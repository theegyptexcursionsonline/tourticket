import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import RevenuePriceOverride from '@/lib/models/RevenuePriceOverride';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { effectiveOptionPrice } from '@/lib/pricing/effectivePrice';

type SummaryTour = {
  _id: Types.ObjectId;
  discountPrice?: number;
  discountPercent?: number;
  bookingOptions?: Array<{
    price?: number;
    applyTourDiscount?: boolean;
    timeSlots?: Array<{ price?: number }>;
  }>;
};

type ProjectionTour = SummaryTour & {
  isPublished?: boolean;
  pricingSummary?: { version?: number; currency?: string };
  pricingSearchProjection?: {
    status?: 'pending' | 'syncing' | 'verified' | 'failed';
    summaryVersion?: number;
    authoritativeVersion?: number;
    projectionToken?: string;
    attempts?: number;
    lastErrorCode?: string;
  };
};

const PROJECTION_RETRY_BASE_MS = 60_000;
const PROJECTION_RETRY_MAX_MS = 60 * 60_000;

export function pricingProjectionRetryDelayMs(attempts: number) {
  const normalizedAttempts = Math.max(1, Math.min(12, Math.floor(attempts) || 1));
  return Math.min(PROJECTION_RETRY_MAX_MS, PROJECTION_RETRY_BASE_MS * (2 ** (normalizedAttempts - 1)));
}

const finitePrices = (values: unknown[]) => values
  .map(Number)
  .filter((value) => Number.isFinite(value) && value >= 0);

export function catalogueFromPrice(tour: Pick<SummaryTour, 'discountPrice' | 'discountPercent' | 'bookingOptions'>) {
  const options = Array.isArray(tour.bookingOptions)
    ? tour.bookingOptions.filter((option) => Number.isFinite(Number(option.price)) && Number(option.price) >= 0)
    : [];
  const candidates = options.length > 0
    ? finitePrices(options.flatMap((option) => {
      const slots = Array.isArray(option.timeSlots) && option.timeSlots.length > 0
        ? option.timeSlots
        : [undefined];
      return slots.map((slot) => effectiveOptionPrice(tour, option, slot).price);
    }))
    : finitePrices([tour.discountPrice]);
  return candidates.length ? Math.min(...candidates) : null;
}

/**
 * Rebuild the one listing/search price summary from authoritative catalogue
 * prices plus active future exact overrides. Historical overrides must not
 * keep a stale low price on public cards.
 */
export async function refreshTourPricingSummary(tourId: string, currency = 'USD', authoritativeVersion?: number) {
  const tour = await Tour.findOne({ _id: tourId, ...DEFAULT_TENANT_FILTER })
    .select('_id discountPrice discountPercent bookingOptions.price bookingOptions.applyTourDiscount bookingOptions.timeSlots.price')
    .lean<SummaryTour | null>();
  if (!tour) return null;

  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const overrides = await RevenuePriceOverride.find({
    tenantId: 'default', tourId: tour._id, active: true, date: { $gte: today },
  }).select('prices.adult version date currency').lean<Array<{
    prices?: { adult?: number };
    version?: number;
    date?: Date;
    currency?: string;
  }>>();

  const cataloguePrice = catalogueFromPrice(tour);
  const candidates = finitePrices([
    cataloguePrice,
    ...overrides.map((override) => override.prices?.adult),
  ]);
  if (candidates.length === 0) {
    const projectionToken = randomUUID();
    await Tour.updateOne(
      { _id: tour._id },
      {
        $unset: { pricingSummary: 1 },
        $set: {
          pricingSearchProjection: {
            status: 'pending',
            summaryVersion: 0,
            authoritativeVersion: Math.max(0, Number(authoritativeVersion || 0)),
            projectionToken,
            attempts: 0,
            nextAttemptAt: new Date(),
          },
        },
      },
    );
    return null;
  }

  const versions = overrides.map((override) => Number(override.version || 0)).filter(Number.isFinite);
  const dates = overrides.map((override) => override.date && new Date(override.date)).filter((date): date is Date => Boolean(date));
  const summary = {
    fromPrice: Math.min(...candidates),
    currency: overrides.find((override) => override.currency)?.currency || currency,
    version: versions.length ? Math.max(...versions) : 0,
    validThrough: dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : undefined,
  };
  const projectionToken = randomUUID();
  await Tour.updateOne(
    { _id: tour._id },
    {
      $set: {
        pricingSummary: summary,
        pricingSearchProjection: {
          status: 'pending',
          summaryVersion: summary.version,
          authoritativeVersion: Math.max(0, Number(authoritativeVersion ?? summary.version)),
          projectionToken,
          attempts: 0,
          nextAttemptAt: new Date(),
        },
      },
    },
  );
  return summary;
}

/**
 * Refresh the direct-site search projection and persist an independently
 * retryable delivery state. A successful authoritative price write is not
 * reported as fully propagated while Algolia/listing projection is stale.
 */
export async function syncTourPricingSearchIndex(tourId: string) {
  if (process.env.NODE_ENV !== 'production' && process.env.REVENUEPILOT_SKIP_SEARCH_SYNC === 'true') {
    // Local harnesses skip the external Algolia push but must still settle the
    // projection ledger, or read-back propagation would stay pending forever.
    await Tour.updateOne(
      { _id: tourId, ...DEFAULT_TENANT_FILTER, 'pricingSearchProjection.projectionToken': { $exists: true } },
      { $set: { 'pricingSearchProjection.status': 'verified', 'pricingSearchProjection.syncedAt': new Date() } },
    );
    return true;
  }
  const now = new Date();
  const tour = await Tour.findOne({ _id: tourId, ...DEFAULT_TENANT_FILTER }).lean<ProjectionTour | null>();
  if (!tour) return false;
  const summaryVersion = Number(
    tour.pricingSearchProjection?.summaryVersion
    ?? tour.pricingSummary?.version
    ?? 0,
  );
  const projectionToken = tour.pricingSearchProjection?.projectionToken;
  if (!projectionToken) return false;
  const attempts = Math.max(0, Number(tour.pricingSearchProjection?.attempts || 0)) + 1;
  const claimed = await Tour.updateOne(
    {
      _id: tour._id,
      'pricingSearchProjection.summaryVersion': summaryVersion,
      'pricingSearchProjection.projectionToken': projectionToken,
    },
    {
      $set: {
        'pricingSearchProjection.status': 'syncing',
        'pricingSearchProjection.lastAttemptAt': now,
      },
      $inc: { 'pricingSearchProjection.attempts': 1 },
      $unset: {
        'pricingSearchProjection.nextAttemptAt': 1,
        'pricingSearchProjection.lastErrorCode': 1,
      },
    },
  );
  if (Number(claimed.matchedCount || 0) !== 1) return false;

  const markFailed = async (lastErrorCode: string) => {
    const nextAttemptAt = new Date(now.getTime() + pricingProjectionRetryDelayMs(attempts));
    await Tour.updateOne(
      {
        _id: tour._id,
        'pricingSearchProjection.summaryVersion': summaryVersion,
        'pricingSearchProjection.projectionToken': projectionToken,
      },
      {
        $set: {
          'pricingSearchProjection.status': 'failed',
          'pricingSearchProjection.lastErrorCode': lastErrorCode,
          'pricingSearchProjection.nextAttemptAt': nextAttemptAt,
        },
      },
    );
    return false;
  };

  try {
    const hasWriteCredentials = Boolean(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
      && (process.env.ALGOLIA_WRITE_API_KEY || process.env.ALGOLIA_ADMIN_API_KEY),
    );
    if (!hasWriteCredentials) return markFailed('ALGOLIA_WRITE_NOT_CONFIGURED');
    const { deleteTourFromAlgolia, syncTourToAlgoliaVerified } = await import('@/lib/algolia');
    if (tour.isPublished === false) await deleteTourFromAlgolia(String(tour._id));
    else await syncTourToAlgoliaVerified(tour);
    const verified = await Tour.updateOne(
      {
        _id: tour._id,
        'pricingSearchProjection.summaryVersion': summaryVersion,
        'pricingSearchProjection.projectionToken': projectionToken,
      },
      {
        $set: {
          'pricingSearchProjection.status': 'verified',
          'pricingSearchProjection.syncedAt': new Date(),
        },
        $unset: {
          'pricingSearchProjection.nextAttemptAt': 1,
          'pricingSearchProjection.lastErrorCode': 1,
        },
      },
    );
    return Number(verified.matchedCount || 0) === 1;
  } catch (error) {
    console.error('Pricing search projection refresh failed.', error);
    return markFailed('ALGOLIA_SYNC_FAILED');
  }
}

export function pricingProjectionStatus(
  tour: Pick<ProjectionTour, 'pricingSummary' | 'pricingSearchProjection'> | null | undefined,
  authoritativeVersion?: number,
) {
  const projection = tour?.pricingSearchProjection;
  const summaryVersion = Number(tour?.pricingSummary?.version ?? -1);
  const projectionVersion = Number(projection?.summaryVersion ?? -1);
  const authorityMatches = authoritativeVersion === undefined
    || Number(projection?.authoritativeVersion ?? -1) === authoritativeVersion;
  const versionMatches = summaryVersion >= 0
    && projectionVersion === summaryVersion
    && authorityMatches;
  const verified = projection?.status === 'verified' && versionMatches;
  return {
    state: verified ? 'verified' as const : projection?.status === 'failed' ? 'failed' as const : 'pending' as const,
    verified,
    versionMatches,
    summaryVersion: summaryVersion >= 0 ? summaryVersion : null,
    projectionVersion: projectionVersion >= 0 ? projectionVersion : null,
    authoritativeVersion: Number.isFinite(Number(projection?.authoritativeVersion))
      ? Number(projection?.authoritativeVersion)
      : null,
  };
}

/**
 * Idempotently repair both materialized listing state and the external search
 * projection after an authoritative apply/rollback. A summary failure is
 * persisted as retryable work; an Algolia failure is persisted by the search
 * sync itself. Replaying the original write therefore repairs the projection
 * without repeating the price mutation.
 */
export async function reconcileTourPricingProjection(
  tourId: string,
  currency = 'USD',
  authoritativeVersion = 0,
) {
  try {
    const summary = await refreshTourPricingSummary(tourId, currency, authoritativeVersion);
    const searchSynced = await syncTourPricingSearchIndex(tourId);
    return { summaryRefreshed: true, searchSynced, summary };
  } catch (error) {
    const now = new Date();
    await Tour.updateOne(
      { _id: tourId, ...DEFAULT_TENANT_FILTER },
      {
        $set: {
          'pricingSearchProjection.status': 'failed',
          'pricingSearchProjection.authoritativeVersion': Math.max(0, Number(authoritativeVersion || 0)),
          'pricingSearchProjection.projectionToken': randomUUID(),
          'pricingSearchProjection.lastAttemptAt': now,
          'pricingSearchProjection.lastErrorCode': 'PRICING_SUMMARY_REFRESH_FAILED',
          'pricingSearchProjection.nextAttemptAt': new Date(now.getTime() + PROJECTION_RETRY_BASE_MS),
        },
        $inc: { 'pricingSearchProjection.attempts': 1 },
      },
    );
    console.error('Pricing summary projection refresh failed.', error);
    return { summaryRefreshed: false, searchSynced: false, summary: null };
  }
}

/** Refresh summaries whose last future override has elapsed. Invoke daily from
 * the authenticated pricing-summaries cron endpoint. The same cron also drains
 * failed/pending search projections so a transient Algolia outage cannot leave
 * listing prices stale indefinitely. */
export async function refreshExpiredPricingSummaries(limit = 200) {
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const boundedLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const tours = await Tour.find({
    ...DEFAULT_TENANT_FILTER,
    'pricingSummary.validThrough': { $lt: today },
  }).select('_id').limit(boundedLimit).lean<Array<{ _id: Types.ObjectId }>>();
  for (const tour of tours) {
    await refreshTourPricingSummary(String(tour._id));
  }

  const now = new Date();
  const staleSyncCutoff = new Date(now.getTime() - 5 * 60_000);
  const projectionTours = await Tour.find({
    ...DEFAULT_TENANT_FILTER,
    $or: [
      { 'pricingSearchProjection.status': 'pending' },
      {
        'pricingSearchProjection.status': 'failed',
        'pricingSearchProjection.nextAttemptAt': { $lte: now },
      },
      {
        'pricingSearchProjection.status': 'syncing',
        'pricingSearchProjection.lastAttemptAt': { $lte: staleSyncCutoff },
      },
    ],
  }).select('_id pricingSummary.currency pricingSearchProjection.authoritativeVersion pricingSearchProjection.lastErrorCode')
    .limit(boundedLimit)
    .lean<Array<{
      _id: Types.ObjectId;
      pricingSummary?: { currency?: string };
      pricingSearchProjection?: { authoritativeVersion?: number; lastErrorCode?: string };
    }>>();
  const results: Array<{ tourId: string; searchSynced: boolean }> = [];
  for (const tour of projectionTours) {
    const tourId = String(tour._id);
    const searchSynced = tour.pricingSearchProjection?.lastErrorCode === 'PRICING_SUMMARY_REFRESH_FAILED'
      ? (await reconcileTourPricingProjection(
        tourId,
        tour.pricingSummary?.currency || 'USD',
        Number(tour.pricingSearchProjection?.authoritativeVersion || 0),
      )).searchSynced
      : await syncTourPricingSearchIndex(tourId);
    results.push({ tourId, searchSynced });
  }
  return { refreshed: tours.length, projectionAttempts: results.length, results };
}

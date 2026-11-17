/**
 * One place that decides a trip's review count and average.
 *
 * A review counts ("published") only when it is a real customer review:
 *   - it belongs to the trip and the trip's own brand (tenant),
 *   - it is approved (`verified: true`; an admin hides one by un-approving it,
 *     removes one by deleting it), and
 *   - the same customer has a confirmed or completed booking of that trip, in
 *     that brand, dated before now. This is the rule the review form enforces,
 *     so imported or sample records without a booking can never become a score.
 *
 * The result is written to the trip as `reviewCount` (and `rating` = average
 * when there is at least one review). Every rating surface reads it through
 * lib/tours/ratingDisplay.ts, which shows nothing while the count is 0.
 *
 * Writes are idempotent (a recompute of the same records writes the same
 * numbers) and ordered: each write carries the time its computation started
 * and is refused if a newer computation already wrote, so two overlapping
 * syncs can never leave the older figure behind.
 */
import mongoose from 'mongoose';
import Review from '@/lib/models/Review';
import Tour from '@/lib/models/Tour';

export const REVIEW_ELIGIBLE_BOOKING_STATUSES = ['Confirmed', 'Completed', 'confirmed', 'completed'];

export interface TourReviewStats {
  reviewCount: number;
  /** Average of the counted reviews, one decimal; null when there are none. */
  average: number | null;
}

type Id = string | mongoose.Types.ObjectId;

const toObjectId = (id: Id | unknown) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)));

/** Records of the main brand were stored without a tenant before tenancy existed. */
function tenantMatch(tenantId: string) {
  return tenantId === 'default' ? { $in: ['default', null] } : tenantId;
}

export async function computeTourReviewStats(
  tourId: Id,
  tenantId: string,
  now: Date = new Date(),
): Promise<TourReviewStats> {
  if (!tenantId) throw new Error('A brand is required to count reviews.');
  const tour = toObjectId(tourId);
  const rows = await Review.aggregate<{ reviewCount: number; average: number }>([
    { $match: { tour, tenantId: tenantMatch(tenantId), verified: true, rating: { $gte: 1, $lte: 5 } } },
    {
      $lookup: {
        from: 'bookings',
        let: { user: '$user', tour: '$tour' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ['$user', '$$user'] }, { $eq: ['$tour', '$$tour'] }] },
              tenantId: tenantMatch(tenantId),
              status: { $in: REVIEW_ELIGIBLE_BOOKING_STATUSES },
              date: { $lt: now },
            },
          },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: 'eligibleBooking',
      },
    },
    { $match: { 'eligibleBooking.0': { $exists: true } } },
    { $group: { _id: null, reviewCount: { $sum: 1 }, average: { $avg: '$rating' } } },
  ]);
  const row = rows[0];
  if (!row || row.reviewCount < 1) return { reviewCount: 0, average: null };
  return { reviewCount: row.reviewCount, average: Math.round(row.average * 10) / 10 };
}

export interface SyncResult extends TourReviewStats {
  tourId: string;
  written: boolean;
}

/**
 * Recompute and store a trip's figures. Safe to call after any review change
 * (create, edit, approve, hide, delete) and safe to call twice.
 */
export async function syncTourReviewStats(tourId: Id | unknown, options: { dryRun?: boolean; now?: Date } = {}): Promise<SyncResult | null> {
  const startedAt = options.now ?? new Date();
  const tour = await Tour.findById(toObjectId(tourId)).select('_id tenantId reviewCount rating reviewStatsSyncedAt').lean<{
    _id: mongoose.Types.ObjectId; tenantId?: string | null; reviewCount?: number; rating?: number; reviewStatsSyncedAt?: Date;
  } | null>();
  if (!tour) return null;
  const tenantId = tour.tenantId || 'default';
  const stats = await computeTourReviewStats(tour._id, tenantId, startedAt);
  const set: Record<string, unknown> = { reviewCount: stats.reviewCount, reviewStatsSyncedAt: startedAt };
  // The average replaces the stored rating only when real reviews back it; with
  // none, the count of 0 keeps any stored figure off every page.
  if (stats.average !== null) set.rating = stats.average;
  if (options.dryRun) return { tourId: String(tour._id), ...stats, written: false };
  const result = await Tour.updateOne(
    {
      _id: tour._id,
      $or: [{ reviewStatsSyncedAt: { $exists: false } }, { reviewStatsSyncedAt: null }, { reviewStatsSyncedAt: { $lte: startedAt } }],
    },
    { $set: set },
  );
  return { tourId: String(tour._id), ...stats, written: result.modifiedCount > 0 || result.matchedCount > 0 };
}

/**
 * For request handlers: a failed recount must never fail the customer's or the
 * admin's action, but it is logged so it can be re-run with the backfill script.
 */
export async function syncTourReviewStatsSafely(tourId: Id | unknown): Promise<void> {
  if (!tourId) return;
  try {
    await syncTourReviewStats(tourId);
  } catch (error) {
    console.error('[reviews] trip review figures not updated; re-run the review backfill', {
      tourId: String(tourId),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

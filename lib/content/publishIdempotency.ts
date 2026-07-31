import { createHash, randomUUID } from 'crypto';
import ContentPublishReceipt from '@/lib/models/ContentPublishReceipt';
import { DEFAULT_TENANT_ID, isDefaultTenant, normalizeTenantId } from '@/lib/tenant/tenantScope';

// How long one publish attempt may hold its claim before another attempt may
// take it over. Publishes are single-request writes, so a minute is generous.
export const PUBLISH_CLAIM_LEASE_MS = 60_000;

// The adapter contract asks for the mapping to survive at least 24h.
export const PUBLISH_RECEIPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const MAX_KEY_LENGTH = 200;

// Reads the `Idempotency-Key` header. The key is optional: the engine always
// sends one, but an older engine build (or a manual curl) must still be able to
// publish rather than be locked out. When absent, dedupe is simply skipped.
export function readIdempotencyKey(value: string | null | undefined): {
  key: string | null;
  error: string | null;
} {
  const key = value?.trim() || '';
  if (!key) return { key: null, error: null };
  if (key.length > MAX_KEY_LENGTH || /[\u0000-\u001f\u007f]/.test(key)) {
    return {
      key: null,
      error: `Idempotency-Key must be at most ${MAX_KEY_LENGTH} printable characters`,
    };
  }
  return { key, error: null };
}

// Order-independent serialization so a retry that re-serializes the same publish
// with different key ordering still hashes identically.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

export function hashPublishRequest(body: unknown): string {
  return createHash('sha256').update(stableStringify(body)).digest('hex');
}

export function receiptTenantId(tenantId: unknown): string {
  return isDefaultTenant(tenantId) ? DEFAULT_TENANT_ID : normalizeTenantId(tenantId)!;
}

export type PublishClaim = {
  outcome: 'proceed';
  receiptId: string;
  claimToken: string;
  // True when this attempt took over a stale claim, i.e. a previous attempt
  // died mid-publish. The caller must then treat an already-existing record
  // with the same natural key as its own work rather than a duplicate.
  resumed: boolean;
};

export type BeginPublishResult =
  | PublishClaim
  | { outcome: 'replay'; status: number; body: Record<string, unknown> }
  | { outcome: 'error'; status: number; error: string };

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: number }).code === 11000);
}

function replayOf(receipt: {
  statusCode?: number;
  response?: Record<string, unknown> | null;
}): { outcome: 'replay'; status: number; body: Record<string, unknown> } {
  return {
    outcome: 'replay',
    status: receipt.statusCode ?? 200,
    body: receipt.response ?? {},
  };
}

/**
 * Claims the right to run one publish for an `Idempotency-Key`.
 *
 * - first sighting of a key → `proceed` (a `pending` receipt is written first)
 * - key already completed   → `replay` with the original response body
 * - key bound to a different request body → 409 (a genuine engine-side bug)
 * - key currently in flight → 503 so the engine backs off and retries
 * - key left `pending` by a dead attempt → `proceed` with `resumed: true`
 *
 * The receipt is never marked processed here — only `completePublish` does that,
 * and only after the content write has committed.
 */
export async function beginPublish(input: {
  idempotencyKey: string;
  tenantId: unknown;
  contentType: string;
  requestHash: string;
}): Promise<BeginPublishResult> {
  const tenantId = receiptTenantId(input.tenantId);
  const selector = {
    idempotencyKey: input.idempotencyKey,
    tenantId,
    contentType: input.contentType,
  };
  const now = new Date();
  const claimToken = randomUUID();

  try {
    const receipt = await ContentPublishReceipt.create({
      ...selector,
      requestHash: input.requestHash,
      state: 'pending',
      claimToken,
      claimExpiresAt: new Date(now.getTime() + PUBLISH_CLAIM_LEASE_MS),
      expiresAt: new Date(now.getTime() + PUBLISH_RECEIPT_TTL_MS),
    });
    return { outcome: 'proceed', receiptId: String(receipt._id), claimToken, resumed: false };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }

  const existing = await ContentPublishReceipt.findOne(selector).lean<{
    _id: unknown;
    requestHash: string;
    state: ContentPublishReceiptStateLike;
    statusCode?: number;
    response?: Record<string, unknown> | null;
  } | null>();

  if (!existing) {
    // Lost a race with a TTL expiry; the engine's retry will start cleanly.
    return {
      outcome: 'error',
      status: 503,
      error: 'Publish receipt was not readable; retry shortly',
    };
  }

  if (existing.requestHash !== input.requestHash) {
    return {
      outcome: 'error',
      status: 409,
      error: 'Idempotency-Key is already bound to a different request body',
    };
  }

  if (existing.state === 'completed') return replayOf(existing);

  // A `pending` receipt whose claim has lapsed belonged to an attempt that died.
  const reclaimed = await ContentPublishReceipt.findOneAndUpdate(
    {
      _id: existing._id,
      state: 'pending',
      $or: [
        { claimExpiresAt: { $lte: now } },
        { claimExpiresAt: { $exists: false } },
        { claimExpiresAt: null },
      ],
    },
    {
      $set: { claimToken, claimExpiresAt: new Date(now.getTime() + PUBLISH_CLAIM_LEASE_MS) },
    },
    { new: true },
  ).lean<{ _id: unknown } | null>();

  if (reclaimed) {
    return { outcome: 'proceed', receiptId: String(reclaimed._id), claimToken, resumed: true };
  }

  // Either it completed while we looked, or another attempt still holds a live
  // claim. In-flight is transient, so 503 lets the engine retry with backoff
  // instead of burning its 4xx budget.
  const latest = await ContentPublishReceipt.findOne(selector).lean<{
    state: ContentPublishReceiptStateLike;
    statusCode?: number;
    response?: Record<string, unknown> | null;
  } | null>();
  if (latest?.state === 'completed') return replayOf(latest);

  return {
    outcome: 'error',
    status: 503,
    error: 'A publish with this Idempotency-Key is already in progress; retry shortly',
  };
}

type ContentPublishReceiptStateLike = 'pending' | 'completed';

/**
 * Marks a claimed receipt processed. MUST be called only after the content
 * write has committed — that ordering is what makes a crashed publish safe to
 * retry instead of silently swallowed.
 */
export async function completePublish(
  claim: PublishClaim,
  status: number,
  body: Record<string, unknown>,
): Promise<void> {
  await ContentPublishReceipt.updateOne(
    { _id: claim.receiptId, claimToken: claim.claimToken },
    {
      $set: {
        state: 'completed',
        statusCode: status,
        response: body,
        expiresAt: new Date(Date.now() + PUBLISH_RECEIPT_TTL_MS),
      },
      $unset: { claimToken: 1, claimExpiresAt: 1 },
    },
  );
}

/**
 * Drops a claim whose publish did not write anything (validation rejection or a
 * failed insert), so the engine's next retry starts from a clean slate rather
 * than waiting out the lease.
 */
export async function releasePublishClaim(claim: PublishClaim): Promise<void> {
  await ContentPublishReceipt.deleteOne({
    _id: claim.receiptId,
    claimToken: claim.claimToken,
    state: 'pending',
  });
}

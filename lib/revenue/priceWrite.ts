import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import RevenuePriceExecution, { type IRevenuePriceExecution } from '@/lib/models/RevenuePriceExecution';
import RevenuePriceOverride, { type GuestPrices } from '@/lib/models/RevenuePriceOverride';
import Tour from '@/lib/models/Tour';
import { normalizePriceDate, resolveEffectivePrice } from '@/lib/revenue/pricingResolver';
import type { HydratedDocument } from 'mongoose';

export type PriceWrite = {
  executionId: string; recommendationId: string; tenantId: string;
  target: { tourId: string; optionKey: string; date: string; time: string };
  prices: GuestPrices; currency: string; expectedVersion: number;
  policyHash: string; sourceVersion: string; actor: string; mode: 'manual' | 'assist' | 'autopilot';
};

export function hashRevenuePayload(bodyText: string) {
  return createHash('sha256').update(bodyText).digest('hex');
}

const mongoErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  return (error as { code?: unknown }).code;
};

export function validatePriceWrite(value: unknown): PriceWrite {
  const candidate = value && typeof value === 'object' ? value as Partial<PriceWrite> : {};
  const prices = candidate.prices;
  const required = [candidate.executionId, candidate.recommendationId, candidate.tenantId, candidate.target?.tourId, candidate.target?.optionKey, candidate.target?.date, candidate.target?.time, candidate.currency, candidate.policyHash, candidate.sourceVersion, candidate.actor, candidate.mode];
  if (required.some((item) => typeof item !== 'string' || !item.trim())) throw new Error('Missing required execution fields');
  if (!candidate.target || !mongoose.Types.ObjectId.isValid(candidate.target.tourId)) throw new Error('Invalid tour');
  if (!candidate.mode || !['manual', 'assist', 'autopilot'].includes(candidate.mode)) throw new Error('Invalid execution mode');
  if (!Number.isInteger(candidate.expectedVersion) || (candidate.expectedVersion ?? -1) < 0) throw new Error('Invalid expectedVersion');
  if (candidate.currency !== 'USD') throw new Error('Only USD is enabled for the EEO canary');
  for (const guest of ['adult', 'child', 'infant'] as const) {
    const price = prices?.[guest];
    if (!Number.isFinite(price) || price === undefined || price < 0) throw new Error(`Invalid ${guest} price`);
  }
  normalizePriceDate(candidate.target.date);
  return candidate as PriceWrite;
}

function movement(previous: GuestPrices, next: GuestPrices) {
  return Math.max(...(['adult', 'child', 'infant'] as const).map((guest) => {
    if (previous[guest] === 0) return next[guest] === 0 ? 0 : Infinity;
    return Math.abs(next[guest] - previous[guest]) / previous[guest] * 100;
  }));
}

export async function applyPriceWrite(input: PriceWrite, idempotencyKey: string, bodyText: string) {
  const existing = await RevenuePriceExecution.findOne({ $or: [{ idempotencyKey }, { executionId: input.executionId }] }).lean();
  if (existing?.idempotencyKey === idempotencyKey && existing.state !== 'blocked') return { receipt: existing, state: 'replayed' as const };
  let recoverableIntent: HydratedDocument<IRevenuePriceExecution> | null = null;
  if (existing?.idempotencyKey === idempotencyKey && existing.state === 'blocked') {
    const effective = await resolveEffectivePrice(input.target);
    if (effective.executionId === input.executionId && effective.version === input.expectedVersion + 1) {
      const receipt = await RevenuePriceExecution.findByIdAndUpdate(existing._id, { $set: { state: 'applied', appliedVersion: effective.version, effectivePrices: effective.prices }, $push: { events: { type: 'apply_recovered', at: new Date().toISOString() } } }, { new: true }).lean();
      return { receipt, effective, state: 'replayed' as const };
    }
    if (effective.version === input.expectedVersion) recoverableIntent = await RevenuePriceExecution.findById(existing._id);
    else return { current: effective, state: 'conflict' as const };
  } else if (existing) return { current: await resolveEffectivePrice(input.target), state: 'conflict' as const };
  const current = await resolveEffectivePrice(input.target);
  if (current.version !== input.expectedVersion) return { current, state: 'conflict' as const };
  const maxMovement = Number(process.env.REVENUEPILOT_MAX_WRITE_PERCENT || 5);
  if (movement(current.prices, input.prices) > maxMovement) return { current, state: 'blocked' as const, reason: `Maximum movement is ${maxMovement}%.` };
  const nextVersion = current.version + 1;
  const date = normalizePriceDate(input.target.date);
  let intent = recoverableIntent;
  if (!intent) {
    try {
      intent = await RevenuePriceExecution.create({
        executionId: input.executionId, idempotencyKey, tenantId: input.tenantId, recommendationId: input.recommendationId,
        actor: input.actor, mode: input.mode, target: { ...input.target, date }, currency: input.currency,
        expectedVersion: input.expectedVersion, previousPrices: current.prices, requestedPrices: input.prices,
        policyHash: input.policyHash, sourceVersion: input.sourceVersion, requestHash: hashRevenuePayload(bodyText), state: 'blocked',
        events: [{ type: 'apply_started', at: new Date().toISOString() }],
      });
    } catch (error: unknown) {
      if (mongoErrorCode(error) !== 11000) throw error;
      const concurrent = await RevenuePriceExecution.findOne({ $or: [{ idempotencyKey }, { executionId: input.executionId }] }).lean();
      if (concurrent?.idempotencyKey === idempotencyKey) return { receipt: concurrent, state: 'replayed' as const };
      return { current: await resolveEffectivePrice(input.target), state: 'conflict' as const };
    }
  }
  let override;
  try {
    override = await RevenuePriceOverride.findOneAndUpdate(
      { tenantId: input.tenantId, tourId: input.target.tourId, optionKey: input.target.optionKey, date, time: input.target.time, version: input.expectedVersion },
      { $set: { currency: input.currency, prices: input.prices, cataloguePrices: current.cataloguePrices, previousPrices: current.prices, version: nextVersion, source: 'revenuepilot', recommendationId: input.recommendationId, executionId: input.executionId, active: true }, $unset: { revertedAt: 1 } },
      { new: true, upsert: input.expectedVersion === 0, runValidators: true },
    );
  } catch (error: unknown) {
    if (mongoErrorCode(error) === 11000) {
      intent.state = 'conflict'; intent.events.push({ type: 'version_conflict', at: new Date().toISOString() }); await intent.save();
      return { current: await resolveEffectivePrice(input.target), state: 'conflict' as const };
    }
    throw error;
  }
  if (!override) {
    intent.state = 'conflict'; intent.events.push({ type: 'version_conflict', at: new Date().toISOString() }); await intent.save();
    return { current: await resolveEffectivePrice(input.target), state: 'conflict' as const };
  }
  intent.appliedVersion = nextVersion; intent.effectivePrices = input.prices; intent.state = 'applied';
  intent.events.push({ type: 'price_applied', at: new Date().toISOString() });
  const receipt = await intent.save();
  const summary = await RevenuePriceOverride.aggregate([
    { $match: { tenantId: input.tenantId, tourId: new mongoose.Types.ObjectId(input.target.tourId), active: true } },
    { $group: { _id: null, fromPrice: { $min: '$prices.adult' }, version: { $max: '$version' } } },
  ]);
  const tour = await Tour.findById(input.target.tourId).select('discountPrice bookingOptions').lean<{ discountPrice?: number; bookingOptions?: Array<{ price?: number }> } | null>();
  const catalogueFromPrice = Math.min(Number(tour?.discountPrice ?? Infinity), ...(tour?.bookingOptions || []).map((option) => Number(option.price)).filter(Number.isFinite));
  const fromPrice = Math.min(summary[0]?.fromPrice ?? Infinity, catalogueFromPrice);
  if (Number.isFinite(fromPrice)) await Tour.updateOne({ _id: input.target.tourId }, { $set: { pricingSummary: { fromPrice, currency: input.currency, version: summary[0]?.version ?? nextVersion, validThrough: date } } });
  return { receipt: receipt.toObject(), effective: await resolveEffectivePrice(input.target), state: 'applied' as const };
}

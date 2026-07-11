import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import RevenuePriceExecution from '@/lib/models/RevenuePriceExecution';
import RevenuePriceOverride, { type GuestPrices } from '@/lib/models/RevenuePriceOverride';
import Tour from '@/lib/models/Tour';
import { normalizePriceDate, resolveEffectivePrice } from '@/lib/revenue/pricingResolver';

export type PriceWrite = {
  executionId: string; recommendationId: string; tenantId: string;
  target: { tourId: string; optionKey: string; date: string; time: string };
  prices: GuestPrices; currency: string; expectedVersion: number;
  policyHash: string; sourceVersion: string; actor: string; mode: 'manual' | 'assist' | 'autopilot';
};

export function hashRevenuePayload(bodyText: string) {
  return createHash('sha256').update(bodyText).digest('hex');
}

export function validatePriceWrite(value: any): PriceWrite {
  const prices = value?.prices;
  const required = [value?.executionId, value?.recommendationId, value?.tenantId, value?.target?.tourId, value?.target?.optionKey, value?.target?.date, value?.target?.time, value?.currency, value?.policyHash, value?.sourceVersion, value?.actor, value?.mode];
  if (required.some((item) => typeof item !== 'string' || !item.trim())) throw new Error('Missing required execution fields');
  if (!mongoose.Types.ObjectId.isValid(value.target.tourId)) throw new Error('Invalid tour');
  if (!['manual', 'assist', 'autopilot'].includes(value.mode)) throw new Error('Invalid execution mode');
  if (!Number.isInteger(value.expectedVersion) || value.expectedVersion < 0) throw new Error('Invalid expectedVersion');
  if (value.currency !== 'USD') throw new Error('Only USD is enabled for the EEO canary');
  for (const guest of ['adult', 'child', 'infant']) {
    if (!Number.isFinite(prices?.[guest]) || prices[guest] < 0) throw new Error(`Invalid ${guest} price`);
  }
  normalizePriceDate(value.target.date);
  return value as PriceWrite;
}

function movement(previous: GuestPrices, next: GuestPrices) {
  return Math.max(...(['adult', 'child', 'infant'] as const).map((guest) => {
    if (previous[guest] === 0) return next[guest] === 0 ? 0 : Infinity;
    return Math.abs(next[guest] - previous[guest]) / previous[guest] * 100;
  }));
}

export async function applyPriceWrite(input: PriceWrite, idempotencyKey: string, bodyText: string) {
  const existing: any = await RevenuePriceExecution.findOne({ $or: [{ idempotencyKey }, { executionId: input.executionId }] }).lean();
  if (existing?.idempotencyKey === idempotencyKey && existing.state !== 'blocked') return { receipt: existing, state: 'replayed' as const };
  let recoverableIntent: any = null;
  if (existing?.idempotencyKey === idempotencyKey && existing.state === 'blocked') {
    const effective = await resolveEffectivePrice(input.target);
    if (effective.executionId === input.executionId && effective.version === input.expectedVersion + 1) {
      const receipt: any = await RevenuePriceExecution.findByIdAndUpdate(existing._id, { $set: { state: 'applied', appliedVersion: effective.version, effectivePrices: effective.prices }, $push: { events: { type: 'apply_recovered', at: new Date().toISOString() } } }, { new: true }).lean();
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
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      const concurrent: any = await RevenuePriceExecution.findOne({ $or: [{ idempotencyKey }, { executionId: input.executionId }] }).lean();
      if (concurrent?.idempotencyKey === idempotencyKey) return { receipt: concurrent, state: 'replayed' as const };
      return { current: await resolveEffectivePrice(input.target), state: 'conflict' as const };
    }
  }
  let override: any;
  try {
    override = await RevenuePriceOverride.findOneAndUpdate(
      { tenantId: input.tenantId, tourId: input.target.tourId, optionKey: input.target.optionKey, date, time: input.target.time, version: input.expectedVersion },
      { $set: { currency: input.currency, prices: input.prices, cataloguePrices: current.cataloguePrices, previousPrices: current.prices, version: nextVersion, source: 'revenuepilot', recommendationId: input.recommendationId, executionId: input.executionId, active: true }, $unset: { revertedAt: 1 } },
      { new: true, upsert: input.expectedVersion === 0, runValidators: true },
    );
  } catch (error: any) {
    if (error?.code === 11000) {
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
  const tour: any = await Tour.findById(input.target.tourId).select('discountPrice bookingOptions').lean();
  const catalogueFromPrice = Math.min(Number(tour?.discountPrice ?? Infinity), ...(tour?.bookingOptions || []).map((option: any) => Number(option.price)).filter(Number.isFinite));
  const fromPrice = Math.min(summary[0]?.fromPrice ?? Infinity, catalogueFromPrice);
  if (Number.isFinite(fromPrice)) await Tour.updateOne({ _id: input.target.tourId }, { $set: { pricingSummary: { fromPrice, currency: input.currency, version: summary[0]?.version ?? nextVersion, validThrough: date } } });
  return { receipt: receipt.toObject(), effective: await resolveEffectivePrice(input.target), state: 'applied' as const };
}

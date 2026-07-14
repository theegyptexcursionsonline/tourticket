import { createHash } from 'node:crypto';
import type { GuestPrices } from '@/lib/models/RevenuePriceOverride';

export type PriceWrite = {
  executionId: string; recommendationId: string; tenantId: string;
  target: { tourId: string; optionKey: string; date: string; time: string };
  prices: GuestPrices; currency: string; expectedVersion: number;
  policyHash: string; policySnapshot: { floor: number; ceiling: number; maxChangePercent: number; minConfidence: number; cooldownHours: number; mode: 'manual' | 'assist' | 'autopilot' }; sourceVersion: string; actor: string; mode: 'manual' | 'assist' | 'autopilot';
};

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
  return JSON.stringify(value);
};

export function hashRevenuePolicy(value: unknown) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function validatePriceWrite(value: unknown): PriceWrite {
  const candidate = value && typeof value === 'object' ? value as Partial<PriceWrite> : {};
  const prices = candidate.prices;
  const required = [candidate.executionId, candidate.recommendationId, candidate.tenantId, candidate.target?.tourId, candidate.target?.optionKey, candidate.target?.date, candidate.target?.time, candidate.currency, candidate.policyHash, candidate.sourceVersion, candidate.actor, candidate.mode];
  if (required.some((item) => typeof item !== 'string' || !item.trim())) throw new Error('Missing required execution fields');
  if (!candidate.target || !/^[a-f0-9]{24}$/i.test(candidate.target.tourId)) throw new Error('Invalid tour');
  if (!candidate.mode || !['manual', 'assist', 'autopilot'].includes(candidate.mode)) throw new Error('Invalid execution mode');
  if (!Number.isInteger(candidate.expectedVersion) || (candidate.expectedVersion ?? -1) < 0) throw new Error('Invalid expectedVersion');
  if (candidate.currency !== 'USD') throw new Error('Only USD is enabled for the EEO canary');
  if (!prices) throw new Error('Missing required execution fields');
  for (const guest of ['adult', 'child', 'infant'] as const) {
    const price = prices?.[guest];
    if (!Number.isFinite(price) || price === undefined || price < 0) throw new Error(`Invalid ${guest} price`);
  }
  const policy = candidate.policySnapshot;
  if (!policy || !Number.isFinite(policy.floor) || !Number.isFinite(policy.ceiling) || policy.floor < 0 || policy.floor >= policy.ceiling || !Number.isFinite(policy.maxChangePercent) || policy.maxChangePercent < 1 || policy.maxChangePercent > 50 || !Number.isFinite(policy.minConfidence) || !Number.isInteger(policy.cooldownHours) || !['manual', 'assist', 'autopilot'].includes(policy.mode)) throw new Error('Invalid policy snapshot');
  if (policy.mode !== candidate.mode || hashRevenuePolicy(policy) !== candidate.policyHash) throw new Error('Invalid policy hash');
  if (prices.adult < policy.floor || prices.adult > policy.ceiling) throw new Error('Adult price is outside policy corridor');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.target.date)) throw new Error('Invalid price date');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate.target.time)) throw new Error('Invalid price time');
  if (!candidate.sourceVersion || !/^pv1_[a-f0-9]{64}$/.test(candidate.sourceVersion)) throw new Error('Invalid source version');
  return candidate as PriceWrite;
}

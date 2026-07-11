import mongoose from 'mongoose';
import Tour from '@/lib/models/Tour';
import RevenuePriceOverride, { type GuestPrices } from '@/lib/models/RevenuePriceOverride';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import type { IBookingOption } from '@/lib/models/Tour';
import type { Types } from 'mongoose';

export const STANDARD_OPTION_KEY = 'standard';

type CatalogueTour = {
  _id: Types.ObjectId;
  title: string;
  discountPrice: number;
  originalPrice?: number;
  bookingOptions?: IBookingOption[];
};

type PriceOverride = {
  _id: Types.ObjectId;
  currency: string;
  prices: GuestPrices;
  version: number;
  executionId?: string;
};

export function normalizePriceDate(value: string | Date) {
  const raw = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('Invalid price date');
  return new Date(`${raw}T00:00:00.000Z`);
}

export function catalogueGuestPrices(adult: number): GuestPrices {
  return { adult, child: Math.round(adult * 50) / 100, infant: 0 };
}

export async function resolveEffectivePrice(input: { tourId: string; optionKey?: string; date: string; time: string; tenantId?: string }) {
  if (!mongoose.Types.ObjectId.isValid(input.tourId)) throw new Error('Invalid tour');
  const tenantId = input.tenantId || 'default';
  const optionKey = input.optionKey || STANDARD_OPTION_KEY;
  const tour = await Tour.findOne({ _id: input.tourId, ...DEFAULT_TENANT_FILTER })
    .select('_id title discountPrice originalPrice bookingOptions')
    .lean<CatalogueTour | null>();
  if (!tour) throw new Error('Tour unavailable');
  const option = optionKey === STANDARD_OPTION_KEY
    ? null
    : tour.bookingOptions?.find((candidate) => candidate.pricingKey === optionKey);
  if (optionKey !== STANDARD_OPTION_KEY && !option) throw new Error('Pricing option unavailable');
  const adult = Number(option?.price ?? tour.discountPrice);
  if (!Number.isFinite(adult) || adult < 0) throw new Error('Invalid catalogue price');
  const cataloguePrices = catalogueGuestPrices(adult);
  const date = normalizePriceDate(input.date);
  const override = await RevenuePriceOverride.findOne({ tenantId, tourId: tour._id, optionKey, date, time: input.time, active: true }).lean<PriceOverride | null>();
  const prices = override?.prices ?? cataloguePrices;
  return {
    tourId: String(tour._id),
    tourTitle: tour.title,
    optionKey,
    date: date.toISOString().slice(0, 10),
    time: input.time,
    currency: override?.currency ?? 'USD',
    prices,
    cataloguePrices,
    version: override?.version ?? 0,
    overrideId: override?._id ? String(override._id) : null,
    executionId: override?.executionId ?? null,
    source: override ? 'override' : 'catalogue',
  };
}

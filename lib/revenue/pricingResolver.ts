import mongoose from 'mongoose';
import Tour from '@/lib/models/Tour';
import RevenuePriceOverride, { type GuestPrices } from '@/lib/models/RevenuePriceOverride';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import type { IBookingOption } from '@/lib/models/Tour';
import type { Types } from 'mongoose';
import { pricingCatalogueVersion } from '@/lib/revenue/pricingVersion';
import { effectiveSlotGuestPrices, explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';

export { explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';

export const STANDARD_OPTION_KEY = 'standard';

type CatalogueTour = {
  _id: Types.ObjectId;
  title: string;
  discountPrice: number;
  discountPercent?: number;
  originalPrice?: number;
  bookingOptions?: IBookingOption[];
  revenueGuestPrices?: GuestPrices;
  availability?: { slots?: Array<{ time?: string; capacity?: number; price?: number; guestPrices?: { child?: number; infant?: number } }> };
  updatedAt: Date;
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

export function catalogueGuestPrices(adult: number, explicit?: Partial<GuestPrices> | null): GuestPrices {
  return explicitCatalogueGuestPrices(adult, explicit).prices;
}

export async function resolveEffectivePrice(input: { tourId: string; optionKey?: string; date: string; time: string; tenantId?: string }) {
  if (!mongoose.Types.ObjectId.isValid(input.tourId)) throw new Error('Invalid tour');
  const tenantId = input.tenantId || 'default';
  if (tenantId !== 'default') throw new Error('Tenant unavailable');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('Invalid price time');
  const optionKey = input.optionKey || STANDARD_OPTION_KEY;
  const tour = await Tour.findOne({ _id: input.tourId, isPublished: true, ...DEFAULT_TENANT_FILTER })
    .select('_id title discountPrice discountPercent originalPrice revenueGuestPrices bookingOptions availability updatedAt')
    .lean<CatalogueTour | null>();
  if (!tour) throw new Error('Tour unavailable');
  const option = optionKey === STANDARD_OPTION_KEY
    ? null
    : tour.bookingOptions?.find((candidate) => candidate.pricingKey === optionKey);
  if (optionKey !== STANDARD_OPTION_KEY && !option) throw new Error('Pricing option unavailable');
  const rawAdult = Number(option?.price ?? tour.discountPrice);
  if (!Number.isFinite(rawAdult) || rawAdult < 0) throw new Error('Invalid catalogue price');
  // The catalogue baseline goes through the shared discount helper: the tour's
  // percentage applies to opted-in options and a slot may override the base,
  // so this quote, the sidebar and the booking writer can never disagree.
  const adult = authoritativeBasePrice(tour, {
    selectedBookingOption: option ? { pricingKey: optionKey } : null,
    selectedTime: input.time,
  });
  const selectedSlot = option
    ? option.timeSlots?.find((slot) => slot.time === input.time)
    : tour.availability?.slots?.find((slot) => slot.time === input.time);
  const cataloguePrices = effectiveSlotGuestPrices({
    adult,
    base: option?.guestPrices ?? tour.revenueGuestPrices,
    slot: selectedSlot,
    discountPercent: tour.discountPercent,
    applyDiscount: option ? Boolean(option.applyTourDiscount) : true,
  });
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
    sourceVersion: pricingCatalogueVersion(tour),
  };
}

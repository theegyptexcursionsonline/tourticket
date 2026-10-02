import { resolveBookingCutoff } from '@/lib/bookings/bookingCutoff';
import Availability from '@/lib/models/Availability';
import Booking from '@/lib/models/Booking';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { paidTenantFilter, paidTenantId } from '@/lib/tenant/paidTenant';
import {
  evaluateDepartureSellability,
  stopSaleAliasesForOption,
  type DepartureSlot,
  type SellableBookingOption,
} from '@/lib/revenue/departureSellability';
import { isTourScheduled, localDepartureToUtc } from '@/lib/revenue/departureSchedule';
import { normalizePriceDate } from '@/lib/revenue/pricingResolver';
import { RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
import type { Types } from 'mongoose';

type SellableTour = {
  bookingCutoffMinutes?: number;
  _id: Types.ObjectId;
  availability?: {
    type?: string;
    availableDays?: number[];
    startDate?: Date;
    endDate?: Date;
    specificDates?: Date[];
    blockedDates?: Date[];
    slots?: DepartureSlot[];
  };
  bookingOptions?: SellableBookingOption[];
};

type ExplicitAvailability = {
  slots?: DepartureSlot[];
  stopSale?: boolean;
};

type StopSaleRow = { optionIds?: string[] };
type BookingRow = { adultGuests?: number; childGuests?: number; infantGuests?: number; guests?: number };

export type SellableDepartureEvidence = {
  startsAtUtc: string;
  bookingClosesAtUtc?: string;
  capacity: number;
  booked: number;
  available: number;
  optionId: string;
};

export async function assertRevenuePriceTargetSellable(target: {
  tourId: string;
  optionKey: string;
  date: string;
  time: string;
  tenantId?: string;
}): Promise<SellableDepartureEvidence> {
  const tenantId = paidTenantId({ tenant_id: target.tenantId || '' });
  const tenantFilter = tenantId === 'default' ? DEFAULT_TENANT_FILTER : paidTenantFilter(tenantId);
  const tour = await Tour.findOne({ _id: target.tourId, isPublished: true, ...tenantFilter })
    .select('_id availability bookingOptions bookingCutoffMinutes')
    .lean<SellableTour | null>();
  if (!tour) throw new RevenuePricingWriteError(422, 'TOUR_UNAVAILABLE', 'The approved tour is not published or is outside the EEO tenant.');

  const aliases = stopSaleAliasesForOption(tour.bookingOptions, target.optionKey);
  if (aliases.length === 0) {
    throw new RevenuePricingWriteError(422, 'PRICING_OPTION_UNAVAILABLE', 'The target pricing option is no longer available.');
  }

  const date = normalizePriceDate(target.date);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  const [explicit, stopSales, bookings] = await Promise.all([
    Availability.findOne({ tour: tour._id, date: { $gte: date, $lte: end }, ...tenantFilter })
      .select('slots stopSale')
      .lean<ExplicitAvailability | null>(),
    StopSale.find({ tourId: tour._id, startDate: { $lte: end }, endDate: { $gte: date }, ...tenantFilter })
      .select('optionIds')
      .lean<StopSaleRow[]>(),
    Booking.find({
      $and: [
        {
          tour: tour._id,
          time: target.time,
          status: { $in: ['Confirmed', 'Pending'] },
          $or: [{ date: { $gte: date, $lte: end } }, { dateString: target.date }],
        },
        tenantFilter,
      ],
    }).select('adultGuests childGuests infantGuests guests').lean<BookingRow[]>(),
  ]);

  const fullStopSale = stopSales.some((row) => !Array.isArray(row.optionIds) || row.optionIds.length === 0);
  const optionStopSale = stopSales.some((row) => (row.optionIds || []).some((id) => aliases.includes(String(id))));
  const booked = bookings.reduce((sum, booking) => {
    const explicitGuests = Number(booking.adultGuests || 0) + Number(booking.childGuests || 0) + Number(booking.infantGuests || 0);
    return sum + (explicitGuests || Number(booking.guests || 0));
  }, 0);
  const startsAtUtc = localDepartureToUtc(target.date, target.time);
  const bookingClosesAtUtc = new Date(new Date(startsAtUtc).getTime() - resolveBookingCutoff(tour.bookingCutoffMinutes) * 60000).toISOString();
  if (Date.now() >= new Date(bookingClosesAtUtc).getTime()) throw new RevenuePricingWriteError(422, 'DEPARTURE_NOT_FUTURE', 'Bookings for this departure are closed. Choose another time or date.');
  const result = evaluateDepartureSellability({
    scheduled: isTourScheduled(tour, date),
    startsAtUtc,
    slots: explicit?.slots?.length ? explicit.slots : tour.availability?.slots || [],
    time: target.time,
    explicitStopSale: Boolean(explicit?.stopSale),
    fullStopSale,
    optionStopSale,
    booked,
  });
  return { ...result, bookingClosesAtUtc, optionId: aliases.find((alias) => alias !== target.optionKey) || aliases[0] };
}

/** Capacity recovery for an immutable, verified on-time paid departure.
 * Current publication, pricing, scheduling and stop-sale admission cannot revoke that purchase.
 * Missing authoritative capacity remains unproven and requires reconciliation.
 */
export async function readPaidDepartureCapacity(target: {
  tenantId: string; tourId: string; date: string; time: string;
}): Promise<{ capacity: number; booked: number }> {
  const tenantFilter = target.tenantId === 'default' ? DEFAULT_TENANT_FILTER : paidTenantFilter(target.tenantId);
  const date = normalizePriceDate(target.date);
  const end = new Date(date); end.setUTCHours(23, 59, 59, 999);
  const [tour, explicit, bookings] = await Promise.all([
    Tour.findOne({ _id: target.tourId, ...tenantFilter }).select('availability.slots').lean<SellableTour | null>(),
    Availability.findOne({ tour: target.tourId, date: { $gte: date, $lte: end }, ...tenantFilter }).select('slots').lean<ExplicitAvailability | null>(),
    Booking.find({ $and: [{ tour: target.tourId, time: target.time, status: { $in: ['Confirmed', 'Pending'] },
      $or: [{ date: { $gte: date, $lte: end } }, { dateString: target.date }] }, tenantFilter] })
      .select('adultGuests childGuests infantGuests guests').lean<BookingRow[]>(),
  ]);
  const slot = (explicit?.slots?.length ? explicit.slots : tour?.availability?.slots || []).find(row => row.time === target.time);
  if (!slot) throw new RevenuePricingWriteError(409, 'PAYMENT_TIME_UNPROVEN', 'The paid departure capacity needs reconciliation.');
  const capacity = Number(slot.capacity || 0) + Number(slot.extraCapacity || 0);
  const bookedFromRows = bookings.reduce((sum, row) => sum + (Number(row.adultGuests || 0) + Number(row.childGuests || 0)
    + Number(row.infantGuests || 0) || Number(row.guests || 0)), 0);
  const booked = Math.max(Number(slot.booked || 0), bookedFromRows);
  if (!Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(booked) || booked < 0) {
    throw new RevenuePricingWriteError(409, 'PAYMENT_TIME_UNPROVEN', 'The paid departure capacity needs reconciliation.');
  }
  return { capacity, booked };
}

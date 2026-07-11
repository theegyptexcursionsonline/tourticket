import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Availability from '@/lib/models/Availability';
import Booking from '@/lib/models/Booking';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { isTourScheduled } from '@/lib/revenue/departureSchedule';
import type { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

const key = (tourId: unknown, date: Date, time = '') => `${tourId}:${date.toISOString().slice(0, 10)}:${time}`;

type DepartureSlot = { time: string; capacity: number; booked?: number; extraCapacity?: number; blocked?: boolean };
type DepartureTour = {
  _id: Types.ObjectId;
  availability?: {
    type?: string; availableDays?: number[]; startDate?: Date; endDate?: Date;
    specificDates?: Date[]; blockedDates?: Date[]; slots?: DepartureSlot[];
  };
  updatedAt?: Date;
};
type ExplicitAvailability = { tour: Types.ObjectId; date: Date; slots: DepartureSlot[]; stopSale: boolean; updatedAt: Date };
type DepartureBooking = {
  tour: Types.ObjectId; date: Date; time?: string; adultGuests?: number; childGuests?: number;
  infantGuests?: number; guests?: number; updatedAt: Date;
};
type DepartureStopSale = { tourId: Types.ObjectId; optionIds: string[]; startDate: Date; endDate: Date };
type Departure = {
  tourId: string; date: string; time: string; capacity: number; booked: number;
  available: number; blocked: boolean; updatedAt?: Date;
};

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  await dbConnect();
  const from = request.nextUrl.searchParams.get('from') || new Date().toISOString().slice(0, 10);
  const to = request.nextUrl.searchParams.get('to') || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return revenueError(400, 'INVALID_RANGE', 'from and to must use YYYY-MM-DD.');
  const rangeStart = new Date(`${from}T00:00:00.000Z`);
  const rangeEnd = new Date(`${to}T23:59:59.999Z`);
  if ((rangeEnd.getTime() - rangeStart.getTime()) / 86400000 > 120) return revenueError(400, 'RANGE_TOO_LARGE', 'Departure reads are limited to 120 days.');

  const tours = await Tour.find({ isPublished: true, ...DEFAULT_TENANT_FILTER })
    .select('_id availability updatedAt')
    .lean<DepartureTour[]>();
  const tourIds = tours.map((tour) => tour._id);
  const [explicitRows, bookings, stopSales] = await Promise.all([
    Availability.find({ tour: { $in: tourIds }, date: { $gte: rangeStart, $lte: rangeEnd } }).lean<ExplicitAvailability[]>(),
    Booking.find({ tour: { $in: tourIds }, date: { $gte: rangeStart, $lte: rangeEnd }, status: { $in: ['Confirmed', 'Pending'] } }).select('tour date time adultGuests childGuests infantGuests guests updatedAt').lean<DepartureBooking[]>(),
    StopSale.find({ tourId: { $in: tourIds }, startDate: { $lte: rangeEnd }, endDate: { $gte: rangeStart } }).select('tourId optionIds startDate endDate').lean<DepartureStopSale[]>(),
  ]);
  const explicit = new Map(explicitRows.map((row) => [key(row.tour, new Date(row.date)), row]));
  const booked = new Map<string, number>();
  const bookingUpdated = new Map<string, Date>();
  for (const booking of bookings) {
    const bookingKey = key(booking.tour, new Date(booking.date), booking.time || '10:00');
    const guestCount = Number(booking.adultGuests || 0) + Number(booking.childGuests || 0) + Number(booking.infantGuests || 0);
    booked.set(bookingKey, (booked.get(bookingKey) || 0) + (guestCount || Number(booking.guests || 0)));
    bookingUpdated.set(bookingKey, booking.updatedAt);
  }
  const fullyStopped = new Set<string>();
  for (const stopSale of stopSales) {
    if (Array.isArray(stopSale.optionIds) && stopSale.optionIds.length) continue;
    for (let date = new Date(Math.max(rangeStart.getTime(), new Date(stopSale.startDate).getTime())); date <= rangeEnd && date <= new Date(stopSale.endDate); date = new Date(date.getTime() + 86400000)) fullyStopped.add(key(stopSale.tourId, date));
  }

  const departures: Departure[] = [];
  for (const tour of tours) {
    for (let date = new Date(rangeStart); date <= rangeEnd; date = new Date(date.getTime() + 86400000)) {
      if (!isTourScheduled(tour, date)) continue;
      const explicitRow = explicit.get(key(tour._id, date));
      const slots = explicitRow?.slots?.length ? explicitRow.slots : tour.availability?.slots || [];
      for (const slot of slots) {
        const bookingKey = key(tour._id, date, slot.time);
        const sold = Math.max(Number(slot.booked || 0), booked.get(bookingKey) || 0);
        const capacity = Number(slot.capacity || 0) + Number(slot.extraCapacity || 0);
        const blocked = Boolean(fullyStopped.has(key(tour._id, date)) || explicitRow?.stopSale || slot.blocked);
        departures.push({ tourId: String(tour._id), date: date.toISOString().slice(0, 10), time: slot.time, capacity, booked: sold, available: blocked ? 0 : Math.max(0, capacity - sold), blocked, updatedAt: bookingUpdated.get(bookingKey) || explicitRow?.updatedAt || tour.updatedAt });
      }
    }
  }
  return NextResponse.json({ tenantId: 'default', departures }, { headers: { 'Cache-Control': 'no-store' } });
}

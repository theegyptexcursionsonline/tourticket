import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Availability from '@/lib/models/Availability';
import Booking from '@/lib/models/Booking';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { isTourScheduled } from '@/lib/revenue/departureSchedule';

export const dynamic = 'force-dynamic';

const key = (tourId: unknown, date: Date, time = '') => `${tourId}:${date.toISOString().slice(0, 10)}:${time}`;
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

  const tours: any[] = await Tour.find({ isPublished: true, ...DEFAULT_TENANT_FILTER }).select('_id availability').lean();
  const tourIds = tours.map((tour) => tour._id);
  const [explicitRows, bookings, stopSales]: any[][] = await Promise.all([
    Availability.find({ tour: { $in: tourIds }, date: { $gte: rangeStart, $lte: rangeEnd } }).lean(),
    Booking.find({ tour: { $in: tourIds }, date: { $gte: rangeStart, $lte: rangeEnd }, status: { $in: ['Confirmed', 'Pending'] } }).select('tour date time adultGuests childGuests infantGuests guests updatedAt').lean(),
    StopSale.find({ tourId: { $in: tourIds }, startDate: { $lte: rangeEnd }, endDate: { $gte: rangeStart } }).select('tourId optionIds startDate endDate').lean(),
  ]);
  const explicit = new Map(explicitRows.map((row) => [key(row.tour, new Date(row.date)), row]));
  const booked = new Map<string, number>();
  const bookingUpdated = new Map<string, Date>();
  for (const booking of bookings) {
    const bookingKey = key(booking.tour, new Date(booking.date), booking.time || '10:00');
    booked.set(bookingKey, (booked.get(bookingKey) || 0) + Number(booking.adultGuests + booking.childGuests + booking.infantGuests || booking.guests || 0));
    bookingUpdated.set(bookingKey, booking.updatedAt);
  }
  const fullyStopped = new Set<string>();
  for (const stopSale of stopSales) {
    if (Array.isArray(stopSale.optionIds) && stopSale.optionIds.length) continue;
    for (let date = new Date(Math.max(rangeStart.getTime(), new Date(stopSale.startDate).getTime())); date <= rangeEnd && date <= new Date(stopSale.endDate); date = new Date(date.getTime() + 86400000)) fullyStopped.add(key(stopSale.tourId, date));
  }

  const departures: any[] = [];
  for (const tour of tours) {
    for (let date = new Date(rangeStart); date <= rangeEnd; date = new Date(date.getTime() + 86400000)) {
      if (!isTourScheduled(tour, date)) continue;
      const explicitRow: any = explicit.get(key(tour._id, date));
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

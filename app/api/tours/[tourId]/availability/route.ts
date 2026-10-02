import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Booking from '@/lib/models/Booking';
import Availability from '@/lib/models/Availability';
import CheckoutInventoryHold from '@/lib/models/CheckoutInventoryHold';
import StopSale from '@/lib/models/StopSale';
import { stopSaleAliasesForOption } from '@/lib/revenue/departureSellability';
import { isFutureDeparture, isTourScheduled } from '@/lib/revenue/departureSchedule';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export async function GET(request: Request, { params }: { params: Promise<{ tourId: string }> }) {
  try {
    const { tourId } = await params;
    const month = new URL(request.url).searchParams.get('month');
    if (!month || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ message: 'Select a valid month.' }, { status: 400 });
    await dbConnect();
    const tour = await Tour.findOne({ _id: tourId, isPublished: true, ...DEFAULT_TENANT_FILTER }).select('availability bookingOptions bookingCutoffMinutes tenantId');
    if (!tour?.availability) return NextResponse.json({ message: 'Tour or availability rules not found' }, { status: 404 });
    const [year, monthIndex] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthIndex - 1, 1));
    const end = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59, 999));
    // One bounded monthly read per source, never one query per calendar cell.
    const [bookings, overrides, stops, holds] = await Promise.all([
      Booking.find({ tour: tourId, status: { $in: ['Confirmed', 'Pending'] }, $and: [DEFAULT_TENANT_FILTER, { $or: [{ date: { $gte: start, $lte: end } }, { dateString: { $gte: start.toISOString().slice(0, 10), $lte: end.toISOString().slice(0, 10) } }] }] }).select('date dateString time guests adultGuests childGuests infantGuests'),
      Availability.find({ tour: tourId, date: { $gte: start, $lte: end }, ...DEFAULT_TENANT_FILTER }).select('date slots stopSale'),
      StopSale.find({ tourId, startDate: { $lte: end }, endDate: { $gte: start }, ...DEFAULT_TENANT_FILTER }).select('startDate endDate optionIds'),
      CheckoutInventoryHold.find({ tourId, tenantId: 'default', state: 'active', expiresAt: { $gt: new Date() }, dateString: { $gte: start.toISOString().slice(0, 10), $lte: end.toISOString().slice(0, 10) } }).select('dateString time guests'),
    ]);
    const availableSlotsByDate: Record<string, Array<{ time: string; remaining: number }>> = {};
    const fullyBookedDates: string[] = [];
    const now = new Date();
    for (let date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
      const key = date.toISOString().slice(0, 10);
      const override = overrides.find(row => new Date(row.date).toISOString().slice(0, 10) === key);
      const dayStops = stops.filter(row => new Date(row.startDate).toISOString().slice(0, 10) <= key && new Date(row.endDate).toISOString().slice(0, 10) >= key);
      const stopped = new Set(dayStops.flatMap(row => (row.optionIds || []).map(String)));
      const fullStop = dayStops.some(row => !row.optionIds?.length);
      const slots: Array<{ time: string; capacity?: number; extraCapacity?: number; booked?: number; blocked?: boolean }> = override?.slots?.length ? override.slots : tour.availability.slots || [];
      const options = tour.bookingOptions || [];
      const available = slots.filter(slot => {
        if (!isTourScheduled(tour, date) || override?.stopSale || fullStop || slot.blocked || !isFutureDeparture(key, slot.time, now, tour.bookingCutoffMinutes)) return false;
        if (!options.length) return !stopped.has('standard') && !stopped.has('standard-default');
        return options.some((option, index) => {
          const legacyId = (option as unknown as { id?: string }).id;
          const aliases = stopSaleAliasesForOption(options, option.pricingKey || legacyId || String(option._id || `option-${index}`));
          return !aliases.some(alias => stopped.has(String(alias))) && (!option.timeSlots?.length || option.timeSlots.some(item => item.time === slot.time));
        });
      }).map(slot => {
        const sold = bookings.filter(row => (row.dateString || new Date(row.date).toISOString().slice(0, 10)) === key && row.time === slot.time).reduce((sum, row) => sum + (Number(row.adultGuests || 0) + Number(row.childGuests || 0) + Number(row.infantGuests || 0) || Number(row.guests || 0)), 0);
        const held = holds.filter(row => row.dateString === key && row.time === slot.time).reduce((sum, row) => sum + Number(row.guests || 0), 0);
        return { time: slot.time, remaining: Math.max(0, Number(slot.capacity || 0) + Number(slot.extraCapacity || 0) - Math.max(Number(slot.booked || 0), sold) - held) };
      }).filter(slot => slot.remaining > 0);
      if (available.length) availableSlotsByDate[key] = available;
      else fullyBookedDates.push(key);
    }
    return NextResponse.json({ availableSlotsByDate, fullyBookedDates }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'Availability could not be checked. Please try again.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

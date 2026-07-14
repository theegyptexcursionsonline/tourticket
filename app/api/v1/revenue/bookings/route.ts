import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking, { type IBooking } from '@/lib/models/Booking';
import type { FilterQuery } from 'mongoose';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateRevenueRequest } from '@/lib/revenue/machineResponse';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  await dbConnect();
  const updatedSince = request.nextUrl.searchParams.get('updatedSince');
  const afterId = request.nextUrl.searchParams.get('afterId');
  const requestedTourId = request.nextUrl.searchParams.get('tourId');
  const departureFrom = request.nextUrl.searchParams.get('departureFrom');
  const departureTo = request.nextUrl.searchParams.get('departureTo');
  const limit = Math.min(1000, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 500)));
  const tourIds = await Tour.find({ ...DEFAULT_TENANT_FILTER }).distinct('_id');
  if (requestedTourId && (!mongoose.Types.ObjectId.isValid(requestedTourId) || !tourIds.some((id) => String(id) === requestedTourId))) {
    return NextResponse.json({ error: { code: 'TOUR_NOT_FOUND', message: 'Tour is outside the RevenuePilot catalogue.' } }, { status: 404 });
  }
  if ((departureFrom && !/^\d{4}-\d{2}-\d{2}$/.test(departureFrom)) || (departureTo && !/^\d{4}-\d{2}-\d{2}$/.test(departureTo))) {
    return NextResponse.json({ error: { code: 'INVALID_DATE_RANGE', message: 'Departure dates must use YYYY-MM-DD.' } }, { status: 422 });
  }
  const query: FilterQuery<IBooking> = { tour: requestedTourId || { $in: tourIds } };
  if (departureFrom || departureTo) query.date = { ...(departureFrom ? { $gte: departureFrom } : {}), ...(departureTo ? { $lte: departureTo } : {}) };
  if (updatedSince) {
    const boundary = new Date(updatedSince);
    query.$or = afterId
      ? [{ updatedAt: { $gt: boundary } }, { updatedAt: boundary, _id: { $gt: afterId } }]
      : [{ updatedAt: { $gt: boundary } }];
  }
  const rows = await Booking.find(query).select('_id tour date time adultGuests childGuests infantGuests totalPrice currency status selectedBookingOption createdAt updatedAt').sort({ updatedAt: 1, _id: 1 }).limit(limit).lean();
  return NextResponse.json({ tenantId: 'default', bookings: rows.map((row) => ({
    id: String(row._id), tourId: String(row.tour), date: new Date(row.date).toISOString().slice(0, 10), time: row.time,
    guests: { adult: row.adultGuests || 0, child: row.childGuests || 0, infant: row.infantGuests || 0 },
    totalPrice: row.totalPrice, currency: row.currency, status: row.status,
    optionKey: row.selectedBookingOption?.pricingKey || null, bookedAt: row.createdAt, updatedAt: row.updatedAt,
  })), nextCursor: rows.length === limit ? { updatedSince: rows.at(-1)?.updatedAt, afterId: String(rows.at(-1)?._id) } : null }, { headers: { 'Cache-Control': 'no-store' } });
}

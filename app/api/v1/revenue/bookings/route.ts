import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateRevenueRequest } from '@/lib/revenue/machineResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  await dbConnect();
  const updatedSince = request.nextUrl.searchParams.get('updatedSince');
  const afterId = request.nextUrl.searchParams.get('afterId');
  const limit = Math.min(1000, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 500)));
  const tourIds = await Tour.find({ ...DEFAULT_TENANT_FILTER }).distinct('_id');
  const query: any = { tour: { $in: tourIds } };
  if (updatedSince) {
    const boundary = new Date(updatedSince);
    query.$or = afterId
      ? [{ updatedAt: { $gt: boundary } }, { updatedAt: boundary, _id: { $gt: afterId } }]
      : [{ updatedAt: { $gt: boundary } }];
  }
  const rows: any[] = await Booking.find(query).select('_id tour date time adultGuests childGuests infantGuests totalPrice currency status selectedBookingOption updatedAt').sort({ updatedAt: 1, _id: 1 }).limit(limit).lean();
  return NextResponse.json({ tenantId: 'default', bookings: rows.map((row) => ({
    id: String(row._id), tourId: String(row.tour), date: row.date, time: row.time,
    guests: { adult: row.adultGuests || 0, child: row.childGuests || 0, infant: row.infantGuests || 0 },
    totalPrice: row.totalPrice, currency: row.currency, status: row.status,
    optionKey: row.selectedBookingOption?.pricingKey || null, updatedAt: row.updatedAt,
  })), nextCursor: rows.length === limit ? { updatedSince: rows.at(-1)?.updatedAt, afterId: String(rows.at(-1)?._id) } : null }, { headers: { 'Cache-Control': 'no-store' } });
}

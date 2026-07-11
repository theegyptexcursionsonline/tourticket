import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Availability from '@/lib/models/Availability';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  await dbConnect();
  const from = request.nextUrl.searchParams.get('from') || new Date().toISOString().slice(0, 10);
  const to = request.nextUrl.searchParams.get('to') || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return revenueError(400, 'INVALID_RANGE', 'from and to must use YYYY-MM-DD.');
  const tourIds = await Tour.find({ isPublished: true, ...DEFAULT_TENANT_FILTER }).distinct('_id');
  const rows: any[] = await Availability.find({ tour: { $in: tourIds }, date: { $gte: new Date(`${from}T00:00:00.000Z`), $lte: new Date(`${to}T23:59:59.999Z`) } }).sort({ date: 1 }).lean();
  return NextResponse.json({ tenantId: 'default', departures: rows.flatMap((row) => row.slots.map((slot: any) => ({
    tourId: String(row.tour), date: row.date.toISOString().slice(0, 10), time: slot.time,
    capacity: slot.capacity + (slot.extraCapacity || 0), booked: slot.booked, available: Math.max(0, slot.capacity + (slot.extraCapacity || 0) - slot.booked),
    blocked: Boolean(row.stopSale || slot.blocked), updatedAt: row.updatedAt,
  }))) }, { headers: { 'Cache-Control': 'no-store' } });
}

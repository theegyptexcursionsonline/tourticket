import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import {
  FEED_SIGNATURE_HEADER,
  FeedRequestError,
  cursorAfter,
  feedQuery,
  inWindow,
  parseFeedRequest,
  toFeedItem,
  verifyFeedSignature,
  type FeedBookingRow,
} from '@/lib/integrations/bookingFeed';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROW_FIELDS = [
  'bookingReference', 'date', 'dateString', 'time', 'guests', 'adultGuests', 'childGuests', 'infantGuests', 'totalPrice',
  'currency', 'status', 'paymentStatus', 'paymentMethod', 'amountPaid', 'refundAmount', 'customerPhone', 'pickupLocation',
  'hotelPickupDetails', 'hotelPickupLocation', 'selectedBookingOption', 'duplicateOf', 'paymentReconciliationState',
  'updatedAt', 'user', 'tour',
].join(' ');

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/internal/booking-feed — the Foxes booking API's signed read of EEO bookings
 * (`lib/integrations/bookingFeed.ts`). One consumer, one secret; nothing about a guest is logged.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.BOOKING_FEED_SECRET;
  if (!secret) return NextResponse.json({ success: false, error: 'Not configured' }, { status: 503, headers: noStore });
  const params = request.nextUrl.searchParams;
  if (!verifyFeedSignature(secret, request.headers.get(FEED_SIGNATURE_HEADER), 'GET', request.nextUrl.pathname, params, Date.now() / 1000)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: noStore });
  }

  let feed;
  try {
    feed = parseFeedRequest(params);
  } catch (error) {
    if (error instanceof FeedRequestError) {
      return NextResponse.json({ success: false, error: 'Invalid request', field: error.field }, { status: 400, headers: noStore });
    }
    throw error;
  }

  try {
    await dbConnect();
    const { filter, sort } = feedQuery(feed, new Date());
    const rows = await Booking.find(filter).select(ROW_FIELDS).sort(sort).limit(feed.limit + 1).lean<FeedBookingRow[]>();
    const page = rows.slice(0, feed.limit);

    // Tours and guests are read separately so a tour of another site is never joined in (its id is
    // still sent, so the booking API can ask staff to match it).
    const tourIds = [...new Set(page.map((row) => String(row.tour || '')).filter(Boolean))];
    const userIds = [...new Set(page.map((row) => String(row.user || '')).filter(Boolean))];
    const [tours, users] = await Promise.all([
      tourIds.length ? Tour.find({ _id: { $in: tourIds }, $and: [DEFAULT_TENANT_FILTER] }).select('title').lean<Array<{ _id: unknown; title?: string }>>() : [],
      userIds.length ? User.find({ _id: { $in: userIds } }).select('firstName lastName email phone').lean<Array<{ _id: unknown; firstName?: string; lastName?: string; email?: string; phone?: string }>>() : [],
    ]);
    const tourById = new Map(tours.map((tour) => [String(tour._id), tour]));
    const userById = new Map(users.map((user) => [String(user._id), user]));

    const items = page
      .map((row) => toFeedItem({
        ...row,
        tourId: row.tour,
        tour: tourById.get(String(row.tour || '')) ?? null,
        user: userById.get(String(row.user || '')) ?? null,
      }))
      .filter((item): item is Record<string, unknown> => item !== null && inWindow(item, feed));
    const last = page[page.length - 1];
    const incoming = params.get('cursor');
    return NextResponse.json({
      success: true,
      data: {
        items,
        hasMore: rows.length > feed.limit,
        // The position after the last row read (also when every row on it was left out), so paging
        // always moves forward; an empty page keeps the position it was asked from.
        nextCursor: last ? cursorAfter(feed, last) : incoming,
      },
    }, { headers: noStore });
  } catch (error) {
    console.error('Booking feed read failed.', { code: error instanceof Error ? error.name : 'UNKNOWN_ERROR' });
    return NextResponse.json({ success: false, error: 'Feed unavailable' }, { status: 503, headers: noStore });
  }
}

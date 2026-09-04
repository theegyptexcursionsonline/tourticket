// app/api/bookings/route.ts
import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Destination from '@/lib/models/Destination';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateCustomerSession } from '@/lib/auth/customerSession';
import type { PopulatedBookingTour, PopulatedBookingUser } from '@/lib/types/populatedBooking';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;
    const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
    const status = searchParams.get('status');

    const query: Record<string, unknown> = { ...DEFAULT_TENANT_FILTER };

    if (isAdmin) {
      const adminAuth = await requireAdminAuth(request, {
        permissions: ['manageBookings'],
      });
      if (adminAuth instanceof NextResponse) {
        return adminAuth;
      }

      if (status) {
        query.status = status;
      }
    } else {
      const authentication = await authenticateCustomerSession(request);
      if (!authentication.success) return NextResponse.json({ success: false, error: authentication.error }, { status: authentication.statusCode });
      query.user = authentication.user._id;
    }

    await dbConnect();

    const skip = (page - 1) * limit;

    const [bookings, totalCount] = await Promise.all([
      Booking.find(query)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image images duration rating discountPrice destination',
        populate: {
          path: 'destination',
          model: Destination,
          select: 'name slug',
        },
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email name',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
      Booking.countDocuments(query),
    ]);

    // Filter out bookings where tour is null (deleted tours)
    const validBookings = bookings.filter(booking => booking.tour !== null);

    const totalPages = Math.ceil(totalCount / limit);

    const transformedBookings = validBookings.map((booking) => {
      const tour = booking.tour as unknown as PopulatedBookingTour | null;
      const user = booking.user as unknown as PopulatedBookingUser | null;
      return {
        ...booking,
        id: booking._id,
        bookingDate: booking.date,
        bookingTime: booking.time,
        participants: booking.guests,
        tour: tour ? { ...tour, id: tour._id } : null,
        user: user ? {
          ...user,
          id: user._id,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error: unknown) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bookings',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}

async function POSTHandler(_request: NextRequest) {
  // Booking creation must go through /api/checkout, where catalogue prices,
  // discounts, and payment status are verified server-side. This legacy route
  // previously trusted totalPrice and created Confirmed bookings directly.
  return NextResponse.json(
    { success: false, error: 'Direct booking creation is disabled. Use checkout.' },
    { status: 405, headers: { Allow: 'GET' } },
  );
}

export const POST = withAdminAudit(POSTHandler);

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import mongoose from 'mongoose';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateCustomerBearer } from '@/lib/auth/customerAuth';

export async function GET(request: NextRequest) {
  try {
    // 1. Connect to database
    await dbConnect();

    // 2. Get and validate the JWT from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated: No token provided' }, { status: 401 });
    }

    const authentication = await authenticateCustomerBearer(request);
    if (!authentication.success) {
      return NextResponse.json({ error: authentication.error }, { status: authentication.status });
    }
    const user = authentication.user;
    const userId = (user._id as any).toString();

    // 4. Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    // 5. Find the user in database (if not already found via Firebase)
    // authenticateCustomerBearer already revalidated the active database user.

    // 7. Fetch bookings count first
    const bookingQuery = { user: userId, ...DEFAULT_TENANT_FILTER };
    const bookingCount = await Booking.countDocuments(bookingQuery);

    // 8. Fetch bookings with detailed logging
    const bookings = await Booking.find(bookingQuery)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating discountPrice',
        populate: {
          path: 'destination',
          model: Destination,
          select: 'name slug'
        }
      })
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    // 9. Transform bookings for frontend consistency
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      id: booking._id?.toString() || '',
      bookingDate: booking.date,
      bookingTime: booking.time,
      participants: booking.guests,
      tour: booking.tour ? {
        ...(booking.tour as any),
        id: (booking.tour as any)._id?.toString() || '',
      } : null,
    }));

    // 10. Return the data
    return NextResponse.json({ 
      success: true, 
      data: transformedBookings,
      meta: {
        total: bookingCount,
      }
    });

  } catch (error) {
    console.error('Failed to fetch user bookings');
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch bookings', 
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: process.env.NODE_ENV === 'development' ? {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      } : undefined
    }, { status: 500 });
  }
}

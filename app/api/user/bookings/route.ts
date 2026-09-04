import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import mongoose from 'mongoose';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateCustomerSession } from '@/lib/auth/customerSession';
import type { PopulatedBookingTour } from '@/lib/types/populatedBooking';

export async function GET(request: NextRequest) {
  try {
    // 1. Connect to database
    await dbConnect();

    const authentication = await authenticateCustomerSession(request);
    if (!authentication.success) {
      return NextResponse.json({ error: authentication.error }, { status: authentication.statusCode });
    }
    const user = authentication.user;
    const userId = String(user._id);

    // 4. Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    // authenticateCustomerSession already revalidated the active customer.

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
    const transformedBookings = bookings.map(booking => {
      const tour = booking.tour as unknown as PopulatedBookingTour | null;
      return {
        ...booking,
        id: booking._id?.toString() || '',
        bookingDate: booking.date,
        bookingTime: booking.time,
        participants: booking.guests,
        tour: tour ? {
          ...tour,
          id: tour._id?.toString() || '',
        } : null,
      };
    });

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

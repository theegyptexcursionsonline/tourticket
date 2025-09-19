// app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');

    let query: any = {};
    let requireAuth = false;

    // Handle admin requests
    if (isAdmin) {
      // Admin can see all bookings
      if (status) {
        query.status = status;
      }
    } 
    // Handle user-specific requests
    else if (userId) {
      query.user = userId;
      requireAuth = true;
    }
    // Handle authenticated user requests via JWT
    else {
      requireAuth = true;
      
      // Extract token from Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: 401 }
        );
      }

      const token = authHeader.split(' ')[1];
      const payload = await verifyToken(token);

      if (!payload || !payload.sub) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      query.user = payload.sub;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch bookings with population
    const bookings = await Booking.find(query)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating discountPrice destination',
        populate: {
          path: 'destination',
          model: 'Destination',
          select: 'name slug',
        },
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Booking.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Transform bookings for client compatibility
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      // Ensure consistent field naming
      id: booking._id,
      bookingDate: booking.date, // Map 'date' to 'bookingDate' for client
      bookingTime: booking.time,  // Map 'time' to 'bookingTime' for client
      participants: booking.guests, // Map 'guests' to 'participants' for client
      tour: booking.tour ? {
        ...booking.tour,
        id: booking.tour._id,
      } : null,
      user: booking.user ? {
        ...booking.user,
        id: booking.user._id,
        name: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim(),
      } : null,
    }));

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

  } catch (error: any) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch bookings',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    // Authentication check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);

    if (!payload || !payload.sub) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = payload.sub as string;
    
    // Parse request body
    const body = await request.json();
    const {
      tourId,
      date,
      time,
      adults = 1,
      children = 0,
      infants = 0,
      totalPrice,
      specialRequests,
      selectedAddOns = {},
    } = body;

    // Validate required fields
    if (!tourId || !date || !time || !totalPrice) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // Verify tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json(
        { success: false, message: 'Tour not found' },
        { status: 404 }
      );
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate total guests
    const totalGuests = adults + children + infants;

    // Create booking
    const booking = await Booking.create({
      tour: tourId,
      user: userId,
      date: new Date(date),
      time,
      guests: totalGuests,
      totalPrice: parseFloat(totalPrice),
      status: 'Confirmed',
      // Additional fields
      adultGuests: adults,
      childGuests: children,
infantGuests: infants,
      specialRequests,
      selectedAddOns,
    });

    // Populate the created booking for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating discountPrice',
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email',
      });

    // Transform booking for client compatibility
    const transformedBooking = {
      ...populatedBooking?.toObject(),
      id: populatedBooking?._id,
      bookingDate: populatedBooking?.date,
      bookingTime: populatedBooking?.time,
      participants: populatedBooking?.guests,
    };

    return NextResponse.json({
      success: true,
      data: transformedBooking,
      message: 'Booking created successfully!',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Failed to create booking:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Booking validation failed',
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create booking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
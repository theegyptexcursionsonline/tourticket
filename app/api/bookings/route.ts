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
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');

    let query: any = {};
    let requireAuth = false;

    if (isAdmin) {
      if (status) {
        query.status = status;
      }
    } else if (userId) {
      query.user = userId;
      requireAuth = true;
    } else {
      requireAuth = true;
      
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

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image images duration rating discountPrice destination',
        populate: {
          path: 'destination',
          model: 'Destination',
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
      .lean();

    // Filter out bookings where tour is null (deleted tours)
    const validBookings = bookings.filter(booking => booking.tour !== null);

    const totalCount = validBookings.length;
    const totalPages = Math.ceil(totalCount / limit);

    const transformedBookings = validBookings.map(booking => ({
      ...booking,
      id: booking._id,
      bookingDate: booking.date,
      bookingTime: booking.time,
      participants: booking.guests,
      tour: booking.tour ? {
        ...booking.tour,
        id: booking.tour._id,
      } : null,
      user: booking.user ? {
        ...booking.user,
        id: booking.user._id,
        name: booking.user.name || `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim(),
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

    if (!tourId || !date || !time || !totalPrice) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking information' },
        { status: 400 }
      );
    }

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json(
        { success: false, message: 'Tour not found' },
        { status: 404 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const totalGuests = adults + children + infants;

    const booking = await Booking.create({
      tour: tourId,
      user: userId,
      date: new Date(date),
      time,
      guests: totalGuests,
      totalPrice: parseFloat(totalPrice),
      status: 'Confirmed',
      adultGuests: adults,
      childGuests: children,
      infantGuests: infants,
      specialRequests,
      selectedAddOns,
    });

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
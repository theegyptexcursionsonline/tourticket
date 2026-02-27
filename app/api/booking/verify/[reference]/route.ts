// app/api/booking/verify/[reference]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    await dbConnect();
    const { reference } = await params;

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Booking reference is required' },
        { status: 400 }
      );
    }

    // Find booking by reference
    const booking = await Booking.findOne({ bookingReference: reference })
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating',
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email',
      })
      .lean();

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Transform booking data for frontend
    const tour = booking.tour as any;
    const user = booking.user as any;
    const transformedBooking = {
      bookingReference: booking.bookingReference,
      tour: {
        title: tour.title,
        image: tour.image,
        duration: tour.duration,
      },
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      date: booking.date,
      time: booking.time,
      guests: booking.guests,
      adultGuests: booking.adultGuests,
      childGuests: booking.childGuests,
      infantGuests: booking.infantGuests,
      totalPrice: booking.totalPrice,
      status: booking.status,
      selectedBookingOption: booking.selectedBookingOption,
      specialRequests: booking.specialRequests,
      emergencyContact: booking.emergencyContact,
      createdAt: booking.createdAt,
    };

    return NextResponse.json(
      {
        success: true,
        booking: transformedBooking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying booking:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to verify booking',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}


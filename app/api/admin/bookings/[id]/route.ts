// app/api/admin/bookings/[id]/route.ts (Fixed - await params)
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';

// GET - Fetch a single booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params; // FIXED: Await params

    const booking = await Booking.findById(id)
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
      .lean();

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Transform the booking data
    const transformedBooking = {
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
    };

    return NextResponse.json(transformedBooking);

  } catch (error: any) {
    console.error('Failed to fetch booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch booking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// PATCH - Update booking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params; // FIXED: Await params
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['Confirmed', 'Pending', 'Cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating discountPrice',
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email name',
      })
      .lean();

    if (!updatedBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Transform the booking data
    const transformedBooking = {
      ...updatedBooking,
      id: updatedBooking._id,
      bookingDate: updatedBooking.date,
      bookingTime: updatedBooking.time,
      participants: updatedBooking.guests,
      tour: updatedBooking.tour ? {
        ...updatedBooking.tour,
        id: updatedBooking.tour._id,
      } : null,
      user: updatedBooking.user ? {
        ...updatedBooking.user,
        id: updatedBooking.user._id,
        name: updatedBooking.user.name || `${updatedBooking.user.firstName || ''} ${updatedBooking.user.lastName || ''}`.trim(),
      } : null,
    };

    return NextResponse.json(transformedBooking);

  } catch (error: any) {
    console.error('Failed to update booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update booking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params; // FIXED: Await params

    const deletedBooking = await Booking.findByIdAndDelete(id);

    if (!deletedBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
      data: { id: deletedBooking._id },
    });

  } catch (error: any) {
    console.error('Failed to delete booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete booking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
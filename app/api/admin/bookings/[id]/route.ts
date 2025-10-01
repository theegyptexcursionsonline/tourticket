import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  
  try {
    const booking = await Booking.findById(params.id)
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
        select: 'firstName lastName name email',
      })
      .lean();

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Transform for client compatibility
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  
  try {
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['Confirmed', 'Pending', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      params.id,
      { status },
      { new: true, runValidators: true }
    )
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
      select: 'firstName lastName name email',
    });

    if (!updatedBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Send email notification to customer about status change
    try {
      const customerName = updatedBooking.user.name || 
        `${updatedBooking.user.firstName || ''} ${updatedBooking.user.lastName || ''}`.trim() ||
        'Valued Customer';

      await EmailService.sendBookingStatusUpdate({
        customerName,
        customerEmail: updatedBooking.user.email,
        bookingId: updatedBooking._id.toString(),
        tourTitle: updatedBooking.tour.title,
        bookingDate: updatedBooking.date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        bookingTime: updatedBooking.time,
        newStatus: status,
        statusMessage: getStatusMessage(status),
      });
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
      // Don't fail the request if email fails
    }

    // Transform for client compatibility
    const transformedBooking = {
      ...updatedBooking.toObject(),
      id: updatedBooking._id,
      bookingDate: updatedBooking.date,
      bookingTime: updatedBooking.time,
      participants: updatedBooking.guests,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  
  try {
    const deletedBooking = await Booking.findByIdAndDelete(params.id);

    if (!deletedBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Booking deleted successfully' 
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

// Helper function to get status-specific messages
function getStatusMessage(status: string): string {
  switch (status) {
    case 'Confirmed':
      return 'Your booking has been confirmed! We look forward to welcoming you.';
    case 'Pending':
      return 'Your booking is currently pending. We will update you shortly.';
    case 'Cancelled':
      return 'Your booking has been cancelled. If you have any questions, please contact our support team.';
    default:
      return 'Your booking status has been updated.';
  }
}
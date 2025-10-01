// app/api/admin/bookings/[id]/route.ts (Fixed - with correct EmailService)
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';

// GET - Fetch a single booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;

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

// PATCH - Update booking status (with email notifications)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['Confirmed', 'Pending', 'Cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Get the current booking with populated fields before updating
    const currentBooking = await Booking.findById(id)
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
        select: 'firstName lastName email name',
      });

    if (!currentBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Store old status for comparison
    const oldStatus = currentBooking.status;

    // Update booking
    currentBooking.status = status;
    await currentBooking.save();

    // Reload with lean for response
    const updatedBooking = await Booking.findById(id)
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
        select: 'firstName lastName email name',
      })
      .lean();

    if (!updatedBooking) {
      return NextResponse.json(
        { success: false, message: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Send email notifications based on status change
    if (oldStatus !== status && updatedBooking.user && updatedBooking.tour) {
      try {
        const customerName = updatedBooking.user.name || 
          `${updatedBooking.user.firstName || ''} ${updatedBooking.user.lastName || ''}`.trim() || 
          'Valued Customer';
        const customerEmail = updatedBooking.user.email;
        const tourTitle = updatedBooking.tour.title || 'Tour';
        const bookingDate = new Date(updatedBooking.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const bookingTime = updatedBooking.time;
        const bookingId = updatedBooking._id.toString();

        if (status === 'Cancelled') {
          // Calculate potential refund for cancellation email
          const bookingDateObj = new Date(updatedBooking.date);
          const now = new Date();
          const daysUntilTour = Math.ceil((bookingDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let refundPercentage = 0;
          if (daysUntilTour >= 7) refundPercentage = 100;
          else if (daysUntilTour >= 3) refundPercentage = 50;
          else refundPercentage = 0;

          const refundAmount = (updatedBooking.totalPrice * refundPercentage) / 100;

          // Send cancellation confirmation email
          await EmailService.sendCancellationConfirmation({
            customerName,
            customerEmail,
            tourTitle,
            bookingDate,
            bookingId,
            refundAmount: refundAmount > 0 ? `$${refundAmount.toFixed(2)}` : undefined,
            refundProcessingDays: refundAmount > 0 ? 5 : undefined,
            cancellationReason: 'Status changed to cancelled by administrator'
          });

          console.log(`✅ Cancellation email sent to ${customerEmail}`);
        } else {
          // Send status update email for other status changes
          const statusMessages = {
            'Confirmed': '✓ Your booking has been confirmed! Get ready for an amazing experience.',
            'Pending': '⏳ Your booking is currently pending. We\'ll update you soon.',
          };

          await EmailService.sendBookingStatusUpdate({
            customerName,
            customerEmail,
            tourTitle,
            bookingDate,
            bookingTime,
            bookingId,
            newStatus: status,
            statusMessage: statusMessages[status as keyof typeof statusMessages] || 'Your booking status has been updated.',
            additionalInfo: status === 'Confirmed' 
              ? 'Please make sure to arrive at the meeting point 15 minutes before the scheduled time.'
              : undefined
          });

          console.log(`✅ Status update email sent to ${customerEmail} - Status: ${status}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError);
        // Don't fail the request if email fails, just log it
        // This allows the status update to succeed even if email fails
      }
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
    const { id } = await params;

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
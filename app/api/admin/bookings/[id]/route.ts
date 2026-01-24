// app/api/admin/bookings/[id]/route.ts (Enhanced with booking editing and notifications)
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking, { BOOKING_STATUSES, IBookingEditHistoryEntry } from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

// Helper to format dates consistently and avoid timezone issues
function formatBookingDate(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  const dateStr = dateString instanceof Date ? dateString.toISOString() : String(dateString);

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper to get admin info from token
async function getAdminInfo(): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return null;
    
    const payload = await verifyToken(token);
    if (!payload) return null;
    
    return {
      id: payload.sub as string,
      name: (payload.name as string) || (payload.email as string) || 'Admin',
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

// Status display messages for notifications
const STATUS_MESSAGES: Record<string, string> = {
  'Confirmed': '✓ Your booking has been confirmed! Get ready for an amazing experience.',
  'Pending': '⏳ Your booking is currently pending. We\'ll update you soon.',
  'Cancelled': '❌ Your booking has been cancelled.',
  'Refunded': '💰 Your booking has been refunded. The full amount will be credited to your account.',
  'Partial_Refund': '💰 A partial refund has been processed for your booking.',
};

// GET - Fetch a single booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

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
    const tour = booking.tour as any;
    const user = booking.user as any;
    const transformedBooking = {
      ...booking,
      id: booking._id,
      bookingDate: booking.date,
      bookingTime: booking.time,
      participants: booking.guests,
      tour: tour ? {
        ...tour,
        id: tour._id,
      } : null,
      user: user ? {
        ...user,
        id: user._id,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
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

// PATCH - Update booking (status, date, time, booking option) with email notifications
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      status, 
      date, 
      dateString, 
      time, 
      selectedBookingOption,
      refundAmount,
      refundReason 
    } = body;

    // Get admin info for edit history
    const adminInfo = await getAdminInfo();

    // Validate status if provided
    if (status && !BOOKING_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status value. Must be one of: ${BOOKING_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get the current booking with populated fields before updating
    const currentBooking = await Booking.findById(id)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image images duration rating discountPrice destination bookingOptions',
        populate: {
          path: 'destination',
          model: 'Destination',
          select: 'name slug',
        },
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email name phone',
      });

    if (!currentBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Track changes for edit history and notifications
    const changes: IBookingEditHistoryEntry[] = [];
    const changesForNotification: { field: string; oldValue: string; newValue: string }[] = [];

    // Store old values for comparison
    const oldStatus = currentBooking.status;
    const oldDate = currentBooking.dateString || currentBooking.date?.toISOString().split('T')[0];
    const oldTime = currentBooking.time;
    const oldBookingOption = currentBooking.selectedBookingOption?.title;

    // Update status if provided
    if (status && status !== oldStatus) {
      changes.push({
        editedAt: new Date(),
        editedBy: adminInfo?.id || 'system',
        editedByName: adminInfo?.name || 'System',
        field: 'status',
        previousValue: oldStatus,
        newValue: status,
        changeType: (status === 'Refunded' || status === 'Partial_Refund') ? 'refund' : 'status_change',
      });
      changesForNotification.push({
        field: 'Status',
        oldValue: oldStatus,
        newValue: status,
      });
      currentBooking.status = status;

      // Handle refund tracking
      if (status === 'Refunded' || status === 'Partial_Refund') {
        if (refundAmount !== undefined) {
          currentBooking.refundAmount = refundAmount;
        }
        if (refundReason) {
          currentBooking.refundReason = refundReason;
        }
        currentBooking.refundDate = new Date();
      }
    }

    // Update date if provided
    if (dateString && dateString !== oldDate) {
      const newDateObj = new Date(dateString + 'T12:00:00Z');
      changes.push({
        editedAt: new Date(),
        editedBy: adminInfo?.id || 'system',
        editedByName: adminInfo?.name || 'System',
        field: 'date',
        previousValue: formatBookingDate(oldDate),
        newValue: formatBookingDate(dateString),
        changeType: 'detail_update',
      });
      changesForNotification.push({
        field: 'Tour Date',
        oldValue: formatBookingDate(oldDate),
        newValue: formatBookingDate(dateString),
      });
      currentBooking.date = newDateObj;
      currentBooking.dateString = dateString;
    } else if (date && !dateString) {
      // Fallback if only date is provided
      const newDateStr = new Date(date).toISOString().split('T')[0];
      if (newDateStr !== oldDate) {
        const newDateObj = new Date(newDateStr + 'T12:00:00Z');
        changes.push({
          editedAt: new Date(),
          editedBy: adminInfo?.id || 'system',
          editedByName: adminInfo?.name || 'System',
          field: 'date',
          previousValue: formatBookingDate(oldDate),
          newValue: formatBookingDate(newDateStr),
          changeType: 'detail_update',
        });
        changesForNotification.push({
          field: 'Tour Date',
          oldValue: formatBookingDate(oldDate),
          newValue: formatBookingDate(newDateStr),
        });
        currentBooking.date = newDateObj;
        currentBooking.dateString = newDateStr;
      }
    }

    // Update time if provided
    if (time && time !== oldTime) {
      changes.push({
        editedAt: new Date(),
        editedBy: adminInfo?.id || 'system',
        editedByName: adminInfo?.name || 'System',
        field: 'time',
        previousValue: oldTime,
        newValue: time,
        changeType: 'detail_update',
      });
      changesForNotification.push({
        field: 'Tour Time',
        oldValue: oldTime,
        newValue: time,
      });
      currentBooking.time = time;
    }

    // Update booking option if provided
    if (selectedBookingOption && selectedBookingOption.title !== oldBookingOption) {
      changes.push({
        editedAt: new Date(),
        editedBy: adminInfo?.id || 'system',
        editedByName: adminInfo?.name || 'System',
        field: 'bookingOption',
        previousValue: oldBookingOption || 'None',
        newValue: selectedBookingOption.title,
        changeType: 'detail_update',
      });
      changesForNotification.push({
        field: 'Tour Option',
        oldValue: oldBookingOption || 'None',
        newValue: selectedBookingOption.title,
      });
      currentBooking.selectedBookingOption = selectedBookingOption;
    }

    // Add changes to edit history
    if (changes.length > 0) {
      if (!currentBooking.editHistory) {
        currentBooking.editHistory = [];
      }
      currentBooking.editHistory.push(...changes);
    }

    // Save the updated booking
    await currentBooking.save();

    // Reload with lean for response
    const updatedBooking = await Booking.findById(id)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image images duration rating discountPrice destination bookingOptions',
        populate: {
          path: 'destination',
          model: 'Destination',
          select: 'name slug',
        },
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email name phone',
      })
      .lean();

    if (!updatedBooking) {
      return NextResponse.json(
        { success: false, message: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Send email notifications if there are changes
    const updatedUser = updatedBooking.user as any;
    const updatedTour = updatedBooking.tour as any;
    
    if (changesForNotification.length > 0 && updatedUser && updatedTour) {
      const customerName = updatedUser.name || 
        `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || 
        'Valued Customer';
      const customerEmail = updatedUser.email;
      const tourTitle = updatedTour.title || 'Tour';
      const bookingDate = formatBookingDate(updatedBooking.dateString || updatedBooking.date);
      const bookingTime = updatedBooking.time;
      const bookingId = updatedBooking.bookingReference || updatedBooking._id.toString();

      // Build changes summary for email
      const changesSummary = changesForNotification
        .map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`)
        .join('\n');

      // Send notification to customer
      try {
        if (status === 'Cancelled') {
          // Calculate potential refund for cancellation email
          const bookingDateObj = new Date(updatedBooking.date);
          const now = new Date();
          const daysUntilTour = Math.ceil((bookingDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let refundPercentage = 0;
          if (daysUntilTour >= 7) refundPercentage = 100;
          else if (daysUntilTour >= 3) refundPercentage = 50;
          else refundPercentage = 0;

          const calculatedRefund = (updatedBooking.totalPrice * refundPercentage) / 100;

          await EmailService.sendCancellationConfirmation({
            customerName,
            customerEmail,
            tourTitle,
            bookingDate,
            bookingId,
            refundAmount: calculatedRefund > 0 ? `$${calculatedRefund.toFixed(2)}` : undefined,
            refundProcessingDays: calculatedRefund > 0 ? 5 : undefined,
            cancellationReason: 'Status changed to cancelled by administrator',
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
          });
          console.log(`✅ Cancellation email sent to customer: ${customerEmail}`);
        } else {
          // Send booking update email
          const statusChanged = changesForNotification.some(c => c.field === 'Status');
          const detailsChanged = changesForNotification.some(c => c.field !== 'Status');

          await EmailService.sendBookingStatusUpdate({
            customerName,
            customerEmail,
            tourTitle,
            bookingDate,
            bookingTime,
            bookingId,
            newStatus: status || oldStatus,
            statusMessage: STATUS_MESSAGES[status || oldStatus] || 'Your booking has been updated.',
            additionalInfo: detailsChanged 
              ? `Changes made:\n${changesSummary}`
              : (status === 'Confirmed' 
                ? 'Please make sure to arrive at the meeting point 15 minutes before the scheduled time.'
                : undefined),
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
          });
          console.log(`✅ Update email sent to customer: ${customerEmail}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send customer email notification:', emailError);
      }

      // Send notification to operator/admin
      try {
        // Build hotel pickup map URLs if location exists
        const hotelPickupLocation = updatedBooking.hotelPickupLocation as { lat: number; lng: number; name?: string; address?: string } | undefined;
        const hotelPickupMapImage = hotelPickupLocation ? buildStaticMapImageUrl(hotelPickupLocation) : undefined;
        const hotelPickupMapLink = hotelPickupLocation ? buildGoogleMapsLink(hotelPickupLocation) : undefined;

        await EmailService.sendOperatorBookingUpdate({
          bookingId,
          tourTitle,
          customerName,
          customerEmail,
          customerPhone: updatedUser.phone,
          bookingDate,
          bookingTime,
          changesSummary,
          changedBy: adminInfo?.name || 'Admin',
          changedAt: new Date().toISOString(),
          newStatus: status || oldStatus,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
          // Hotel pickup info
          hotelPickupDetails: updatedBooking.hotelPickupDetails,
          hotelPickupLocation: hotelPickupLocation,
          hotelPickupMapImage: hotelPickupMapImage || undefined,
          hotelPickupMapLink: hotelPickupMapLink || undefined,
          // Special requests
          specialRequests: updatedBooking.specialRequests,
          // Guest counts
          adultGuests: updatedBooking.adultGuests,
          childGuests: updatedBooking.childGuests,
          infantGuests: updatedBooking.infantGuests,
        });
        console.log(`✅ Update notification sent to operator`);
      } catch (emailError) {
        console.error('❌ Failed to send operator notification:', emailError);
      }
    }

    // Transform the booking data
    const finalTour = updatedBooking.tour as any;
    const finalUser = updatedBooking.user as any;
    const transformedBooking = {
      ...updatedBooking,
      id: updatedBooking._id,
      bookingDate: updatedBooking.date,
      bookingTime: updatedBooking.time,
      participants: updatedBooking.guests,
      tour: finalTour ? {
        ...finalTour,
        id: finalTour._id,
      } : null,
      user: finalUser ? {
        ...finalUser,
        id: finalUser._id,
        name: finalUser.name || `${finalUser.firstName || ''} ${finalUser.lastName || ''}`.trim(),
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
  // Verify admin authentication
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

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
// app/api/admin/bookings/[id]/route.ts (Enhanced with booking editing and notifications)
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking, { BOOKING_STATUSES, IBookingEditHistoryEntry } from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Destination from '@/lib/models/Destination';
import { EmailService } from '@/lib/email/emailService';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import type { PopulatedBookingTour, PopulatedBookingUser } from '@/lib/types/populatedBooking';
import { InventoryHoldError, withBookingInventoryCapacity } from '@/lib/checkout/inventoryHolds';
import { validateAdminLifecycleTransition } from '@/lib/bookings/statusTransitions';

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

function normalizeAdminBookingDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (!match) return null;
  const normalized = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized
    ? normalized
    : null;
}

// Helper to get admin info from token (cookie or Authorization header)
async function getAdminInfo(request?: NextRequest): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get('authToken')?.value;

    // Fallback: check Authorization header
    if (!token && request) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload || payload.scope !== 'admin') return null;

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
  'Completed': '✓ Your experience has been completed. Thank you for booking with us.',
  'Cancelled': '❌ Your booking has been cancelled.',
  'Refunded': '💰 Your booking has been refunded. The full amount will be credited to your account.',
  'Partial_Refund': '💰 A partial refund has been processed for your booking.',
};

// GET - Fetch a single booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication (cookie + Authorization header fallback)
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;

    const booking = await Booking.findOne({ _id: id, ...DEFAULT_TENANT_FILTER })
      .select('+internalNotes')
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
        select: 'firstName lastName email name phone country',
      })
      .lean();

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Transform the booking data
    const tour = booking.tour as unknown as PopulatedBookingTour;
    const user = booking.user as unknown as PopulatedBookingUser;
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

  } catch (error: unknown) {
    console.error('Failed to fetch booking:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch booking',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
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
  // Verify admin authentication (cookie + Authorization header fallback)
  const auth = await verifyAdmin(request);
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
    } = body;

    // Get admin info for edit history
    const adminInfo = await getAdminInfo(request);

    // Validate status if provided
    if (status && !BOOKING_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status value. Must be one of: ${BOOKING_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get the current booking with populated fields before updating
    const currentBooking = await Booking.findOne({ _id: id, ...DEFAULT_TENANT_FILTER })
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image images duration rating discountPrice destination bookingOptions',
        populate: {
          path: 'destination',
          model: Destination,
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
    if (currentBooking.refundState === 'pending') {
      return NextResponse.json(
        {
          success: false,
          code: 'REFUND_IN_PROGRESS',
          message: 'This booking is locked while Stripe confirms the refund. Retry after reconciliation completes.',
        },
        { status: 409 },
      );
    }
    if (['Cancelled', 'Refunded', 'Partial_Refund', 'Completed'].includes(currentBooking.status)
      && (status !== currentBooking.status || date !== undefined || dateString !== undefined || time !== undefined || selectedBookingOption !== undefined)) {
      return NextResponse.json(
        {
          success: false,
          code: currentBooking.status === 'Completed' ? 'COMPLETED_BOOKING_IMMUTABLE' : 'FINANCIAL_RECORD_IMMUTABLE',
          message: currentBooking.status === 'Completed'
            ? 'A completed booking cannot be reopened or rescheduled. Use the protected refund workflow if money must be returned.'
            : 'A cancelled or refunded booking cannot be reopened or rescheduled. Create a new booking instead.',
        },
        { status: 409 },
      );
    }
    if (status && status !== currentBooking.status) {
      const transitionError = validateAdminLifecycleTransition({
        currentStatus: currentBooking.status,
        nextStatus: status,
        paymentMethod: currentBooking.paymentMethod,
        dateString: currentBooking.dateString || currentBooking.date?.toISOString().slice(0, 10),
        time: currentBooking.time,
      });
      if (transitionError) {
        return NextResponse.json({ success: false, ...transitionError }, { status: 409 });
      }
    }

    // Track changes for edit history and notifications
    const changes: IBookingEditHistoryEntry[] = [];
    const changesForNotification: { field: string; oldValue: string; newValue: string }[] = [];

    // Store old values for comparison
    const oldStatus = currentBooking.status;
    const oldDate = currentBooking.dateString || currentBooking.date?.toISOString().split('T')[0];
    const oldTime = currentBooking.time;
    const oldBookingOption = currentBooking.selectedBookingOption?.title;
    const updates: Record<string, unknown> = {};

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
      updates.status = status;
      if (oldStatus === 'Pending' && status === 'Confirmed') {
        updates.paymentStatus = 'paid';
        updates.amountPaid = currentBooking.totalPrice;
        updates.paymentConfirmedAt = new Date();
        updates.paymentConfirmedBy = `admin:${adminInfo?.id || auth.id}`;
      }
    }

    // Update date if provided
    const requestedDate = dateString !== undefined
      ? normalizeAdminBookingDate(dateString)
      : date !== undefined
        ? normalizeAdminBookingDate(date)
        : oldDate;
    if ((dateString !== undefined || date !== undefined) && !requestedDate) {
      return NextResponse.json(
        { success: false, code: 'INVALID_BOOKING_DATE', message: 'Booking date must be a real date in YYYY-MM-DD format.' },
        { status: 422 },
      );
    }
    if (requestedDate && requestedDate !== oldDate) {
      const newDateObj = new Date(`${requestedDate}T12:00:00.000Z`);
      changes.push({
        editedAt: new Date(),
        editedBy: adminInfo?.id || 'system',
        editedByName: adminInfo?.name || 'System',
        field: 'date',
        previousValue: formatBookingDate(oldDate),
        newValue: formatBookingDate(requestedDate),
        changeType: 'detail_update',
      });
      changesForNotification.push({
        field: 'Tour Date',
        oldValue: formatBookingDate(oldDate),
        newValue: formatBookingDate(requestedDate),
      });
      updates.date = newDateObj;
      updates.dateString = requestedDate;
    }

    // Update time if provided
    if (time !== undefined && (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))) {
      return NextResponse.json(
        { success: false, code: 'INVALID_BOOKING_TIME', message: 'Booking time must use 24-hour HH:mm format.' },
        { status: 422 },
      );
    }
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
      updates.time = time;
    }

    // A paid option change can alter both the guest-price snapshot and the
    // amount owed. It must be handled as a cancel/rebook until an explicit
    // adjustment-payment workflow exists.
    if (selectedBookingOption && selectedBookingOption.title !== oldBookingOption) {
      return NextResponse.json(
        {
          success: false,
          code: 'BOOKING_OPTION_CHANGE_REQUIRES_REBOOKING',
          message: 'Booking option changes require cancellation and a new authoritative quote.',
        },
        { status: 409 },
      );
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { success: false, code: 'NO_BOOKING_CHANGES', message: 'No booking changes were supplied.' },
        { status: 422 },
      );
    }

    const expectedVersion = Number((currentBooking as unknown as { __v?: number }).__v || 0);
    const persist = async () => Booking.findOneAndUpdate(
      {
        _id: id,
        ...DEFAULT_TENANT_FILTER,
        __v: expectedVersion,
        status: oldStatus,
        refundState: { $ne: 'pending' },
      },
      {
        $set: updates,
        $push: { editHistory: { $each: changes } },
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true },
    );

    const departureChanged = (requestedDate && requestedDate !== oldDate) || (time && time !== oldTime);
    let persisted;
    if (departureChanged) {
      const populatedTour = currentBooking.tour as unknown as { _id?: unknown; bookingOptions?: Array<unknown> };
      const tourId = String(populatedTour?._id || currentBooking.tour || '');
      const pricingKey = String(currentBooking.selectedBookingOption?.pricingKey
        || ((populatedTour?.bookingOptions || []).length === 0 ? 'standard' : ''));
      if (!/^[a-f0-9]{24}$/i.test(tourId) || !pricingKey) {
        return NextResponse.json(
          {
            success: false,
            code: 'BOOKING_MAPPING_REQUIRED',
            message: 'This legacy booking is missing an immutable option mapping and cannot be rescheduled automatically.',
          },
          { status: 409 },
        );
      }
      const guests = Number(currentBooking.adultGuests || 0)
        + Number(currentBooking.childGuests || 0)
        + Number(currentBooking.infantGuests || 0)
        || Number(currentBooking.guests || 0);
      persisted = await withBookingInventoryCapacity({
        bookingId: id,
        current: {
          _id: tourId,
          selectedDate: oldDate,
          selectedTime: oldTime,
          quantity: guests,
          selectedBookingOption: { pricingKey },
        },
        next: {
          _id: tourId,
          selectedDate: requestedDate || oldDate,
          selectedTime: time || oldTime,
          quantity: guests,
          selectedBookingOption: { pricingKey },
        },
        work: persist,
      });
    } else {
      persisted = await persist();
    }
    if (!persisted) {
      return NextResponse.json(
        {
          success: false,
          code: 'BOOKING_VERSION_CONFLICT',
          message: 'The booking changed while this update was being saved. Refresh and try again.',
        },
        { status: 409 },
      );
    }

    // Reload with lean for response
    const updatedBooking = await Booking.findOne({ _id: id, ...DEFAULT_TENANT_FILTER })
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image images duration rating discountPrice destination bookingOptions',
        populate: {
          path: 'destination',
          model: Destination,
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
    const updatedUser = updatedBooking.user as unknown as PopulatedBookingUser;
    const updatedTour = updatedBooking.tour as unknown as PopulatedBookingTour;
    
    // "Nothing silent": track email outcomes so the admin UI can show when a
    // notification failed instead of the failure disappearing into the logs.
    const notifications: { customer: 'sent' | 'failed' | 'skipped'; operator: 'sent' | 'failed' | 'skipped' } = {
      customer: 'skipped',
      operator: 'skipped',
    };
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
          console.log('✅ Cancellation email sent to customer');
        } else {
          // Send booking update email
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
          console.log('✅ Update email sent to customer');
        }
        notifications.customer = 'sent';
      } catch (emailError) {
        notifications.customer = 'failed';
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
        notifications.operator = 'sent';
      } catch (emailError) {
        notifications.operator = 'failed';
        console.error('❌ Failed to send operator notification:', emailError);
      }
    }

    // Transform the booking data
    const finalTour = updatedBooking.tour as unknown as PopulatedBookingTour;
    const finalUser = updatedBooking.user as unknown as PopulatedBookingUser;
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
      notifications,
    };

    return NextResponse.json(transformedBooking);

  } catch (error: unknown) {
    if (error instanceof InventoryHoldError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error('Failed to update booking:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update booking',
        error: (error as Error).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Financial bookings are immutable audit records. Operators must use
// the cancellation/refund workflows so inventory, provider evidence and
// customer notifications remain consistent.
export async function DELETE(
  request: NextRequest,
) {
  // Verify admin authentication (cookie + Authorization header fallback)
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(
    {
      success: false,
      code: 'BOOKING_DELETION_DISABLED',
      message: 'Bookings cannot be permanently deleted. Use the cancellation or refund workflow to preserve the financial audit trail.',
    },
    { status: 409 },
  );
}

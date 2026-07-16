import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { resendBookingNotifications } from '@/lib/bookings/refundNotifications';
import Booking from '@/lib/models/Booking';

// Admin-initiated resend of a booking's notification emails (customer +
// operator). For bookings with a completed refund/cancellation outcome this
// re-runs the standard refund-notification path after releasing its one-shot
// claim; for all other bookings it sends the current-status update directly.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
    if (auth instanceof NextResponse) return auth;
    await dbConnect();
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      return NextResponse.json({ success: false, error: 'Booking ID is invalid.' }, { status: 400 });
    }

    const outcome = await resendBookingNotifications(id, auth.email || `admin:${auth.userId}`);
    if (!outcome) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    const customerSent = outcome.customer !== 'failed';
    const operatorSent = outcome.operator !== 'failed';
    await Booking.updateOne(
      { _id: id, tenantId: 'default' },
      operatorSent
        ? { $set: { operatorNotificationSentAt: new Date() }, $unset: { operatorNotificationFailedAt: 1, operatorNotificationFailureCode: 1 } }
        : { $set: { operatorNotificationFailedAt: new Date(), operatorNotificationFailureCode: 'manual_resend_failed' } },
    );
    if (!customerSent) {
      await Booking.updateOne(
        { _id: id, tenantId: 'default' },
        { $set: { confirmationEmailFailedAt: new Date(), confirmationEmailFailureCode: 'manual_resend_failed' } },
      );
    }
    return NextResponse.json({
      success: customerSent && operatorSent,
      notificationSent: customerSent,
      operatorNotificationSent: operatorSent,
      detail: outcome,
    }, { status: customerSent || operatorSent ? 200 : 502 });
  } catch (error) {
    console.error('Manual notification resend error:', error);
    return NextResponse.json({ success: false, error: 'Failed to resend notifications.' }, { status: 500 });
  }
}

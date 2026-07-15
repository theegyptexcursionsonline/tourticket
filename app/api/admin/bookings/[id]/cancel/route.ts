import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { getServerStripe } from '@/lib/stripe/server';
import { BookingRefundError, requestBookingRefund } from '@/lib/bookings/refunds';
import { sendBookingRefundNotification } from '@/lib/bookings/refundNotifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
    if (auth instanceof NextResponse) return auth;
    await dbConnect();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await requestBookingRefund({
      bookingId: id,
      kind: 'admin_cancel',
      actor: `admin:${auth.userId}`,
      reason: (body as { reason?: unknown }).reason || 'Booking cancelled by administrator',
      requestKey: request.headers.get('idempotency-key') || undefined,
    }, getServerStripe);

    // "Nothing silent": report whether the customer notification went out.
    let notificationSent: boolean | undefined;
    if (result.newlyFinalized) {
      notificationSent = await sendBookingRefundNotification(id).catch((error) => {
        console.error('Admin cancellation completed but notification failed.', error);
        return false;
      });
    }
    const pending = result.state === 'pending';
    return NextResponse.json({
      success: !pending,
      notificationSent,
      code: pending ? 'REFUND_PENDING' : undefined,
      message: pending
        ? 'Stripe is processing the refund. The booking status has not been changed yet.'
        : result.state === 'manual_required'
          ? 'Booking cancelled; the original non-Stripe payment requires manual refund review.'
          : 'Booking cancellation completed successfully.',
      bookingStatus: result.status,
      refundStatus: result.state,
      refundAmount: result.actualRefundAmount,
      refundRequestedAmount: result.requestedAmount,
      refundPercentage: result.refundPercentage,
      providerRefundId: result.providerRefundId,
      replayed: result.replayed,
    }, { status: pending ? 202 : 200 });
  } catch (error) {
    if (error instanceof BookingRefundError) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: error.status });
    }
    console.error('Admin cancellation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel booking safely.' }, { status: 500 });
  }
}

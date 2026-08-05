import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { getServerStripe } from '@/lib/stripe/server';
import { BookingRefundError, requestBookingRefund } from '@/lib/bookings/refunds';
import { sendBookingRefundNotification } from '@/lib/bookings/refundNotifications';

async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
    if (auth instanceof NextResponse) return auth;
    await dbConnect();
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as {
      type?: unknown;
      amount?: unknown;
      reason?: unknown;
    };
    if (body.type !== 'full' && body.type !== 'partial') {
      return NextResponse.json({ success: false, code: 'INVALID_REFUND_TYPE', error: 'Refund type must be full or partial.' }, { status: 422 });
    }
    const result = await requestBookingRefund({
      bookingId: id,
      kind: body.type === 'full' ? 'admin_full' : 'admin_partial',
      actor: `admin:${auth.userId}`,
      reason: body.reason,
      requestedAmount: body.type === 'partial' ? Number(body.amount) : undefined,
      requestKey: request.headers.get('idempotency-key') || undefined,
    }, getServerStripe);

    // "Nothing silent": report whether the customer AND operator notifications went out.
    let notificationSent: boolean | undefined;
    let operatorNotificationSent: boolean | undefined;
    if (result.newlyFinalized) {
      const outcome = await sendBookingRefundNotification(id).catch((error) => {
        console.error('Admin refund completed but notification failed.', error);
        return null;
      });
      notificationSent = outcome ? outcome.customer !== 'failed' : false;
      operatorNotificationSent = outcome ? outcome.operator !== 'failed' : false;
    }
    const pending = result.state === 'pending';
    return NextResponse.json({
      success: !pending,
      notificationSent,
      operatorNotificationSent,
      code: pending ? 'REFUND_PENDING' : undefined,
      message: pending
        ? 'Stripe accepted the refund for processing. Booking status will change after provider confirmation.'
        : 'Refund confirmed by Stripe and booking status updated.',
      bookingStatus: result.status,
      refundStatus: result.state,
      refundAmount: result.actualRefundAmount,
      refundRequestedAmount: result.requestedAmount,
      providerRefundId: result.providerRefundId,
      replayed: result.replayed,
    }, { status: pending ? 202 : 200 });
  } catch (error) {
    if (error instanceof BookingRefundError) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: error.status });
    }
    console.error('Admin refund error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process refund safely.' }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);

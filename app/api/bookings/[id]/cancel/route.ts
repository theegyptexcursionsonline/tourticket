import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { authenticateCustomerBearer } from '@/lib/auth/customerAuth';
import { getServerStripe } from '@/lib/stripe/server';
import { BookingRefundError, requestBookingRefund } from '@/lib/bookings/refunds';
import { sendBookingRefundNotification } from '@/lib/bookings/refundNotifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authentication = await authenticateCustomerBearer(request);
    if (!authentication.success) {
      return NextResponse.json({ success: false, error: authentication.error }, { status: authentication.status });
    }
    await dbConnect();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await requestBookingRefund({
      bookingId: id,
      ownerId: String(authentication.user._id),
      kind: 'customer_cancel',
      actor: `customer:${String(authentication.user._id)}`,
      reason: (body as { reason?: unknown }).reason,
      requestKey: request.headers.get('idempotency-key') || undefined,
    }, getServerStripe);

    if (result.newlyFinalized) {
      await sendBookingRefundNotification(id).catch((error) => {
        console.error('Cancellation completed but notification failed.', error);
      });
    }
    const pending = result.state === 'pending';
    return NextResponse.json({
      success: !pending,
      code: pending ? 'REFUND_PENDING' : undefined,
      message: pending
        ? 'The payment provider is processing the refund. The booking will be cancelled only after confirmation.'
        : result.state === 'manual_required'
          ? 'Booking cancelled. Any offline refund requires operator review.'
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
    console.error('Cancellation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel booking safely.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyCron } from '@/lib/auth/verifyCron';
import Booking from '@/lib/models/Booking';
import { getServerStripe } from '@/lib/stripe/server';
import {
  reconcileStripeBookingRefund,
  requestBookingRefund,
  type BookingRefundKind,
} from '@/lib/bookings/refunds';
import { sendBookingRefundNotification } from '@/lib/bookings/refundNotifications';

export async function GET(request: NextRequest) {
  const authError = verifyCron(request);
  if (authError) return authError;
  try {
    await dbConnect();
    const requestedLimit = Number(new URL(request.url).searchParams.get('limit') || 50);
    const limit = Math.max(1, Math.min(100, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 50));
    const pending = await Booking.find({ tenantId: 'default', refundState: 'pending' })
      .select('_id refundKind refundActor refundReason refundRequestKey refundRequestedAmount refundProviderId')
      .sort({ updatedAt: 1 })
      .limit(limit)
      .lean<Array<{
        _id: unknown;
        refundKind?: BookingRefundKind;
        refundActor?: string;
        refundReason?: string;
        refundRequestKey?: string;
        refundRequestedAmount?: number;
        refundProviderId?: string;
      }>>();
    const stripe = getServerStripe();
    const results: Array<{ bookingId: string; outcome: string }> = [];

    for (const booking of pending) {
      const bookingId = String(booking._id);
      try {
        if (booking.refundProviderId) {
          const providerRefund = await stripe.refunds.retrieve(booking.refundProviderId);
          const reconciled = await reconcileStripeBookingRefund(providerRefund);
          if (reconciled.finalized) {
            await sendBookingRefundNotification(bookingId).catch((error) => {
              console.error(`Refund ${bookingId} completed but notification claiming failed.`, error);
            });
          }
          results.push({ bookingId, outcome: reconciled.state || 'inspected' });
        } else if (booking.refundKind) {
          const resumed = await requestBookingRefund({
            bookingId,
            kind: booking.refundKind,
            actor: booking.refundActor || 'refund-reconciliation',
            reason: booking.refundReason,
            requestKey: booking.refundRequestKey,
            requestedAmount: booking.refundRequestedAmount,
          }, getServerStripe);
          if (resumed.newlyFinalized) {
            await sendBookingRefundNotification(bookingId).catch((error) => {
              console.error(`Refund ${bookingId} completed but notification claiming failed.`, error);
            });
          }
          results.push({ bookingId, outcome: resumed.state });
        } else {
          results.push({ bookingId, outcome: 'invalid_claim_requires_review' });
        }
      } catch (error) {
        console.error(`Refund reconciliation failed for ${bookingId}.`, error);
        results.push({ bookingId, outcome: 'retry_required' });
      }
    }

    return NextResponse.json({
      success: results.every((result) => !['retry_required', 'invalid_claim_requires_review'].includes(result.outcome)),
      inspected: pending.length,
      results,
    });
  } catch (error) {
    console.error('Refund reconciliation cron failed.', error);
    return NextResponse.json({ success: false, error: 'Refund reconciliation failed' }, { status: 500 });
  }
}

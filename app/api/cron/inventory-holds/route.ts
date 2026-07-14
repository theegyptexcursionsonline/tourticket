import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import { verifyCron } from '@/lib/auth/verifyCron';
import Booking from '@/lib/models/Booking';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import {
  acquireCheckoutInventoryLease,
  ensureInventoryHoldsForPayment,
  expireInventoryHolds,
  expireUnboundInventoryHolds,
  expiredInventoryPaymentIds,
  releaseCheckoutInventoryLease,
  type InventoryHoldCartItem,
} from '@/lib/checkout/inventoryHolds';
import {
  markPaymentInventoryConverted,
  refundUnavailablePaidInventory,
  releasePaymentInventory,
} from '@/lib/checkout/inventoryPaymentRecovery';

let stripeInstance: Stripe | null = null;
function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured.');
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });
  }
  return stripeInstance;
}

/**
 * Reconciles expired checkout holds. A successful charge is either backed by
 * every durable booking or refunded; unpaid intents are canceled/released.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCron(request);
  if (authError) return authError;

  try {
    await dbConnect();
    const requestedLimit = Number(new URL(request.url).searchParams.get('limit') || 100);
    const limit = Math.max(1, Math.min(100, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 100));
    const paymentIntentIds = await expiredInventoryPaymentIds(limit);
    const stripe = getStripe();
    const results: Array<{ paymentIntentId: string; outcome: string }> = [];

    for (const paymentIntentId of paymentIntentIds) {
      const paymentLeaseKey = `payment:${paymentIntentId}`;
      let paymentLeaseToken: string | undefined;
      try {
        paymentLeaseToken = await acquireCheckoutInventoryLease(paymentLeaseKey, 120_000);
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status === 'succeeded') {
          const quote = await CheckoutPaymentQuote.findOne({ tenantId: 'default', paymentIntentId })
            .select('quoteBinding cart')
            .lean<{ quoteBinding?: string; cart?: InventoryHoldCartItem[] } | null>();
          const expectedCount = Array.isArray(quote?.cart) ? quote.cart.length : 0;
          const bookingCount = await Booking.countDocuments({ tenantId: 'default', paymentId: paymentIntentId });
          if (quote?.quoteBinding && expectedCount > 0 && bookingCount >= expectedCount) {
            await ensureInventoryHoldsForPayment({
              paymentIntentId,
              reservationKey: quote.quoteBinding,
              cart: quote.cart || [],
            });
            await markPaymentInventoryConverted(paymentIntentId);
            results.push({ paymentIntentId, outcome: 'converted_from_durable_bookings' });
          } else {
            await refundUnavailablePaidInventory({
              stripe,
              paymentIntentId,
              reason: 'succeeded_payment_hold_expired_without_complete_booking',
            });
            results.push({ paymentIntentId, outcome: 'paid_but_unfulfilled_refunded' });
          }
          continue;
        }

        // Do not cancel an unpaid PaymentIntent here. Releasing its capacity is
        // sufficient, and keeping the intent reusable lets an idempotent mobile
        // retry acquire a fresh hold instead of receiving a terminal client secret.
        await expireInventoryHolds(paymentIntentId);
        await releasePaymentInventory(paymentIntentId, 'inventory_hold_expired');
        results.push({ paymentIntentId, outcome: intent.status === 'canceled' ? 'released_canceled' : 'released_unpaid' });
      } catch (error) {
        console.error(`Inventory hold reconciliation failed for ${paymentIntentId}.`, error);
        results.push({ paymentIntentId, outcome: 'retry_required' });
      } finally {
        if (paymentLeaseToken) {
          await releaseCheckoutInventoryLease(paymentLeaseKey, paymentLeaseToken);
        }
      }
    }

    const unboundExpired = await expireUnboundInventoryHolds();
    return NextResponse.json({
      success: results.every((result) => result.outcome !== 'retry_required'),
      inspected: paymentIntentIds.length,
      unboundExpired,
      results,
    });
  } catch (error) {
    console.error('Inventory hold cron failed.', error);
    return NextResponse.json({ success: false, error: 'Inventory hold reconciliation failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  buildCheckoutPaymentIdempotencyKey,
} from '@/lib/checkout/checkoutAttempt';
import {
  bindInventoryHoldsToPayment,
  createInventoryHolds,
  releaseInventoryHolds,
} from '@/lib/checkout/inventoryHolds';
import {
  persistPreparedCheckoutQuote,
  prepareWebCheckout,
  webCheckoutErrorResponse,
} from '@/lib/checkout/webCheckoutPreparation';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    stripeInstance = new Stripe(key, { apiVersion: '2025-08-27.basil' });
  }
  return stripeInstance;
}

export async function POST(request: Request) {
  let paymentIntent: Stripe.PaymentIntent | undefined;
  try {
    const prepared = await prepareWebCheckout(request, {
      rateLimitAction: 'checkout-payment-intent',
      paymentExperience: 'modal',
    });
    await createInventoryHolds({ reservationKey: prepared.quoteBinding, cart: prepared.cart });
    const stripe = getStripe();
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: prepared.amountMinor,
        currency: 'usd',
        description: `Booking for ${prepared.cart.length} tour${prepared.cart.length > 1 ? 's' : ''}`,
        metadata: prepared.metadata,
        automatic_payment_methods: { enabled: true },
      }, {
        idempotencyKey: buildCheckoutPaymentIdempotencyKey(prepared.quoteBinding),
      });
      await bindInventoryHoldsToPayment(prepared.quoteBinding, paymentIntent.id);
    } catch (error) {
      if (!paymentIntent) {
        await releaseInventoryHolds({
          reservationKey: prepared.quoteBinding,
          reason: 'payment_intent_creation_failed',
        });
      }
      throw error;
    }

    await persistPreparedCheckoutQuote({
      prepared,
      paymentIntentId: paymentIntent.id,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      pricing: prepared.pricing,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('Create PaymentIntent error:', error);
    const knownError = webCheckoutErrorResponse(error);
    if (knownError) return knownError;

    let errorMessage = 'Failed to initialize payment. Please try again.';
    const stripeErrorType = (error as { type?: string }).type;
    if (stripeErrorType === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment request. Please check your information and try again.';
    } else if (stripeErrorType === 'StripeAPIError') {
      errorMessage = 'Payment service temporarily unavailable. Please try again in a moment.';
    } else if (stripeErrorType === 'StripeAuthenticationError') {
      errorMessage = 'Payment configuration error. Please contact support.';
      console.error('STRIPE AUTHENTICATION ERROR - Check API keys!');
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

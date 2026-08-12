import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  createInventoryHolds,
  releaseInventoryHolds,
} from '@/lib/checkout/inventoryHolds';
import { publicCheckoutOrigin } from '@/lib/checkout/publicCheckoutOrigin';
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

function stripeCheckoutErrorMessage(error: unknown): string {
  const type = (error as { type?: string }).type;
  if (type === 'StripeInvalidRequestError') return 'Stripe could not prepare this checkout. Please review the booking and try again.';
  if (type === 'StripeAPIError') return 'Stripe is temporarily unavailable. Please try again in a moment.';
  if (type === 'StripeAuthenticationError') return 'Payment configuration is unavailable. Please contact support.';
  return 'Stripe Checkout could not be opened. Please try again.';
}

export async function POST(request: Request) {
  let session: Stripe.Checkout.Session | undefined;
  try {
    const prepared = await prepareWebCheckout(request, {
      rateLimitAction: 'checkout-hosted-session',
      paymentExperience: 'hosted',
    });
    // Stripe Checkout can stay open for at least 30 minutes. Keep inventory
    // one minute longer than the 31-minute provider session so a payment at
    // the edge of expiry still reaches the webhook with an active reservation.
    await createInventoryHolds({
      reservationKey: prepared.quoteBinding,
      cart: prepared.cart,
      holdMinutes: 32,
    });

    const origin = publicCheckoutOrigin();
    const stripe = getStripe();
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        ui_mode: 'hosted',
        client_reference_id: prepared.checkoutAttemptId,
        customer_email: prepared.customer.email,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: prepared.amountMinor,
            product_data: {
              name: prepared.cart.length === 1
                ? prepared.cart[0].title
                : `${prepared.cart.length} Egypt experiences`,
              description: 'Server-verified tour booking',
            },
          },
        }],
        payment_intent_data: {
          description: `Booking for ${prepared.cart.length} tour${prepared.cart.length > 1 ? 's' : ''}`,
          metadata: prepared.metadata,
        },
        metadata: prepared.metadata,
        success_url: `${origin}/${prepared.locale}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/${prepared.locale}/checkout?payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + (31 * 60),
        locale: 'auto',
      }, {
        idempotencyKey: `tourticket-hosted-${prepared.quoteBinding}`,
      });
      if (!session.url) throw new Error('Stripe Checkout did not return a hosted URL.');

      await persistPreparedCheckoutQuote({
        prepared: { ...prepared, paymentExperience: 'hosted' },
        // Before payment, a hosted Session has no PaymentIntent. The unique
        // provider-session ID is replaced atomically by the webhook once
        // Stripe creates the PaymentIntent.
        paymentIntentId: session.id,
        checkoutSessionId: session.id,
      });
    } catch (error) {
      if (session?.status === 'open') {
        await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      }
      await releaseInventoryHolds({
        reservationKey: prepared.quoteBinding,
        reason: session ? 'checkout_session_snapshot_failed' : 'checkout_session_creation_failed',
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      pricing: prepared.pricing,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('Create Stripe Checkout Session error:', error);
    const knownError = webCheckoutErrorResponse(error);
    if (knownError) return knownError;
    return NextResponse.json(
      {
        success: false,
        message: stripeCheckoutErrorMessage(error),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

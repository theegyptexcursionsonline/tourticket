import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  acquireCheckoutInventoryLease,
  coverInventoryHoldsUntil,
  createInventoryHolds,
  releaseCheckoutInventoryLease,
  releaseInventoryHolds,
} from '@/lib/checkout/inventoryHolds';
import {
  listHostedCheckoutsForAttempt,
  markHostedCheckoutSuperseded,
} from '@/lib/checkout/hostedCheckoutQuote';
import { publicCheckoutOrigin } from '@/lib/checkout/publicCheckoutOrigin';
import { isAllowedStripeCheckoutUrl } from '@/lib/checkout/stripeCheckoutDestination';
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

// Stripe's minimum Checkout lifetime is 30 minutes; one more absorbs clock skew.
const SESSION_LIFETIME_SECONDS = 31 * 60;
// A recorded page is handed out again only while it has this much time left.
const REUSE_MARGIN_SECONDS = 10 * 60;
// The hold outlives the page it pays for, so a payment at the edge of expiry
// still reaches the webhook with an active reservation.
const HOLD_GRACE_SECONDS = 60;
const HOLD_MINUTES = 32;

class HostedCheckoutRefusal extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// Stripe refused the request outright, so no page exists under that key.
const STRIPE_DEFINITE_REJECTIONS = new Set([
  'StripeInvalidRequestError',
  'StripeAuthenticationError',
  'StripePermissionError',
  'StripeIdempotencyError',
]);

function alreadyPaid(session: Stripe.Checkout.Session): boolean {
  return session.status === 'complete' || session.payment_status === 'paid';
}

/**
 * One payable Stripe page per checkout attempt. A still-usable page is handed
 * back; any other page of the attempt is marked superseded and closed with
 * Stripe before a replacement is made. A page the guest already paid on stops
 * everything: the webhook confirms that payment.
 */
async function reuseOrRetire(
  stripe: Stripe,
  prepared: { checkoutAttemptId: string; quoteBinding: string; amountMinor: number },
): Promise<Stripe.Checkout.Session | null> {
  const recorded = await listHostedCheckoutsForAttempt({
    checkoutAttemptId: prepared.checkoutAttemptId,
  });
  const nowSeconds = Math.floor(Date.now() / 1000);
  for (const quote of recorded) {
    const current = await stripe.checkout.sessions.retrieve(quote.checkoutSessionId);
    if (alreadyPaid(current)) {
      throw new HostedCheckoutRefusal(409, 'CHECKOUT_ALREADY_PAID', 'This checkout has already been paid. Your confirmation is on its way by email.');
    }
    if (
      current.status === 'open'
      && quote.quoteBinding === prepared.quoteBinding
      && current.amount_total === prepared.amountMinor
      && current.currency === 'usd'
      && typeof current.expires_at === 'number'
      && current.expires_at - nowSeconds > REUSE_MARGIN_SECONDS
      && isAllowedStripeCheckoutUrl(current.url)
    ) {
      return current;
    }
  }
  for (const quote of recorded) {
    // Marked first, so the page's own expiry event never ends the hold that
    // now belongs to its replacement.
    await markHostedCheckoutSuperseded(quote.checkoutSessionId);
    let current = await stripe.checkout.sessions.retrieve(quote.checkoutSessionId);
    if (current.status === 'open') current = await stripe.checkout.sessions.expire(quote.checkoutSessionId);
    if (alreadyPaid(current)) {
      throw new HostedCheckoutRefusal(409, 'CHECKOUT_ALREADY_PAID', 'This checkout has already been paid. Your confirmation is on its way by email.');
    }
    if (current.status !== 'expired') {
      throw new Error(`Stripe did not close checkout page ${quote.checkoutSessionId}`);
    }
    if (quote.quoteBinding !== prepared.quoteBinding) {
      // The guest changed the cart: the closed page's seats are no longer wanted.
      await releaseInventoryHolds({ reservationKey: quote.quoteBinding, reason: 'checkout_session_replaced' });
    }
  }
  return null;
}

export async function POST(request: Request) {
  let session: Stripe.Checkout.Session | undefined;
  let lease: { key: string; token: string } | undefined;
  try {
    const prepared = await prepareWebCheckout(request, {
      rateLimitAction: 'checkout-hosted-session',
      paymentExperience: 'hosted',
    });
    const leaseKey = `hosted-checkout:${prepared.checkoutAttemptId}`;
    lease = { key: leaseKey, token: await acquireCheckoutInventoryLease(leaseKey, 60_000) };

    const origin = publicCheckoutOrigin();
    const stripe = getStripe();
    const reusable = await reuseOrRetire(stripe, prepared);
    if (reusable) {
      return NextResponse.json({
        success: true,
        sessionId: reusable.id,
        url: reusable.url,
        pricing: prepared.pricing,
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
    const holdUntil = new Date((expiresAt + HOLD_GRACE_SECONDS) * 1000);
    await createInventoryHolds({
      reservationKey: prepared.quoteBinding,
      cart: prepared.cart,
      holdMinutes: HOLD_MINUTES,
    });
    // Cover the page before it exists: if Stripe's answer is lost, the page may
    // still take payment, and its seats must still be held when it does.
    const coverage = { reservationKey: prepared.quoteBinding, itemCount: prepared.cart.length, until: holdUntil };
    if (await coverInventoryHoldsUntil(coverage) === 'stale') {
      // A hold is carried across pages only for a bounded time; after that the
      // seats are taken again through a fresh availability check.
      await releaseInventoryHolds({ reservationKey: prepared.quoteBinding, reason: 'checkout_hold_renewed' });
      await createInventoryHolds({
        reservationKey: prepared.quoteBinding,
        cart: prepared.cart,
        holdMinutes: HOLD_MINUTES,
      });
      if (await coverInventoryHoldsUntil(coverage) !== 'covered') {
        throw new Error('Inventory hold could not cover the checkout page.');
      }
    }

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
        expires_at: expiresAt,
        locale: 'auto',
      }, {
        // One key per page: retries of this exact request replay it, and a
        // later page (new expiry) never collides with an earlier key.
        idempotencyKey: `tourticket-hosted-${prepared.quoteBinding}-${randomUUID()}`,
      });
      if (!isAllowedStripeCheckoutUrl(session.url)) {
        throw new Error('Stripe Checkout did not return an approved hosted URL.');
      }

      await persistPreparedCheckoutQuote({
        prepared: { ...prepared, paymentExperience: 'hosted' },
        // Before payment, a hosted Session has no PaymentIntent. The unique
        // provider-session ID is replaced atomically by the webhook once
        // Stripe creates the PaymentIntent.
        paymentIntentId: session.id,
        checkoutSessionId: session.id,
      });
    } catch (error) {
      // Seats are freed only when no page can take payment for them. A page we
      // could not close, or a create whose answer never arrived, keeps its
      // hold until the hold expires after the page does.
      let noPayablePage = false;
      if (session) {
        const closed = await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
        noPayablePage = closed?.status === 'expired';
      } else {
        noPayablePage = STRIPE_DEFINITE_REJECTIONS.has((error as { type?: string }).type || '');
      }
      if (noPayablePage) {
        await releaseInventoryHolds({
          reservationKey: prepared.quoteBinding,
          reason: session ? 'checkout_session_snapshot_failed' : 'checkout_session_creation_failed',
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      pricing: prepared.pricing,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    if (error instanceof HostedCheckoutRefusal) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
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
  } finally {
    if (lease) await releaseCheckoutInventoryLease(lease.key, lease.token);
  }
}

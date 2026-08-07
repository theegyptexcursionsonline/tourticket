// app/api/checkout/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import { CartMetadataTooLargeError, packCartMetadata } from '@/lib/checkout/cartMetadata';
import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { PriceChangedError, secureCartPricing } from '@/lib/checkout/serverCartPricing';
import { buildQuoteBinding } from '@/lib/checkout/quoteBinding';
import {
  buildCheckoutPaymentIdempotencyKey,
  normalizeCheckoutAttemptId,
} from '@/lib/checkout/checkoutAttempt';
import { assertCartAvailability, UnavailableTourError } from '@/lib/checkout/assertAvailability';
import { checkoutCartSubtotal, roundMoney } from '@/lib/checkout/cartTotals';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import {
  bindInventoryHoldsToPayment,
  createInventoryHolds,
  InventoryHoldError,
  releaseInventoryHolds,
} from '@/lib/checkout/inventoryHolds';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import {
  normalizeBoundedText,
  normalizeEmail,
  PublicInputError,
  readBoundedJson,
} from '@/lib/security/publicInput';

// Lazy Stripe initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

type PaymentIntentRequestBody = {
  customer?: { email?: unknown; firstName?: unknown; lastName?: unknown };
  pricing?: unknown;
  cart?: unknown;
  discountCode?: unknown;
  checkoutAttemptId?: unknown;
};

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripeInstance;
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedJson<PaymentIntentRequestBody>(request, 128 * 1024);
    const { customer, pricing, cart: requestedCart, discountCode } = body;
    const checkoutAttemptId = normalizeCheckoutAttemptId(body.checkoutAttemptId);

    // Validate required fields
    if (!customer || !pricing || !Array.isArray(requestedCart) || requestedCart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required payment information' },
        { status: 400 }
      );
    }
    if (!checkoutAttemptId) {
      return NextResponse.json(
        { success: false, code: 'INVALID_CHECKOUT_ATTEMPT', message: 'Please restart checkout and try again.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (requestedCart.length > 10) {
      return NextResponse.json(
        { success: false, message: 'A checkout may contain at most 10 tours.' },
        { status: 400 }
      );
    }

    // Validate customer data
    const normalizedCustomerEmail = normalizeEmail(customer.email);
    const customerFirstName = normalizeBoundedText(customer.firstName, { minimum: 1, maximum: 100 });
    const customerLastName = normalizeBoundedText(customer.lastName, { minimum: 1, maximum: 100 });
    if (!normalizedCustomerEmail || !customerFirstName || !customerLastName) {
      return NextResponse.json(
        { success: false, message: 'Please provide complete customer information (name and email)' },
        { status: 400 }
      );
    }
    const normalizedDiscountCode = typeof discountCode === 'string' && discountCode.trim()
      ? discountCode.trim().toUpperCase()
      : undefined;
    if (normalizedDiscountCode && (normalizedDiscountCode.length > 64 || !/^[A-Z0-9_-]+$/.test(normalizedDiscountCode))) {
      return NextResponse.json(
        { success: false, message: 'Enter a valid coupon code.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Always compute the amount server-side from the cart.
    // This guarantees Stripe amount matches booking summary, even if client pricing is stale.
    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'checkout-payment-intent',
      subject: normalizedCustomerEmail,
      networkLimit: 20,
      subjectLimit: 6,
      windowMs: 15 * 60 * 1_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many payment attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Cache-Control': 'no-store', 'Retry-After': String(rate.retryAfterSeconds) },
        },
      );
    }
    const cart = await secureCartPricing(requestedCart);
    await assertCartAvailability(cart);

    const toNumberQty = (value: unknown, fallback = 0): number => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      }
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const inner = record.quantity ?? record.qty ?? record.count;
        return toNumberQty(inner, fallback);
      }
      return fallback;
    };

    const subtotal = checkoutCartSubtotal(cart);

    const serviceFee = roundMoney(subtotal * 0.03);
    const tax = roundMoney(subtotal * 0.05);

    let discount = 0;
    if (normalizedDiscountCode) {
      const d = await Discount.findOne({ code: normalizedDiscountCode }).lean();
      if (d && d.isActive && (!d.expiresAt || new Date(d.expiresAt) >= new Date()) && (!d.usageLimit || d.timesUsed < d.usageLimit)) {
        discount = d.discountType === 'percentage'
          ? roundMoney((subtotal * d.value) / 100)
          : roundMoney(d.value);
      }
    }

    const total = roundMoney(Math.max(0, subtotal + serviceFee + tax - discount));
    if (!total || total <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Prepare cart data for metadata (essential fields only to fit in Stripe's 500 char limit per field)
    // We store tour IDs, quantities, dates, times so webhook can recreate booking if needed
    const cartSummary = cart.map((item, index: number) => ({
      i: index, // index
      t: item._id || item.id, // tour ID
      a: item.quantity || 1, // adults
      c: item.childQuantity || 0, // children
      n: item.infantQuantity || 0, // infants
      d: item.selectedDate, // date
      tm: item.selectedTime, // time
      bp: item.selectedBookingOption?.price ?? item.discountPrice ?? item.price, // base price
      bo: item.selectedBookingOption?.id, // booking option ID
      bot: item.selectedBookingOption?.title, // booking option title
      ok: item.selectedBookingOption?.pricingKey,
      gp: item.guestPrices,
      pv: item.priceVersion,
      pe: item.priceExecutionId,
      po: item.priceOverrideId,
      // Add-ons (short keys): [{id,q,p,pg,t}]
      ao: (() => {
        const addOns: Array<{ id: string; q: number; p: number; pg: boolean; t: string }> = [];
        const source = item?.selectedAddOns;
        const details = item?.selectedAddOnDetails || {};
        const pushAddOn = (id: string, q: unknown) => {
          const qty = toNumberQty(q, 0);
          if (qty <= 0) return;
          const d = details[id];
          addOns.push({
            id,
            q: qty,
            p: Number(d?.price || 0),
            pg: d?.perGuest ?? false,
            t: String(d?.title || '').slice(0, 40),
          });
        };
        Object.entries(source).forEach(([id, q]) => pushAddOn(id, q));
        return addOns;
      })(),
    }));

    // Pack the cart into metadata BEFORE creating the intent. Truncating it
    // here used to hand the webhook malformed JSON, which refunded a customer
    // who had already paid; refusing the checkout is the recoverable failure.
    let packedCart: Record<string, string>;
    try {
      packedCart = packCartMetadata(cartSummary);
    } catch (cartMetadataError) {
      if (!(cartMetadataError instanceof CartMetadataTooLargeError)) throw cartMetadataError;
      console.error('[Checkout] Cart too large to record on the payment', {
        length: cartMetadataError.length,
        items: cartSummary.length,
      });
      // No inventory is held yet at this point, so there is nothing to release.
      return NextResponse.json(
        {
          success: false,
          code: 'CART_TOO_LARGE',
          message: 'This booking has too many items to process in one payment. Please book them in two smaller orders.',
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }


    // Create a PaymentIntent with Stripe - including full booking data for webhook recovery
    // IMPORTANT: Always charge in USD since all prices are stored in USD
    // The display currency is for user convenience only - Stripe handles card currency conversion
    const stripe = getStripe();
    const amountMinor = Math.round(total * 100);
    const quoteBinding = buildQuoteBinding({
      cart,
      customerEmail: normalizedCustomerEmail,
      currency: 'USD',
      amountMinor,
      discountCode: normalizedDiscountCode,
      checkoutAttemptId,
    });
    
    // Reserve the exact departure before Stripe exposes a payable client
    // secret. The reservation key is the same deterministic quote binding used
    // for Stripe idempotency, so retries cannot reserve capacity twice.
    await createInventoryHolds({ reservationKey: quoteBinding, cart });
    let paymentIntent: Stripe.PaymentIntent | undefined;
    try {
      paymentIntent = await stripe.paymentIntents.create({
      amount: amountMinor, // Stripe expects amount in cents
      currency: 'usd', // Always charge in USD - prices are stored in USD
      description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''}`,
      metadata: {
        // Customer info
        customer_email: normalizedCustomerEmail,
        customer_name: `${customerFirstName} ${customerLastName}`,
        customer_first_name: customerFirstName,
        customer_last_name: customerLastName,
        // Do not copy phone numbers, hotel geolocation, emergency contacts, or
        // special requests into Stripe metadata. Those fields remain in the
        // first-party checkout request and booking record only.
        // Tour info
        tours: cart.map((item) => item.title).join(', ').substring(0, 500),
        tour_count: String(cart.length),
        // Cart data (JSON compressed - Stripe allows up to 500 chars per value)
        ...packedCart,
        // Pricing info
        pricing_subtotal: String(subtotal),
        pricing_service_fee: String(serviceFee),
        pricing_tax: String(tax),
        pricing_discount: String(discount || 0),
        pricing_total: String(total),
        pricing_currency: 'USD', // Always USD - prices are stored and charged in USD
        // Discount
        discount_code: normalizedDiscountCode || 'none',
        // Flag to indicate this has booking data for webhook processing
        has_booking_data: 'true',
        quote_binding: quoteBinding,
        checkout_attempt_id: checkoutAttemptId,
      },
      // receipt_email removed - we send our own booking confirmation email
      automatic_payment_methods: {
        enabled: true,
      },
      }, {
        // Identical authoritative quotes converge on one PaymentIntent even when
        // a mobile client retries after losing the response.
        idempotencyKey: buildCheckoutPaymentIdempotencyKey(quoteBinding),
      });
      await bindInventoryHoldsToPayment(quoteBinding, paymentIntent.id);
    } catch (paymentError) {
      // If Stripe never created the intent, there is nothing the customer can
      // complete and capacity can be released immediately. Once an intent
      // exists, keep the short hold: a concurrent idempotent retry may already
      // be binding that same intent.
      if (!paymentIntent) {
        await releaseInventoryHolds({ reservationKey: quoteBinding, reason: 'payment_intent_creation_failed' });
      }
      throw paymentError;
    }

    // Stripe metadata is deliberately only a compact compatibility fallback.
    // Persist the complete authoritative quote so a delayed webhook can recover
    // every cart item without trusting client prices or truncated metadata.
    try {
      const savedQuote = await CheckoutPaymentQuote.findOneAndUpdate(
        { paymentIntentId: paymentIntent.id, tenantId: 'default' },
        {
          $setOnInsert: {
            quoteBinding,
            checkoutAttemptId,
            customer: {
              email: normalizedCustomerEmail,
              firstName: customerFirstName,
              lastName: customerLastName,
            },
            cart,
            cartSummary,
            pricing: { subtotal, serviceFee, tax, discount, total, currency: 'USD' },
            discountCode: normalizedDiscountCode,
            inventoryState: 'held',
            inventoryUpdatedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        { upsert: true, new: true },
      ).lean();
      if (
        !savedQuote
        || savedQuote.quoteBinding !== quoteBinding
        || savedQuote.checkoutAttemptId !== checkoutAttemptId
      ) {
        throw new Error('Payment quote idempotency conflict');
      }
    } catch (snapshotError) {
      // Do not cancel here: a concurrent retry may already be using the same
      // idempotent PaymentIntent. The client receives no secret until the
      // durable snapshot is confirmed.
      throw snapshotError;
    }

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      pricing: {
        subtotal,
        serviceFee,
        tax,
        discount,
        total,
        currency: 'USD', // Always USD - prices are stored and charged in USD
      },
    });

  } catch (error: unknown) {
    console.error('Create PaymentIntent error:', error);

    if (error instanceof PublicInputError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (error instanceof PriceChangedError) {
      return NextResponse.json({ success: false, code: (error as { code?: string | number }).code, message: (error as Error).message, quote: error.quote }, { status: 409 });
    }
    if (error instanceof UnavailableTourError) {
      return NextResponse.json({ success: false, code: error.code, message: error.message }, { status: 409 });
    }
    if (error instanceof InventoryHoldError) {
      return NextResponse.json({ success: false, code: error.code, message: error.message }, { status: error.status });
    }

    // Provide more specific error messages
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

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}

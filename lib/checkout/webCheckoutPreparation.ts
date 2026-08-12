import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import { CartMetadataTooLargeError, packCartMetadata } from '@/lib/checkout/cartMetadata';
import { assertCartAvailability, UnavailableTourError } from '@/lib/checkout/assertAvailability';
import { checkoutCartSubtotal, roundMoney } from '@/lib/checkout/cartTotals';
import { normalizeCheckoutAttemptId } from '@/lib/checkout/checkoutAttempt';
import { buildQuoteBinding } from '@/lib/checkout/quoteBinding';
import {
  PriceChangedError,
  secureCartPricing,
  type SecureCartItem,
} from '@/lib/checkout/serverCartPricing';
import { InventoryHoldError } from '@/lib/checkout/inventoryHolds';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import {
  normalizeBoundedText,
  normalizeEmail,
  PublicInputError,
  readBoundedJson,
} from '@/lib/security/publicInput';
import {
  paymentExperienceForEndpoint,
  type PaymentExperience,
} from '@/lib/checkout/paymentExperience';

type RawCustomer = {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  emergencyContact?: unknown;
  hotelPickupDetails?: unknown;
  hotelPickupLocation?: unknown;
  specialRequests?: unknown;
};

type WebCheckoutRequestBody = {
  customer?: RawCustomer;
  pricing?: unknown;
  cart?: unknown;
  discountCode?: unknown;
  checkoutAttemptId?: unknown;
  paymentExperience?: unknown;
  locale?: unknown;
};

type CheckoutCustomer = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  emergencyContact?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: { lat: number; lng: number; name?: string; address?: string; placeId?: string };
  specialRequests?: string;
};

export type PreparedWebCheckout = {
  checkoutAttemptId: string;
  paymentExperience: PaymentExperience;
  locale: 'en' | 'ar' | 'de' | 'fr' | 'es';
  customer: CheckoutCustomer;
  cart: SecureCartItem[];
  cartSummary: Array<Record<string, unknown>>;
  pricing: {
    subtotal: number;
    serviceFee: number;
    tax: number;
    discount: number;
    total: number;
    currency: 'USD';
  };
  discountCode?: string;
  amountMinor: number;
  quoteBinding: string;
  metadata: Record<string, string>;
};

export class WebCheckoutInputError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WebCheckoutInputError';
  }
}

function optionalText(value: unknown, maximum: number): string | undefined {
  return normalizeBoundedText(value, { minimum: 1, maximum }) || undefined;
}

function normalizedLocation(value: unknown): CheckoutCustomer['hotelPickupLocation'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const location = value as Record<string, unknown>;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return undefined;
  }
  return {
    lat,
    lng,
    name: optionalText(location.name, 200),
    address: optionalText(location.address, 300),
    placeId: optionalText(location.placeId, 200),
  };
}

function quantity(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return quantity(record.quantity ?? record.qty ?? record.count, fallback);
  }
  return fallback;
}

function recoveryCart(cart: SecureCartItem[]) {
  return cart.map((item, index) => ({
    i: index,
    t: item._id || item.id,
    a: item.quantity || 1,
    c: item.childQuantity || 0,
    n: item.infantQuantity || 0,
    d: item.selectedDate,
    tm: item.selectedTime,
    bp: item.selectedBookingOption?.price ?? item.discountPrice ?? item.price,
    bo: item.selectedBookingOption?.id,
    bot: item.selectedBookingOption?.title,
    ok: item.selectedBookingOption?.pricingKey,
    gp: item.guestPrices,
    pv: item.priceVersion,
    pe: item.priceExecutionId,
    po: item.priceOverrideId,
    ao: (() => {
      const addOns: Array<{ id: string; q: number; p: number; pg: boolean; t: string }> = [];
      const details = item.selectedAddOnDetails || {};
      for (const [id, rawQuantity] of Object.entries(item.selectedAddOns || {})) {
        const count = quantity(rawQuantity);
        if (count <= 0) continue;
        const detail = details[id];
        addOns.push({
          id,
          q: count,
          p: Number(detail?.price || 0),
          pg: detail?.perGuest ?? false,
          t: String(detail?.title || '').slice(0, 40),
        });
      }
      return addOns;
    })(),
  }));
}

export async function prepareWebCheckout(
  request: Request,
  options: { rateLimitAction: string; paymentExperience: PaymentExperience },
): Promise<PreparedWebCheckout> {
  const body = await readBoundedJson<WebCheckoutRequestBody>(request, 128 * 1024);
  const { customer, pricing, cart: requestedCart, discountCode } = body;
  const checkoutAttemptId = normalizeCheckoutAttemptId(body.checkoutAttemptId);

  if (!customer || !pricing || !Array.isArray(requestedCart) || requestedCart.length === 0) {
    throw new WebCheckoutInputError(400, 'MISSING_PAYMENT_INFORMATION', 'Missing required payment information');
  }
  if (!checkoutAttemptId) {
    throw new WebCheckoutInputError(400, 'INVALID_CHECKOUT_ATTEMPT', 'Please restart checkout and try again.');
  }
  if (requestedCart.length > 10) {
    throw new WebCheckoutInputError(400, 'CART_LIMIT_EXCEEDED', 'A checkout may contain at most 10 tours.');
  }

  const email = normalizeEmail(customer.email);
  const firstName = normalizeBoundedText(customer.firstName, { minimum: 1, maximum: 100 });
  const lastName = normalizeBoundedText(customer.lastName, { minimum: 1, maximum: 100 });
  if (!email || !firstName || !lastName) {
    throw new WebCheckoutInputError(
      400,
      'INCOMPLETE_CUSTOMER',
      'Please provide complete customer information (name and email)',
    );
  }

  const normalizedDiscountCode = typeof discountCode === 'string' && discountCode.trim()
    ? discountCode.trim().toUpperCase()
    : undefined;
  if (normalizedDiscountCode && (normalizedDiscountCode.length > 64 || !/^[A-Z0-9_-]+$/.test(normalizedDiscountCode))) {
    throw new WebCheckoutInputError(400, 'INVALID_DISCOUNT_CODE', 'Enter a valid coupon code.');
  }

  const paymentExperience = paymentExperienceForEndpoint(
    body.paymentExperience,
    options.paymentExperience,
  );
  const locale = typeof body.locale === 'string' && ['en', 'ar', 'de', 'fr', 'es'].includes(body.locale)
    ? body.locale as PreparedWebCheckout['locale']
    : 'en';
  const normalizedCustomer: CheckoutCustomer = {
    email,
    firstName,
    lastName,
    phone: optionalText(customer.phone, 50),
    emergencyContact: optionalText(customer.emergencyContact, 200),
    hotelPickupDetails: optionalText(customer.hotelPickupDetails, 300),
    hotelPickupLocation: normalizedLocation(customer.hotelPickupLocation),
    specialRequests: normalizeBoundedText(
      customer.specialRequests,
      { minimum: 1, maximum: 2_000, collapseWhitespace: false },
    ) || undefined,
  };

  await dbConnect();
  const rate = await enforcePublicActionLimits({
    request,
    action: options.rateLimitAction,
    subject: email,
    networkLimit: 20,
    subjectLimit: 6,
    windowMs: 15 * 60 * 1_000,
  });
  if (!rate.allowed) {
    const error = new WebCheckoutInputError(429, 'RATE_LIMITED', 'Too many payment attempts. Please try again later.');
    (error as WebCheckoutInputError & { retryAfterSeconds?: number }).retryAfterSeconds = rate.retryAfterSeconds;
    throw error;
  }

  const cart = await secureCartPricing(requestedCart);
  await assertCartAvailability(cart);
  const subtotal = checkoutCartSubtotal(cart);
  const serviceFee = roundMoney(subtotal * 0.03);
  const tax = roundMoney(subtotal * 0.05);
  let discount = 0;
  if (normalizedDiscountCode) {
    const candidate = await Discount.findOne({ code: normalizedDiscountCode }).lean();
    if (
      candidate
      && candidate.isActive
      && (!candidate.expiresAt || new Date(candidate.expiresAt) >= new Date())
      && (!candidate.usageLimit || candidate.timesUsed < candidate.usageLimit)
    ) {
      discount = candidate.discountType === 'percentage'
        ? roundMoney((subtotal * candidate.value) / 100)
        : roundMoney(candidate.value);
    }
  }

  const total = roundMoney(Math.max(0, subtotal + serviceFee + tax - discount));
  if (!total || total <= 0) {
    throw new WebCheckoutInputError(400, 'INVALID_PAYMENT_AMOUNT', 'Invalid payment amount');
  }

  const cartSummary = recoveryCart(cart);
  let packedCart: Record<string, string>;
  try {
    packedCart = packCartMetadata(cartSummary);
  } catch (error) {
    if (!(error instanceof CartMetadataTooLargeError)) throw error;
    console.error('[Checkout] Cart too large to record on the payment', {
      length: error.length,
      items: cartSummary.length,
    });
    throw new WebCheckoutInputError(
      400,
      'CART_TOO_LARGE',
      'This booking has too many items to process in one payment. Please book them in two smaller orders.',
    );
  }

  const amountMinor = Math.round(total * 100);
  const quoteBinding = buildQuoteBinding({
    cart,
    customerEmail: email,
    currency: 'USD',
    amountMinor,
    discountCode: normalizedDiscountCode,
    checkoutAttemptId,
  });
  const paymentPricing = { subtotal, serviceFee, tax, discount, total, currency: 'USD' as const };
  const metadata = {
    customer_email: email,
    customer_name: `${firstName} ${lastName}`,
    customer_first_name: firstName,
    customer_last_name: lastName,
    tours: cart.map((item) => item.title).join(', ').substring(0, 500),
    tour_count: String(cart.length),
    ...packedCart,
    pricing_subtotal: String(subtotal),
    pricing_service_fee: String(serviceFee),
    pricing_tax: String(tax),
    pricing_discount: String(discount || 0),
    pricing_total: String(total),
    pricing_currency: 'USD',
    discount_code: normalizedDiscountCode || 'none',
    has_booking_data: 'true',
    quote_binding: quoteBinding,
    checkout_attempt_id: checkoutAttemptId,
    checkout_experience: paymentExperience,
  };

  return {
    checkoutAttemptId,
    paymentExperience,
    locale,
    customer: normalizedCustomer,
    cart,
    cartSummary,
    pricing: paymentPricing,
    discountCode: normalizedDiscountCode,
    amountMinor,
    quoteBinding,
    metadata,
  };
}

export async function persistPreparedCheckoutQuote(input: {
  prepared: PreparedWebCheckout;
  paymentIntentId: string;
  checkoutSessionId?: string;
}) {
  const { prepared } = input;
  const savedQuote = await CheckoutPaymentQuote.findOneAndUpdate(
    { paymentIntentId: input.paymentIntentId, tenantId: 'default' },
    {
      $setOnInsert: {
        quoteBinding: prepared.quoteBinding,
        checkoutAttemptId: prepared.checkoutAttemptId,
        checkoutSessionId: input.checkoutSessionId,
        paymentExperience: prepared.paymentExperience,
        customer: prepared.customer,
        cart: prepared.cart,
        cartSummary: prepared.cartSummary,
        pricing: prepared.pricing,
        discountCode: prepared.discountCode,
        inventoryState: 'held',
        inventoryUpdatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true },
  ).lean();
  if (
    !savedQuote
    || savedQuote.quoteBinding !== prepared.quoteBinding
    || savedQuote.checkoutAttemptId !== prepared.checkoutAttemptId
    || (input.checkoutSessionId && savedQuote.checkoutSessionId !== input.checkoutSessionId)
  ) {
    throw new Error('Payment quote idempotency conflict');
  }
  return savedQuote;
}

export function webCheckoutErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof PublicInputError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (error instanceof WebCheckoutInputError) {
    const retryAfterSeconds = (error as WebCheckoutInputError & { retryAfterSeconds?: number }).retryAfterSeconds;
    return NextResponse.json(
      { success: false, code: error.code, message: error.message },
      {
        status: error.status,
        headers: {
          'Cache-Control': 'no-store',
          ...(retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : {}),
        },
      },
    );
  }
  if (error instanceof PriceChangedError) {
    return NextResponse.json(
      { success: false, code: error.code, message: error.message, quote: error.quote },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (error instanceof UnavailableTourError) {
    return NextResponse.json(
      { success: false, code: error.code, message: error.message },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (error instanceof InventoryHoldError) {
    return NextResponse.json(
      { success: false, code: error.code, message: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return null;
}

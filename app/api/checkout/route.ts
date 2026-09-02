// app/api/checkout/route.ts (With booking reference generation)
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Discount from '@/lib/models/Discount';
import { EmailService } from '@/lib/email/emailService';
import Stripe from 'stripe';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';
import { unitCount, unitCountLabel } from '@/lib/bookings/unitPricing';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { generateDeterministicBookingReference, generateUniqueBookingReference } from '@/lib/utils/bookingReference';
import { PriceChangedError, secureCartPricing, type SecureCartItem } from '@/lib/checkout/serverCartPricing';
import { authenticateFirebaseUser } from '@/lib/firebase/authHelpers';
import { signToken } from '@/lib/jwt';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { buildQuoteBinding } from '@/lib/checkout/quoteBinding';
import { normalizeCheckoutAttemptId } from '@/lib/checkout/checkoutAttempt';
import { assertCartAvailability, UnavailableTourError } from '@/lib/checkout/assertAvailability';
import {
  checkoutCartSubtotal,
  checkoutItemSubtotal,
  roundMoney,
} from '@/lib/checkout/cartTotals';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import {
  acquireCheckoutInventoryLease,
  convertInventoryHold,
  convertInventoryReservationHold,
  createInventoryHolds,
  ensureInventoryHoldsForPayment,
  InventoryHoldError,
  releaseCheckoutInventoryLease,
  releaseInventoryHolds,
} from '@/lib/checkout/inventoryHolds';
import {
  markPaymentInventoryConverted,
  refundUnavailablePaidInventory,
} from '@/lib/checkout/inventoryPaymentRecovery';

// Lazy Stripe initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

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

// Format date consistently for display
function formatBookingDate(dateString: string | Date | undefined): string {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const formatCurrencyValue = (value: number | undefined, symbol = '$'): string => {
  const numeric = Number.isFinite(value) ? Number(value) : 0;
  return `${symbol}${numeric.toFixed(2)}`;
};

const computeTimeUntilTour = (dateValue?: string | Date, timeValue?: string) => {
  const tourDate = parseLocalDate(dateValue);
  if (!tourDate) return null;

  if (timeValue) {
    const [hours, minutes] = timeValue.split(':').map(Number);
    if (!Number.isNaN(hours)) {
      tourDate.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
    }
  }

  const diff = tourDate.getTime() - Date.now();
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
};

const round2 = roundMoney;

const calculateCartSubtotal = (cart: SecureCartItem[]): number => {
  return checkoutCartSubtotal(cart || []);
};

async function recordCardDiscountUsageOnce(paymentIntentId: string, discountCode: string) {
  const usageClaimed = Boolean(await CheckoutPaymentQuote.findOneAndUpdate(
    {
      paymentIntentId,
      tenantId: 'default',
      discountUsageRecordedAt: { $exists: false },
    },
    { $set: { discountUsageRecordedAt: new Date() } },
  ));
  if (!usageClaimed) return;
  try {
    await Discount.findOneAndUpdate({ code: discountCode }, { $inc: { timesUsed: 1 } });
  } catch (discountError) {
    await CheckoutPaymentQuote.updateOne(
      { paymentIntentId, tenantId: 'default' },
      { $unset: { discountUsageRecordedAt: 1 } },
    ).catch(() => undefined);
    throw discountError;
  }
}

export async function POST(request: NextRequest) {
  let bankReservationKey: string | undefined;
  const bankCreatedBookingIds: unknown[] = [];
  let paymentFulfillmentLeaseKey: string | undefined;
  let paymentFulfillmentLeaseToken: string | undefined;
  try {
    await dbConnect();
    
    const body = await request.json();
    const {
      customer,
      cart: requestedCart,
      paymentMethod = 'card',
      paymentDetails,
      isGuest = false,
      discountCode = null
    } = body;

    // Public checkout is card-only. Bank/cash reservations are created by an
    // authenticated administrator; accepting them here would let an anonymous
    // caller consume departure capacity without completing a payment.
    if (paymentMethod !== 'card') {
      return NextResponse.json(
        { success: false, code: 'UNSUPPORTED_PAYMENT_METHOD', message: 'Public checkout currently supports card payments only.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Validation
    if (!customer || !Array.isArray(requestedCart) || requestedCart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking information' },
        { status: 400 }
      );
    }
    if (requestedCart.length > 10) {
      return NextResponse.json(
        { success: false, message: 'A checkout may contain at most 10 tours.' },
        { status: 400 }
      );
    }

    if (!customer.firstName || !customer.lastName || !customer.email) {
      return NextResponse.json(
        { success: false, message: 'Customer information is incomplete' },
        { status: 400 }
      );
    }

    const normalizedCustomerEmail = String(customer.email).trim().toLowerCase();
    // A previous passwordless guest profile may be reused for another guest
    // checkout. Never attach a guest checkout to an arbitrary local/Firebase
    // account merely because the email matches.
    const existingEmailUser = isGuest
      ? await User.findOne({ email: normalizedCustomerEmail })
        .select('_id role isActive isGuestProfile +password +firebaseUid')
      : null;
    const reusableGuestProfile = Boolean(
      existingEmailUser
      && existingEmailUser.role === 'customer'
      && existingEmailUser.isActive
      && (existingEmailUser as unknown as { isGuestProfile?: boolean }).isGuestProfile === true
      && !(existingEmailUser as unknown as { password?: string }).password
      && !(existingEmailUser as unknown as { firebaseUid?: string }).firebaseUid,
    );
    if (existingEmailUser && !reusableGuestProfile) {
      return NextResponse.json(
        { success: false, code: 'ACCOUNT_AUTH_REQUIRED', message: 'An account already exists for this email. Sign in before checking out.' },
        { status: 409 },
      );
    }

    const normalizedDiscountCode = discountCode ? String(discountCode).trim().toUpperCase() : undefined;
    const storedQuote = paymentDetails?.paymentIntentId && paymentMethod !== 'bank'
      ? await CheckoutPaymentQuote.findOne({
          paymentIntentId: String(paymentDetails.paymentIntentId),
          tenantId: 'default',
          expiresAt: { $gt: new Date() },
        }).lean<{
          quoteBinding: string;
          checkoutAttemptId?: string;
          customer: { email: string };
          cart: SecureCartItem[];
          pricing: { subtotal: number; serviceFee: number; tax: number; discount: number; total: number; currency: string };
          discountCode?: string;
          inventoryState?: string;
        } | null>()
      : null;
    if (storedQuote && String(storedQuote.customer.email).trim().toLowerCase() !== normalizedCustomerEmail) {
      return NextResponse.json(
        { success: false, code: 'QUOTE_OWNER_MISMATCH', message: 'Payment does not belong to this customer.' },
        { status: 403 },
      );
    }
    if (storedQuote && (storedQuote.discountCode || undefined) !== normalizedDiscountCode) {
      return NextResponse.json(
        { success: false, code: 'QUOTE_CHANGED', message: 'The discount selection changed. Please restart checkout.' },
        { status: 409 },
      );
    }
    if (storedQuote?.inventoryState === 'refunded' || storedQuote?.inventoryState === 'refund_failed') {
      return NextResponse.json(
        {
          success: false,
          code: storedQuote.inventoryState === 'refunded' ? 'INVENTORY_REFUNDED' : 'INVENTORY_REFUND_REQUIRES_SUPPORT',
          message: storedQuote.inventoryState === 'refunded'
            ? 'This payment was refunded because the selected departure was no longer available.'
            : 'This payment needs support review before a booking can be created.',
        },
        { status: 409 },
      );
    }

    // Once Stripe has charged a persisted quote, use that immutable server-side
    // snapshot. Re-resolving a newer price here could reject a successfully paid
    // customer while the webhook creates the original booking independently.
    const cart = storedQuote?.cart || await secureCartPricing(requestedCart);
    if (!storedQuote) await assertCartAvailability(cart);

    // Always compute pricing on the server to avoid stale/incorrect totals in emails/PDFs
    // IMPORTANT: Always use USD since all prices are stored and charged in USD
    // Client may send display currency (EUR, GBP, etc.) but we ignore it for actual charges
    const currencyCode = 'USD';
    const currencySymbol = '$';
    const computedSubtotal = storedQuote?.pricing.subtotal ?? calculateCartSubtotal(cart || []);
    let computedDiscount = storedQuote?.pricing.discount ?? 0;
    if (!storedQuote && discountCode) {
      const discount = await Discount.findOne({ code: String(discountCode).toUpperCase() });
      if (discount && discount.isActive && (!discount.expiresAt || new Date(discount.expiresAt) >= new Date()) && (!discount.usageLimit || discount.timesUsed < discount.usageLimit)) {
        computedDiscount = discount.discountType === 'percentage'
          ? round2((computedSubtotal * discount.value) / 100)
          : round2(discount.value);
      }
    }
    const computedServiceFee = storedQuote?.pricing.serviceFee ?? round2(computedSubtotal * 0.03);
    const computedTax = storedQuote?.pricing.tax ?? round2(computedSubtotal * 0.05);
    const computedTotal = storedQuote?.pricing.total ?? round2(Math.max(0, computedSubtotal + computedServiceFee + computedTax - computedDiscount));

    const computedPricing = {
      subtotal: computedSubtotal,
      serviceFee: computedServiceFee,
      tax: computedTax,
      discount: computedDiscount,
      total: computedTotal,
      currency: currencyCode,
      symbol: currencySymbol,
    };

    const isBankTransfer = paymentMethod === 'bank';
    const isCardPayment = !isBankTransfer;
    if (paymentMethod === 'pay_later') {
      return NextResponse.json(
        { success: false, message: 'Pay Later is currently unavailable. Please select another payment method.' },
        { status: 400 },
      );
    }

    // Verify money before creating a guest account or sending any email. This
    // prevents an unpaid/fabricated PaymentIntent from becoming an account or
    // notification spam primitive.
    let verifiedPaymentIntent: Stripe.PaymentIntent | null = null;
    if (isCardPayment) {
      if (!paymentDetails?.paymentIntentId) {
        return NextResponse.json(
          { success: false, code: 'PAYMENT_REQUIRED', message: 'A verified PaymentIntent is required for card checkout.' },
          { status: 400 },
        );
      }
      try {
        verifiedPaymentIntent = await getStripe().paymentIntents.retrieve(String(paymentDetails.paymentIntentId));
      } catch (stripeError) {
        console.error('Stripe PaymentIntent retrieval failed.', stripeError);
        return NextResponse.json(
          { success: false, code: 'PAYMENT_INVALID', message: 'The payment could not be verified. Please restart checkout.' },
          { status: 400 },
        );
      }
      if (verifiedPaymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { success: false, code: 'PAYMENT_INCOMPLETE', message: 'Payment has not been completed.' },
          { status: 402 },
        );
      }
      const expectedAmount = Math.round(computedPricing.total * 100);
      const metadataCheckoutAttemptId = normalizeCheckoutAttemptId(
        verifiedPaymentIntent.metadata?.checkout_attempt_id,
      );
      if (!storedQuote && !metadataCheckoutAttemptId) {
        return NextResponse.json(
          { success: false, code: 'PAYMENT_QUOTE_MISMATCH', message: 'Payment does not match this checkout quote. Please restart checkout.' },
          { status: 409 },
        );
      }
      const expectedBinding = storedQuote?.quoteBinding || buildQuoteBinding({
        cart,
        customerEmail: normalizedCustomerEmail,
        currency: 'USD',
        amountMinor: expectedAmount,
        discountCode,
        checkoutAttemptId: metadataCheckoutAttemptId!,
      });
      if (
        verifiedPaymentIntent.amount !== expectedAmount
        || verifiedPaymentIntent.currency.toLowerCase() !== 'usd'
        || verifiedPaymentIntent.metadata?.quote_binding !== expectedBinding
        || (storedQuote?.checkoutAttemptId
          && metadataCheckoutAttemptId !== storedQuote.checkoutAttemptId)
      ) {
        return NextResponse.json(
          { success: false, code: 'PAYMENT_QUOTE_MISMATCH', message: 'Payment does not match this checkout quote. Please restart checkout.' },
          { status: 409 },
        );
      }
      paymentFulfillmentLeaseKey = `payment:${verifiedPaymentIntent.id}`;
      paymentFulfillmentLeaseToken = await acquireCheckoutInventoryLease(paymentFulfillmentLeaseKey, 120_000);
      try {
        await ensureInventoryHoldsForPayment({
          paymentIntentId: verifiedPaymentIntent.id,
          reservationKey: expectedBinding,
          cart,
        });
      } catch (inventoryError) {
        if (!(inventoryError instanceof InventoryHoldError)) throw inventoryError;
        await refundUnavailablePaidInventory({
          stripe: getStripe(),
          paymentIntentId: verifiedPaymentIntent.id,
          reason: inventoryError.code,
        });
        return NextResponse.json(
          {
            success: false,
            code: 'INVENTORY_REFUNDED',
            message: 'The departure became unavailable before fulfilment. Your payment has been refunded automatically.',
          },
          { status: 409 },
        );
      }
    } else {
      // Bank-transfer bookings become durable Pending capacity immediately.
      // A short internal hold closes the race between validation and Booking.create.
      bankReservationKey = randomBytes(32).toString('hex');
      await createInventoryHolds({ reservationKey: bankReservationKey, cart });
    }

    let user = null;

    // Handle user creation
    if (isGuest) {
      if (reusableGuestProfile && existingEmailUser) {
        user = existingEmailUser;
      } else {
        try {
          user = await User.create({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: normalizedCustomerEmail,
            phone: customer.phone ? String(customer.phone).slice(0, 50) : undefined,
            country: customer.country ? String(customer.country).slice(0, 100) : undefined,
            role: 'customer',
            permissions: [],
            isGuestProfile: true,
          });
        } catch (userError: unknown) {
          if ((userError as { code?: string | number }).code === 11000) {
            const concurrentGuest = await User.findOne({
              email: normalizedCustomerEmail,
              role: 'customer',
              isActive: true,
              isGuestProfile: true,
              firebaseUid: { $exists: false },
              password: { $exists: false },
            });
            if (concurrentGuest) user = concurrentGuest;
            else {
              return NextResponse.json(
                { success: false, code: 'ACCOUNT_AUTH_REQUIRED', message: 'An account already exists for this email. Sign in before checking out.' },
                { status: 409 },
              );
            }
          } else {
            throw userError;
          }
        }
      }
    } else {
      const authResult = await authenticateFirebaseUser(request);
      if (!authResult.success || !authResult.user) {
        return NextResponse.json(
          { success: false, message: authResult.error || 'Authentication required' },
          { status: authResult.statusCode || 401 },
        );
      }
      user = authResult.user;
      if (String(user.email).toLowerCase() !== normalizedCustomerEmail) {
        return NextResponse.json(
          { success: false, code: 'IDENTITY_MISMATCH', message: 'Checkout email must match the authenticated account.' },
          { status: 403 },
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unable to process user information' },
        { status: 400 }
      );
    }

    // Process payment based on payment method
    let paymentResult;

    if (isBankTransfer) {
      // For bank transfer, no Stripe processing needed
      paymentResult = {
        paymentId: `BANK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'pending',
        amount: computedPricing.total,
        currency: 'USD',
      };
    } else {
      if (!verifiedPaymentIntent) throw new Error('Verified PaymentIntent state was lost.');
      paymentResult = {
        paymentId: verifiedPaymentIntent.id,
        status: verifiedPaymentIntent.status,
        amount: verifiedPaymentIntent.amount / 100,
        currency: verifiedPaymentIntent.currency.toUpperCase(),
      };
    }

    if (isBankTransfer) {
      // Send bank transfer instructions email
      try {
        await EmailService.sendBankTransferInstructions({
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email,
          tourTitle: cart.length === 1 ? cart[0].title : `${cart.length} Tours`,
          bookingId: `BOOKING-${Date.now()}`,
          bookingDate: formatBookingDate(cart[0]?.selectedDate),
          bookingTime: cart[0]?.selectedTime || '10:00',
          participants: `${cart.reduce((sum, item) => sum + item.quantity + item.childQuantity + item.infantQuantity, 0)} participant(s)`,
          totalPrice: `$${computedPricing.total.toFixed(2)}`,
          bankName: 'Commercial International Bank (CIB)',
          accountName: 'Egypt Excursions Online',
          accountNumber: '1001234567890',
          iban: 'EG380001001001234567890',
          swiftCode: 'CIBEEGCX',
          currency: paymentResult.currency,
          specialRequests: customer.specialRequests,
          hotelPickupDetails: customer.hotelPickupDetails,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
        });
      } catch (emailError) {
        console.error('Failed to send bank transfer email:', emailError);
        // Don't fail the booking if email fails
      }
    }

    // STABLE FLOW: Create bookings immediately for ALL payment methods
    // - Card payments: Create with "Pending" status, webhook will update to "Confirmed" and send customer email
    // - Bank transfers: Create with "Pending" status
    // - Admin is notified immediately for all bookings

    // Check if booking already exists for this payment (idempotency)
    if (isCardPayment && paymentResult.paymentId) {
      const existingBookings = await Booking.find({ paymentId: paymentResult.paymentId, user: user._id, ...DEFAULT_TENANT_FILTER })
        .sort({ paymentItemIndex: 1, createdAt: 1 })
        .lean();
      if (existingBookings.length >= cart.length) {
        const existingBooking = existingBookings[0];
        console.log(`[Checkout] Booking already exists for payment ${paymentResult.paymentId}`);
        if (normalizedDiscountCode) {
          await recordCardDiscountUsageOnce(paymentResult.paymentId, normalizedDiscountCode);
        }
        await markPaymentInventoryConverted(paymentResult.paymentId);
        const receiptToken = await signToken({
          sub: `receipt:${paymentResult.paymentId}`,
          scope: 'receipt',
          paymentId: paymentResult.paymentId,
        }, { expiresIn: '1h' });
        return NextResponse.json({
          success: true,
          message: 'Booking confirmed!',
          bookingId: existingBooking.bookingReference,
          bookings: existingBookings.map((booking) => booking._id),
          paymentId: paymentResult.paymentId,
          receiptToken,
          customer: {
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
          },
        });
      }
    }

    // Create bookings with generated references
    const createdBookings = [];
    
    for (let i = 0; i < cart.length; i++) {
      const cartItem = cart[i];
      try {
        // Recheck immediately before persistence to narrow the gap between
        // quote/payment and booking creation.
        await assertCartAvailability([cartItem]);
        const tour = await Tour.findOne({ _id: cartItem._id || cartItem.id, isPublished: true, ...DEFAULT_TENANT_FILTER });
        if (!tour) {
          throw new Error(`Tour not found: ${cartItem.title}`);
        }

        // Use parseLocalDate to ensure date-only strings are parsed correctly
        const bookingDate = parseLocalDate(cartItem.selectedDate) || new Date();
        // Store the original date string (YYYY-MM-DD) for timezone-safe display
        const bookingDateString = ensureDateOnlyString(cartItem.selectedDate);
        const bookingTime = cartItem.selectedTime || '10:00';
        const totalGuests = (cartItem.quantity || 1) + (cartItem.childQuantity || 0) + (cartItem.infantQuantity || 0);

        // Compute per-item subtotal (no fees/tax) to match server discount basis.
        // NOTE: overall discount is computed from computedPricing.subtotal (no fees/tax), so we prorate using the same basis.
        const itemSubtotal = checkoutItemSubtotal(cartItem);
        const itemServiceFee = round2(itemSubtotal * 0.03);
        const itemTax = round2(itemSubtotal * 0.05);
        const itemTotalBeforeDiscount = round2(itemSubtotal + itemServiceFee + itemTax);

        const discountBase = computedPricing.subtotal || 0;
        const itemDiscountShare = computedPricing.discount > 0
          ? (cart.length === 1
              ? computedPricing.discount
              : round2(discountBase > 0 ? (itemSubtotal / discountBase) * computedPricing.discount : 0))
          : 0;

        // Final total for this booking (with discount applied)
        const itemTotalPrice = round2(Math.max(0, itemTotalBeforeDiscount - itemDiscountShare));

        // Card payments use deterministic refs so webhook + checkout converge on one booking/item.
        const bookingReference = (isCardPayment && paymentResult.paymentId)
          ? generateDeterministicBookingReference(paymentResult.paymentId, i)
          : await generateUniqueBookingReference();

        let booking;
        try {
          booking = await Booking.create({
          tenantId: 'default',
          bookingReference, // Provide the reference explicitly
          tour: tour._id,
          user: user._id,
          date: bookingDate,
          dateString: bookingDateString, // Store original YYYY-MM-DD for timezone-safe display
          time: bookingTime,
          guests: totalGuests,
          totalPrice: itemTotalPrice,
            currency: paymentResult.currency || 'USD',
          // Card payments: "Pending" until webhook confirms payment succeeded
          // Bank transfers: "Pending" until manual confirmation
          // Webhook will update card payments to "Confirmed" when payment succeeds
          status: 'Pending',
          source: 'online',
          paymentStatus: isCardPayment ? 'paid' : 'pending',
          amountPaid: isCardPayment ? itemTotalPrice : 0,
          paymentConfirmedAt: isCardPayment ? new Date() : undefined,
          paymentConfirmedBy: isCardPayment ? `stripe:${paymentResult.paymentId}` : undefined,
          paymentId: paymentResult.paymentId,
          paymentItemIndex: i,
          checkoutItemKey: isCardPayment && paymentResult.paymentId
            ? `default:${paymentResult.paymentId}:${i}`
            : undefined,
          paymentDetails: isCardPayment && paymentResult.paymentId && verifiedPaymentIntent
            ? {
                provider: 'stripe',
                mode: verifiedPaymentIntent.livemode ? 'live' : 'test',
                source: 'eeo-web',
                transactionId: paymentResult.paymentId,
              }
            : undefined,
          paymentMethod,
          customerPhone: customer.phone ? String(customer.phone).slice(0, 50) : undefined,
          customerCountry: customer.country ? String(customer.country).slice(0, 100) : undefined,
          specialRequests: customer.specialRequests,
          emergencyContact: customer.emergencyContact,
          hotelPickupDetails: customer.hotelPickupDetails,
          hotelPickupLocation: customer.hotelPickupLocation,
          adultGuests: cartItem.quantity || 1,
          childGuests: cartItem.childQuantity || 0,
          infantGuests: cartItem.infantQuantity || 0,
          selectedAddOns: cartItem.selectedAddOns || {},
          addOnQuantityVersion: cartItem.addOnQuantityVersion,
          selectedBookingOption: cartItem.selectedBookingOption,
          priceSnapshot: {
            guestPrices: cartItem.guestPrices,
            unitPricing: cartItem.unitPricing || undefined,
            version: cartItem.priceVersion,
            executionId: cartItem.priceExecutionId || undefined,
            overrideId: cartItem.priceOverrideId || undefined,
            source: cartItem.priceSource,
            capturedAt: new Date(),
          },
          selectedAddOnDetails: cartItem.selectedAddOnDetails || {},
          // Store discount info if a promo code was applied
          discountCode: discountCode ? String(discountCode).toUpperCase() : undefined,
          discountAmount: itemDiscountShare > 0 ? itemDiscountShare : undefined,
        });
        } catch (createError: unknown) {
          // E11000 = duplicate key error - booking already exists (commonly from webhook race)
          if (
            (createError as { code?: string | number }).code === 11000 &&
            ((createError as { keyPattern?: { bookingReference?: unknown; paymentId?: unknown; checkoutItemKey?: unknown } }).keyPattern?.bookingReference ||
              (createError as { keyPattern?: { bookingReference?: unknown; paymentId?: unknown; checkoutItemKey?: unknown } }).keyPattern?.paymentId ||
              (createError as { keyPattern?: { bookingReference?: unknown; paymentId?: unknown; checkoutItemKey?: unknown } }).keyPattern?.checkoutItemKey)
          ) {
            console.log(`[Checkout] Booking already exists for payment ${paymentResult.paymentId} (created concurrently)`);
            const existingBooking = await Booking.findOne({ bookingReference, ...DEFAULT_TENANT_FILTER }) ||
              await Booking.findOne({
                paymentId: paymentResult.paymentId,
                paymentItemIndex: i,
                ...DEFAULT_TENANT_FILTER,
              }) ||
              await Booking.findOne({
                checkoutItemKey: `default:${paymentResult.paymentId}:${i}`,
                ...DEFAULT_TENANT_FILTER,
              });
            if (existingBooking) {
              booking = existingBooking;
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }

        createdBookings.push(booking);
        if (isCardPayment) {
          await convertInventoryHold({
            paymentIntentId: paymentResult.paymentId,
            itemIndex: i,
            bookingId: booking._id,
          });
        } else if (bankReservationKey) {
          bankCreatedBookingIds.push(booking._id);
          await convertInventoryReservationHold({
            reservationKey: bankReservationKey,
            itemIndex: i,
            bookingId: booking._id,
          });
        }
        
        // Add a small delay between bookings
        if (i < cart.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (bookingError: unknown) {
        console.error('Error creating booking:', bookingError);
        throw new Error(`Failed to create booking for ${cartItem.title}: ${(bookingError as Error).message}`);
      }
    }

    if (isCardPayment) await markPaymentInventoryConverted(paymentResult.paymentId);
    // At this point each bank hold has become a durable Pending booking, so a
    // later non-critical email failure must not cancel the reservation.
    bankReservationKey = undefined;
    bankCreatedBookingIds.length = 0;

    // Count a card-backed discount at most once even when checkout and Stripe
    // webhook delivery race or the browser retries the completion request.
    if (normalizedDiscountCode) {
      if (isCardPayment && paymentResult.paymentId) {
        try {
          await recordCardDiscountUsageOnce(paymentResult.paymentId, normalizedDiscountCode);
        } catch (discountError) {
          console.error('Error updating discount usage:', discountError);
        }
      } else {
        try {
          await Discount.findOneAndUpdate(
            { code: normalizedDiscountCode },
            { $inc: { timesUsed: 1 } },
          );
        } catch (discountError) {
          console.error('Error updating discount usage:', discountError);
        }
      }
    }

    // Generate booking confirmation data
    const mainBooking = createdBookings[0];
    const mainTour = await Tour.findById(mainBooking.tour);
    const bookingId = createdBookings.length === 1 ? mainBooking.bookingReference : `MULTI-${Date.now()}`;

    // IMPORTANT: Use the original cart date string for emails to avoid timezone issues
    // MongoDB stores dates in UTC which can cause off-by-one day errors when reformatted
    const mainCartItem = cart[0];
    const emailBookingDate = formatBookingDate(mainCartItem?.selectedDate);
    const emailBookingTime = mainCartItem?.selectedTime || mainBooking.time;
    const formatMoney = (value?: number) => formatCurrencyValue(value, currencySymbol);
    const orderedItemsSummary = cart.map((item) => {
      const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
      const total = checkoutItemSubtotal(item);

      return {
        title: item.title,
        image: item.image,
        adults: item.quantity || 0,
        children: item.childQuantity || 0,
        infants: item.infantQuantity || 0,
        bookingOption: item.selectedBookingOption?.title,
        totalPrice: formatMoney(total),
        // For receipt PDF generation
        quantity: item.quantity || 0,
        childQuantity: item.childQuantity || 0,
        infantQuantity: item.infantQuantity || 0,
        price: Number(basePrice) || 0,
        selectedBookingOption: item.selectedBookingOption ? {
          title: item.selectedBookingOption.title,
          price: Number(item.selectedBookingOption.price) || 0,
        } : undefined,
      };
    });

    const pricingDetails = {
      subtotal: formatMoney(computedPricing.subtotal),
      serviceFee: formatMoney(computedPricing.serviceFee),
      tax: formatMoney(computedPricing.tax),
      discount: computedPricing.discount > 0 ? formatMoney(computedPricing.discount) : undefined,
      total: formatMoney(computedPricing.total),
      currencySymbol,
    };

    const pricingRaw = {
      subtotal: computedPricing.subtotal,
      serviceFee: computedPricing.serviceFee,
      tax: computedPricing.tax,
      discount: computedPricing.discount,
      total: computedPricing.total,
      symbol: currencySymbol,
    };

    const hotelPickupLocation = customer.hotelPickupLocation || null;
    const hotelPickupMapImage = buildStaticMapImageUrl(hotelPickupLocation);
    const hotelPickupMapLink = buildGoogleMapsLink(hotelPickupLocation);
    const timeUntilTour = computeTimeUntilTour(mainCartItem?.selectedDate, emailBookingTime);
    const parsedDateForBadge = parseLocalDate(mainCartItem?.selectedDate) || new Date();
    const dateBadge = parsedDateForBadge
      ? {
          dayLabel: parsedDateForBadge.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
          dayNumber: parsedDateForBadge.getDate(),
          monthLabel: parsedDateForBadge.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
          year: parsedDateForBadge.getFullYear()
        }
      : undefined;
    
    // STABLE EMAIL FLOW:
    // 1. Admin Alert: Sent IMMEDIATELY for all bookings (so admin knows about booking attempt)
    // 2. Customer Confirmation: 
    //    - Card payments: Sent by webhook AFTER payment succeeds
    //    - Bank transfers: Sent here with bank transfer instructions

    // Prepare common email data
    const bookingOption = mainCartItem?.selectedBookingOption?.title;
    const adultCount = mainCartItem?.quantity || 0;
    const childCount = mainCartItem?.childQuantity || 0;
    const infantCount = mainCartItem?.infantQuantity || 0;

    const participantParts = [];
    if (mainCartItem?.unitPricing) {
      // Unit-priced options (per couple/family/group) are charged in whole
      // units — a per-guest price breakdown here would misstate the charge.
      const totalParticipants = adultCount + childCount + infantCount;
      const units = unitCount(totalParticipants, mainCartItem.unitPricing.unitSize || null);
      participantParts.push(
        `${totalParticipants} participant${totalParticipants === 1 ? '' : 's'} — `
        + `${unitCountLabel(mainCartItem.selectedBookingOption?.type, units)} x $${Number(mainCartItem.unitPricing.unitPrice).toFixed(2)}`,
      );
    } else {
      if (adultCount > 0) {
        const basePrice = mainCartItem?.selectedBookingOption?.price || mainCartItem?.discountPrice || mainCartItem?.price || 0;
        participantParts.push(`${adultCount} x Adult${adultCount > 1 ? 's' : ''} ($${basePrice.toFixed(2)})`);
      }
      if (childCount > 0) {
        const basePrice = mainCartItem?.selectedBookingOption?.price || mainCartItem?.discountPrice || mainCartItem?.price || 0;
        const childPrice = Number(mainCartItem?.guestPrices?.child ?? basePrice / 2);
        participantParts.push(`${childCount} x Child${childCount > 1 ? 'ren' : ''} ($${childPrice.toFixed(2)})`);
      }
      if (infantCount > 0) {
        const infantPrice = Number(mainCartItem?.guestPrices?.infant ?? 0);
        participantParts.push(`${infantCount} x Infant${infantCount > 1 ? 's' : ''} ($${infantPrice.toFixed(2)})`);
      }
    }

    // SEND ADMIN ALERT IMMEDIATELY (before customer email)
    // This ensures admin always knows about booking attempts
    try {
      // Prepare detailed tour information
      const tourDetails = await Promise.all(cart.map(async (item) => {
        const tour = await Tour.findById(item._id || item.id);

        // Get add-ons details
        const addOns: string[] = [];
        if (item.selectedAddOns && item.selectedAddOnDetails) {
          Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
            const addOnDetail = item.selectedAddOnDetails?.[addOnId];
            const numericQuantity = Number(quantity);
            if (addOnDetail && numericQuantity > 0) {
              addOns.push(addOnDetail.title);
            }
          });
        }

        // Calculate item price
        const getItemTotal = (item: SecureCartItem) => {
          return checkoutItemSubtotal(item);
        };

        return {
          title: tour?.title || item.title,
          // Use parseLocalDate to ensure consistent date parsing
          date: (() => {
            const date = parseLocalDate(item.selectedDate);
            return date ? date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : '';
          })(),
          time: item.selectedTime || '10:00',
          adults: item.quantity || 0,
          children: item.childQuantity || 0,
          infants: item.infantQuantity || 0,
          bookingOption: item.selectedBookingOption?.title,
          addOns: addOns.length > 0 ? addOns : undefined,
          price: formatMoney(getItemTotal(item))
        };
      }));

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

      await EmailService.sendAdminBookingAlert({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        tourTitle: cart.length === 1 ? mainTour?.title || 'Tour' : `${cart.length} Tours`,
        bookingId: bookingId,
        // Use original cart date to avoid timezone issues with MongoDB UTC storage
        bookingDate: emailBookingDate,
        totalPrice: formatMoney(computedPricing.total),
        paymentMethod: paymentMethod,
        specialRequests: customer.specialRequests,
        hotelPickupDetails: customer.hotelPickupDetails,
        hotelPickupLocation,
        hotelPickupMapImage: hotelPickupMapImage || undefined,
        hotelPickupMapLink: hotelPickupMapLink || undefined,
        adminDashboardLink: baseUrl ? `${baseUrl}/admin/bookings/${bookingId}` : undefined,
        baseUrl,
        tours: tourDetails,
        timeUntil: timeUntilTour || undefined,
        dateBadge,
        // Include discount/promo code info if applied
        discountCode: discountCode ? String(discountCode).toUpperCase() : undefined,
        discountAmount: computedPricing.discount > 0 ? formatMoney(computedPricing.discount) : undefined,
      });
      console.log(`[Checkout] Admin alert sent for booking ${bookingId}`);
    } catch (emailError) {
      console.error('Failed to send admin alert email:', emailError);
      // Don't fail the booking if admin email fails
    }

    // CUSTOMER EMAIL: Only send immediately for bank transfers
    // Card payments: Customer will receive confirmation from webhook after payment succeeds
    if (isBankTransfer) {
      try {
        await EmailService.sendBookingConfirmation({
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email,
          tourTitle: cart.length === 1 ? mainTour?.title || 'Tour' : `${cart.length} Tours`,
          bookingDate: emailBookingDate,
          bookingTime: emailBookingTime,
          participants: `${mainBooking.guests} participant${mainBooking.guests !== 1 ? 's' : ''}`,
          participantBreakdown: participantParts.join(', '),
          totalPrice: formatMoney(computedPricing.total),
          bookingId: bookingId,
          bookingOption: bookingOption,
          specialRequests: customer.specialRequests,
          hotelPickupDetails: customer.hotelPickupDetails,
          hotelPickupLocation,
          hotelPickupMapImage: hotelPickupMapImage || undefined,
          hotelPickupMapLink: hotelPickupMapLink || undefined,
          meetingPoint: mainTour?.meetingPoint || "Meeting point will be confirmed 24 hours before tour",
          contactNumber: "+20 11 42255624",
          tourImage: mainTour?.image,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
          orderedItems: orderedItemsSummary,
          pricingDetails,
          pricingRaw,
          timeUntil: timeUntilTour || undefined,
          customerPhone: customer.phone,
          dateBadge,
          // Promo code info
          discountCode: discountCode ? String(discountCode).toUpperCase() : undefined,
        });
        console.log(`[Checkout] Customer confirmation sent for bank transfer booking ${bookingId}`);
        await Booking.updateMany(
          { _id: { $in: createdBookings.map((booking) => booking._id) } },
          { $set: { confirmationSentAt: new Date() }, $unset: { confirmationEmailFailedAt: 1, confirmationEmailFailureCode: 1 } },
        ).catch(() => undefined);
      } catch (emailError) {
        console.error('Failed to send customer confirmation email:', emailError);
        // Record the failure so the admin UI can surface it ("nothing silent").
        const failureCode = (emailError instanceof Error ? emailError.message : 'unknown_error').slice(0, 200);
        await Booking.updateMany(
          { _id: { $in: createdBookings.map((booking) => booking._id) } },
          { $set: { confirmationEmailFailedAt: new Date(), confirmationEmailFailureCode: failureCode } },
        ).catch(() => undefined);
      }
    } else {
      console.log(`[Checkout] Card payment - customer confirmation will be sent by webhook after payment succeeds`);
    }

    // Return success response
    const receiptToken = await signToken({
      sub: `receipt:${paymentResult.paymentId}`,
      scope: 'receipt',
      paymentId: paymentResult.paymentId,
    }, { expiresIn: '1h' });

    return NextResponse.json({
      success: true,
      message: 'Booking completed successfully!',
      bookingId: bookingId,
      bookings: createdBookings.map(booking => booking._id),
      paymentId: paymentResult.paymentId,
      receiptToken,
      customer: {
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
      },
      ...(isGuest && { 
        guestAccount: true,
        message: 'Booking completed! A temporary account has been created with your email. You can set a password later to access your bookings.',
      }),
    });

  } catch (error: unknown) {
    console.error('Checkout error:', error);

    if (bankReservationKey) {
      await releaseInventoryHolds({ reservationKey: bankReservationKey, reason: 'bank_booking_failed' }).catch(() => undefined);
      if (bankCreatedBookingIds.length > 0) {
        await Booking.updateMany(
          { _id: { $in: bankCreatedBookingIds }, tenantId: 'default', status: 'Pending' },
          { $set: { status: 'Cancelled', refundReason: 'Bank booking creation did not complete' } },
        ).catch(() => undefined);
      }
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
    
    if ((error as Error).message.includes('Payment processing failed')) {
      return NextResponse.json(
        { success: false, message: (error as Error).message },
        { status: 402 }
      );
    }

    if ((error as Error).message.includes('Tour not found')) {
      return NextResponse.json(
        { success: false, message: 'One or more tours in your cart are no longer available' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Booking failed due to a server error. Please try again.',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  } finally {
    if (paymentFulfillmentLeaseKey && paymentFulfillmentLeaseToken) {
      await releaseCheckoutInventoryLease(paymentFulfillmentLeaseKey, paymentFulfillmentLeaseToken);
    }
  }
}

// GET method for retrieving checkout session
export async function GET() {
  return NextResponse.json({ success: false, message: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

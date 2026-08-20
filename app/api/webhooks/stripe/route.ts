// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import Booking, { type IBooking } from '@/lib/models/Booking';
import Tour, { type ITour } from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { generateDeterministicBookingReference } from '@/lib/utils/bookingReference';
import type { SecureAddOnDetail } from '@/lib/checkout/serverCartPricing';
import { unpackCartMetadata } from '@/lib/checkout/cartMetadata';
import { recordWebhookOutcome } from '@/lib/checkout/webhookOutcomeLog';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import {
  loadPaidTenant,
  paidCheckoutReservationKey,
  paidTenantFilter,
  paidTenantId,
  paidTenantReferencePrefix,
  paidTenantValue,
} from '@/lib/tenant/paidTenant';
import Discount from '@/lib/models/Discount';
import { recoveryCartItemSubtotal, roundMoney } from '@/lib/checkout/cartTotals';
import { reconcileStripeBookingRefund, reconcileUnboundStripeRefund } from '@/lib/bookings/refunds';
import { sendBookingRefundNotification } from '@/lib/bookings/refundNotifications';
import { deliverCheckoutNotifications } from '@/lib/bookings/checkoutNotificationDelivery';
import {
  acquireCheckoutInventoryLease,
  bindInventoryHoldsToPayment,
  convertInventoryHold,
  ensureInventoryHoldsForPayment,
  InventoryHoldError,
  releaseInventoryHolds,
  releaseCheckoutInventoryLease,
} from '@/lib/checkout/inventoryHolds';
import {
  markPaymentInventoryConverted,
  refundUnavailablePaidInventory,
  releasePaymentInventory,
} from '@/lib/checkout/inventoryPaymentRecovery';
import { loadWebhookPaymentQuote } from '@/lib/checkout/hostedCheckoutQuote';

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

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || '';

type RecoveryCartItem = {
  i?: number;
  t?: string;
  a?: number;
  c?: number;
  n?: number;
  d?: string;
  tm?: string;
  bp?: number;
  bo?: string;
  bot?: string;
  ok?: string;
  gp?: { adult?: number; child?: number; infant?: number };
  us?: number;
  up?: number;
  pv?: number;
  pe?: string;
  po?: string;
  ao?: Array<{ id?: string; q?: number; p?: number; pg?: boolean; t?: string }>;
};

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

// Process successful payment - create booking if it doesn't exist
async function processSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  const paymentId = paymentIntent.id;
  const metadata = paymentIntent.metadata;

  // Every brand's payments arrive at this one endpoint, so the tenant is
  // whatever the checkout that took the money says it is — never this
  // storefront by assumption. Resolving it here keeps the tour lookup, the
  // duplicate check, the booking write and the confirmation on the same brand.
  const tenantId = paidTenantId(metadata);
  const tenantValue = paidTenantValue(tenantId);
  const tenantFilter = paidTenantFilter(tenantId);

  console.log(`[Webhook] Processing payment ${paymentId}`);

  // Check if booking data is available in metadata
  if (metadata.has_booking_data !== 'true') {
    console.log(`[Webhook] No booking data in metadata for ${paymentId}, skipping`);
    return { created: false, reason: 'no_booking_data' };
  }

  await dbConnect();

  // Loaded once so every confirmation on this payment — whether the booking is
  // created here or was already written by the brand's own checkout — goes out
  // under the brand the customer actually bought from.
  const paidTenant = await loadPaidTenant(tenantId);
  const tenantEmailBranding = paidTenant.isDefault ? {} : {
    ...(paidTenant.name ? { companyName: paidTenant.name } : {}),
    ...(paidTenant.logo ? { companyLogo: paidTenant.logo } : {}),
    ...(paidTenant.primaryColor ? { primaryColor: paidTenant.primaryColor } : {}),
    ...(paidTenant.contactEmail ? { contactEmail: paidTenant.contactEmail, supportEmail: paidTenant.contactEmail } : {}),
    ...(paidTenant.contactPhone ? { contactPhone: paidTenant.contactPhone } : {}),
  };

  // Hosted Checkout Sessions don't have a PaymentIntent when the durable
  // quote is written. Adopt the quote exactly once when Stripe later creates
  // the intent, before any pricing, inventory, booking, or discount effect.
  const persistedQuote = await loadWebhookPaymentQuote({
    paymentIntentId: paymentId,
    tenantId: tenantValue,
    metadata,
  });
  const recordDiscountUsage = async () => {
    if (!persistedQuote?.discountCode) return;
    const usageClaimed = await CheckoutPaymentQuote.findOneAndUpdate(
      {
        paymentIntentId: paymentId,
        tenantId: tenantValue,
        discountUsageRecordedAt: { $exists: false },
      },
      { $set: { discountUsageRecordedAt: new Date() } },
    );
    if (!usageClaimed) return;
    try {
      await Discount.findOneAndUpdate(
        { code: persistedQuote.discountCode },
        { $inc: { timesUsed: 1 } },
      );
    } catch (discountError) {
      await CheckoutPaymentQuote.updateOne(
        { paymentIntentId: paymentId, tenantId: tenantValue },
        { $unset: { discountUsageRecordedAt: 1 } },
      ).catch(() => undefined);
      throw discountError;
    }
  };
  const expectedTotal = persistedQuote?.pricing.total ?? Number(metadata.pricing_total);
  if (
    !Number.isFinite(expectedTotal)
    || Math.round(expectedTotal * 100) !== paymentIntent.amount
    || paymentIntent.currency.toLowerCase() !== 'usd'
    || (persistedQuote && metadata.quote_binding !== persistedQuote.quoteBinding)
    || (persistedQuote?.checkoutAttemptId
      && metadata.checkout_attempt_id !== persistedQuote.checkoutAttemptId)
  ) {
    console.error(`[Webhook] Payment quote validation failed for ${paymentId}`);
    await refundUnavailablePaidInventory({
      stripe: getStripe(),
      paymentIntentId: paymentId,
      reason: 'paid_quote_validation_failed',
      tenantId,
    });
    return { created: false, reason: 'invalid_quote_refunded' };
  }

  if (persistedQuote?.inventoryState === 'refunded') {
    return { created: false, reason: 'inventory_already_refunded' };
  }
  if (persistedQuote?.inventoryState === 'refund_failed') {
    console.error(`[Webhook] Inventory refund for ${paymentId} requires manual support review`);
    return { created: false, reason: 'inventory_refund_requires_support' };
  }

  // Parse the authoritative recovery cart before touching users or bookings so
  // every item can be capacity-checked as one paid fulfilment attempt.
  let cartData: RecoveryCartItem[];
  if (Array.isArray(persistedQuote?.cartSummary) && persistedQuote.cartSummary.length > 0) {
    cartData = persistedQuote.cartSummary as RecoveryCartItem[];
  } else {
    try {
      // Reassembles every chunk the checkout wrote, not just the first two.
      const cartJson = unpackCartMetadata(metadata);
      cartData = JSON.parse(cartJson) as RecoveryCartItem[];
      if (!Array.isArray(cartData) || cartData.length === 0 || cartData.length > 10) throw new Error('Cart is invalid');
    } catch (error) {
      console.error(`[Webhook] Failed to parse paid cart ${paymentId}:`, error);
      await refundUnavailablePaidInventory({
        stripe: getStripe(),
        paymentIntentId: paymentId,
        reason: 'invalid_paid_cart',
        tenantId,
      });
      return { created: false, reason: 'invalid_cart_refunded' };
    }
  }

  // Main-site checkouts use quote_binding; the white-label network still uses
  // checkout_fingerprint for the same immutable 64-character cart binding.
  // Every Stripe event reaches this one webhook, so rejecting the sibling key
  // after a successful charge refunds a valid brand booking immediately.
  const reservationKey = paidCheckoutReservationKey(metadata, persistedQuote?.quoteBinding);
  try {
    if (metadata.checkout_experience === 'hosted') {
      if (!persistedQuote) {
        throw new InventoryHoldError(
          'HOSTED_QUOTE_MISSING',
          'The hosted payment quote could not be recovered.',
        );
      }
      await bindInventoryHoldsToPayment(reservationKey, paymentId);
    }
    await ensureInventoryHoldsForPayment({
      tenantId,
      paymentIntentId: paymentId,
      reservationKey,
      cart: cartData.map((item) => ({
        _id: item.t,
        selectedDate: item.d,
        selectedTime: item.tm,
        quantity: item.a,
        childQuantity: item.c,
        infantQuantity: item.n,
        // Main checkout writes the immutable pricing key; the white-label
        // network still writes the legacy option id. Sellability accepts both.
        selectedBookingOption: { pricingKey: item.ok || item.bo },
      })),
    });
  } catch (inventoryError) {
    if (!(inventoryError instanceof InventoryHoldError)) throw inventoryError;
    await refundUnavailablePaidInventory({
      stripe: getStripe(),
      paymentIntentId: paymentId,
      reason: inventoryError.code,
      tenantId,
    });
    return { created: false, reason: 'inventory_unavailable_refunded' };
  }

  // Check if booking already exists for this payment (created by checkout endpoint)
  const existingBookings = await Booking.find({ paymentId }).sort({ paymentItemIndex: 1, createdAt: 1 });
  const rawExpectedBookingCount = Number(metadata.tour_count || persistedQuote?.cartSummary.length || 1);
  const expectedBookingCount = Number.isInteger(rawExpectedBookingCount) && rawExpectedBookingCount > 0
    ? rawExpectedBookingCount
    : 1;
  const existingBooking = existingBookings[0];
  
  // The compact single-booking confirmation path below is intentionally only
  // for one item. Multi-item payments flow through the common recovery loop so
  // the customer/admin messages and receipts contain every paid tour.
  if (existingBooking && existingBookings.length >= expectedBookingCount && expectedBookingCount === 1) {
    console.log(`[Webhook] Booking exists for payment ${paymentId}, status: ${existingBooking.status}`);
    
    // If booking is still "Pending", update to "Confirmed" and send customer email
    if (existingBookings.some((booking) => booking.status === 'Pending') || !existingBooking.confirmationSentAt) {
      console.log(`[Webhook] Updating booking ${existingBooking.bookingReference} from Pending to Confirmed`);
      await Booking.updateMany(
        { _id: { $in: existingBookings.map((booking) => booking._id) } },
        [{ $set: {
          status: 'Confirmed',
          paymentStatus: 'paid',
          amountPaid: '$totalPrice',
          paymentConfirmedAt: new Date(),
          paymentConfirmedBy: `stripe:${paymentId}`,
        } }],
      );
      existingBooking.status = 'Confirmed';
      
      // Need to send customer confirmation email - get tour info
      const tour = await Tour.findOne({ _id: existingBooking.tour, ...tenantFilter });
      const user = await User.findById(existingBooking.user);
      
      if (tour && user) {
        // Send customer confirmation email (see email sending section below)
        // We'll reuse the email sending logic by setting a flag
        // Send confirmation email for the updated booking
        try {
          const bookingDate = formatBookingDate(existingBooking.date);
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
          const formatMoney = (value: number) => `$${value.toFixed(2)}`;
          
          // Extract hotel pickup from existing booking
          const hotelPickupDetails = existingBooking.hotelPickupDetails || '';
          const hotelPickupLocation = existingBooking.hotelPickupLocation || null;
          const hotelPickupMapImage = hotelPickupLocation ? buildStaticMapImageUrl(hotelPickupLocation) : undefined;
          const hotelPickupMapLink = hotelPickupLocation ? buildGoogleMapsLink(hotelPickupLocation) : undefined;
          
          // Build date badge
          const tourDate = existingBooking.date;
          let dateBadge: { dayLabel: string; dayNumber: number; monthLabel: string; year: number } | undefined;
          if (tourDate) {
            const d = new Date(tourDate);
            dateBadge = {
              dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
              dayNumber: d.getDate(),
              monthLabel: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
              year: d.getFullYear(),
            };
          }
          
          // Calculate time until tour
          let timeUntilTour: { days: number; hours: number; minutes: number } | undefined;
          if (tourDate) {
            const targetDate = new Date(tourDate);
            const tourTime = existingBooking.time;
            if (tourTime) {
              const [hours, minutes] = tourTime.split(':').map(Number);
              if (!Number.isNaN(hours)) {
                targetDate.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
              }
            }
            const diff = targetDate.getTime() - Date.now();
            if (diff > 0) {
              timeUntilTour = {
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
              };
            }
          }
          
          // Build ordered items for email
          const orderedItems = [{
            title: tour.title || 'Tour',
            image: tour.image,
            adults: existingBooking.adultGuests || 1,
            children: existingBooking.childGuests || 0,
            infants: existingBooking.infantGuests || 0,
            bookingOption: existingBooking.selectedBookingOption?.title,
            totalPrice: formatMoney(existingBooking.totalPrice || 0),
            quantity: existingBooking.adultGuests || 1,
            childQuantity: existingBooking.childGuests || 0,
            infantQuantity: existingBooking.infantGuests || 0,
            price: existingBooking.selectedBookingOption?.price || 0,
            selectedBookingOption: existingBooking.selectedBookingOption || undefined,
          }];
          
          // Get pricing from metadata or calculate
          const pricingTotal = existingBooking.totalPrice || 0;
          const pricingSubtotal = pricingTotal / 1.08; // Approximate (remove 3% service + 5% tax)
          const pricingServiceFee = pricingSubtotal * 0.03;
          const pricingTax = pricingSubtotal * 0.05;
          const pricingDiscount = existingBooking.discountAmount || 0;
          
          await EmailService.sendBookingConfirmation({
            ...tenantEmailBranding,
            customerName: `${user.firstName} ${user.lastName}`,
            customerEmail: user.email,
            customerPhone: metadata.customer_phone || '',
            tourTitle: tour.title || 'Tour',
            bookingDate: bookingDate,
            bookingTime: existingBooking.time,
            participants: `${existingBooking.guests} participant${existingBooking.guests !== 1 ? 's' : ''}`,
            totalPrice: formatMoney(pricingTotal),
            bookingId: existingBooking.bookingReference,
            bookingOption: existingBooking.selectedBookingOption?.title,
            meetingPoint: tour.meetingPoint || "Meeting point will be confirmed 24 hours before tour",
            contactNumber: paidTenant.contactPhone || "+20 11 42255624",
            tourImage: tour.image,
            baseUrl,
            hotelPickupDetails: hotelPickupDetails || undefined,
            hotelPickupLocation: hotelPickupLocation || undefined,
            hotelPickupMapImage: hotelPickupMapImage || undefined,
            hotelPickupMapLink: hotelPickupMapLink || undefined,
            specialRequests: existingBooking.specialRequests || undefined,
            orderedItems,
            pricingDetails: {
              subtotal: formatMoney(pricingSubtotal),
              serviceFee: formatMoney(pricingServiceFee),
              tax: formatMoney(pricingTax),
              discount: pricingDiscount > 0 ? formatMoney(pricingDiscount) : undefined,
              total: formatMoney(pricingTotal),
              currencySymbol: '$',
            },
            pricingRaw: {
              subtotal: pricingSubtotal,
              serviceFee: pricingServiceFee,
              tax: pricingTax,
              discount: pricingDiscount,
              total: pricingTotal,
              symbol: '$',
            },
            timeUntil: timeUntilTour,
            dateBadge,
            // Promo code info
            discountCode: existingBooking.discountCode || undefined,
          });
          await Booking.updateMany(
            { _id: { $in: existingBookings.map((booking) => booking._id) } },
            { $set: { confirmationSentAt: new Date() }, $unset: { confirmationEmailFailedAt: 1, confirmationEmailFailureCode: 1 } },
          );
          
          console.log(`[Webhook] Sent customer confirmation for updated booking ${existingBooking.bookingReference}`);
        } catch (emailError) {
          console.error(`[Webhook] Failed to send customer email for updated booking:`, emailError);
          const failureCode = (emailError instanceof Error ? emailError.message : 'unknown_error').slice(0, 200);
          await Booking.updateMany(
            { _id: { $in: existingBookings.map((booking) => booking._id) } },
            { $set: { confirmationEmailFailedAt: new Date(), confirmationEmailFailureCode: failureCode } },
          ).catch(() => undefined);
        }
      }
      await recordDiscountUsage();
      await markPaymentInventoryConverted(paymentId, tenantId);
      
      return { 
        created: false, 
        updated: true, 
        reason: 'updated_to_confirmed', 
        bookingId: existingBooking.bookingReference 
      };
    }
    
    // Booking exists and is already Confirmed
    console.log(`[Webhook] Booking ${existingBooking.bookingReference} already confirmed, skipping`);
    await recordDiscountUsage();
    await markPaymentInventoryConverted(paymentId, tenantId);
    return { created: false, reason: 'already_confirmed', bookingId: existingBooking.bookingReference };
  }

  // FALLBACK: Create booking if it doesn't exist (shouldn't happen normally, but ensures no lost bookings)
  console.log(`[Webhook] Creating booking for payment ${paymentId} (fallback - checkout didn't create it)`);

  // Extract customer info from metadata
  const customerEmail = persistedQuote?.customer.email || metadata.customer_email;
  const customerFirstName = persistedQuote?.customer.firstName || metadata.customer_first_name;
  const customerLastName = persistedQuote?.customer.lastName || metadata.customer_last_name;
  const customerPhone = persistedQuote?.customer.phone || metadata.customer_phone || '';
  const emergencyContact = persistedQuote?.customer.emergencyContact || '';

  if (!customerEmail || !customerFirstName || !customerLastName) {
    console.error(`[Webhook] Missing customer data for payment ${paymentId}`);
    await refundUnavailablePaidInventory({
      stripe: getStripe(),
      paymentIntentId: paymentId,
      reason: 'missing_paid_customer_data',
      tenantId,
    });
    return { created: false, reason: 'missing_customer_data_refunded' };
  }

  // Extract hotel pickup info from metadata
  const hotelPickupDetails = persistedQuote?.customer.hotelPickupDetails || metadata.hotel_pickup_details || '';
  let hotelPickupLocation: { lat: number; lng: number; name?: string; address?: string } | null =
    persistedQuote?.customer.hotelPickupLocation || null;
  if (!hotelPickupLocation) {
    try {
      if (metadata.hotel_pickup_location) {
        hotelPickupLocation = JSON.parse(metadata.hotel_pickup_location);
      }
    } catch {
      console.log(`[Webhook] Could not parse hotel pickup location for ${paymentId}`);
    }
  }

  // Extract special requests
  const specialRequests = persistedQuote?.customer.specialRequests || metadata.special_requests || '';

  // Find or create user
  let user = await User.findOne({ email: customerEmail });
  if (!user) {
    try {
      user = await User.create({
        firstName: customerFirstName,
        lastName: customerLastName,
        email: customerEmail,
        phone: customerPhone ? customerPhone.slice(0, 50) : undefined,
        role: 'customer',
        permissions: [],
        isGuestProfile: true,
      });
      console.log('[Webhook] Created guest user');
    } catch (userError: unknown) {
      if ((userError as { code?: string | number }).code === 11000) {
        user = await User.findOne({ email: customerEmail });
      } else {
        throw userError;
      }
    }
  }

  if (!user) {
    console.error('[Webhook] Could not find or create user');
    return { created: false, reason: 'user_creation_failed' };
  }

  // Create bookings for each cart item
  const createdBookings: Array<{ booking: IBooking; tour: ITour }> = [];
  const pricingTotal = persistedQuote?.pricing.total ?? (parseFloat(metadata.pricing_total) || (paymentIntent.amount / 100));

  for (let cartIndex = 0; cartIndex < cartData.length; cartIndex++) {
    const item = cartData[cartIndex];
    try {
      const tourId = item.t;
      // A paid quote remains fulfilment-authoritative even if an operator
      // unpublishes the tour while Stripe is completing the payment.
      const tour = await Tour.findOne({ _id: tourId, ...tenantFilter });
      
      if (!tour) {
        console.error(`[Webhook] Tour not found: ${tourId}`);
        await refundUnavailablePaidInventory({
          stripe: getStripe(),
          paymentIntentId: paymentId,
          reason: 'paid_tour_deleted',
          tenantId,
        });
        return { created: false, reason: 'missing_tour_refunded' };
      }

      const bookingDate = parseLocalDate(item.d) || new Date();
      const bookingDateString = ensureDateOnlyString(item.d);
      const bookingTime = item.tm || '10:00';
      const totalGuests = (item.a || 1) + (item.c || 0) + (item.n || 0);

      // Reuse the same explicit adult/child/infant and add-on calculation as
      // synchronous checkout so webhook recovery cannot drift financially.
      const itemSubtotalRounded = recoveryCartItemSubtotal(item);
      const serviceFee = roundMoney(itemSubtotalRounded * 0.03);
      const tax = roundMoney(itemSubtotalRounded * 0.05);
      const itemTotalBeforeDiscount = roundMoney(itemSubtotalRounded + serviceFee + tax);

      const itemIndex = Number.isFinite(Number(item?.i)) ? Number(item.i) : cartIndex;
      const bookingReference = generateDeterministicBookingReference(paymentId, itemIndex, paidTenantReferencePrefix(tenantId));

      const selectedAddOns: Record<string, number> = {};
      const selectedAddOnDetails: Record<string, SecureAddOnDetail> = {};
      if (Array.isArray(item.ao)) {
        for (const ao of item.ao) {
          if (!ao?.id) continue;
          const qty = Number(ao?.q || 0);
          if (!Number.isFinite(qty) || qty <= 0) continue;
          selectedAddOns[ao.id] = qty;
          selectedAddOnDetails[ao.id] = {
            id: ao.id,
            title: ao.t || 'Add-on',
            price: Number(ao.p || 0),
            category: 'add-on',
            perGuest: !!ao.pg,
          };
        }
      }

      // Extract discount info from metadata
      const discountCode = persistedQuote?.discountCode || (
        metadata.discount_code && metadata.discount_code !== 'none'
          ? metadata.discount_code.toUpperCase()
          : undefined
      );
      const totalDiscount = persistedQuote?.pricing.discount ?? (parseFloat(metadata.pricing_discount) || 0);
      const pricingSubtotal = persistedQuote?.pricing.subtotal ?? (parseFloat(metadata.pricing_subtotal) || itemSubtotalRounded);
      
      // For discount: if single item, apply full discount; if multiple items, prorate based on item's share
      const itemDiscountShare = cartData.length === 1 
        ? totalDiscount 
        : Math.round((itemSubtotalRounded / pricingSubtotal) * totalDiscount * 100) / 100;
      
      // Final total for this item (with discount applied)
      const itemTotalWithDiscount = roundMoney(Math.max(0, itemTotalBeforeDiscount - itemDiscountShare));

      const booking = await Booking.create({
        tenantId: tenantValue,
        bookingReference,
        tour: tour._id,
        user: user._id,
        date: bookingDate,
        dateString: bookingDateString,
        time: bookingTime,
        guests: totalGuests,
        totalPrice: itemTotalWithDiscount,
        currency: (metadata.pricing_currency || paymentIntent.currency || 'USD').toUpperCase(), // Store currency
        status: 'Confirmed',
        source: 'online',
        paymentStatus: 'paid',
        amountPaid: itemTotalWithDiscount,
        paymentConfirmedAt: new Date(),
        paymentConfirmedBy: `stripe:${paymentId}`,
        paymentId: paymentId,
        paymentItemIndex: itemIndex,
        checkoutItemKey: `${tenantId}:${paymentId}:${itemIndex}`,
        paymentDetails: {
          provider: 'stripe',
          mode: paymentIntent.livemode ? 'live' : 'test',
          source: 'eeo-web',
          transactionId: paymentId,
        },
        paymentMethod: 'card',
        customerPhone: customerPhone ? customerPhone.slice(0, 50) : undefined,
        emergencyContact: emergencyContact || undefined,
        adultGuests: item.a || 1,
        childGuests: item.c || 0,
        infantGuests: item.n || 0,
        selectedAddOns: Object.keys(selectedAddOns).length > 0 ? selectedAddOns : undefined,
        selectedAddOnDetails: Object.keys(selectedAddOnDetails).length > 0 ? selectedAddOnDetails : undefined,
        selectedBookingOption: item.bo ? {
          id: item.bo,
          pricingKey: item.ok,
          title: item.bot || '',
          price: item.bp || 0,
        } : undefined,
        priceSnapshot: item.gp ? {
          guestPrices: item.gp,
          unitPricing: item.us !== undefined && Number.isFinite(Number(item.up))
            ? { unitSize: Number(item.us), unitPrice: Number(item.up) }
            : undefined,
          version: Number(item.pv || 0),
          executionId: item.pe || undefined,
          overrideId: item.po || undefined,
          source: item.po ? 'override' : 'catalogue',
          capturedAt: new Date(),
        } : undefined,
        // Store discount info if a promo code was applied
        discountCode: discountCode,
        discountAmount: itemDiscountShare > 0 ? itemDiscountShare : undefined,
        // Hotel pickup and special requests
        hotelPickupDetails: hotelPickupDetails || undefined,
        hotelPickupLocation: hotelPickupLocation || undefined,
        specialRequests: specialRequests || undefined,
      });

      await convertInventoryHold({
        tenantId,
        paymentIntentId: paymentId,
        itemIndex,
        bookingId: booking._id,
      });

      createdBookings.push({
        booking,
        tour,
      });

      console.log(`[Webhook] Created booking ${bookingReference} for tour ${tour.title}`);
    } catch (bookingError: unknown) {
      // E11000 = duplicate key error - booking already exists (commonly created by checkout race)
      if (
        (bookingError as { code?: string | number }).code === 11000 &&
        ((bookingError as { keyPattern?: { bookingReference?: unknown; paymentId?: unknown; checkoutItemKey?: unknown } }).keyPattern?.bookingReference ||
          (bookingError as { keyPattern?: { bookingReference?: unknown; paymentId?: unknown; checkoutItemKey?: unknown } }).keyPattern?.paymentId ||
          (bookingError as { keyPattern?: { bookingReference?: unknown; paymentId?: unknown; checkoutItemKey?: unknown } }).keyPattern?.checkoutItemKey)
      ) {
        const itemIndex = Number.isFinite(Number(item?.i)) ? Number(item.i) : cartIndex;
        const bookingReference = generateDeterministicBookingReference(paymentId, itemIndex, paidTenantReferencePrefix(tenantId));
        console.log(`[Webhook] Booking ${bookingReference} already exists for payment ${paymentId} - skipping duplicate create`);

        const existingBooking = await Booking.findOne({ bookingReference });
        if (existingBooking) {
          await convertInventoryHold({
            tenantId,
            paymentIntentId: paymentId,
            itemIndex,
            bookingId: existingBooking._id,
          });
          const existingTour = await Tour.findOne({ _id: existingBooking.tour, ...tenantFilter });
          if (existingTour) {
            createdBookings.push({
              booking: existingBooking,
              tour: existingTour,
            });
          }
        } else {
          const fallbackExisting = await Booking.findOne({ paymentId, paymentItemIndex: itemIndex }).lean()
            || await Booking.findOne({ checkoutItemKey: `${tenantId}:${paymentId}:${itemIndex}` }).lean();
          if (fallbackExisting) {
            return {
              created: false,
              reason: 'already_exists_concurrent',
              bookingId: fallbackExisting.bookingReference
            };
          }
        }
      } else {
        console.error(`[Webhook] Error creating booking:`, bookingError);
      }
    }
  }

  if (createdBookings.length !== cartData.length) {
    console.error(`[Webhook] Only ${createdBookings.length}/${cartData.length} bookings are durable for payment ${paymentId}`);
    throw new Error('Paid booking recovery is incomplete');
  }

  await Booking.updateMany(
    { paymentId, status: 'Pending' },
    [{ $set: {
      status: 'Confirmed',
      paymentStatus: 'paid',
      amountPaid: '$totalPrice',
      paymentConfirmedAt: new Date(),
      paymentConfirmedBy: `stripe:${paymentId}`,
    } }],
  );

  await recordDiscountUsage();
  await markPaymentInventoryConverted(paymentId, tenantId);

  if (createdBookings.every(({ booking }) => Boolean(booking.confirmationSentAt))) {
    return {
      created: false,
      reason: 'already_confirmed',
      count: createdBookings.length,
      bookingIds: createdBookings.map(({ booking }) => booking.bookingReference),
    };
  }

  // Send confirmation email
  try {
    const mainBooking = createdBookings[0];
    const bookingId = createdBookings.length === 1 
      ? mainBooking.booking.bookingReference 
      : `MULTI-${Date.now()}`;

    const emailBookingDate = formatBookingDate(mainBooking.booking.date);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    
    // Build hotel pickup map image URLs
    const hotelPickupMapImage = hotelPickupLocation ? buildStaticMapImageUrl(hotelPickupLocation) : undefined;
    const hotelPickupMapLink = hotelPickupLocation ? buildGoogleMapsLink(hotelPickupLocation) : undefined;

    // Helper to format money
    const formatMoney = (value: number) => `$${value.toFixed(2)}`;

    // Extract pricing from metadata
    const pricingSubtotal = persistedQuote?.pricing.subtotal ?? (parseFloat(metadata.pricing_subtotal) || pricingTotal);
    const pricingServiceFee = persistedQuote?.pricing.serviceFee ?? (parseFloat(metadata.pricing_service_fee) || 0);
    const pricingTax = persistedQuote?.pricing.tax ?? (parseFloat(metadata.pricing_tax) || 0);
    const pricingDiscount = persistedQuote?.pricing.discount ?? (parseFloat(metadata.pricing_discount) || 0);

    // Calculate time until tour
    const tourDate = mainBooking.booking.date;
    const tourTime = mainBooking.booking.time;
    let timeUntilTour: { days: number; hours: number; minutes: number } | undefined;
    if (tourDate) {
      const targetDate = new Date(tourDate);
      if (tourTime) {
        const [hours, minutes] = tourTime.split(':').map(Number);
        if (!Number.isNaN(hours)) {
          targetDate.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
        }
      }
      const diff = targetDate.getTime() - Date.now();
      if (diff > 0) {
        timeUntilTour = {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        };
      }
    }

    // Build date badge
    let dateBadge: { dayLabel: string; dayNumber: number; monthLabel: string; year: number } | undefined;
    if (tourDate) {
      const d = new Date(tourDate);
      dateBadge = {
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNumber: d.getDate(),
        monthLabel: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        year: d.getFullYear(),
      };
    }

    // Build ordered items array for customer email and receipt PDF
    const orderedItems = createdBookings.map((item) => ({
      title: item.tour?.title || 'Tour',
      image: item.tour?.image,
      adults: item.booking.adultGuests || 1,
      children: item.booking.childGuests || 0,
      infants: item.booking.infantGuests || 0,
      bookingOption: item.booking.selectedBookingOption?.title,
      totalPrice: formatMoney(item.booking.totalPrice || 0),
      // Additional fields for receipt PDF generation
      quantity: item.booking.adultGuests || 1,
      childQuantity: item.booking.childGuests || 0,
      infantQuantity: item.booking.infantGuests || 0,
      price: item.booking.selectedBookingOption?.price || 0,
      selectedBookingOption: item.booking.selectedBookingOption || undefined,
    }));

    const bookingFilter = {
      _id: { $in: createdBookings.map(({ booking }) => booking._id) },
    };

    const sendCustomerConfirmation = async () => {
      await EmailService.sendBookingConfirmation({
      ...tenantEmailBranding,
      customerName: `${customerFirstName} ${customerLastName}`,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      tourTitle: createdBookings.length === 1 
        ? mainBooking.tour?.title || 'Tour' 
        : `${createdBookings.length} Tours`,
      bookingDate: emailBookingDate,
      bookingTime: mainBooking.booking.time,
      participants: `${mainBooking.booking.guests} participant${mainBooking.booking.guests !== 1 ? 's' : ''}`,
      totalPrice: formatMoney(pricingTotal),
      bookingId: bookingId,
      bookingOption: mainBooking.booking.selectedBookingOption?.title,
      meetingPoint: mainBooking.tour?.meetingPoint || "Meeting point will be confirmed 24 hours before tour",
      contactNumber: "+20 11 42255624",
      tourImage: mainBooking.tour?.image,
      baseUrl,
      // Hotel pickup info
      hotelPickupDetails: hotelPickupDetails || undefined,
      hotelPickupLocation: hotelPickupLocation || undefined,
      hotelPickupMapImage: hotelPickupMapImage || undefined,
      hotelPickupMapLink: hotelPickupMapLink || undefined,
      // Special requests
      specialRequests: specialRequests || undefined,
      // Order summary
      orderedItems,
      // Pricing breakdown
      pricingDetails: {
        subtotal: formatMoney(pricingSubtotal),
        serviceFee: formatMoney(pricingServiceFee),
        tax: formatMoney(pricingTax),
        discount: pricingDiscount > 0 ? formatMoney(pricingDiscount) : undefined,
        total: formatMoney(pricingTotal),
        currencySymbol: '$',
      },
      // Raw pricing values for receipt PDF generation
      pricingRaw: {
        subtotal: pricingSubtotal,
        serviceFee: pricingServiceFee,
        tax: pricingTax,
        discount: pricingDiscount,
        total: pricingTotal,
        symbol: '$',
      },
      // Countdown
      timeUntil: timeUntilTour,
      dateBadge,
      // Promo code info
      discountCode: metadata.discount_code && metadata.discount_code !== 'none' 
        ? metadata.discount_code.toUpperCase() 
        : undefined,
      });
      await Booking.updateMany(
        bookingFilter,
        { $set: { confirmationSentAt: new Date() }, $unset: { confirmationEmailFailedAt: 1, confirmationEmailFailureCode: 1 } },
      );
      console.log('[Webhook] Sent booking confirmation');
    };

    // Extract discount info for admin email
    const emailDiscountCode = metadata.discount_code && metadata.discount_code !== 'none' 
      ? metadata.discount_code.toUpperCase() 
      : undefined;
    const emailDiscountAmount = pricingDiscount;

    const sendOperatorAlert = async () => {
      // Build tours array only for the operator path. A failure here must not
      // change the already-delivered customer voucher state.
      const tourDetails = await Promise.all(createdBookings.map(async (item) => {
        const addOns: string[] = [];
        if (item.booking.selectedAddOnDetails) {
          const details = item.booking.selectedAddOnDetails;
          const entries = (details instanceof Map ? Array.from(details.entries()) : Object.entries(details || {})) as unknown as Array<[string, { title?: string }]>;
          for (const [_id, detail] of entries) {
            if (detail?.title) {
              addOns.push(detail.title);
            }
          }
        }

        return {
          title: item.tour?.title || 'Tour',
          date: formatBookingDate(item.booking.date),
          time: item.booking.time,
          adults: item.booking.adultGuests || 1,
          children: item.booking.childGuests || 0,
          infants: item.booking.infantGuests || 0,
          bookingOption: item.booking.selectedBookingOption?.title,
          addOns: addOns.length > 0 ? addOns : undefined,
          price: formatMoney(item.booking.totalPrice || 0),
        };
      }));

      await EmailService.sendAdminBookingAlert({
      customerName: `${customerFirstName} ${customerLastName}`,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      tourTitle: createdBookings.length === 1 
        ? mainBooking.tour?.title || 'Tour' 
        : `${createdBookings.length} Tours`,
      bookingId: bookingId,
      bookingDate: emailBookingDate,
      totalPrice: formatMoney(pricingTotal),
      paymentMethod: 'card',
      baseUrl,
      adminDashboardLink: baseUrl ? `${baseUrl}/admin/bookings/${bookingId}` : undefined,
      // Hotel pickup info
      hotelPickupDetails: hotelPickupDetails || undefined,
      hotelPickupLocation: hotelPickupLocation || undefined,
      hotelPickupMapImage: hotelPickupMapImage || undefined,
      hotelPickupMapLink: hotelPickupMapLink || undefined,
      // Special requests
      specialRequests: specialRequests || undefined,
      // Tours array with all details
      tours: tourDetails,
      // Countdown
      timeUntil: timeUntilTour,
      dateBadge,
      // Include discount/promo code info if applied
      discountCode: emailDiscountCode,
      discountAmount: emailDiscountAmount > 0 ? formatMoney(emailDiscountAmount) : undefined,
      });
      await Booking.updateMany(
        bookingFilter,
        { $set: { operatorNotificationSentAt: new Date() }, $unset: { operatorNotificationFailedAt: 1, operatorNotificationFailureCode: 1 } },
      );
      console.log(`[Webhook] Sent admin alert for booking ${bookingId}`);
    };

    await deliverCheckoutNotifications({
      sendCustomer: sendCustomerConfirmation,
      sendOperator: sendOperatorAlert,
      onFailure: async (channel, error) => {
        const failureCode = (error instanceof Error ? error.message : 'unknown_error').slice(0, 200);
        console.error(`[Webhook] Failed to send ${channel} notification:`, error);
        const update = channel === 'customer'
          ? { $set: { confirmationEmailFailedAt: new Date(), confirmationEmailFailureCode: failureCode } }
          : { $set: { operatorNotificationFailedAt: new Date(), operatorNotificationFailureCode: failureCode } };
        await Booking.updateMany(bookingFilter, update).catch((persistError) => {
          console.error(`[Webhook] Could not record ${channel}-notification failure:`, persistError);
        });
      },
    });
  } catch (notificationPreparationError) {
    console.error('[Webhook] Failed to prepare booking notifications:', notificationPreparationError);
  }

  return { 
    created: true, 
    count: createdBookings.length,
    bookingIds: createdBookings.map(b => b.booking.bookingReference),
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe webhook is not configured');
      return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 });
    }

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        getWebhookSecret()
      );
    } catch {
      console.error('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] PaymentIntent succeeded: ${paymentIntent.id}`);

        // CRITICAL: Create booking if it doesn't exist yet
        // This ensures bookings are created even if the frontend callback fails
        let paymentLeaseToken: string | undefined;
        const paymentLeaseKey = `payment:${paymentIntent.id}`;
        try {
          paymentLeaseToken = await acquireCheckoutInventoryLease(paymentLeaseKey, 120_000);
          const startedAt = Date.now();
          const result = await processSuccessfulPayment(paymentIntent);
          console.log(`[Webhook] Process result for ${paymentIntent.id}:`, result);
          // Every outcome here is durable now. The dangerous ones are silent —
          // a refund because the tour would not resolve, a cart that failed to
          // parse — and each leaves a paying customer with no booking.
          await recordWebhookOutcome({
            event,
            paymentIntent,
            outcome: result.reason || (result.created ? 'created' : 'unknown'),
            created: Boolean(result.created),
            bookingReference: result.bookingId,
            durationMs: Date.now() - startedAt,
          });
        } catch (processError: unknown) {
          console.error(`[Webhook] Failed to process payment ${paymentIntent.id}:`, processError);
          await recordWebhookOutcome({
            event,
            paymentIntent,
            outcome: 'processing_failed',
            created: false,
            errorMessage: processError instanceof Error ? processError.message : 'unknown error',
          });
          // Return 500 so Stripe retries transient failures instead of losing a
          // paid booking after acknowledging the event.
          return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
        } finally {
          if (paymentLeaseToken) {
            await releaseCheckoutInventoryLease(paymentLeaseKey, paymentLeaseToken);
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Payment failed: ${failedPayment.id}`);
        await dbConnect();
        await releasePaymentInventory(
          failedPayment.id,
          'payment_failed',
          paidTenantId(failedPayment.metadata),
        );
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Payment canceled: ${canceledPayment.id}`);
        await dbConnect();
        await releasePaymentInventory(
          canceledPayment.id,
          'payment_canceled',
          paidTenantId(canceledPayment.metadata),
        );
        break;

      case 'checkout.session.expired': {
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        if (expiredSession.metadata?.checkout_experience !== 'hosted') break;
        const reservationKey = expiredSession.metadata.quote_binding;
        const expiredTenant = paidTenantValue(paidTenantId(expiredSession.metadata));
        await dbConnect();
        if (/^[a-f0-9]{64}$/i.test(reservationKey || '')) {
          await releaseInventoryHolds({
            tenantId: expiredTenant,
            reservationKey,
            reason: 'checkout_session_expired',
          });
        }
        await CheckoutPaymentQuote.updateOne(
          {
            tenantId: expiredTenant,
            checkoutSessionId: expiredSession.id,
            inventoryState: { $nin: ['converted', 'refunding', 'refunded', 'refund_failed'] },
          },
          {
            $set: {
              inventoryState: 'released',
              inventoryFailureReason: 'checkout_session_expired',
              inventoryUpdatedAt: new Date(),
            },
          },
        );
        break;
      }

      case 'charge.succeeded':
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge succeeded: ${charge.id}`);
        break;

      case 'refund.created':
      case 'refund.updated':
      case 'refund.failed': {
        const providerRefund = event.data.object as Stripe.Refund;
        await dbConnect();
        let reconciliation = await reconcileStripeBookingRefund(providerRefund);
        if (!reconciliation.handled) {
          reconciliation = await reconcileUnboundStripeRefund(providerRefund);
        }
        if (reconciliation.handled && reconciliation.finalized && reconciliation.bookingId) {
          await sendBookingRefundNotification(String(reconciliation.bookingId)).catch((error) => {
            console.error('Refund finalized but customer notification failed.', error);
          });
        }
        console.log(`[Webhook] Refund ${providerRefund.id} reconciliation:`, reconciliation);
        break;
      }

      case 'charge.refunded': {
        const refundedCharge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge refunded: ${refundedCharge.id}`);
        {
          const refundedPaymentId = typeof refundedCharge.payment_intent === 'string'
            ? refundedCharge.payment_intent
            : refundedCharge.payment_intent?.id;
          if (refundedPaymentId) {
            await dbConnect();
            let handledBookingRefund = false;
            for (const providerRefund of refundedCharge.refunds?.data || []) {
              let reconciliation = await reconcileStripeBookingRefund(providerRefund);
              if (!reconciliation.handled) {
                reconciliation = await reconcileUnboundStripeRefund(providerRefund);
              }
              handledBookingRefund ||= reconciliation.handled;
              if (reconciliation.handled && reconciliation.finalized && reconciliation.bookingId) {
                await sendBookingRefundNotification(String(reconciliation.bookingId)).catch((error) => {
                  console.error('Charge refund finalized but customer notification failed.', error);
                });
              }
            }
            if (!handledBookingRefund) {
              // A dashboard-created legacy refund has no booking metadata. It
              // can only be allocated automatically when exactly one booking
              // is bound to the PaymentIntent; never smear one partial refund
              // across a multi-item checkout.
              const paymentBookings = await Booking.find({ paymentId: refundedPaymentId }).select('_id totalPrice').lean();
              if (paymentBookings.length === 1) {
                const refundedAmount = Number(refundedCharge.amount_refunded || 0) / 100;
                const fullyRefunded = refundedAmount >= Number(paymentBookings[0].totalPrice || 0);
                await Booking.updateOne(
                  { _id: paymentBookings[0]._id, refundState: { $ne: 'succeeded' } },
                  {
                    $set: {
                      status: fullyRefunded ? 'Refunded' : 'Partial_Refund',
                      refundState: 'succeeded',
                      refundProviderStatus: 'succeeded',
                      refundChargeId: refundedCharge.id,
                      refundAmount: refundedAmount,
                      refundDate: new Date(),
                      refundCompletedAt: new Date(),
                      refundReason: 'Stripe dashboard refund (legacy allocation)',
                    },
                  },
                );
                await sendBookingRefundNotification(String(paymentBookings[0]._id)).catch(() => undefined);
              } else if (paymentBookings.length > 1) {
                console.error(`[Webhook] Unallocated multi-booking refund requires review for ${refundedPaymentId}`);
              }
            }
            await releasePaymentInventory(
              refundedPaymentId,
              'charge_refunded',
              paidTenantId(refundedCharge.metadata),
            );
          }
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: unknown) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

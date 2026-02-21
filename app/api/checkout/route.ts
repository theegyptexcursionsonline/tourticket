// app/api/checkout/route.ts (With booking reference generation)
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Discount from '@/lib/models/Discount';
import { EmailService } from '@/lib/email/emailService';
import Stripe from 'stripe';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { generateDeterministicBookingReference, generateUniqueBookingReference } from '@/lib/utils/bookingReference';
import { currencies } from '@/utils/localization';

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

const round2 = (n: number) => Math.round(n * 100) / 100;

const getCurrencySymbolFromCode = (code?: string) => {
  const upper = (code || 'USD').toUpperCase();
  return currencies.find(c => c.code === upper)?.symbol || (upper === 'EUR' ? '€' : '$');
};

const toNumberQty = (value: any, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof value === 'object') {
    const inner = value.quantity ?? value.qty ?? value.count;
    return toNumberQty(inner, fallback);
  }
  return fallback;
};

const calculateAddOnsTotal = (cartItem: any): number => {
  const totalGuests = (cartItem?.quantity || 0) + (cartItem?.childQuantity || 0);
  let addOnsTotal = 0;

  // Case 1: selectedAddOns is an array (server/user schema format)
  if (Array.isArray(cartItem?.selectedAddOns)) {
    for (const addon of cartItem.selectedAddOns) {
      const qty = toNumberQty(addon?.quantity, 0);
      if (qty <= 0) continue;
      const price = Number(addon?.price || 0);
      const perGuest = addon?.perGuest ?? false;
      const multiplier = perGuest ? totalGuests : 1;
      addOnsTotal += price * multiplier;
    }
    return addOnsTotal;
  }

  // Case 2: selectedAddOns is an object (client format or corrupted format)
  if (cartItem?.selectedAddOns && typeof cartItem.selectedAddOns === 'object') {
    for (const [addOnId, rawQty] of Object.entries(cartItem.selectedAddOns)) {
      const qty = toNumberQty(rawQty, 0);
      const detail =
        cartItem?.selectedAddOnDetails?.[addOnId] ||
        (rawQty && typeof rawQty === 'object' ? (rawQty as any) : undefined);
      if (!detail || qty <= 0) continue;
      const price = Number((detail as any).price || 0);
      const perGuest = (detail as any).perGuest ?? false;
      const multiplier = perGuest ? totalGuests : 1;
      addOnsTotal += price * multiplier;
    }
  }

  return addOnsTotal;
};

const calculateCartSubtotal = (cart: any[]): number => {
  return round2((cart || []).reduce((sum, item) => {
    const basePrice = item?.selectedBookingOption?.price || item?.discountPrice || item?.price || 0;
    const adultPrice = Number(basePrice) * (item?.quantity || 1);
    const childPrice = (Number(basePrice) / 2) * (item?.childQuantity || 0);
    const itemSubtotal = adultPrice + childPrice + calculateAddOnsTotal(item);
    return sum + itemSubtotal;
  }, 0));
};

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const {
      customer,
      cart,
      pricing,
      paymentMethod = 'card',
      paymentDetails,
      userId,
      isGuest = false,
      discountCode = null
    } = body;

    // Validation
    if (!customer || !cart || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking information' },
        { status: 400 }
      );
    }

    if (!customer.firstName || !customer.lastName || !customer.email) {
      return NextResponse.json(
        { success: false, message: 'Customer information is incomplete' },
        { status: 400 }
      );
    }

    // IDEMPOTENCY CHECK: If we have a paymentIntentId, check if booking already exists
    // This prevents duplicate bookings when both webhook and frontend try to create
    if (paymentDetails?.paymentIntentId && paymentMethod === 'card') {
      const existingBooking = await Booking.findOne({ 
        paymentId: paymentDetails.paymentIntentId 
      }).lean();
      
      if (existingBooking) {
        console.log(`[Checkout] Booking already exists for payment ${paymentDetails.paymentIntentId} - returning existing`);
        
        // Return success with existing booking info
        return NextResponse.json({
          success: true,
          message: 'Booking already confirmed!',
          bookingId: existingBooking.bookingReference,
          bookings: [existingBooking._id],
          paymentId: paymentDetails.paymentIntentId,
          customer: {
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
          },
          alreadyExisted: true, // Flag to indicate this was pre-existing
        });
      }
    }

    // Always compute pricing on the server to avoid stale/incorrect totals in emails/PDFs
    // IMPORTANT: Always use USD since all prices are stored and charged in USD
    // Client may send display currency (EUR, GBP, etc.) but we ignore it for actual charges
    const currencyCode = 'USD';
    const currencySymbol = '$';
    const computedSubtotal = calculateCartSubtotal(cart || []);
    let computedDiscount = 0;
    if (discountCode) {
      const discount = await Discount.findOne({ code: String(discountCode).toUpperCase() });
      if (discount && discount.isActive && (!discount.expiresAt || new Date(discount.expiresAt) >= new Date()) && (!discount.usageLimit || discount.timesUsed < discount.usageLimit)) {
        computedDiscount = discount.discountType === 'percentage'
          ? round2((computedSubtotal * discount.value) / 100)
          : round2(discount.value);
      }
    }
    const computedServiceFee = round2(computedSubtotal * 0.03);
    const computedTax = round2(computedSubtotal * 0.05);
    const computedTotal = round2(Math.max(0, computedSubtotal + computedServiceFee + computedTax - computedDiscount));

    const computedPricing = {
      subtotal: computedSubtotal,
      serviceFee: computedServiceFee,
      tax: computedTax,
      discount: computedDiscount,
      total: computedTotal,
      currency: currencyCode,
      symbol: currencySymbol,
    };

    let user = null;

    // Handle user creation
    if (isGuest) {
      const existingUser = await User.findOne({ email: customer.email });
      
      if (existingUser) {
        user = existingUser;
      } else {
        try {
          user = await User.create({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            password: 'guest-' + Math.random().toString(36).substring(2, 15),
          });
          
          // Send Welcome Email for New Guest Users with real tours
          try {
            // Fetch recommended tours from database
            const Tour = (await import('@/lib/models/Tour')).default;
            const recommendedTours = await Tour.find({})
              .select('title slug images pricing')
              .limit(3)
              .lean();

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            const tourRecommendations = recommendedTours.map((tour: any) => ({
              title: tour.title,
              image: tour.images?.[0]?.url || `${baseUrl}/pyramid.png`,
              price: tour.pricing?.adult ? `From $${tour.pricing.adult}` : 'From $99',
              link: `${baseUrl}/tour/${tour.slug}`
            }));

            // Fallback if no tours found
            if (tourRecommendations.length === 0) {
              tourRecommendations.push({
                title: "Browse All Tours",
                image: `${baseUrl}/pyramid.png`,
                price: "Explore",
                link: `${baseUrl}/tours`
              });
            }

            await EmailService.sendWelcomeEmail({
              customerName: `${customer.firstName} ${customer.lastName}`,
              customerEmail: customer.email,
              dashboardLink: `${baseUrl}/user/dashboard`,
              recommendedTours: tourRecommendations,
              baseUrl
            });
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail user creation if welcome email fails
          }
        } catch (userError: any) {
          if (userError.code === 11000) {
            user = await User.findOne({ email: customer.email });
          } else {
            throw userError;
          }
        }
      }
    } else if (userId) {
      user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
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
    const isBankTransfer = paymentMethod === 'bank';
    const isCardPayment = !isBankTransfer;

    if (paymentMethod === 'pay_later') {
      return NextResponse.json(
        { success: false, message: 'Pay Later is currently unavailable. Please select another payment method.' },
        { status: 400 }
      );
    }

    if (isBankTransfer) {
      // For bank transfer, no Stripe processing needed
      paymentResult = {
        paymentId: `BANK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'pending',
        amount: pricing.total,
        currency: (pricing.currency || 'USD').toUpperCase(),
      };
    } else {
      // Process payment with Stripe for card payments
      try {
        const stripe = getStripe();
        // If paymentIntentId is provided, verify the payment
        if (paymentDetails?.paymentIntentId) {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentDetails.paymentIntentId);

          if (paymentIntent.status !== 'succeeded') {
            throw new Error('Payment has not been completed. Please complete the payment and try again.');
          }

          // Verify the amount matches
          const expectedAmount = Math.round(computedPricing.total * 100);
          if (paymentIntent.amount !== expectedAmount) {
            throw new Error('Payment amount mismatch. Please contact support.');
          }

          paymentResult = {
            paymentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
          };
        } else {
          // Fallback: Create and auto-confirm PaymentIntent (for backward compatibility)
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(pricing.total * 100),
            currency: (pricing.currency || 'USD').toLowerCase(),
            description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''}`,
            metadata: {
              customer_email: customer.email,
              customer_name: `${customer.firstName} ${customer.lastName}`,
              tours: cart.map((item: any) => item.title).join(', '),
              discount_code: discountCode || 'none',
            },
            // receipt_email removed - we send our own booking confirmation email
            confirm: true,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'never',
            },
            payment_method: 'pm_card_visa', // Test only - won't work with live keys
          });

          if (paymentIntent.status !== 'succeeded') {
            throw new Error('Payment processing failed. Please try a different payment method.');
          }

          paymentResult = {
            paymentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
          };
        }
      } catch (stripeError: any) {
        console.error('Stripe payment error:', stripeError);
        throw new Error(stripeError.message || 'Payment processing failed. Please try again.');
      }
    }

    // Increment discount usage counter if a discount was applied
    if (discountCode) {
      try {
        await Discount.findOneAndUpdate(
          { code: discountCode.toUpperCase() },
          { $inc: { timesUsed: 1 } }
        );
      } catch (discountError) {
        console.error('Error updating discount usage:', discountError);
        // Don't fail the booking if discount update fails
      }
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
          participants: `${cart.reduce((sum: number, item: any) => sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0), 0)} participant(s)`,
          totalPrice: `$${pricing.total.toFixed(2)}`,
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
      const existingBooking = await Booking.findOne({ paymentId: paymentResult.paymentId }).lean();
      if (existingBooking) {
        console.log(`[Checkout] Booking already exists for payment ${paymentResult.paymentId}`);
        return NextResponse.json({
          success: true,
          message: 'Booking confirmed!',
          bookingId: existingBooking.bookingReference,
          bookings: [existingBooking._id],
          paymentId: paymentResult.paymentId,
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
        const tour = await Tour.findById(cartItem._id || cartItem.id);
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
        const basePrice = cartItem.selectedBookingOption?.price || cartItem.discountPrice || cartItem.price || 0;
        const adultPrice = basePrice * (cartItem.quantity || 1);
        const childPrice = (basePrice / 2) * (cartItem.childQuantity || 0);
        const addOnsTotal = calculateAddOnsTotal(cartItem);

        const itemSubtotal = round2(adultPrice + childPrice + addOnsTotal);
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
          bookingReference, // Provide the reference explicitly
          tour: tour._id,
          user: user._id,
          date: bookingDate,
          dateString: bookingDateString, // Store original YYYY-MM-DD for timezone-safe display
          time: bookingTime,
          guests: totalGuests,
          totalPrice: itemTotalPrice,
            currency: paymentResult.currency || pricing.currency || 'USD', // Store the currency
          // Card payments: "Pending" until webhook confirms payment succeeded
          // Bank transfers: "Pending" until manual confirmation
          // Webhook will update card payments to "Confirmed" when payment succeeds
          status: 'Pending',
          paymentId: paymentResult.paymentId,
          paymentMethod,
          specialRequests: customer.specialRequests,
          emergencyContact: customer.emergencyContact,
          hotelPickupDetails: customer.hotelPickupDetails,
          hotelPickupLocation: customer.hotelPickupLocation,
          adultGuests: cartItem.quantity || 1,
          childGuests: cartItem.childQuantity || 0,
          infantGuests: cartItem.infantQuantity || 0,
          selectedAddOns: cartItem.selectedAddOns || {},
          selectedBookingOption: cartItem.selectedBookingOption,
          selectedAddOnDetails: cartItem.selectedAddOnDetails || {},
          // Store discount info if a promo code was applied
          discountCode: discountCode ? String(discountCode).toUpperCase() : undefined,
          discountAmount: itemDiscountShare > 0 ? itemDiscountShare : undefined,
        });
        } catch (createError: any) {
          // E11000 = duplicate key error - booking already exists (commonly from webhook race)
          if (
            createError.code === 11000 &&
            (createError.keyPattern?.bookingReference || createError.keyPattern?.paymentId)
          ) {
            console.log(`[Checkout] Booking already exists for payment ${paymentResult.paymentId} (created concurrently)`);
            const existingBooking = await Booking.findOne({ bookingReference }) ||
              await Booking.findOne({ paymentId: paymentResult.paymentId });
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
        
        // Add a small delay between bookings
        if (i < cart.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (bookingError: any) {
        console.error('Error creating booking:', bookingError);
        throw new Error(`Failed to create booking for ${cartItem.title}: ${bookingError.message}`);
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
    const orderedItemsSummary = cart.map((item: any) => {
      const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
      const adultPrice = basePrice * (item.quantity || 1);
      const childPrice = (basePrice / 2) * (item.childQuantity || 0);
      let total = adultPrice + childPrice;

      total += calculateAddOnsTotal(item);

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
    if (adultCount > 0) {
      const basePrice = mainCartItem?.selectedBookingOption?.price || mainCartItem?.discountPrice || mainCartItem?.price || 0;
      participantParts.push(`${adultCount} x Adult${adultCount > 1 ? 's' : ''} ($${basePrice.toFixed(2)})`);
    }
    if (childCount > 0) {
      const basePrice = mainCartItem?.selectedBookingOption?.price || mainCartItem?.discountPrice || mainCartItem?.price || 0;
      const childPrice = basePrice / 2;
      participantParts.push(`${childCount} x Child${childCount > 1 ? 'ren' : ''} ($${childPrice.toFixed(2)})`);
    }
    if (infantCount > 0) {
      participantParts.push(`${infantCount} x Infant${infantCount > 1 ? 's' : ''} (Free)`);
    }

    // SEND ADMIN ALERT IMMEDIATELY (before customer email)
    // This ensures admin always knows about booking attempts
    try {
      // Prepare detailed tour information
      const tourDetails = await Promise.all(cart.map(async (item: any) => {
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
        const getItemTotal = (item: any) => {
          const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
          const adultPrice = basePrice * (item.quantity || 1);
          const childPrice = (basePrice / 2) * (item.childQuantity || 0);
          let tourTotal = adultPrice + childPrice;

          let addOnsTotal = 0;
          if (item.selectedAddOns && item.selectedAddOnDetails) {
            Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
              const addOnDetail = item.selectedAddOnDetails?.[addOnId];
              const numericQuantity = Number(quantity);
              if (addOnDetail && numericQuantity > 0) {
                const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
                const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
                addOnsTotal += addOnDetail.price * addOnQuantity;
              }
            });
          }

          return tourTotal + addOnsTotal;
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
      } catch (emailError) {
        console.error('Failed to send customer confirmation email:', emailError);
      }
    } else {
      console.log(`[Checkout] Card payment - customer confirmation will be sent by webhook after payment succeeds`);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking completed successfully!',
      bookingId: bookingId,
      bookings: createdBookings.map(booking => booking._id),
      paymentId: paymentResult.paymentId,
      customer: {
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
      },
      ...(isGuest && { 
        guestAccount: true,
        message: 'Booking completed! A temporary account has been created with your email. You can set a password later to access your bookings.',
      }),
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    
    if (error.message.includes('Payment processing failed')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 402 }
      );
    }

    if (error.message.includes('Tour not found')) {
      return NextResponse.json(
        { success: false, message: 'One or more tours in your cart are no longer available' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Booking failed due to a server error. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// GET method for retrieving checkout session
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Session ID is required' },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        status: 'completed',
        payment_status: 'paid',
      },
    });

  } catch (error: any) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve checkout session' },
      { status: 500 }
    );
  }
}

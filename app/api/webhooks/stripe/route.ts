// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { generateDeterministicBookingReference } from '@/lib/utils/bookingReference';

// Lazy Stripe initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripeInstance;
}

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || '';

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

  console.log(`[Webhook] Processing payment ${paymentId}`);
  console.log(`[Webhook] Metadata:`, JSON.stringify(metadata));

  // Check if booking data is available in metadata
  if (metadata.has_booking_data !== 'true') {
    console.log(`[Webhook] No booking data in metadata for ${paymentId}, skipping`);
    return { created: false, reason: 'no_booking_data' };
  }

  await dbConnect();

  // Check if booking already exists for this payment (created by checkout endpoint)
  const existingBooking = await Booking.findOne({ paymentId });
  
  if (existingBooking) {
    console.log(`[Webhook] Booking exists for payment ${paymentId}, status: ${existingBooking.status}`);
    
    // If booking is still "Pending", update to "Confirmed" and send customer email
    if (existingBooking.status === 'Pending') {
      console.log(`[Webhook] Updating booking ${existingBooking.bookingReference} from Pending to Confirmed`);
      existingBooking.status = 'Confirmed';
      await existingBooking.save();
      
      // Need to send customer confirmation email - get tour info
      const tour = await Tour.findById(existingBooking.tour);
      const user = await User.findById(existingBooking.user);
      
      if (tour && user) {
        // Send customer confirmation email (see email sending section below)
        // We'll reuse the email sending logic by setting a flag
        const bookingsToEmail = [{
          booking: existingBooking,
          tour: tour,
        }];
        
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
            contactNumber: "+20 11 42255624",
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
          
          console.log(`[Webhook] Sent customer confirmation for updated booking ${existingBooking.bookingReference}`);
        } catch (emailError) {
          console.error(`[Webhook] Failed to send customer email for updated booking:`, emailError);
        }
      }
      
      return { 
        created: false, 
        updated: true, 
        reason: 'updated_to_confirmed', 
        bookingId: existingBooking.bookingReference 
      };
    }
    
    // Booking exists and is already Confirmed
    console.log(`[Webhook] Booking ${existingBooking.bookingReference} already confirmed, skipping`);
    return { created: false, reason: 'already_confirmed', bookingId: existingBooking.bookingReference };
  }

  // FALLBACK: Create booking if it doesn't exist (shouldn't happen normally, but ensures no lost bookings)
  console.log(`[Webhook] Creating booking for payment ${paymentId} (fallback - checkout didn't create it)`);

  // Extract customer info from metadata
  const customerEmail = metadata.customer_email;
  const customerFirstName = metadata.customer_first_name;
  const customerLastName = metadata.customer_last_name;
  const customerPhone = metadata.customer_phone || '';

  if (!customerEmail || !customerFirstName || !customerLastName) {
    console.error(`[Webhook] Missing customer data for payment ${paymentId}`);
    return { created: false, reason: 'missing_customer_data' };
  }

  // Extract hotel pickup info from metadata
  const hotelPickupDetails = metadata.hotel_pickup_details || '';
  let hotelPickupLocation: { lat: number; lng: number; name?: string; address?: string } | null = null;
  try {
    if (metadata.hotel_pickup_location) {
      hotelPickupLocation = JSON.parse(metadata.hotel_pickup_location);
    }
  } catch (e) {
    console.log(`[Webhook] Could not parse hotel pickup location for ${paymentId}`);
  }

  // Extract special requests
  const specialRequests = metadata.special_requests || '';

  // Parse cart data from metadata
  let cartData;
  try {
    const cartJson = metadata.cart_data + (metadata.cart_data_2 || '');
    cartData = JSON.parse(cartJson);
  } catch (e) {
    console.error(`[Webhook] Failed to parse cart data for payment ${paymentId}:`, e);
    return { created: false, reason: 'invalid_cart_data' };
  }

  // Find or create user
  let user = await User.findOne({ email: customerEmail });
  if (!user) {
    try {
      user = await User.create({
        firstName: customerFirstName,
        lastName: customerLastName,
        email: customerEmail,
        password: 'guest-' + Math.random().toString(36).substring(2, 15),
      });
      console.log(`[Webhook] Created guest user ${customerEmail}`);
    } catch (userError: any) {
      if (userError.code === 11000) {
        user = await User.findOne({ email: customerEmail });
      } else {
        throw userError;
      }
    }
  }

  if (!user) {
    console.error(`[Webhook] Could not find or create user for ${customerEmail}`);
    return { created: false, reason: 'user_creation_failed' };
  }

  // Create bookings for each cart item
  const createdBookings = [];
  const pricingTotal = parseFloat(metadata.pricing_total) || (paymentIntent.amount / 100);

  for (let cartIndex = 0; cartIndex < cartData.length; cartIndex++) {
    const item = cartData[cartIndex];
    try {
      const tourId = item.t;
      const tour = await Tour.findById(tourId);
      
      if (!tour) {
        console.error(`[Webhook] Tour not found: ${tourId}`);
        continue;
      }

      const bookingDate = parseLocalDate(item.d) || new Date();
      const bookingDateString = ensureDateOnlyString(item.d);
      const bookingTime = item.tm || '10:00';
      const totalGuests = (item.a || 1) + (item.c || 0) + (item.n || 0);

      // Calculate price for this item
      const basePrice = item.bp || 0;
      const adultPrice = basePrice * (item.a || 1);
      const childPrice = (basePrice / 2) * (item.c || 0);
      let itemSubtotal = adultPrice + childPrice;

      // Add-ons from metadata (ao: [{id,q,p,pg,t}])
      const addOns = Array.isArray(item.ao) ? item.ao : [];
      if (addOns.length > 0) {
        const totalGuestsForAddOns = (item.a || 0) + (item.c || 0);
        for (const ao of addOns) {
          const qty = Number(ao?.q || 0);
          if (!Number.isFinite(qty) || qty <= 0) continue;
          const price = Number(ao?.p || 0);
          const perGuest = !!ao?.pg;
          const multiplier = perGuest ? totalGuestsForAddOns : 1;
          itemSubtotal += price * multiplier * qty;
        }
      }
      const itemSubtotalRounded = Math.round(itemSubtotal * 100) / 100;
      const serviceFee = itemSubtotalRounded * 0.03;
      const tax = itemSubtotalRounded * 0.05;
      const itemTotalBeforeDiscount = itemSubtotalRounded + serviceFee + tax;

      const itemIndex = Number.isFinite(Number(item?.i)) ? Number(item.i) : cartIndex;
      const bookingReference = generateDeterministicBookingReference(paymentId, itemIndex);

      const selectedAddOns: Record<string, number> = {};
      const selectedAddOnDetails: Record<string, any> = {};
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
      const discountCode = metadata.discount_code && metadata.discount_code !== 'none' 
        ? metadata.discount_code.toUpperCase() 
        : undefined;
      const totalDiscount = parseFloat(metadata.pricing_discount) || 0;
      const pricingSubtotal = parseFloat(metadata.pricing_subtotal) || itemSubtotalRounded;
      
      // For discount: if single item, apply full discount; if multiple items, prorate based on item's share
      const itemDiscountShare = cartData.length === 1 
        ? totalDiscount 
        : Math.round((itemSubtotalRounded / pricingSubtotal) * totalDiscount * 100) / 100;
      
      // Final total for this item (with discount applied)
      const itemTotalWithDiscount = Math.max(0, itemTotalBeforeDiscount - itemDiscountShare);

      const booking = await Booking.create({
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
        paymentId: paymentId,
        paymentMethod: 'card',
        adultGuests: item.a || 1,
        childGuests: item.c || 0,
        infantGuests: item.n || 0,
        selectedAddOns: Object.keys(selectedAddOns).length > 0 ? selectedAddOns : undefined,
        selectedAddOnDetails: Object.keys(selectedAddOnDetails).length > 0 ? selectedAddOnDetails : undefined,
        selectedBookingOption: item.bo ? {
          id: item.bo,
          title: item.bot || '',
          price: item.bp || 0,
        } : undefined,
        // Store discount info if a promo code was applied
        discountCode: discountCode,
        discountAmount: itemDiscountShare > 0 ? itemDiscountShare : undefined,
        // Hotel pickup and special requests
        hotelPickupDetails: hotelPickupDetails || undefined,
        hotelPickupLocation: hotelPickupLocation || undefined,
        specialRequests: specialRequests || undefined,
      });

      createdBookings.push({
        booking,
        tour,
      });

      console.log(`[Webhook] Created booking ${bookingReference} for tour ${tour.title}`);
    } catch (bookingError: any) {
      // E11000 = duplicate key error - booking already exists (commonly created by checkout race)
      if (
        bookingError.code === 11000 &&
        (bookingError.keyPattern?.bookingReference || bookingError.keyPattern?.paymentId)
      ) {
        const itemIndex = Number.isFinite(Number(item?.i)) ? Number(item.i) : cartIndex;
        const bookingReference = generateDeterministicBookingReference(paymentId, itemIndex);
        console.log(`[Webhook] Booking ${bookingReference} already exists for payment ${paymentId} - skipping duplicate create`);

        const existingBooking = await Booking.findOne({ bookingReference });
        if (existingBooking) {
          const existingTour = await Tour.findById(existingBooking.tour);
          if (existingTour) {
            createdBookings.push({
              booking: existingBooking,
              tour: existingTour,
            });
          }
        } else {
          const fallbackExisting = await Booking.findOne({ paymentId }).lean();
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

  if (createdBookings.length === 0) {
    console.error(`[Webhook] No bookings created for payment ${paymentId}`);
    return { created: false, reason: 'no_bookings_created' };
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
    const pricingSubtotal = parseFloat(metadata.pricing_subtotal) || pricingTotal;
    const pricingServiceFee = parseFloat(metadata.pricing_service_fee) || 0;
    const pricingTax = parseFloat(metadata.pricing_tax) || 0;
    const pricingDiscount = parseFloat(metadata.pricing_discount) || 0;

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
    const orderedItems = createdBookings.map((item: any) => ({
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

    // Send booking confirmation to customer
    await EmailService.sendBookingConfirmation({
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

    console.log(`[Webhook] Sent booking confirmation to ${customerEmail}`);

    // Extract discount info for admin email
    const emailDiscountCode = metadata.discount_code && metadata.discount_code !== 'none' 
      ? metadata.discount_code.toUpperCase() 
      : undefined;
    const emailDiscountAmount = pricingDiscount;

    // Build tours array for admin email (with all details)
    const tourDetails = await Promise.all(createdBookings.map(async (item: any) => {
      // Gather add-on titles
      const addOns: string[] = [];
      if (item.booking.selectedAddOnDetails) {
        const details = item.booking.selectedAddOnDetails;
        // Handle both Map and plain object
        const entries = details instanceof Map ? Array.from(details.entries()) : Object.entries(details || {});
        for (const [_id, detail] of entries) {
          if (detail && (detail as any).title) {
            addOns.push((detail as any).title);
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

    // Send admin alert
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

    console.log(`[Webhook] Sent admin alert for booking ${bookingId}`);
  } catch (emailError) {
    console.error(`[Webhook] Failed to send emails:`, emailError);
    // Don't fail the whole process if email fails
  }

  return { 
    created: true, 
    count: createdBookings.length,
    bookingIds: createdBookings.map(b => b.booking.bookingReference),
  };
}

export async function POST(request: Request) {
  try {
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
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
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
        try {
          const result = await processSuccessfulPayment(paymentIntent);
          console.log(`[Webhook] Process result for ${paymentIntent.id}:`, result);
        } catch (processError: any) {
          console.error(`[Webhook] Failed to process payment ${paymentIntent.id}:`, processError);
          // Still return 200 to acknowledge the webhook, but log the error
          // We don't want Stripe to keep retrying if there's a data issue
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Payment failed: ${failedPayment.id}`);
        // Log failed payment for monitoring
        break;

      case 'charge.succeeded':
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge succeeded: ${charge.id}`);
        break;

      case 'charge.refunded':
        const refund = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge refunded: ${refund.id}`);
        // TODO: Update booking status to refunded
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

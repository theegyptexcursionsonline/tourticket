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

// Helper function to generate unique booking reference
async function generateUniqueBookingReference(): Promise<string> {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prefix = 'EEO';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `${prefix}-${timestamp}-${random}`;
    
    // Check if this reference already exists
    const existing = await Booking.findOne({ bookingReference: reference }).lean();
    
    if (!existing) {
      return reference;
    }
    
    // Add small delay before retry
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Fallback with extra randomness
  return `EEO-${Date.now()}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
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

  // Check if booking already exists for this payment
  const existingBooking = await Booking.findOne({ paymentId }).lean();
  if (existingBooking) {
    console.log(`[Webhook] Booking already exists for payment ${paymentId}`);
    return { created: false, reason: 'already_exists', bookingId: existingBooking.bookingReference };
  }

  console.log(`[Webhook] Creating booking for payment ${paymentId}`);

  // Extract customer info from metadata
  const customerEmail = metadata.customer_email;
  const customerFirstName = metadata.customer_first_name;
  const customerLastName = metadata.customer_last_name;
  const customerPhone = metadata.customer_phone || '';

  if (!customerEmail || !customerFirstName || !customerLastName) {
    console.error(`[Webhook] Missing customer data for payment ${paymentId}`);
    return { created: false, reason: 'missing_customer_data' };
  }

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

  for (const item of cartData) {
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
      let itemTotal = adultPrice + childPrice;
      const serviceFee = itemTotal * 0.03;
      const tax = itemTotal * 0.05;
      itemTotal = itemTotal + serviceFee + tax;

      const bookingReference = await generateUniqueBookingReference();

      const booking = await Booking.create({
        bookingReference,
        tour: tour._id,
        user: user._id,
        date: bookingDate,
        dateString: bookingDateString,
        time: bookingTime,
        guests: totalGuests,
        totalPrice: itemTotal,
        currency: (metadata.pricing_currency || paymentIntent.currency || 'USD').toUpperCase(), // Store currency
        status: 'Confirmed',
        paymentId: paymentId,
        paymentMethod: 'card',
        adultGuests: item.a || 1,
        childGuests: item.c || 0,
        infantGuests: item.n || 0,
        selectedBookingOption: item.bo ? {
          id: item.bo,
          title: item.bot || '',
          price: item.bp || 0,
        } : undefined,
      });

      createdBookings.push({
        booking,
        tour,
      });

      console.log(`[Webhook] Created booking ${bookingReference} for tour ${tour.title}`);
    } catch (bookingError: any) {
      // E11000 = duplicate key error - booking already exists (created by frontend)
      if (bookingError.code === 11000 && bookingError.keyPattern?.paymentId) {
        console.log(`[Webhook] Booking already exists for payment ${paymentId} (created by frontend) - skipping`);
        // This is expected when frontend creates booking first - not an error
        const existingBooking = await Booking.findOne({ paymentId }).lean();
        if (existingBooking) {
          return { 
            created: false, 
            reason: 'already_exists_concurrent', 
            bookingId: existingBooking.bookingReference 
          };
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
    
    await EmailService.sendBookingConfirmation({
      customerName: `${customerFirstName} ${customerLastName}`,
      customerEmail: customerEmail,
      tourTitle: createdBookings.length === 1 
        ? mainBooking.tour?.title || 'Tour' 
        : `${createdBookings.length} Tours`,
      bookingDate: emailBookingDate,
      bookingTime: mainBooking.booking.time,
      participants: `${mainBooking.booking.guests} participant${mainBooking.booking.guests !== 1 ? 's' : ''}`,
      totalPrice: `$${pricingTotal.toFixed(2)}`,
      bookingId: bookingId,
      meetingPoint: mainBooking.tour?.meetingPoint || "Meeting point will be confirmed 24 hours before tour",
      contactNumber: "+20 11 42255624",
      tourImage: mainBooking.tour?.image,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      customerPhone: customerPhone,
    });

    console.log(`[Webhook] Sent booking confirmation to ${customerEmail}`);

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
      totalPrice: `$${pricingTotal.toFixed(2)}`,
      paymentMethod: 'card',
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
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

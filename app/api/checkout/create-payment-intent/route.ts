// app/api/checkout/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer, pricing, cart, discountCode } = body;

    // Validate required fields
    if (!customer || !pricing || !cart || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required payment information' },
        { status: 400 }
      );
    }

    // Validate customer data
    if (!customer.email || !customer.firstName || !customer.lastName) {
      return NextResponse.json(
        { success: false, message: 'Please provide complete customer information (name and email)' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate pricing
    if (!pricing.total || pricing.total <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Prepare cart data for metadata (essential fields only to fit in Stripe's 500 char limit per field)
    // We store tour IDs, quantities, dates, times so webhook can recreate booking if needed
    const cartSummary = cart.map((item: any, index: number) => ({
      i: index, // index
      t: item._id || item.id, // tour ID
      a: item.quantity || 1, // adults
      c: item.childQuantity || 0, // children
      n: item.infantQuantity || 0, // infants
      d: item.selectedDate, // date
      tm: item.selectedTime, // time
      bp: item.selectedBookingOption?.price || item.discountPrice || item.price, // base price
      bo: item.selectedBookingOption?.id, // booking option ID
      bot: item.selectedBookingOption?.title, // booking option title
    }));

    // Create a PaymentIntent with Stripe - including full booking data for webhook recovery
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(pricing.total * 100), // Stripe expects amount in cents
      currency: (pricing.currency || 'USD').toLowerCase(),
      description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''}`,
      metadata: {
        // Customer info
        customer_email: customer.email,
        customer_name: `${customer.firstName} ${customer.lastName}`,
        customer_first_name: customer.firstName,
        customer_last_name: customer.lastName,
        customer_phone: customer.phone || '',
        // Tour info
        tours: cart.map((item: any) => item.title).join(', ').substring(0, 500),
        tour_count: String(cart.length),
        // Cart data (JSON compressed - Stripe allows up to 500 chars per value)
        cart_data: JSON.stringify(cartSummary).substring(0, 500),
        // Additional cart data if needed (for multi-tour bookings)
        cart_data_2: JSON.stringify(cartSummary).length > 500 
          ? JSON.stringify(cartSummary).substring(500, 1000) 
          : '',
        // Pricing info
        pricing_subtotal: String(pricing.subtotal),
        pricing_service_fee: String(pricing.serviceFee),
        pricing_tax: String(pricing.tax),
        pricing_discount: String(pricing.discount || 0),
        pricing_total: String(pricing.total),
        pricing_currency: pricing.currency || 'USD',
        // Discount
        discount_code: discountCode || 'none',
        // Flag to indicate this has booking data for webhook processing
        has_booking_data: 'true',
      },
      // receipt_email removed - we send our own booking confirmation email
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error: any) {
    console.error('Create PaymentIntent error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to initialize payment. Please try again.';

    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment request. Please check your information and try again.';
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Payment service temporarily unavailable. Please try again in a moment.';
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Payment configuration error. Please contact support.';
      console.error('STRIPE AUTHENTICATION ERROR - Check API keys!');
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

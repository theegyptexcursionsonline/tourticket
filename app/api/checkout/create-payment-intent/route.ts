// app/api/checkout/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

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

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(pricing.total * 100), // Stripe expects amount in cents
      currency: (pricing.currency || 'USD').toLowerCase(),
      description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''}`,
      metadata: {
        customer_email: customer.email,
        customer_name: `${customer.firstName} ${customer.lastName}`,
        tours: cart.map((item: any) => item.title).join(', '),
        discount_code: discountCode || 'none',
      },
      receipt_email: customer.email,
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
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to initialize payment. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

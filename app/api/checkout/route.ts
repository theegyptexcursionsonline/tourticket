import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  const { bookingData, tour } = await request.json();

  const pricePerAdult = tour.discountPrice || 0;
  const pricePerChild = pricePerAdult / 2;
  const subtotal =
    bookingData.adults * pricePerAdult + bookingData.children * pricePerChild;

  const line_items = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: tour.title,
          description: `A tour for ${bookingData.adults} adults and ${bookingData.children} children on ${new Date(
            bookingData.selectedDate
          ).toLocaleDateString()}.`,
        },
        unit_amount: Math.round(subtotal * 100), // Amount in cents
      },
      quantity: 1,
    },
  ];

  if (bookingData.selectedAddOn) {
    const addOnPrice = 50; // Replace with your actual add-on price logic
    const addOnTotal = addOnPrice * bookingData.adults;
    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'ATV Sunset Adventure', // Replace with your add-on title
        },
        unit_amount: Math.round(addOnTotal * 100),
      },
      quantity: 1,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/checkout/cancel`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('Error creating ipe session:', err);
    return NextResponse.json({ error: 'Error creating Stripe session' }, { status: 500 });
  }
}
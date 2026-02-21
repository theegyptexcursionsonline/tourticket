// lib/stripe.ts
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!key) {
      console.error('Stripe publishable key is not configured');
      return null;
    }

    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export default getStripe;

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getServerStripe() {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    stripeInstance = new Stripe(key, { apiVersion: '2025-08-27.basil' });
  }
  return stripeInstance;
}

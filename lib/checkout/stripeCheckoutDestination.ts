const STRIPE_CHECKOUT_CUSTOM_HOSTS = new Set([
  'pay.egypt-excursionsonline.com',
]);

export function isAllowedStripeCheckoutUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 4_096) return false;

  try {
    const destination = new URL(value);
    const hostname = destination.hostname.toLowerCase().replace(/\.$/, '');
    const stripeHosted = hostname.endsWith('.stripe.com');
    const approvedCustomHost = STRIPE_CHECKOUT_CUSTOM_HOSTS.has(hostname);

    return destination.protocol === 'https:'
      && destination.port === ''
      && destination.username === ''
      && destination.password === ''
      && (stripeHosted || approvedCustomHost);
  } catch {
    return false;
  }
}

import { isAllowedStripeCheckoutUrl } from '../stripeCheckoutDestination';

describe('Stripe Checkout destination allowlist', () => {
  it.each([
    'https://checkout.stripe.com/c/pay/cs_live_example',
    'https://pay.egypt-excursionsonline.com/c/pay/cs_live_example',
  ])('accepts an approved provider destination: %s', (url) => {
    expect(isAllowedStripeCheckoutUrl(url)).toBe(true);
  });

  it.each([
    'http://checkout.stripe.com/c/pay/example',
    'https://stripe.com.evil.example/c/pay/example',
    'https://pay.egypt-excursionsonline.com.evil.example/c/pay/example',
    'https://user:pass@checkout.stripe.com/c/pay/example',
    'https://checkout.stripe.com:444/c/pay/example',
    '//checkout.stripe.com/c/pay/example',
    'not-a-url',
  ])('rejects a non-approved redirect: %s', (url) => {
    expect(isAllowedStripeCheckoutUrl(url)).toBe(false);
  });
});

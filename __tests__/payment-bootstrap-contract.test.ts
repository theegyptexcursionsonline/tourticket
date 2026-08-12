import fs from 'node:fs';
import path from 'node:path';

describe('payment bootstrap contract', () => {
  it('does not initialize Stripe with a missing publishable key', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/StripePaymentForm.tsx'),
      'utf8',
    );

    expect(source).toContain(
      'const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;',
    );
    expect(source).not.toContain(
      'loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)',
    );
  });

  it('does not advertise providers without a complete public payment lifecycle', () => {
    const footerSource = fs.readFileSync(path.join(process.cwd(), 'components/Footer.tsx'), 'utf8');
    const contactSource = fs.readFileSync(path.join(process.cwd(), 'app/[locale]/contact/ContactClientPage.tsx'), 'utf8');
    const checkoutRoute = fs.readFileSync(path.join(process.cwd(), 'app/api/checkout/route.ts'), 'utf8');

    expect(footerSource).not.toContain('PaymentIcons.PayPal');
    expect(footerSource).not.toContain('PaymentIcons.Alipay');
    expect(contactSource).not.toContain('PayPal, and bank transfers');
    expect(checkoutRoute).toContain("if (paymentMethod !== 'card')");
    expect(checkoutRoute).toContain("code: 'UNSUPPORTED_PAYMENT_METHOD'");
  });
});

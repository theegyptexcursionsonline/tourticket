import fs from 'node:fs';
import path from 'node:path';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('checkout secure payment experience', () => {
  it('keeps payment collection in a dedicated Stripe dialog', () => {
    const checkout = source('app/[locale]/checkout/page.tsx');
    const payment = source('components/StripePaymentForm.tsx');

    expect(checkout).toContain('isOpen={isPaymentOpen}');
    expect(checkout).toContain('onOpenChange={setIsPaymentOpen}');
    expect(checkout).toContain('Continue to secure payment');
    expect(checkout).not.toContain('PayPal integration is coming soon');
    expect(checkout).not.toContain('/payment/paypal2.png');

    expect(payment).toContain('role="dialog"');
    expect(payment).toContain('aria-modal="true"');
    expect(payment).toContain('<ExpressCheckoutElement');
    expect(payment).toContain('availablePaymentMethods');
    expect(payment).not.toContain('<span>Apple Pay</span>');
  });
});

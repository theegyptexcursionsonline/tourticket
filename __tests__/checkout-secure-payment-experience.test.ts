import fs from 'node:fs';
import path from 'node:path';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('checkout secure payment experience', () => {
  it('loads the administrator-selected experience and supports all three Stripe presentations', () => {
    const checkout = source('app/[locale]/checkout/page.tsx');
    const payment = source('components/StripePaymentForm.tsx');
    const configured = source('components/ConfiguredStripePaymentForm.tsx');
    const hosted = source('app/api/checkout/create-checkout-session/route.ts');
    const webhook = source('app/api/webhooks/stripe/route.ts');

    expect(checkout).toContain('<ConfiguredStripePaymentForm');
    expect(checkout).toContain('isOpen={isPaymentOpen}');
    expect(checkout).toContain('onOpenChange={setIsPaymentOpen}');
    expect(checkout).toContain('onExperienceResolved={onPaymentExperienceChange}');
    expect(checkout).toContain("paymentExperience !== 'inline'");
    expect(checkout).toContain('showPaymentLauncher={showPaymentLauncher}');
    expect(checkout).toContain('Continue to secure payment');
    expect(checkout).not.toContain('PayPal integration is coming soon');
    expect(checkout).not.toContain('/payment/paypal2.png');

    expect(payment).toContain('role="dialog"');
    expect(payment).toContain('aria-modal="true"');
    expect(payment).toContain('<ExpressCheckoutElement');
    expect(payment).toContain('availablePaymentMethods');
    expect(payment).toContain("experience === 'inline'");
    expect(payment).toContain('data-testid="inline-payment-experience"');
    expect(payment).toContain('Complete your payment');
    expect(payment).toContain("fontSizeBase: '16px'");
    expect(payment).toContain("inputs: 'spaced'");
    expect(payment).toContain("labels: 'above'");
    expect(payment).toContain("experience === 'hosted'");
    expect(payment).toContain("experience === 'modal'");
    expect(payment).not.toContain('<span>Apple Pay</span>');

    expect(configured).toContain("fetch('/api/checkout/config'");
    expect(configured).toContain('isPaymentExperience');
    expect(hosted).toContain("ui_mode: 'hosted'");
    expect(hosted).toContain('payment_intent_data');
    expect(hosted).toContain('persistPreparedCheckoutQuote');
    expect(webhook).toContain('loadWebhookPaymentQuote');
    expect(webhook).toContain('bindInventoryHoldsToPayment(reservationKey, paymentId)');
    expect(webhook).toContain("case 'checkout.session.expired'");
  });
});

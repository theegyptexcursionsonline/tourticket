import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('main EEO admin control contracts', () => {
  it('wires the booking-detail Export button to the CSV handler', () => {
    const source = read('app/admin/bookings/[id]/page.tsx');
    expect(source).toContain('const handleExport = () =>');
    expect(source).toContain('onClick={handleExport}');
    expect(source).toContain('toSafeCsvCell');
    expect(source).toContain("booking.paymentDetails?.mode || 'Not recorded'");
    expect(source).toContain('Notification Delivery');
    expect(source).toContain('Delivery evidence not recorded');
    expect(source).toContain("booking.confirmationDeliveries?.find((delivery) => delivery.channel === 'email-customer')?.state");
  });

  it('keeps payment provenance and notification receipts in the admin list contract', () => {
    const list = read('app/admin/bookings/BookingsPageClient.tsx');
    const route = read('app/api/admin/bookings/route.ts');
    const model = read('lib/models/Booking.ts');

    expect(list).toContain("booking.paymentDetails?.mode === 'test'");
    expect(list).toContain('Mode not recorded');
    expect(list).toContain("'Customer email delivery'");
    expect(route).toContain('paymentDetails: 1');
    expect(route).toContain('confirmationDeliveries: 1');
    expect(route).toContain('confirmationSentAt: 1');
    expect(model).toContain("mode: { type: String, enum: ['test', 'live'] }");
    expect(model).toContain("unique: true,\n    name: 'checkout_item_key_unique'");
    expect(model).toContain("enum: ['verified_primary', 'duplicate_suppressed']");
    expect(list).toContain('Duplicate suppressed');
    const mobileCommerce = read('lib/checkout/mobileCommerce.ts');
    expect(mobileCommerce).toContain("checkoutItemKey: `${TENANT_ID}:${input.paymentIntentId}:0`");
    expect(mobileCommerce).toContain("source: 'eeo-mobile'");
  });

  it('stamps payment provider, TEST or LIVE mode, source, and transaction on both web writers', () => {
    const checkout = read('app/api/checkout/route.ts');
    const webhook = read('app/api/webhooks/stripe/route.ts');

    for (const source of [checkout, webhook]) {
      expect(source).toContain("provider: 'stripe'");
      expect(source).toContain("source: 'eeo-web'");
      expect(source).toContain("? 'live' : 'test'");
    }
  });

  it('keeps duplicate reconciliation exact-scoped, dry-run by default, and non-destructive', () => {
    const script = read('scripts/reconcile-duplicate-paid-booking.ts');

    expect(script).toContain("const apply = process.argv.includes('--apply')");
    expect(script).toContain("argument('primary-booking-id')");
    expect(script).toContain("argument('duplicate-booking-id')");
    expect(script).toContain('CONFIRM_DUPLICATE_BOOKING_RECONCILIATION');
    expect(script).toContain('ALLOW_REMOTE_DUPLICATE_BOOKING_RECONCILIATION');
    expect(script).toContain('RECONCILIATION_STRIPE_SECRET_KEY');
    expect(script).toContain('stripe.paymentIntents.retrieve(paymentId)');
    expect(script).toContain('paymentBookingCount !== 2');
    expect(script).toContain('paymentIntent.amount_received !== expectedAmount');
    expect(script).toContain("paymentReconciliationState: 'duplicate_suppressed'");
    expect(script).not.toContain('deleteOne');
    expect(script).not.toContain('deleteMany');
  });

  it('loads manifest tour choices from the lightweight options endpoint', () => {
    const source = read('app/admin/manifests/page.tsx');
    expect(source).toContain("fetch('/api/admin/tours/options'");
    expect(source).not.toContain("fetch('/api/admin/tours',");
  });

  it('renders admin success and error feedback', () => {
    const source = read('app/admin/AdminClientLayout.tsx');
    expect(source).toContain("import AppToaster from '@/components/ui/AppToaster'");
    expect(source).toContain('<AppToaster');
  });
});

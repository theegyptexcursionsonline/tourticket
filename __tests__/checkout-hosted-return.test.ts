import fs from 'node:fs';
import path from 'node:path';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Stripe-hosted Checkout return contract', () => {
  it('does not present payment as a confirmed booking until durable booking rows agree', () => {
    const status = source('app/api/checkout/session-status/route.ts');
    const page = source('app/[locale]/checkout/return/page.tsx');

    expect(status).toContain("booking.status === 'Confirmed' && booking.paymentStatus === 'paid'");
    expect(status).toContain("session.metadata.checkout_experience !== 'hosted'");
    expect(status).toContain("session.payment_status === 'paid'");
    expect(status).toContain("? 'processing'");
    expect(status).toContain("'Cache-Control': 'no-store'");
    expect(page).toContain('Finalizing your booking');
    expect(page).toContain('do not pay again');
    expect(page).toContain('bookingReferences');
    expect(page).toContain('attempt < 36 ? 5_000 : 20_000');
  });
});

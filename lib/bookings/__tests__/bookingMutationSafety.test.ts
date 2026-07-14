import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectFile = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('booking financial-record mutation safety', () => {
  it('keeps single and bulk hard-delete routes disabled', () => {
    const itemRoute = projectFile('app/api/admin/bookings/[id]/route.ts');
    const bulkRoute = projectFile('app/api/admin/bookings/bulk-delete/route.ts');

    expect(itemRoute).toContain("code: 'BOOKING_DELETION_DISABLED'");
    expect(bulkRoute).toContain("code: 'BOOKING_DELETION_DISABLED'");
    expect(itemRoute).not.toMatch(/findOneAndDelete|findByIdAndDelete|deleteOne\s*\(/);
    expect(bulkRoute).not.toMatch(/deleteMany\s*\(|findOneAndDelete|findByIdAndDelete/);
  });

  it('routes cancellation and refund statuses through provider-aware workflows', () => {
    const itemRoute = projectFile('app/api/admin/bookings/[id]/route.ts');
    const adminPage = projectFile('app/admin/bookings/BookingsPageClient.tsx');

    expect(itemRoute).toContain('FINANCIAL_TRANSITION_REQUIRES_WORKFLOW');
    expect(itemRoute).toContain("['Cancelled', 'Refunded', 'Partial_Refund'].includes(status)");
    expect(adminPage).not.toContain('Delete booking');
    expect(adminPage).not.toContain('/api/admin/bookings/bulk-delete');
  });

  it('never confirms card payments through the generic admin status editor', () => {
    const itemRoute = projectFile('app/api/admin/bookings/[id]/route.ts');
    const listPage = projectFile('app/admin/bookings/BookingsPageClient.tsx');

    expect(itemRoute).toContain('PAYMENT_PROVIDER_CONFIRMATION_REQUIRED');
    expect(itemRoute).toContain("if (!['cash', 'bank'].includes(method))");
    expect(itemRoute).toContain("updates.paymentConfirmedBy = `admin:${adminInfo?.id || auth.id}`");
    expect(listPage).toContain('Card bookings are confirmed only after Stripe verifies payment.');
  });

  it('accepts only explicitly modelled manual payment methods', () => {
    const createRoute = projectFile('app/api/admin/bookings/route.ts');
    const modal = projectFile('components/admin/ManualBookingModal.tsx');

    expect(createRoute).toContain("else if (rawPayment?.method !== 'card')");
    expect(createRoute).not.toContain("['card', 'external']");
    expect(modal).toContain("paymentMethod: 'card'");
    expect(modal).not.toContain("paymentMethod: 'external'");
  });

  it('uses the shared cryptographic capability generator for manual booking references', () => {
    const createRoute = projectFile('app/api/admin/bookings/route.ts');

    expect(createRoute).toContain("import { generateUniqueBookingReference } from '@/lib/utils/bookingReference'");
    expect(createRoute).not.toContain('Math.random()');
    expect(createRoute).not.toMatch(/async function generateUniqueBookingReference/);
  });

  it('archives tours instead of deleting records referenced by bookings', () => {
    const tourRoute = projectFile('app/api/admin/tours/[id]/route.ts');

    expect(tourRoute).toContain("isPublished: false, archivedAt: new Date()");
    expect(tourRoute).not.toMatch(/Tour\.findOneAndDelete|Tour\.findByIdAndDelete/);
  });

  it('deactivates users without cascading deletion into bookings', () => {
    const userRoute = projectFile('app/api/admin/users/[id]/route.ts');

    expect(userRoute).toContain('preservedBookingCount');
    expect(userRoute).toContain('isActive: false');
    expect(userRoute).not.toMatch(/Booking\.deleteMany|User\.findByIdAndDelete|User\.findOneAndDelete/);
  });
});

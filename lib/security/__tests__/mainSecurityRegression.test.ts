import fs from 'fs';
import path from 'path';

const source = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

describe('main storefront security regressions', () => {
  it('does not bind receipt authorization to a customer database id', () => {
    const checkout = source('app/api/checkout/route.ts');
    const receipt = source('app/api/checkout/receipt/route.ts');
    expect(checkout).not.toContain("sub: String(user._id)");
    expect(receipt).toContain('payload.sub !== `receipt:${payload.paymentId}`');
    expect(receipt).not.toContain('user: String(payload.sub)');
  });

  it('uses one platform customer-session authority across account and checkout routes', () => {
    for (const file of [
      'app/api/auth/me/route.ts',
      'app/api/bookings/route.ts',
      'app/api/bookings/[id]/route.ts',
      'app/api/bookings/[id]/cancel/route.ts',
      'app/api/user/cart/route.ts',
      'app/api/user/wishlist/route.ts',
      'app/api/user/profile/route.ts',
      'app/api/user/bookings/route.ts',
      'app/api/checkout/route.ts',
      'app/api/user/change-password/route.ts',
      'app/api/tours/[tourId]/reviews/route.ts',
      'app/api/tours/[tourId]/reviews/check/route.ts',
      'app/api/reviews/[id]/route.ts',
    ]) {
      const route = source(file);
      expect(route).toContain('authenticateCustomerSession');
      expect(route).not.toContain('verifyFirebaseToken');
    }
  });

  it('keeps public catalogue APIs published and default-tenant scoped', () => {
    const sharedFilter = source('lib/tenant/defaultTenantFilter.ts');
    expect(sharedFilter).toContain("tenantId: 'default'");
    expect(sharedFilter).toContain("tenantId: { $exists: false }");
    const publicFilter = source('lib/content/publicContentFilter.ts');
    expect(publicFilter).toContain('isPublished: true');
    expect(publicFilter).toContain('archivedAt: null');

    for (const file of ['app/api/tours/list/route.ts', 'app/api/search/live/route.ts']) {
      const route = source(file);
      expect(route).toContain('PUBLIC_CONTENT_FILTER');
      expect(
        route.includes("tenantId: 'default'") ||
        (route.includes("from '@/lib/tenant/defaultTenantFilter'") && route.includes('DEFAULT_TENANT_FILTER'))
      ).toBe(true);
    }
  });

  it('does not report an arbitrary checkout session as paid', () => {
    const checkout = source('app/api/checkout/route.ts');
    expect(checkout).not.toContain("payment_status: 'paid'");
    expect(checkout).toContain("status: 405");
  });

  it('revalidates admin authorization against the current database account', () => {
    const adminAuth = source('lib/auth/adminAuth.ts');
    expect(adminAuth).toContain("isActive: true");
    expect(adminAuth).toContain("role: { $ne: 'customer' }");
    expect(adminAuth).toContain('permissionsFromDatabase');
    expect(adminAuth).not.toContain('permissionsFromToken');
  });

  it('protects both placeholder-image maintenance methods', () => {
    const route = source('app/api/admin/tours/clean-images/route.ts');
    const postSection = route.slice(route.indexOf('async function POSTHandler'), route.indexOf('// GET endpoint'));
    const getSection = route.slice(route.indexOf('export async function GET'));
    expect(postSection).toContain('verifyAdmin(request)');
    expect(route).toContain('export const POST = withAdminAudit(POSTHandler)');
    expect(getSection).toContain('verifyAdmin(request)');
  });

  it('sanitizes the delayed redirect destination', () => {
    const page = source('app/[locale]/redirecting/page.tsx');
    expect(page).toContain("safeRelativeRedirect(searchParams.get('to'), '/checkout')");
    expect(page).not.toContain("searchParams.get('to') || '/checkout'");
  });

  it('disables Sentry error-generation examples in production', () => {
    const layout = source('app/sentry-example-page/layout.tsx');
    const api = source('app/api/sentry-example-api/route.ts');
    expect(layout).toContain("process.env.NODE_ENV === 'production'");
    expect(layout).toContain('notFound()');
    expect(api).toContain("process.env.NODE_ENV === 'production'");
    expect(api).toContain("status: 404");
  });
});

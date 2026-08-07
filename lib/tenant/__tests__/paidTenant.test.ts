// bookingReference pulls in the Booking model; the repo's own reference test
// mocks it the same way rather than switching test environment.
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(null) })) },
}));

import {
  isDefaultTenant,
  paidTenantFilter,
  paidTenantId,
  paidTenantReferencePrefix,
  paidTenantValue,
} from '@/lib/tenant/paidTenant';
import { generateDeterministicBookingReference } from '@/lib/utils/bookingReference';

// 2026-08-07 incident: this storefront's Stripe webhook is the only endpoint on
// the account, so it receives every white-label brand's payments. It resolved
// the paid tour with the default-tenant filter, could not find an el-gouna
// tour, and refunded a real customer instead of booking them.
describe('paid tenant resolution', () => {
  describe('paidTenantId', () => {
    it('takes the tenant from the checkout that took the money', () => {
      expect(paidTenantId({ tenant_id: 'el-gouna' })).toBe('el-gouna');
    });

    it('treats missing or blank metadata as this storefront', () => {
      // Payments taken before the metadata existed must keep working.
      expect(paidTenantId({})).toBe('default');
      expect(paidTenantId({ tenant_id: '' })).toBe('default');
      expect(paidTenantId({ tenant_id: '   ' })).toBe('default');
      expect(paidTenantId(undefined)).toBe('default');
      expect(paidTenantId(null)).toBe('default');
    });
  });

  describe('paidTenantFilter', () => {
    it('matches a brand exactly — never widened', () => {
      // Widening this is how one brand's payment resolves another brand's tour.
      expect(paidTenantFilter('el-gouna')).toEqual({ tenantId: 'el-gouna' });
    });

    it('keeps the permissive shape for the default brand only', () => {
      // The main storefront's rows are inconsistent by history: some carry
      // 'default', older ones have no tenantId field at all.
      const filter = paidTenantFilter('default') as { $or: Array<Record<string, unknown>> };
      expect(filter.$or).toEqual(expect.arrayContaining([
        { tenantId: 'default' },
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' },
      ]));
    });

    it('does not let a brand filter match untagged default rows', () => {
      expect(JSON.stringify(paidTenantFilter('hurghada'))).not.toContain('$exists');
    });
  });

  it('stores the resolved tenant on what it creates', () => {
    expect(paidTenantValue('el-gouna')).toBe('el-gouna');
    expect(paidTenantValue('')).toBe('default');
    expect(isDefaultTenant('')).toBe(true);
    expect(isDefaultTenant('el-gouna')).toBe(false);
  });

  describe('booking reference', () => {
    it('names the brand that sold the trip', () => {
      const ref = generateDeterministicBookingReference('pi_3U1jUODstYVU2pYL2KVDNV95', 0, paidTenantReferencePrefix('el-gouna'));
      expect(ref.startsWith('ELGO-')).toBe(true);
    });

    it('leaves the main storefront format untouched', () => {
      const withDefault = generateDeterministicBookingReference('pi_test123456', 0, paidTenantReferencePrefix('default'));
      expect(withDefault.startsWith('EEO-')).toBe(true);
      // Historic call sites pass no prefix at all and must not change.
      expect(generateDeterministicBookingReference('pi_test123456', 0)).toBe(withDefault);
    });

    it('stays deterministic, so a webhook retry cannot double-book', () => {
      const a = generateDeterministicBookingReference('pi_abc', 2, paidTenantReferencePrefix('el-gouna'));
      const b = generateDeterministicBookingReference('pi_abc', 2, paidTenantReferencePrefix('el-gouna'));
      expect(a).toBe(b);
    });

    it('separates items within one payment', () => {
      const first = generateDeterministicBookingReference('pi_abc', 0, 'ELGO');
      const second = generateDeterministicBookingReference('pi_abc', 1, 'ELGO');
      expect(first).not.toBe(second);
    });

    it('never emits a prefix that is not alphanumeric', () => {
      expect(paidTenantReferencePrefix('marsa-alam-excursions')).toBe('MARS');
      expect(paidTenantReferencePrefix('!!!')).toBe('BKG');
    });
  });

  describe('where the tenant filter belongs (source contract)', () => {
    const source = require('fs').readFileSync(
      require('path').join(process.cwd(), 'app/api/webhooks/stripe/route.ts'),
      'utf8',
    );

    it('scopes every tour lookup to the paying brand', () => {
      // Resolving content is the security boundary: without this, one brand's
      // payment could book against another brand's tour.
      const tourLookups = source.match(/Tour\.findOne\(\{[^}]*\}/g) || [];
      expect(tourLookups.length).toBeGreaterThan(0);
      for (const lookup of tourLookups) {
        expect(lookup).toContain('tenantFilter');
      }
    });

    it('does not scope a payment own bookings by tenant', () => {
      // A payment id is unique account-wide. Scoping identity lookups by tenant
      // would miss legacy brand bookings stored as 'default' and double-book on
      // a Stripe retry.
      expect(source).toContain('await Booking.find({ paymentId }).sort(');
      expect(source).not.toMatch(/Booking\.find\(\{ paymentId, \.\.\.tenantFilter/);
      expect(source).not.toMatch(/paymentId, status: 'Pending', \.\.\.tenantFilter/);
    });

    it('never reintroduces a hardcoded default tenant in the paid path', () => {
      expect(source).not.toContain("tenantId: 'default'");
      expect(source).not.toContain('DEFAULT_TENANT_FILTER');
    });
  });
});

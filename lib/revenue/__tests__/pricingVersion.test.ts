import { explicitCatalogueGuestPrices, guestPricesEqual } from '@/lib/revenue/guestPrices';
import { pricingCatalogueVersion } from '@/lib/revenue/pricingVersion';

describe('pricing catalogue version', () => {
  it('ignores option order and non-pricing edits', () => {
    const left = { discountPrice: 100, originalPrice: 120, title: 'Old title', bookingOptions: [{ pricingKey: 'private', price: 200, type: 'private' }, { pricingKey: 'shared', price: 100, type: 'group' }] };
    const right = { ...left, title: 'New title', bookingOptions: [...left.bookingOptions].reverse() };
    expect(pricingCatalogueVersion(left)).toBe(pricingCatalogueVersion(right));
  });

  it('changes only when pricing-relevant catalogue fields change', () => {
    const base = { discountPrice: 100, originalPrice: 120, bookingOptions: [{ pricingKey: 'shared', price: 100, type: 'group' }] };
    expect(pricingCatalogueVersion(base)).not.toBe(pricingCatalogueVersion({ ...base, discountPrice: 105 }));
    expect(pricingCatalogueVersion(base)).not.toBe(pricingCatalogueVersion({ ...base, bookingOptions: [{ ...base.bookingOptions[0], price: 110 }] }));
  });

  it('compares explicit guest fields without object-order coupling', () => {
    expect(guestPricesEqual({ adult: 100, child: 50, infant: 0 }, { infant: 0, child: 50, adult: 100 })).toBe(true);
    expect(guestPricesEqual({ adult: 100, child: 50, infant: 0 }, { adult: 100, child: 49, infant: 0 })).toBe(false);
  });

  it('marks ratio fallbacks as unverified and explicit guest prices as canary-ready', () => {
    expect(explicitCatalogueGuestPrices(100).verified).toBe(false);
    expect(explicitCatalogueGuestPrices(100).prices).toEqual({ adult: 100, child: 50, infant: 0 });
    expect(explicitCatalogueGuestPrices(100, { adult: 100, child: 45, infant: 5 })).toEqual({ prices: { adult: 100, child: 45, infant: 5 }, verified: true });
    expect(explicitCatalogueGuestPrices(100, { adult: 90, child: 45, infant: 0 }).verified).toBe(false);
  });
});

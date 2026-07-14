jest.mock('@/lib/models/RevenuePriceOverride', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {},
}));

import { catalogueFromPrice } from '@/lib/revenue/pricingSummary';

describe('catalogueFromPrice', () => {
  it('includes standard and option prices, including legitimate zero prices', () => {
    expect(catalogueFromPrice({ discountPrice: 100, bookingOptions: [{ price: 120 }, { price: 80 }] })).toBe(80);
    expect(catalogueFromPrice({ discountPrice: 100, bookingOptions: [{ price: 0 }] })).toBe(0);
  });

  it('ignores invalid prices and returns null when no catalogue price is usable', () => {
    expect(catalogueFromPrice({ discountPrice: Number.NaN, bookingOptions: [{ price: -1 }] })).toBeNull();
  });
});

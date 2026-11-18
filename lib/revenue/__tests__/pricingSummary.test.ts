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
  it('includes standard and option prices', () => {
    expect(catalogueFromPrice({ discountPrice: 100, bookingOptions: [{ price: 120 }, { price: 80 }] })).toBe(80);
  });

  // A 0 option price is the editor's blank default, not a free trip: checkout
  // cannot take $0 and refuses it, so it must never become the "from" price.
  // (Live 18 Nov: the Cairo Private Shopping Tour listed at $0.00 this way.)
  it('never lists a 0 option price as the "from" price', () => {
    expect(catalogueFromPrice({ discountPrice: 100, bookingOptions: [{ price: 0 }] })).toBeNull();
    expect(catalogueFromPrice({
      discountPrice: 60,
      bookingOptions: [{ price: 60, timeSlots: [{}, {}] }, { price: 0, timeSlots: [{}, {}] }],
    })).toBe(60);
  });

  it('lists the lowest start-time price of an option whose base is 0', () => {
    expect(catalogueFromPrice({
      discountPrice: 16,
      bookingOptions: [
        { price: 0, timeSlots: [{ price: 29.78 }, { price: 21.66 }] },
        { price: 29.78, timeSlots: [{ price: 29.78 }] },
      ],
    })).toBe(21.66);
    expect(catalogueFromPrice({ discountPrice: 0, bookingOptions: [{ price: 0, timeSlots: [{}, { price: 34.96 }] }] })).toBe(34.96);
  });

  it('has no "from" price when the tour without options has a 0 price', () => {
    expect(catalogueFromPrice({ discountPrice: 0, bookingOptions: [] })).toBeNull();
  });

  it('uses the cheapest chargeable slot and applies discounts only for opted-in options', () => {
    expect(catalogueFromPrice({
      discountPrice: 25,
      discountPercent: 20,
      bookingOptions: [{
        price: 150,
        applyTourDiscount: true,
        timeSlots: [{ price: 50 }, { price: 200 }],
      }],
    })).toBe(40);
  });

  it('does not advertise the tour fallback when booking options are required', () => {
    expect(catalogueFromPrice({
      discountPrice: 25,
      bookingOptions: [{ price: 120, applyTourDiscount: false }],
    })).toBe(120);
  });

  it('advertises the automatically discounted tour base when no options exist', () => {
    expect(catalogueFromPrice({ discountPrice: 100, discountPercent: 20, bookingOptions: [] })).toBe(80);
  });

  it('ignores invalid prices and returns null when no catalogue price is usable', () => {
    expect(catalogueFromPrice({ discountPrice: Number.NaN, bookingOptions: [{ price: -1 }] })).toBeNull();
  });
});

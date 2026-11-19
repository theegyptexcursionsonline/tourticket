import { customerFromPrice, listingCompareAtPrice, listingFromPrice, bookableTripPrice } from '@/lib/pricing/effectivePrice';

// 19 Nov 2026: the search card read "From $16.00" (the stored base price) for
// the Makadi Bay ATV trip, whose page heading read $21.66 (its cheapest start
// time). 70 of 217 live tours had a stored base no option sells at. One rule
// now decides the "from" price on every surface before a date is chosen.
const NOW = new Date('2026-11-19T10:00:00Z');

const makadi = {
  discountPrice: 16,
  price: 16,
  pricingSummary: { fromPrice: 21.66, version: 0 },
  bookingOptions: [
    { price: 0, type: 'Per Person', timeSlots: [{ price: 29.78 }, { price: 23.01 }, { price: 21.66 }] },
    { price: 29.78, type: 'Per Person', timeSlots: [{ price: 29.78 }, { price: 27.07 }] },
    { price: 609.2, type: 'Per Group', timeSlots: [{}] },
  ],
};

describe('customerFromPrice: one "from" price before a date is chosen', () => {
  it('a page payload with options: the cheapest bookable per-person price, not the stored base', () => {
    expect(customerFromPrice(makadi, NOW)?.price).toBe(21.66);
    expect(bookableTripPrice(makadi)?.price).toBe(21.66);
  });

  it('a listing payload without options: the server summary, the same figure', () => {
    const { bookingOptions: _omit, ...listing } = makadi;
    expect(listingFromPrice(listing)).toBe(21.66);
    expect(customerFromPrice(listing, NOW)?.price).toBe(customerFromPrice(makadi, NOW)?.price);
  });

  it('no options and no summary: the base price, with its percentage discount', () => {
    expect(customerFromPrice({ discountPrice: 50, discountPercent: 10 }, NOW)).toEqual({ price: 45, originalPrice: 50, discountApplied: true });
  });

  it('a lower price set for an upcoming date wins, on every payload shape', () => {
    const dated = { ...makadi, pricingSummary: { fromPrice: 18.5, version: 3, validThrough: '2026-12-01T00:00:00Z' } };
    expect(customerFromPrice(dated, NOW)).toEqual({ price: 18.5, originalPrice: 18.5, discountApplied: false });
    const { bookingOptions: _omit, ...listing } = dated;
    expect(customerFromPrice(listing, NOW)?.price).toBe(18.5);
  });

  it('a date-specific price whose last date has passed no longer counts', () => {
    const expired = { ...makadi, pricingSummary: { fromPrice: 18.5, version: 3, validThrough: '2026-11-18T00:00:00Z' } };
    expect(customerFromPrice(expired, NOW)?.price).toBe(21.66);
  });

  it('a summary not built from date prices never undercuts the options (it is the same catalogue)', () => {
    expect(customerFromPrice({ ...makadi, pricingSummary: { fromPrice: 5, version: 0 } }, NOW)?.price).toBe(21.66);
  });

  it('only whole-group options priced: the summary, not an unrelated base', () => {
    expect(customerFromPrice({ discountPrice: 16, pricingSummary: { fromPrice: 609.2 }, bookingOptions: [{ price: 609.2, type: 'Per Group' }] }, NOW)?.price).toBe(609.2);
  });

  it('nothing priced: null ("price on request")', () => {
    expect(customerFromPrice({ discountPrice: 0, bookingOptions: [{ price: 0, timeSlots: [{ price: 0 }] }] }, NOW)).toBeNull();
    expect(listingFromPrice({ pricingSummary: { fromPrice: 0 }, discountPrice: 0 })).toBeNull();
    expect(customerFromPrice(null, NOW)).toBeNull();
  });
});

describe('listingCompareAtPrice: a struck-through price only for a real reduction', () => {
  it('a stored original price beside an option-derived price is not shown', () => {
    expect(listingCompareAtPrice({ ...makadi, originalPrice: 30 })).toBeNull();
    const { bookingOptions: _omit, ...listing } = makadi;
    expect(listingCompareAtPrice({ ...listing, originalPrice: 30 })).toBeNull();
  });

  it('the stored base pair stands when the base is the price shown', () => {
    expect(listingCompareAtPrice({ discountPrice: 40, originalPrice: 55 })).toBe(55);
  });

  it('a discounted cheapest option shows its own original price', () => {
    expect(listingCompareAtPrice({ discountPercent: 20, bookingOptions: [{ price: 50, applyTourDiscount: true }] })).toBe(50);
  });
});

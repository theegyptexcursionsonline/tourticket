import { displayedTripPrice, effectiveOptionPrice, lowestPerPersonPrice } from '@/lib/pricing/effectivePrice';

describe('the trip page per-person price matches what one guest can book', () => {
  it('uses the lowest bookable per-person option instead of the tour base price', () => {
    // Live shape that showed $69.00 on the trip page and $69.17 everywhere else.
    const tour = {
      discountPrice: 69,
      bookingOptions: [
        { type: 'Per Person', price: 69.17 },
        { type: 'Per Person', price: 86.47 },
      ],
    };
    expect(displayedTripPrice(tour).price).toBe(69.17);
  });

  it('counts a cheaper departure time that sets its own price', () => {
    const tour = {
      discountPrice: 90,
      bookingOptions: [{ type: 'Per Person', price: 80, timeSlots: [{ price: 85 }, { price: 72.5 }] }],
    };
    expect(displayedTripPrice(tour).price).toBe(72.5);
  });

  it('applies the tour discount exactly as the booking panel charges it', () => {
    const tour = {
      discountPrice: 100,
      discountPercent: 20,
      bookingOptions: [{ type: 'Per Person', price: 50, applyTourDiscount: true }],
    };
    const shown = displayedTripPrice(tour);
    expect(shown).toEqual(effectiveOptionPrice(tour, tour.bookingOptions[0]));
    expect(shown).toEqual({ price: 40, originalPrice: 50, discountApplied: true });
  });

  it('leaves group, family and couple prices out of a per-person headline', () => {
    const tour = {
      discountPrice: 60,
      bookingOptions: [
        { type: 'Per Group', price: 20 },
        { type: 'Per Couple', price: 30 },
        { type: 'Per Person', price: 65 },
      ],
    };
    expect(displayedTripPrice(tour).price).toBe(65);
  });

  it('treats an option without a type as per person', () => {
    expect(displayedTripPrice({ discountPrice: 99, bookingOptions: [{ price: 55 }] }).price).toBe(55);
  });

  it('falls back to the tour base price when nothing per-person is bookable', () => {
    expect(lowestPerPersonPrice({ discountPrice: 40, bookingOptions: [{ type: 'Per Group', price: 10 }] })).toBeNull();
    expect(displayedTripPrice({ discountPrice: 40, bookingOptions: [{ type: 'Per Group', price: 10 }] }).price).toBe(40);
    expect(displayedTripPrice({ discountPrice: 40 }).price).toBe(40);
    expect(displayedTripPrice(null).price).toBe(0);
  });

  it('ignores options without a usable price', () => {
    const tour = {
      discountPrice: 40,
      bookingOptions: [{ type: 'Per Person', price: null }, { type: 'Per Person', price: -5 }, { type: 'Per Person', price: Number.NaN }],
    };
    expect(displayedTripPrice(tour).price).toBe(40);
  });
});

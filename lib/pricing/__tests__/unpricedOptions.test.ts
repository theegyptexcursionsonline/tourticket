import {
  bookableTripPrice,
  displayedTripPrice,
  firstRealPrice,
  isRealPrice,
  listingFromPrice,
  lowestPerPersonPrice,
} from '@/lib/pricing/effectivePrice';
import { effectiveSlotGuestPrices } from '@/lib/revenue/guestPrices';

// Shapes copied from the live catalogue (18 Nov): options created with a 0
// base, priced either per start time or nowhere at all.
const shoppingTour = {
  discountPrice: 60,
  bookingOptions: [
    { type: 'Per Person', price: 60, timeSlots: [{ time: '11:00' }, { time: '11:30' }] },
    { type: 'Per Person', price: 0, timeSlots: [{ time: '11:00' }, { time: '11:30' }] },
  ],
};

const startTimePricedTour = {
  discountPrice: 16,
  bookingOptions: [
    { type: 'Per Person', price: 0, timeSlots: [{ time: '05:00', price: 29.78 }, { time: '10:00', price: 21.66 }] },
    { type: 'Per Person', price: 0, timeSlots: [{ time: '05:00', price: 37.9 }, { time: '08:00', price: 27.07 }] },
    { type: 'Per Person', price: 29.78, timeSlots: [{ time: '05:00', price: 29.78 }] },
    { type: 'Per Group', price: 609.2 },
  ],
};

describe('a price of 0 is "not priced yet", never a price', () => {
  it('recognises only finite amounts above zero', () => {
    expect(isRealPrice(0.5)).toBe(true);
    expect(isRealPrice(60)).toBe(true);
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, null, undefined, '60']) {
      expect(isRealPrice(value)).toBe(false);
    }
    expect(firstRealPrice(0, undefined, Number.NaN, 49, 12)).toBe(49);
    expect(firstRealPrice(0, null)).toBeNull();
  });
});

describe('trip page, booking panel and phone bar price', () => {
  it('shows the priced option, not the unpriced one at $0.00 (Cairo Private Shopping Tour)', () => {
    expect(lowestPerPersonPrice(shoppingTour)?.price).toBe(60);
    expect(bookableTripPrice(shoppingTour)?.price).toBe(60);
    expect(displayedTripPrice(shoppingTour).price).toBe(60);
  });

  it('uses the lowest start-time price of an option whose base price is 0', () => {
    expect(bookableTripPrice(startTimePricedTour)?.price).toBe(21.66);
    // Only the 0-base options exist: still the lowest start time, never 0.
    expect(bookableTripPrice({
      discountPrice: 0,
      bookingOptions: [{ type: 'Per Person', price: 0, timeSlots: [{ price: 116 }] }],
    })?.price).toBe(116);
  });

  it('skips a start time left without a price on a 0-base option', () => {
    expect(bookableTripPrice({
      discountPrice: 0,
      bookingOptions: [{ type: 'Per Person', price: 0, timeSlots: [{ time: '08:00' }, { time: '12:00', price: 34.96 }] }],
    })?.price).toBe(34.96);
  });

  it('keeps the tour base when no per-person option is priced but the base is', () => {
    expect(bookableTripPrice({
      discountPrice: 45,
      bookingOptions: [{ type: 'Per Person', price: 0, timeSlots: [{ time: '08:00' }] }],
    })?.price).toBe(45);
  });

  it('has no price at all when nothing anywhere is priced', () => {
    expect(bookableTripPrice({ discountPrice: 0, bookingOptions: [{ type: 'Per Person', price: 0 }] })).toBeNull();
    expect(bookableTripPrice({ discountPrice: 0 })).toBeNull();
    expect(bookableTripPrice(null)).toBeNull();
  });

  it('applies the tour discount to a start-time price exactly as before', () => {
    expect(bookableTripPrice({
      discountPrice: 100,
      discountPercent: 10,
      bookingOptions: [{ type: 'Per Person', price: 0, applyTourDiscount: true, timeSlots: [{ price: 50 }] }],
    })).toEqual({ price: 45, originalPrice: 50, discountApplied: true });
  });

  it('a 100% discount is not a bookable price either', () => {
    expect(bookableTripPrice({
      discountPrice: 0,
      discountPercent: 100,
      bookingOptions: [{ type: 'Per Person', price: 40, applyTourDiscount: true }],
    })).toBeNull();
  });
});

describe('child prices on a start-time-priced option', () => {
  it('follow the departure: its own child price, or half the adult price when none is set', () => {
    // Live 08:00 departure of a 0-base option: adult 116, child 116, infant free.
    expect(effectiveSlotGuestPrices({ adult: 116, slot: { guestPrices: { child: 116, infant: 0 } } }))
      .toEqual({ adult: 116, child: 116, infant: 0 });
    expect(effectiveSlotGuestPrices({ adult: 29.78 })).toEqual({ adult: 29.78, child: 14.89, infant: 0 });
  });

  it('a free child or infant is still allowed: only the adult price must be real', () => {
    const prices = effectiveSlotGuestPrices({ adult: 40, slot: { guestPrices: { child: 0, infant: 0 } } });
    expect(prices).toEqual({ adult: 40, child: 0, infant: 0 });
    expect(isRealPrice(prices.adult)).toBe(true);
  });
});

describe('tour card "from" price', () => {
  it('skips a 0 listing summary and uses the tour price instead', () => {
    expect(listingFromPrice({ pricingSummary: { fromPrice: 0 }, discountPrice: 60 })).toBe(60);
  });

  it('keeps a real listing summary untouched', () => {
    expect(listingFromPrice({ pricingSummary: { fromPrice: 21.66 }, discountPrice: 16 })).toBe(21.66);
    expect(listingFromPrice({ discountPrice: 49 })).toBe(49);
    expect(listingFromPrice({ discountPrice: 0, originalPrice: 70 })).toBe(70);
  });

  it('is null when nothing is priced', () => {
    expect(listingFromPrice({ pricingSummary: { fromPrice: 0 }, discountPrice: 0 })).toBeNull();
    expect(listingFromPrice(undefined)).toBeNull();
  });
});

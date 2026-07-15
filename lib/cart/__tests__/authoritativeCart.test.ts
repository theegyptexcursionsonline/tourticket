import {
  isAuthoritativePriceQuote,
  normalizeStoredCartPricingFields,
  replaceCartPriceQuote,
  type AuthoritativePriceQuote,
} from '@/lib/cart/authoritativeCart';

const quote: AuthoritativePriceQuote = {
  tourId: '507f1f77bcf86cd799439011',
  tourTitle: 'Nile Sunset Cruise',
  optionKey: 'premium-evening',
  date: '2026-08-01',
  time: '18:00',
  currency: 'USD',
  prices: { adult: 126, child: 70, infant: 5 },
  version: 4,
  executionId: 'execution-4',
  overrideId: 'override-4',
  source: 'override',
};

describe('authoritative cart pricing identity', () => {
  it('normalizes every server-authoritative field without dropping zero infant prices', () => {
    expect(normalizeStoredCartPricingFields({
      infantQuantity: 2,
      selectedBookingOption: {
        id: 'option-0',
        pricingKey: 'premium-evening',
        title: 'Premium evening',
        price: 126,
        originalPrice: 140,
        duration: '3 hours',
        badge: 'Popular',
      },
      guestPrices: { adult: 126, child: 70, infant: 0 },
      priceVersion: 4,
      priceExecutionId: 'execution-4',
      priceOverrideId: 'override-4',
      priceSource: 'override',
    })).toEqual({
      infantQuantity: 2,
      selectedBookingOption: {
        id: 'option-0',
        pricingKey: 'premium-evening',
        title: 'Premium evening',
        price: 126,
        originalPrice: 140,
        duration: '3 hours',
        badge: 'Popular',
      },
      guestPrices: { adult: 126, child: 70, infant: 0 },
      priceVersion: 4,
      priceExecutionId: 'execution-4',
      priceOverrideId: 'override-4',
      priceSource: 'override',
    });
  });

  it('replaces only the exact tour, option, date and time quote while preserving cart choices', () => {
    const matching = {
      id: quote.tourId,
      uniqueId: 'matching-line',
      selectedDate: `${quote.date}T00:00:00.000Z`,
      selectedTime: quote.time,
      quantity: 2,
      childQuantity: 1,
      infantQuantity: 1,
      selectedBookingOption: { id: 'option-0', pricingKey: quote.optionKey, title: 'Premium evening', price: 100 },
      selectedAddOns: { lunch: 1 },
      selectedAddOnDetails: { lunch: { id: 'lunch', title: 'Lunch', price: 10 } },
      guestPrices: { adult: 100, child: 50, infant: 0 },
      priceVersion: 3,
    };
    const differentTime = { ...matching, uniqueId: 'other-line', selectedTime: '19:00' };

    const result = replaceCartPriceQuote([matching, differentTime], quote);

    expect(result.replacements).toBe(1);
    expect(result.cart[0]).toMatchObject({
      uniqueId: 'matching-line',
      quantity: 2,
      childQuantity: 1,
      infantQuantity: 1,
      selectedAddOns: { lunch: 1 },
      selectedBookingOption: { id: 'option-0', pricingKey: quote.optionKey, title: 'Premium evening', price: 126 },
      guestPrices: quote.prices,
      priceVersion: 4,
      priceExecutionId: 'execution-4',
      priceOverrideId: 'override-4',
      priceSource: 'override',
      price: 126,
      discountPrice: 126,
    });
    expect(result.cart[1]).toBe(differentTime);
  });

  it('recognizes a complete quote and rejects an incomplete price-change payload', () => {
    expect(isAuthoritativePriceQuote(quote)).toBe(true);
    expect(isAuthoritativePriceQuote({ ...quote, optionKey: '' })).toBe(false);
    expect(isAuthoritativePriceQuote({ ...quote, prices: { adult: 126, child: 70 } })).toBe(false);
  });
});

jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } } },
}));

const tourLean = jest.fn();
const tourSelect = jest.fn(() => ({ lean: tourLean }));
const tourFindOne = jest.fn(() => ({ select: tourSelect }));

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => (tourFindOne as jest.Mock)(...args) },
}));

const overrideLean = jest.fn();
const overrideFindOne = jest.fn(() => ({ lean: overrideLean }));

jest.mock('@/lib/models/RevenuePriceOverride', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => (overrideFindOne as jest.Mock)(...args) },
}));

import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';

// The resolver is the single quote authority: the sidebar's live quote, the
// payment intent and the manual-booking writer all consume it. These tests pin
// its catalogue baseline to the shared discount helper so a tour percentage or
// a slot override can never be quoted without also being charged.
describe('resolveEffectivePrice catalogue baseline with tour discounts', () => {
  const discountedTour = {
    _id: 'tour-1',
    title: 'Discounted tour',
    discountPrice: 100,
    discountPercent: 20,
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    bookingOptions: [
      {
        pricingKey: 'private-key',
        type: 'Per Person',
        label: 'Private',
        price: 150,
        applyTourDiscount: true,
        timeSlots: [
          { time: '14:00', price: 200 },
          { time: '16:00' },
        ],
      },
      { pricingKey: 'group-key', type: 'Per Person', label: 'Group', price: 90 },
    ],
    availability: { slots: [{ time: '09:00', capacity: 10, price: 75 }] },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tourLean.mockResolvedValue(discountedTour);
    overrideLean.mockResolvedValue(null);
  });

  it('quotes the discounted adult price for an opted-in option and derives child from it', async () => {
    const quote = await resolveEffectivePrice({ tourId: 'a'.repeat(24), optionKey: 'private-key', date: '2099-01-01', time: '10:00' });
    expect(quote.prices).toEqual({ adult: 120, child: 60, infant: 0 });
    expect(quote.source).toBe('catalogue');
    expect(quote.prices.adult).toBe(authoritativeBasePrice(discountedTour, {
      selectedBookingOption: { pricingKey: 'private-key' },
      selectedTime: '10:00',
    }));
  });

  it('applies the discount to a slot price override for the selected time', async () => {
    const quote = await resolveEffectivePrice({ tourId: 'a'.repeat(24), optionKey: 'private-key', date: '2099-01-01', time: '14:00' });
    expect(quote.prices.adult).toBe(160); // 200 - 20%
  });

  it('inherits the discounted base when the selected slot has no price', async () => {
    const quote = await resolveEffectivePrice({ tourId: 'a'.repeat(24), optionKey: 'private-key', date: '2099-01-01', time: '16:00' });
    expect(quote.prices.adult).toBe(120);
  });

  it('leaves a non-opted option at full price', async () => {
    const quote = await resolveEffectivePrice({ tourId: 'a'.repeat(24), optionKey: 'group-key', date: '2099-01-01', time: '10:00' });
    expect(quote.prices.adult).toBe(90);
  });

  it('applies the percentage automatically to the standard universal slot and tour base', async () => {
    const slotQuote = await resolveEffectivePrice({ tourId: 'a'.repeat(24), date: '2099-01-01', time: '09:00' });
    expect(slotQuote.prices.adult).toBe(60);
    const plainQuote = await resolveEffectivePrice({ tourId: 'a'.repeat(24), date: '2099-01-01', time: '11:00' });
    expect(plainQuote.prices.adult).toBe(80);
  });

  it('invalidates explicit guest prices once the discount moves the adult baseline', async () => {
    tourLean.mockResolvedValueOnce({
      ...discountedTour,
      bookingOptions: [{
        pricingKey: 'private-key',
        type: 'Per Person',
        label: 'Private',
        price: 150,
        applyTourDiscount: true,
        guestPrices: { adult: 150, child: 70, infant: 5 },
      }],
    });
    const quote = await resolveEffectivePrice({ tourId: 'a'.repeat(24), optionKey: 'private-key', date: '2099-01-01', time: '10:00' });
    // Explicit prices described the pre-discount adult, so they no longer
    // verify; the child falls back to half the discounted base.
    expect(quote.prices).toEqual({ adult: 120, child: 60, infant: 0 });
  });

  it('lets an active RevenuePilot override win over the discounted catalogue', async () => {
    overrideLean.mockResolvedValueOnce({ _id: 'ovr-1', currency: 'USD', prices: { adult: 99, child: 45, infant: 0 }, version: 5 });
    const quote = await resolveEffectivePrice({ tourId: 'a'.repeat(24), optionKey: 'private-key', date: '2099-01-01', time: '14:00' });
    expect(quote.prices.adult).toBe(99);
    expect(quote.version).toBe(5);
    expect(quote.source).toBe('override');
    // The catalogue reference still reports the discounted number.
    expect(quote.cataloguePrices.adult).toBe(160);
  });

  it('still throws on an invalid stored option price instead of quoting 0', async () => {
    tourLean.mockResolvedValueOnce({
      ...discountedTour,
      bookingOptions: [{ pricingKey: 'broken-key', type: 'Per Person', label: 'Broken', price: Number.NaN }],
    });
    await expect(resolveEffectivePrice({ tourId: 'a'.repeat(24), optionKey: 'broken-key', date: '2099-01-01', time: '10:00' }))
      .rejects.toThrow('Invalid catalogue price');
  });
});

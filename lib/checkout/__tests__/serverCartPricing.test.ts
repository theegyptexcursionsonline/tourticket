jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } } },
}));

const lean = jest.fn();
const select = jest.fn(() => ({ lean }));
const findOne = jest.fn(() => ({ select }));

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: (...args: any[]) => (findOne as any)(...args) },
}));

jest.mock('@/lib/revenue/pricingResolver', () => ({
  STANDARD_OPTION_KEY: 'standard',
  resolveEffectivePrice: jest.fn(),
}));

import { PriceChangedError, secureCartPricing } from '@/lib/checkout/serverCartPricing';
import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';

describe('secureCartPricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lean.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      title: 'Catalogue Tour',
      discountPrice: 80,
      originalPrice: 100,
      bookingOptions: [{ label: 'Premium', type: 'Per Person', price: 120, pricingKey: 'premium-key' }],
      addOns: [
        { _id: { toString: () => 'addon-0' }, name: 'Lunch', description: 'Lunch package', price: 25, category: 'Food' },
        { _id: { toString: () => 'addon-1' }, name: 'Photos', description: 'Photo package', price: 40, category: 'Food', pricingMethod: 'per_unit' },
        { _id: { toString: () => 'addon-2' }, name: 'Guide', description: 'Private guide', price: 60, category: 'Experience', pricingMethod: 'per_person' },
      ],
    });
  });

  it('replaces client-supplied prices with catalogue prices', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      title: 'Tampered',
      quantity: 2,
      price: 0.01,
      discountPrice: 0.01,
      selectedBookingOption: { id: 'option-0', title: 'Tampered', price: 0.01 },
      selectedAddOns: { 'addon-0': 1 },
      selectedAddOnDetails: { 'addon-0': { price: 0.01 } },
    }]);

    expect(item.title).toBe('Catalogue Tour');
    expect(item.price).toBe(120);
    expect(item.selectedBookingOption.price).toBe(120);
    expect(item.selectedAddOnDetails['addon-0'].price).toBe(25);
  });

  it('derives perGuest from the admin pricing method, falling back to the legacy Food rule', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedAddOns: { 'addon-0': 1, 'addon-1': 1, 'addon-2': 1 },
    }]);
    // addon-0: legacy Food add-on without pricingMethod → per person
    expect(item.selectedAddOnDetails['addon-0'].perGuest).toBe(true);
    // addon-1: explicit per_unit wins over the Food category
    expect(item.selectedAddOnDetails['addon-1'].perGuest).toBe(false);
    // addon-2: explicit per_person on a non-Food category
    expect(item.selectedAddOnDetails['addon-2'].perGuest).toBe(true);
  });

  it('rejects add-ons that do not exist in the catalogue', async () => {
    await expect(secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedAddOns: { invented: 1 },
    }])).rejects.toThrow('Invalid add-on');
  });

  it('selects a non-standard option by stable pricingKey without a positional option id', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedBookingOption: { pricingKey: 'premium-key' },
    }]);

    expect(item.selectedBookingOption).toMatchObject({
      id: 'option-0',
      pricingKey: 'premium-key',
      price: 120,
    });
  });

  it('returns only authored add-ons and never manufactures fallback products', async () => {
    lean.mockResolvedValueOnce({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      title: 'No add-ons tour',
      discountPrice: 80,
      originalPrice: 100,
      bookingOptions: [],
      addOns: [],
    });

    const [item] = await secureCartPricing([{ id: '507f1f77bcf86cd799439011' }]);
    expect(item.availableAddOns).toEqual([]);
    await expect(secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedAddOns: { 'photo-package-fallback': 1 },
    }])).rejects.toThrow('Invalid add-on');
  });

  it('rejects a stale quote version instead of silently repricing checkout', async () => {
    jest.mocked(resolveEffectivePrice).mockResolvedValue({ version: 2, prices: { adult: 126, child: 63, infant: 0 } } as any);
    await expect(secureCartPricing([{
      id: '507f1f77bcf86cd799439011', selectedDate: '2026-08-01', selectedTime: '10:00', priceVersion: 1,
      selectedBookingOption: { id: 'option-0', pricingKey: 'premium-key' },
    }])).rejects.toBeInstanceOf(PriceChangedError);
  });

  it('uses explicit guest prices from the authoritative quote', async () => {
    jest.mocked(resolveEffectivePrice).mockResolvedValue({ version: 2, prices: { adult: 126, child: 70, infant: 5 }, executionId: 'exec-1', overrideId: 'override-1' } as any);
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011', selectedDate: '2026-08-01', selectedTime: '10:00', priceVersion: 2,
      selectedBookingOption: { id: 'option-0', pricingKey: 'premium-key' },
    }]);
    expect(item.guestPrices).toEqual({ adult: 126, child: 70, infant: 5 });
    expect(item.selectedBookingOption.price).toBe(126);
    expect(item.priceExecutionId).toBe('exec-1');
  });

  it('rejects a stale catalogue source version even when the override version is unchanged', async () => {
    jest.mocked(resolveEffectivePrice).mockResolvedValue({
      version: 2,
      sourceVersion: `pv1_${'b'.repeat(64)}`,
      prices: { adult: 126, child: 70, infant: 5 },
    } as any);
    await expect(secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedDate: '2026-08-01',
      selectedTime: '10:00',
      priceVersion: 2,
      priceSourceVersion: `pv1_${'a'.repeat(64)}`,
      selectedBookingOption: { pricingKey: 'premium-key' },
    }])).rejects.toBeInstanceOf(PriceChangedError);
  });
});

describe('secureCartPricing applies the tour discount exactly like the sidebar quote', () => {
  // Charge == quote: the cart hydrator and the storefront both price through
  // the shared discount helper, so these tests pin the charged amount to the
  // number the customer was shown — opted-in options, non-opted options, slot
  // overrides and the universal-slot standard path.
  const discountedTour = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    title: 'Discounted tour',
    discountPrice: 100,
    discountPercent: 20,
    originalPrice: 120,
    bookingOptions: [
      {
        label: 'Private',
        type: 'Per Person',
        price: 150,
        pricingKey: 'private-key',
        applyTourDiscount: true,
        timeSlots: [
          { time: '14:00', price: 200 },
          { time: '16:00' },
        ],
      },
      { label: 'Group', type: 'Per Person', price: 90, pricingKey: 'group-key', applyTourDiscount: false },
    ],
    addOns: [],
    availability: { slots: [{ time: '09:00', capacity: 10, price: 75 }] },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    lean.mockResolvedValue(discountedTour);
  });

  it('charges the discounted option price when the option opted in', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 2,
      selectedBookingOption: { id: 'option-0', pricingKey: 'private-key', price: 0.01 },
    }]);

    // 150 - 20% = 120 per adult; child derives from the discounted base.
    expect(item.selectedBookingOption.price).toBe(120);
    expect(item.discountPrice).toBe(120);
    expect(item.guestPrices).toEqual({ adult: 120, child: 60, infant: 0 });
    // The strikethrough base is the pre-discount price, so a real reduction shows.
    expect(item.selectedBookingOption.originalPrice).toBe(150);
    // Identical to the helper every quote surface calls.
    expect(item.selectedBookingOption.price).toBe(authoritativeBasePrice(discountedTour, {
      selectedBookingOption: { pricingKey: 'private-key' },
      selectedTime: null,
    }));
  });

  it('charges full price for an option that did not opt in to the discount', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedBookingOption: { id: 'option-1', pricingKey: 'group-key', price: 0.01 },
    }]);
    expect(item.selectedBookingOption.price).toBe(90);
    expect(item.guestPrices).toEqual({ adult: 90, child: 45, infant: 0 });
  });

  it('discounts a time-slot price override for the selected time', async () => {
    // selectedTime without selectedDate exercises the catalogue path directly.
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedTime: '14:00',
      selectedBookingOption: { id: 'option-0', pricingKey: 'private-key' },
    }]);
    // slot 200 - 20% = 160
    expect(item.selectedBookingOption.price).toBe(160);
    expect(item.selectedBookingOption.price).toBe(authoritativeBasePrice(discountedTour, {
      selectedBookingOption: { pricingKey: 'private-key' },
      selectedTime: '14:00',
    }));
  });

  it('falls back to the discounted option base when the slot has no price', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedTime: '16:00',
      selectedBookingOption: { id: 'option-0', pricingKey: 'private-key' },
    }]);
    expect(item.selectedBookingOption.price).toBe(120);
  });

  it('discounts the standard no-option universal slot price', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedTime: '09:00',
    }]);
    expect(item.selectedBookingOption.price).toBe(60);
    expect(item.selectedBookingOption.originalPrice).toBe(75);
    expect(item.selectedBookingOption.price).toBe(authoritativeBasePrice(discountedTour, {
      selectedBookingOption: null,
      selectedTime: '09:00',
    }));
  });

  it('still rejects an option whose stored price is invalid', async () => {
    lean.mockResolvedValueOnce({
      ...discountedTour,
      bookingOptions: [{ label: 'Broken', type: 'Per Person', price: Number.NaN, pricingKey: 'broken-key' }],
    });
    await expect(secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedBookingOption: { id: 'option-0', pricingKey: 'broken-key' },
    }])).rejects.toThrow('Invalid catalogue price');
  });

  it('lets a version-bound RevenuePilot quote win over the catalogue discount', async () => {
    jest.mocked(resolveEffectivePrice).mockResolvedValue({ version: 3, prices: { adult: 111, child: 55, infant: 0 } } as any);
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedDate: '2099-01-01',
      selectedTime: '14:00',
      priceVersion: 3,
      selectedBookingOption: { id: 'option-0', pricingKey: 'private-key' },
    }]);
    expect(item.selectedBookingOption.price).toBe(111);
    expect(item.guestPrices).toEqual({ adult: 111, child: 55, infant: 0 });
  });
});

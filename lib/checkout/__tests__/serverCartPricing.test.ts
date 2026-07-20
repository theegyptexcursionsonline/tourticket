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
        { name: 'Lunch', description: 'Lunch package', price: 25, category: 'Food' },
        { name: 'Photos', description: 'Photo package', price: 40, category: 'Food', pricingMethod: 'per_unit' },
        { name: 'Guide', description: 'Private guide', price: 60, category: 'Experience', pricingMethod: 'per_person' },
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
});

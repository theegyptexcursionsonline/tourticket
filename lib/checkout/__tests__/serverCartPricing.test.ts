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

import { secureCartPricing } from '@/lib/checkout/serverCartPricing';

describe('secureCartPricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lean.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      title: 'Catalogue Tour',
      discountPrice: 80,
      originalPrice: 100,
      bookingOptions: [{ label: 'Premium', type: 'Per Person', price: 120 }],
      addOns: [{ name: 'Lunch', description: 'Lunch package', price: 25, category: 'Food' }],
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

  it('rejects add-ons that do not exist in the catalogue', async () => {
    await expect(secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      selectedAddOns: { invented: 1 },
    }])).rejects.toThrow('Invalid add-on');
  });
});

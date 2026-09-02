/**
 * Server authority for per-person add-ons after the client-sheet change
 * (EEO 24 Aug): the guest's chosen quantity is billed, capped at the paying
 * party size, and the billed units are recorded on the line so booking
 * pages and receipts render what was charged.
 */
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

import { secureCartPricing } from '@/lib/checkout/serverCartPricing';
import { checkoutAddOnsTotal, checkoutItemSubtotal } from '@/lib/checkout/cartTotals';

const tour = {
  _id: { toString: () => '507f1f77bcf86cd799439011' },
  title: 'Canonical tour',
  discountPrice: 100,
  originalPrice: 100,
  addOns: [
    { _id: { toString: () => 'snorkel' }, name: 'Snorkel gear', price: 10, category: 'Experience', pricingMethod: 'per_person' },
    { _id: { toString: () => 'photos' }, name: 'Photo package', price: 40, category: 'Experience', pricingMethod: 'per_unit' },
  ],
};

describe('per-person add-on quantity is guest-chosen and bounded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lean.mockResolvedValue(tour);
  });

  it('bills exactly the chosen units when below the party size', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 3,
      childQuantity: 1,
      addOnQuantityVersion: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { snorkel: 2 },
    }]);
    // base 100×3 + 50×1 = 350; add-on 10 × 2 chosen units = 20
    expect(item.selectedAddOns.snorkel).toBe(2);
    expect(item.selectedAddOnDetails.snorkel).toMatchObject({ perGuest: true, quantity: 2 });
    expect(checkoutAddOnsTotal(item)).toBe(20);
    expect(checkoutItemSubtotal(item)).toBe(370);
  });

  it('caps the billed units at one per paying participant and ignores infants', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 2,
      childQuantity: 1,
      infantQuantity: 2,
      addOnQuantityVersion: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { snorkel: 9 },
    }]);
    expect(item.selectedAddOns.snorkel).toBe(3);
    expect(item.selectedAddOnDetails.snorkel.quantity).toBe(3);
    expect(checkoutAddOnsTotal(item)).toBe(30);
  });

  it('never multiplies a per-person add-on by the party size on the guest\'s behalf', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 4,
      addOnQuantityVersion: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { snorkel: 1 },
    }]);
    expect(item.selectedAddOns.snorkel).toBe(1);
    expect(checkoutAddOnsTotal(item)).toBe(10);
  });

  it('leaves per-unit add-ons on their requested quantity', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { photos: 2 },
    }]);
    expect(item.selectedAddOns.photos).toBe(2);
    expect(item.selectedAddOnDetails.photos).toMatchObject({ perGuest: false, quantity: 2 });
    expect(checkoutAddOnsTotal(item)).toBe(80);
  });

  it('preserves the whole paying-party charge for an unversioned cart toggle', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 2,
      childQuantity: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { snorkel: 1 },
    }]);
    expect(item.selectedAddOns.snorkel).toBe(3);
    expect(item.addOnQuantityVersion).toBe(1);
    expect(checkoutAddOnsTotal(item)).toBe(30);
  });

  it('does not record a quantity on the authored catalogue list', async () => {
    const [item] = await secureCartPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: {},
    }]);
    for (const authored of item.availableAddOns) expect(authored.quantity).toBeUndefined();
  });
});

jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/CheckoutInventoryHold', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/CheckoutInventoryLease', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/revenue/sellableDeparture', () => ({ assertRevenuePriceTargetSellable: jest.fn() }));
jest.mock('@/lib/revenue/pricingResolver', () => ({ normalizePriceDate: jest.fn() }));

import { assertInventoryCapacity, InventoryHoldError } from '@/lib/checkout/inventoryHolds';

describe('checkout inventory capacity guard', () => {
  it('subtracts both durable bookings and unexpired holds', () => {
    expect(assertInventoryCapacity({ capacity: 12, booked: 3, activeHeld: 4, requested: 2 }))
      .toEqual({ availableBefore: 5, availableAfter: 3 });
  });

  it('allows the exact final remaining capacity', () => {
    expect(assertInventoryCapacity({ capacity: 5, booked: 2, activeHeld: 1, requested: 2 }))
      .toEqual({ availableBefore: 2, availableAfter: 0 });
  });

  it('rejects oversell even when durable availability alone appears sufficient', () => {
    expect(() => assertInventoryCapacity({ capacity: 5, booked: 1, activeHeld: 3, requested: 2 }))
      .toThrow(expect.objectContaining({ code: 'INVENTORY_UNAVAILABLE', status: 409 }));
  });

  it.each([
    { capacity: Number.NaN, booked: 0, activeHeld: 0, requested: 1 },
    { capacity: 10, booked: 0, activeHeld: 0, requested: 0 },
    { capacity: 10, booked: 0, activeHeld: 0, requested: -1 },
  ])('fails closed for invalid capacity evidence %#', (input) => {
    expect(() => assertInventoryCapacity(input)).toThrow(InventoryHoldError);
  });
});

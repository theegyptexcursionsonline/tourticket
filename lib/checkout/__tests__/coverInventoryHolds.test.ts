jest.mock('@/lib/checkout/currentBookingCutoff', () => ({ currentBookingDeadline: jest.fn(async () => Date.now() + 3600000) }));
const mockHoldFind = jest.fn();
const mockHoldUpdateMany = jest.fn();
const mockHoldCount = jest.fn();

jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/CheckoutInventoryLease', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/CheckoutInventoryHold', () => ({
  __esModule: true,
  default: {
    find: (...args: unknown[]) => mockHoldFind(...args),
    updateMany: (...args: unknown[]) => mockHoldUpdateMany(...args),
    countDocuments: (...args: unknown[]) => mockHoldCount(...args),
  },
}));
jest.mock('@/lib/revenue/sellableDeparture', () => ({ assertRevenuePriceTargetSellable: jest.fn() }));
jest.mock('@/lib/revenue/pricingResolver', () => ({ normalizePriceDate: jest.fn() }));

import { coverInventoryHoldsUntil, MAX_CHECKOUT_HOLD_CARRY_MS, releaseInventoryHolds } from '@/lib/checkout/inventoryHolds';

const reservationKey = 'd'.repeat(64);
const until = new Date(Date.now() + 32 * 60 * 1000);
const rows = (reservedAt: Date[]) => ({ lean: async () => reservedAt.map((value) => ({ reservedAt: value })) });

describe('coverInventoryHoldsUntil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHoldUpdateMany.mockResolvedValue({ modifiedCount: 1 });
    mockHoldCount.mockResolvedValue(2);
  });

  it('lengthens every live hold of the reservation to the page deadline, never shortens one', async () => {
    mockHoldFind.mockReturnValue(rows([new Date(), new Date()]));
    await expect(coverInventoryHoldsUntil({ reservationKey, itemCount: 2, until })).resolves.toBe('covered');
    const [filter, update] = mockHoldUpdateMany.mock.calls[0];
    expect(filter).toMatchObject({ reservationKey, state: 'active', expiresAt: { $lt: until } });
    expect(update.$set.expiresAt).toEqual(until);
  });

  it('refuses when an item has no live hold, so no page is made without seats', async () => {
    mockHoldFind.mockReturnValue(rows([new Date()]));
    await expect(coverInventoryHoldsUntil({ reservationKey, itemCount: 2, until }))
      .rejects.toMatchObject({ code: 'INVENTORY_HOLD_MISSING' });
    expect(mockHoldUpdateMany).not.toHaveBeenCalled();
  });

  it('refuses when a hold lapsed between the read and the write', async () => {
    mockHoldFind.mockReturnValue(rows([new Date(), new Date()]));
    mockHoldCount.mockResolvedValue(1);
    await expect(coverInventoryHoldsUntil({ reservationKey, itemCount: 2, until }))
      .rejects.toMatchObject({ code: 'INVENTORY_HOLD_MISSING' });
  });

  it('stops carrying a reservation across pages after the carry limit', async () => {
    const old = new Date(Date.now() - MAX_CHECKOUT_HOLD_CARRY_MS - 1000);
    mockHoldFind.mockReturnValue(rows([new Date(), old]));
    await expect(coverInventoryHoldsUntil({ reservationKey, itemCount: 2, until })).resolves.toBe('stale');
    expect(mockHoldUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects malformed input', async () => {
    await expect(coverInventoryHoldsUntil({ reservationKey: 'nope', itemCount: 1, until }))
      .rejects.toMatchObject({ code: 'INVALID_INVENTORY_RESERVATION' });
  });
});

describe('releaseInventoryHolds onlyUnbound', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHoldUpdateMany.mockResolvedValue({ modifiedCount: 1 });
  });

  it('leaves seats already bound to a payment for its webhook', async () => {
    await releaseInventoryHolds({ reservationKey, reason: 'checkout_session_replaced', onlyUnbound: true });
    expect(mockHoldUpdateMany.mock.calls[0][0]).toMatchObject({ reservationKey, state: 'active', paymentIntentId: { $exists: false } });
  });

  it('keeps the existing behaviour by default', async () => {
    await releaseInventoryHolds({ reservationKey, reason: 'checkout_session_expired' });
    expect(mockHoldUpdateMany.mock.calls[0][0]).not.toHaveProperty('paymentIntentId');
  });
});

const mockLeaseFindOneAndUpdate = jest.fn();
const mockLeaseUpdateOne = jest.fn();
const mockHoldFindOne = jest.fn();
const mockHoldFind = jest.fn();
const mockHoldFindOneAndUpdate = jest.fn();
const mockHoldUpdateMany = jest.fn();
const mockAssertSellable = jest.fn();
const mockNormalizePriceDate = jest.fn((value: string) => new Date(`${value}T00:00:00.000Z`));

jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/CheckoutInventoryLease', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...args: unknown[]) => mockLeaseFindOneAndUpdate(...args),
    updateOne: (...args: unknown[]) => mockLeaseUpdateOne(...args),
  },
}));
jest.mock('@/lib/models/CheckoutInventoryHold', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockHoldFindOne(...args),
    find: (...args: unknown[]) => mockHoldFind(...args),
    findOneAndUpdate: (...args: unknown[]) => mockHoldFindOneAndUpdate(...args),
    updateMany: (...args: unknown[]) => mockHoldUpdateMany(...args),
  },
}));
jest.mock('@/lib/revenue/sellableDeparture', () => ({
  assertRevenuePriceTargetSellable: (...args: unknown[]) => mockAssertSellable(...args),
}));
jest.mock('@/lib/revenue/pricingResolver', () => ({
  normalizePriceDate: (value: unknown) => mockNormalizePriceDate(String(value)),
}));

import {
  createInventoryHolds,
  inspectInventoryAvailability,
} from '@/lib/checkout/inventoryHolds';

type FakeHold = {
  _id: { toString: () => string };
  tenantId: string;
  reservationKey: string;
  itemIndex: number;
  tourId: string;
  date: Date;
  dateString: string;
  time: string;
  optionKey: string;
  guests: number;
  state: 'active' | 'released';
  expiresAt: Date;
};

const item = {
  id: '507f1f77bcf86cd799439011',
  selectedDate: '2099-08-17',
  selectedTime: '10:00',
  quantity: 1,
  childQuantity: 0,
  infantQuantity: 0,
  selectedBookingOption: { pricingKey: 'standard' },
};

describe('checkout inventory lease concurrency', () => {
  let leaseHeld: boolean;
  let leaseToken: string | null;
  let holds: FakeHold[];

  beforeEach(() => {
    jest.clearAllMocks();
    leaseHeld = false;
    leaseToken = null;
    holds = [];
    mockAssertSellable.mockResolvedValue({
      startsAtUtc: '2099-08-17T08:00:00.000Z',
      capacity: 1,
      booked: 0,
      available: 1,
      optionId: 'standard',
    });
    mockLeaseFindOneAndUpdate.mockImplementation((_filter, update: any) => ({
      lean: async () => {
        if (leaseHeld) throw Object.assign(new Error('duplicate lease'), { code: 11000 });
        leaseHeld = true;
        leaseToken = update.$set.leaseToken;
        return { leaseToken };
      },
    }));
    mockLeaseUpdateOne.mockImplementation(async (filter: any) => {
      if (filter.leaseToken === leaseToken) {
        leaseHeld = false;
        leaseToken = null;
      }
      return { modifiedCount: 1 };
    });
    mockHoldFindOne.mockImplementation((filter: any) => ({
      lean: async () => holds.find((hold) => hold.tenantId === filter.tenantId
        && hold.reservationKey === filter.reservationKey
        && hold.itemIndex === filter.itemIndex) || null,
    }));
    mockHoldFind.mockImplementation(() => ({
      select: () => ({
        lean: async () => holds.filter((hold) => hold.state === 'active' && hold.expiresAt.getTime() > Date.now()),
      }),
    }));
    mockHoldFindOneAndUpdate.mockImplementation(async (filter: any, update: any) => {
      let hold = holds.find((candidate) => candidate.tenantId === filter.tenantId
        && candidate.reservationKey === filter.reservationKey
        && candidate.itemIndex === filter.itemIndex);
      if (!hold) {
        hold = {
          _id: { toString: () => `hold-${holds.length + 1}` },
          tenantId: filter.tenantId,
          reservationKey: filter.reservationKey,
          itemIndex: filter.itemIndex,
          tourId: '',
          date: new Date(0),
          dateString: '',
          time: '',
          optionKey: '',
          guests: 0,
          state: 'active',
          expiresAt: new Date(0),
        };
        holds.push(hold);
      }
      Object.assign(hold, update.$set);
      return hold;
    });
    mockHoldUpdateMany.mockImplementation(async (filter: any, update: any) => {
      let modifiedCount = 0;
      for (const hold of holds) {
        if (hold.tenantId === filter.tenantId
          && hold.state === filter.state
          && (!filter.reservationKey || hold.reservationKey === filter.reservationKey)) {
          Object.assign(hold, update.$set);
          modifiedCount += 1;
        }
      }
      return { modifiedCount };
    });
  });

  it('serializes concurrent last-seat holds so exactly one reservation wins', async () => {
    const results = await Promise.allSettled([
      createInventoryHolds({ reservationKey: 'a'.repeat(64), cart: [item] }),
      createInventoryHolds({ reservationKey: 'b'.repeat(64), cart: [item] }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(holds.filter((hold) => hold.state === 'active')).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected?.reason).toMatchObject({ code: 'INVENTORY_UNAVAILABLE', status: 409 });
  });

  it('reports booked and held capacity through the same lease-protected snapshot', async () => {
    holds.push({
      _id: { toString: () => 'existing-hold' },
      tenantId: 'default',
      reservationKey: 'c'.repeat(64),
      itemIndex: 0,
      tourId: item.id,
      date: new Date(`${item.selectedDate}T00:00:00.000Z`),
      dateString: item.selectedDate,
      time: item.selectedTime,
      optionKey: item.selectedBookingOption.pricingKey,
      guests: 1,
      state: 'active',
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockAssertSellable.mockResolvedValueOnce({
      startsAtUtc: '2099-08-17T08:00:00.000Z',
      capacity: 4,
      booked: 1,
      available: 3,
      optionId: 'standard',
    });

    await expect(inspectInventoryAvailability(item)).resolves.toMatchObject({
      tenantId: 'default',
      optionKey: 'standard',
      requestedGuests: 1,
      booked: 1,
      activeHeld: 1,
      available: 2,
      availableAfterHold: 1,
    });
  });
});

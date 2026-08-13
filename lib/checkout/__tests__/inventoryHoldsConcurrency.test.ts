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
  commitInventoryReservationHold,
  createInventoryHolds,
  inspectInventoryAvailability,
  recoverPaidInventoryReservationHold,
  releaseInventoryHolds,
} from '@/lib/checkout/inventoryHolds';

type FakeHold = {
  _id: { toString: () => string };
  tenantId: string;
  reservationKey: string;
  commerceContractVersion?: string;
  commerceQuoteVersion?: string;
  commerceTargetBinding?: string;
  checkoutAttemptId?: string;
  paymentAmountMinor?: number;
  paymentCurrency?: string;
  paymentIntentId?: string;
  itemIndex: number;
  tourId: string;
  date: Date;
  dateString: string;
  time: string;
  optionKey: string;
  guests: number;
  state: 'active' | 'converted' | 'released' | 'expired';
  expiresAt: Date;
  convertedBookingId?: { toString: () => string };
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

const commerceContext = {
  contractVersion: 'eeo.mobile-commerce.v1',
  quoteVersion: `mqv1_${'d'.repeat(64)}`,
  targetBinding: 'e'.repeat(64),
  checkoutAttemptId: '11111111-1111-4111-8111-111111111111',
  paymentAmountMinor: 12500,
  paymentCurrency: 'usd' as const,
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
      let hold = filter._id
        ? holds.find((candidate) => candidate._id.toString() === filter._id.toString())
        : holds.find((candidate) => candidate.tenantId === filter.tenantId
          && candidate.reservationKey === filter.reservationKey
          && candidate.itemIndex === filter.itemIndex);
      if (hold && filter.state?.$in && !filter.state.$in.includes(hold.state)) return null;
      if (hold && typeof filter.state === 'string' && hold.state !== filter.state) return null;
      if (hold && filter.expiresAt?.$gt && hold.expiresAt <= filter.expiresAt.$gt) return null;
      if (hold && filter.$or && hold.paymentIntentId
        && !filter.$or.some((condition: any) => condition.paymentIntentId === hold?.paymentIntentId)) return null;
      if (!hold && filter._id) return null;
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
      for (const field of Object.keys(update.$unset || {})) {
        delete (hold as unknown as Record<string, unknown>)[field];
      }
      return hold;
    });
    mockHoldUpdateMany.mockImplementation(async (filter: any, update: any) => {
      let modifiedCount = 0;
      for (const hold of holds) {
        if (hold.tenantId === filter.tenantId
          && hold.state === filter.state
          && (!filter.reservationKey || hold.reservationKey === filter.reservationKey)) {
          Object.assign(hold, update.$set);
          for (const field of Object.keys(update.$unset || {})) {
            delete (hold as unknown as Record<string, unknown>)[field];
          }
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

  it('uses a bounded explicit hold window for hosted Checkout without extending retries', async () => {
    const startedAt = Date.now();
    const reservationKey = '8'.repeat(64);
    await createInventoryHolds({ reservationKey, cart: [item], holdMinutes: 32 });
    const firstExpiry = holds[0].expiresAt.getTime();
    expect(firstExpiry).toBeGreaterThanOrEqual(startedAt + (32 * 60 * 1000));
    expect(firstExpiry).toBeLessThanOrEqual(Date.now() + (32 * 60 * 1000));

    await createInventoryHolds({ reservationKey, cart: [item], holdMinutes: 40 });
    expect(holds[0].expiresAt.getTime()).toBe(firstExpiry);
  });

  it('clears the previous provider binding when a released reservation is retried', async () => {
    const reservationKey = '9'.repeat(64);
    await createInventoryHolds({ reservationKey, cart: [item] });
    holds[0].paymentIntentId = 'pi_abandoned_attempt';

    await releaseInventoryHolds({ reservationKey, reason: 'payment_canceled' });
    expect(holds[0]).toMatchObject({ state: 'released', paymentIntentId: 'pi_abandoned_attempt' });

    await createInventoryHolds({ reservationKey, cart: [item] });

    expect(holds[0]).toMatchObject({ state: 'active' });
    expect(holds[0].paymentIntentId).toBeUndefined();
  });

  it('rejects out-of-policy custom hold windows', async () => {
    await expect(createInventoryHolds({
      reservationKey: '7'.repeat(64),
      cart: [item],
      holdMinutes: 61,
    })).rejects.toMatchObject({ code: 'INVALID_INVENTORY_RESERVATION' });
  });

  it('commits a paid hold exactly once across concurrent replay', async () => {
    const reservationKey = 'f'.repeat(64);
    const bookingId = { toString: () => '507f1f77bcf86cd799439099' };
    await createInventoryHolds({ reservationKey, cart: [item], commerceContext });

    const results = await Promise.all([
      commitInventoryReservationHold({
        reservationKey,
        paymentIntentId: 'pi_mobile_commit_1',
        itemIndex: 0,
        bookingId: bookingId as never,
        item,
        commerceContext,
      }),
      commitInventoryReservationHold({
        reservationKey,
        paymentIntentId: 'pi_mobile_commit_1',
        itemIndex: 0,
        bookingId: bookingId as never,
        item,
        commerceContext,
      }),
    ]);

    expect(results.map((result) => result.alreadyCommitted).sort()).toEqual([false, true]);
    expect(holds).toHaveLength(1);
    expect(holds[0]).toMatchObject({
      state: 'converted',
      paymentIntentId: 'pi_mobile_commit_1',
    });
  });

  it('rejects a replay that changes the payment or booking binding', async () => {
    const reservationKey = '9'.repeat(64);
    const bookingId = { toString: () => '507f1f77bcf86cd799439099' };
    await createInventoryHolds({ reservationKey, cart: [item], commerceContext });
    await commitInventoryReservationHold({
      reservationKey,
      paymentIntentId: 'pi_mobile_commit_2',
      itemIndex: 0,
      bookingId: bookingId as never,
      item,
      commerceContext,
    });

    await expect(commitInventoryReservationHold({
      reservationKey,
      paymentIntentId: 'pi_mobile_commit_other',
      itemIndex: 0,
      bookingId: { toString: () => '507f1f77bcf86cd799439098' } as never,
      item,
      commerceContext,
    })).rejects.toMatchObject({ code: 'INVENTORY_PAYMENT_CONFLICT', status: 409 });
  });

  it('recovers an expired paid hold exactly once without adding capacity twice', async () => {
    const reservationKey = '6'.repeat(64);
    const bookingId = { toString: () => '507f1f77bcf86cd799439099' };
    await createInventoryHolds({ reservationKey, cart: [item], commerceContext });
    holds[0].state = 'expired';
    holds[0].expiresAt = new Date(Date.now() - 60_000);

    const first = await recoverPaidInventoryReservationHold({
      reservationKey,
      paymentIntentId: 'pi_mobile_recovery_1',
      itemIndex: 0,
      bookingId: bookingId as never,
      item,
      commerceContext,
    });
    const replay = await recoverPaidInventoryReservationHold({
      reservationKey,
      paymentIntentId: 'pi_mobile_recovery_1',
      itemIndex: 0,
      bookingId: bookingId as never,
      item,
      commerceContext,
    });

    expect(first.alreadyCommitted).toBe(false);
    expect(replay.alreadyCommitted).toBe(true);
    expect(holds[0]).toMatchObject({
      state: 'converted',
      paymentIntentId: 'pi_mobile_recovery_1',
      convertedBookingId: bookingId,
    });
    expect(mockAssertSellable).toHaveBeenCalledTimes(1);
  });

  it('rejects expired recovery when durable commerce evidence changes', async () => {
    const reservationKey = '5'.repeat(64);
    await createInventoryHolds({ reservationKey, cart: [item], commerceContext });
    holds[0].state = 'expired';

    await expect(recoverPaidInventoryReservationHold({
      reservationKey,
      paymentIntentId: 'pi_mobile_recovery_conflict',
      itemIndex: 0,
      bookingId: { toString: () => '507f1f77bcf86cd799439099' } as never,
      item,
      commerceContext: { ...commerceContext, targetBinding: 'f'.repeat(64) },
    })).rejects.toMatchObject({ code: 'INVENTORY_RECOVERY_CONFLICT', status: 409 });
    expect(holds[0].state).toBe('expired');
  });
});

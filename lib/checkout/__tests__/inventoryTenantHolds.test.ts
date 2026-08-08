jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock('@/lib/models/CheckoutInventoryHold', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));
jest.mock('@/lib/models/CheckoutInventoryLease', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock('@/lib/revenue/sellableDeparture', () => ({
  assertRevenuePriceTargetSellable: jest.fn(),
}));
jest.mock('@/lib/revenue/pricingResolver', () => ({
  normalizePriceDate: jest.fn((value: string) => new Date(`${value}T00:00:00.000Z`)),
}));

import Booking from '@/lib/models/Booking';
import CheckoutInventoryHold from '@/lib/models/CheckoutInventoryHold';
import CheckoutInventoryLease from '@/lib/models/CheckoutInventoryLease';
import { ensureInventoryHoldsForPayment } from '@/lib/checkout/inventoryHolds';
import { assertRevenuePriceTargetSellable } from '@/lib/revenue/sellableDeparture';

describe('paid brand inventory recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(CheckoutInventoryLease.findOneAndUpdate).mockImplementation(((_filter: unknown, update: unknown) => ({
      lean: jest.fn().mockResolvedValue({
        leaseToken: (update as { $set: { leaseToken: string } }).$set.leaseToken,
      }),
    })) as never);
    jest.mocked(CheckoutInventoryLease.updateOne).mockResolvedValue({ acknowledged: true } as never);
    jest.mocked(Booking.findOne).mockReturnValue({
      select: () => ({ lean: jest.fn().mockResolvedValue({ _id: '6a76fbe774b8df75965f67af' }) }),
    } as never);
    jest.mocked(CheckoutInventoryHold.findOne).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    } as never);
    jest.mocked(CheckoutInventoryHold.find).mockReturnValue({
      select: () => ({ lean: jest.fn().mockResolvedValue([]) }),
    } as never);
    jest.mocked(CheckoutInventoryHold.findOneAndUpdate).mockReturnValue({
      lean: jest.fn().mockResolvedValue({ state: 'converted' }),
    } as never);
  });

  it('finds an existing booking and creates its converted hold inside the paying tenant', async () => {
    await ensureInventoryHoldsForPayment({
      tenantId: 'hurghada-excursions-online',
      paymentIntentId: 'pi_brand_inventory_1',
      reservationKey: 'a'.repeat(64),
      cart: [{
        _id: '69861276f1598842cc1e5028',
        selectedDate: '2026-08-09',
        selectedTime: '10:00',
        quantity: 3,
        childQuantity: 2,
        infantQuantity: 1,
        selectedBookingOption: { pricingKey: 'd84ce0bd-a038-44f0-9e45-34f56d1ab860' },
      }],
    });

    expect(Booking.findOne).toHaveBeenCalledWith({
      tenantId: 'hurghada-excursions-online',
      paymentId: 'pi_brand_inventory_1',
      paymentItemIndex: 0,
    });
    expect(CheckoutInventoryHold.findOneAndUpdate).toHaveBeenCalledWith(
      {
        tenantId: 'hurghada-excursions-online',
        reservationKey: 'a'.repeat(64),
        itemIndex: 0,
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          paymentIntentId: 'pi_brand_inventory_1',
          state: 'converted',
        }),
      }),
      { upsert: true, new: true },
    );
    expect(assertRevenuePriceTargetSellable).not.toHaveBeenCalled();
  });

  it('checks an unrecovered brand departure against that brand, never the flagship', async () => {
    jest.mocked(Booking.findOne).mockReturnValue({
      select: () => ({ lean: jest.fn().mockResolvedValue(null) }),
    } as never);
    jest.mocked(assertRevenuePriceTargetSellable).mockResolvedValue({
      startsAtUtc: '2026-08-09T07:00:00.000Z',
      capacity: 10,
      booked: 0,
      available: 10,
      optionId: 'glass-boat-tour',
    });
    jest.mocked(CheckoutInventoryHold.findOneAndUpdate).mockReturnValue({
      lean: jest.fn().mockResolvedValue({ state: 'active' }),
    } as never);

    await ensureInventoryHoldsForPayment({
      tenantId: 'hurghada-excursions-online',
      paymentIntentId: 'pi_brand_inventory_2',
      reservationKey: 'b'.repeat(64),
      cart: [{
        _id: '69861276f1598842cc1e5028',
        selectedDate: '2026-08-09',
        selectedTime: '10:00',
        quantity: 3,
        childQuantity: 2,
        infantQuantity: 1,
        selectedBookingOption: { pricingKey: 'd84ce0bd-a038-44f0-9e45-34f56d1ab860' },
      }],
    });

    expect(assertRevenuePriceTargetSellable).toHaveBeenCalledWith({
      tenantId: 'hurghada-excursions-online',
      tourId: '69861276f1598842cc1e5028',
      optionKey: 'd84ce0bd-a038-44f0-9e45-34f56d1ab860',
      date: '2026-08-09',
      time: '10:00',
    });
    expect(CheckoutInventoryHold.findOneAndUpdate).toHaveBeenCalledWith(
      {
        tenantId: 'hurghada-excursions-online',
        reservationKey: 'b'.repeat(64),
        itemIndex: 0,
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          paymentIntentId: 'pi_brand_inventory_2',
          state: 'active',
        }),
      }),
      { upsert: true, new: true },
    );
  });
});

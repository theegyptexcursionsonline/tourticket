jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: { updateMany: jest.fn() },
}));
jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock('@/lib/checkout/inventoryHolds', () => ({ releaseInventoryHolds: jest.fn() }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

import * as Sentry from '@sentry/nextjs';
import Booking from '@/lib/models/Booking';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import { releaseInventoryHolds } from '@/lib/checkout/inventoryHolds';
import { refundUnavailablePaidInventory } from '@/lib/checkout/inventoryPaymentRecovery';

const mockBookingUpdateMany = jest.mocked(Booking.updateMany);
const mockQuoteUpdateOne = jest.mocked(CheckoutPaymentQuote.updateOne);
const mockQuoteFindOne = jest.mocked(CheckoutPaymentQuote.findOne);
const mockReleaseInventoryHolds = jest.mocked(releaseInventoryHolds);
const mockCaptureException = jest.mocked(Sentry.captureException);
const mockQuoteLean = jest.fn();

describe('paid inventory refund recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuoteLean.mockResolvedValue(null);
    mockQuoteFindOne.mockReturnValue({ select: () => ({ lean: mockQuoteLean }) } as never);
    mockQuoteUpdateOne.mockResolvedValue({ acknowledged: true } as never);
    mockBookingUpdateMany.mockResolvedValue({ modifiedCount: 0 } as never);
    mockReleaseInventoryHolds.mockResolvedValue(1);
  });

  it('cancels partial bookings and creates one idempotent full refund', async () => {
    const createRefund = jest.fn().mockResolvedValue({ id: 're_inventory_1' });
    const stripe = { refunds: { create: createRefund } } as never;

    await expect(refundUnavailablePaidInventory({
      stripe,
      paymentIntentId: 'pi_inventory_1',
      reason: 'INVENTORY_UNAVAILABLE',
    })).resolves.toEqual({ id: 're_inventory_1', replayed: false });

    expect(mockBookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'default', paymentId: 'pi_inventory_1' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'Cancelled' }) }),
    );
    expect(createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_inventory_1' }),
      { idempotencyKey: 'inventory-unavailable-pi_inventory_1' },
    );
    expect(mockReleaseInventoryHolds).toHaveBeenCalledWith({
      tenantId: 'default',
      paymentIntentId: 'pi_inventory_1',
      reason: 'paid_inventory_refunded',
    });
    expect(mockQuoteUpdateOne).toHaveBeenLastCalledWith(
      { tenantId: 'default', paymentIntentId: 'pi_inventory_1' },
      { $set: expect.objectContaining({ inventoryState: 'refunded', inventoryRefundId: 're_inventory_1' }) },
    );
  });

  it('cancels and releases only the paying brand when a brand charge cannot be fulfilled', async () => {
    const createRefund = jest.fn().mockResolvedValue({ id: 're_inventory_brand' });

    await refundUnavailablePaidInventory({
      stripe: { refunds: { create: createRefund } } as never,
      paymentIntentId: 'pi_inventory_brand',
      reason: 'TOUR_UNAVAILABLE',
      tenantId: 'hurghada-excursions-online',
    });

    expect(mockBookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'hurghada-excursions-online',
        paymentId: 'pi_inventory_brand',
      }),
      expect.any(Object),
    );
    expect(mockReleaseInventoryHolds).toHaveBeenCalledWith({
      tenantId: 'hurghada-excursions-online',
      paymentIntentId: 'pi_inventory_brand',
      reason: 'paid_inventory_refunded',
    });
    expect(mockQuoteUpdateOne).toHaveBeenLastCalledWith(
      { tenantId: 'hurghada-excursions-online', paymentIntentId: 'pi_inventory_brand' },
      { $set: expect.objectContaining({ inventoryState: 'refunded' }) },
    );
  });

  it('replays an already recorded refund without calling Stripe again', async () => {
    mockQuoteLean.mockResolvedValue({ inventoryState: 'refunded', inventoryRefundId: 're_existing' });
    const createRefund = jest.fn();

    await expect(refundUnavailablePaidInventory({
      stripe: { refunds: { create: createRefund } } as never,
      paymentIntentId: 'pi_inventory_2',
      reason: 'INVENTORY_UNAVAILABLE',
    })).resolves.toEqual({ id: 're_existing', replayed: true });
    expect(createRefund).not.toHaveBeenCalled();
    expect(mockBookingUpdateMany).not.toHaveBeenCalled();
  });

  it('records and reports a critical refund failure', async () => {
    const error = new Error('Stripe unavailable');
    const createRefund = jest.fn().mockRejectedValue(error);

    await expect(refundUnavailablePaidInventory({
      stripe: { refunds: { create: createRefund } } as never,
      paymentIntentId: 'pi_inventory_3',
      reason: 'INVENTORY_UNAVAILABLE',
    })).rejects.toThrow('Stripe unavailable');
    expect(mockQuoteUpdateOne).toHaveBeenLastCalledWith(
      { tenantId: 'default', paymentIntentId: 'pi_inventory_3' },
      { $set: expect.objectContaining({ inventoryState: 'refund_failed' }) },
    );
    expect(mockCaptureException).toHaveBeenCalledWith(error, expect.objectContaining({ level: 'fatal' }));
  });
});

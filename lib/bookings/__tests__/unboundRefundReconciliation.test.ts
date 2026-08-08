jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

import type Stripe from 'stripe';
import Booking from '@/lib/models/Booking';
import { reconcileUnboundStripeRefund } from '@/lib/bookings/refunds';

function refund(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
  return {
    id: 're_inventory_brand',
    object: 'refund',
    amount: 8640,
    balance_transaction: null,
    charge: 'ch_brand',
    created: 0,
    currency: 'usd',
    destination_details: null,
    metadata: { reason_code: 'inventory_unavailable' },
    payment_intent: 'pi_brand_refunded',
    reason: 'requested_by_customer',
    receipt_number: null,
    source_transfer_reversal: null,
    status: 'succeeded',
    transfer_reversal: null,
    ...overrides,
  } as Stripe.Refund;
}

describe('unbound Stripe refund reconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks the one late-created booking refunded after the provider refund finalizes', async () => {
    jest.mocked(Booking.find).mockReturnValue({
      select: () => ({
        lean: jest.fn().mockResolvedValue([{
          _id: '6a76fbe774b8df75965f67af',
          totalPrice: 86.4,
        }]),
      }),
    } as never);
    jest.mocked(Booking.findOneAndUpdate).mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: '6a76fbe774b8df75965f67af' }),
    } as never);

    await expect(reconcileUnboundStripeRefund(refund())).resolves.toMatchObject({
      handled: true,
      finalized: true,
      bookingId: '6a76fbe774b8df75965f67af',
    });
    expect(Booking.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '6a76fbe774b8df75965f67af', refundState: { $ne: 'succeeded' } },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'Refunded',
          refundState: 'succeeded',
          refundProviderId: 're_inventory_brand',
          refundPaymentIntentId: 'pi_brand_refunded',
          refundAmount: 86.4,
        }),
      }),
      { new: true },
    );
  });

  it('does not guess when one payment is bound to multiple bookings', async () => {
    jest.mocked(Booking.find).mockReturnValue({
      select: () => ({
        lean: jest.fn().mockResolvedValue([{ _id: 'one' }, { _id: 'two' }]),
      }),
    } as never);

    await expect(reconcileUnboundStripeRefund(refund())).resolves.toEqual({
      handled: false,
      reason: 'multiple_bookings_require_review',
    });
    expect(Booking.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('waits for a final provider status', async () => {
    await expect(reconcileUnboundStripeRefund(refund({ status: 'pending' }))).resolves.toEqual({
      handled: false,
      reason: 'refund_not_final',
    });
    expect(Booking.find).not.toHaveBeenCalled();
  });
});

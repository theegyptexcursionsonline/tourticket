jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));

import Booking from '@/lib/models/Booking';
import { BookingRefundError, requestBookingRefund } from '@/lib/bookings/refunds';

const findOne = Booking.findOne as unknown as jest.Mock;
const findOneAndUpdate = Booking.findOneAndUpdate as unknown as jest.Mock;
const updateOne = Booking.updateOne as unknown as jest.Mock;

// Regression: a $0 policy cancellation ('not_required') already consumed the
// one-shot notification claim with its cancellation email. A later admin
// refund of the same booking is a NEW financial outcome and must be able to
// email the customer once it completes — so the refund's pending claim has to
// release the stale notification claim atomically.
describe('refund claim releases a stale notification claim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('unsets prior refundNotification* fields when superseding a $0 cancellation', async () => {
    const priorBooking = {
      _id: '507f1f77bcf86cd799439011',
      __v: 3,
      tenantId: 'default',
      date: new Date('2027-01-15T00:00:00.000Z'),
      dateString: '2027-01-15',
      time: '10:00',
      status: 'Cancelled',
      totalPrice: 58.32,
      currency: 'USD',
      paymentId: 'pi_test_123',
      paymentMethod: 'card',
      refundState: 'not_required',
      refundKind: 'customer_cancel',
      refundAmount: 0,
    };
    findOne.mockReturnValue({ select: () => ({ lean: async () => priorBooking }) });
    findOneAndUpdate.mockReturnValue({
      lean: async () => ({ ...priorBooking, refundState: 'pending', refundProviderIdempotencyKey: 'booking-refund:x:y' }),
    });

    await expect(requestBookingRefund(
      {
        bookingId: '507f1f77bcf86cd799439011',
        kind: 'admin_full',
        actor: 'admin@test',
      },
      () => {
        // Fail at the provider boundary: the claim (the behavior under test)
        // has already been written by this point.
        throw new Error('provider unavailable');
      },
    )).rejects.toMatchObject({ code: 'REFUND_PROVIDER_UNAVAILABLE' });

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [claimQuery, claimUpdate] = findOneAndUpdate.mock.calls[0];
    expect(claimQuery.$or).toEqual(expect.arrayContaining([{ refundState: 'not_required' }]));
    expect(claimUpdate.$set.refundState).toBe('pending');
    expect(claimUpdate.$unset).toMatchObject({
      refundNotificationState: 1,
      refundNotificationSentAt: 1,
      refundNotificationClaimToken: 1,
      refundNotificationClaimedAt: 1,
      refundNotificationFailureCode: 1,
    });
  });

  it('never reaches the claim (or the unset) when replaying an already-notified refund', async () => {
    findOne.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: '507f1f77bcf86cd799439011',
          __v: 4,
          tenantId: 'default',
          date: new Date('2027-01-15T00:00:00.000Z'),
          time: '10:00',
          status: 'Refunded',
          totalPrice: 58.32,
          currency: 'USD',
          paymentId: 'pi_test_123',
          refundState: 'succeeded',
          refundKind: 'admin_full',
          refundAmount: 58.32,
          refundProviderId: 're_test_123',
        }),
      }),
    });

    const outcome = await requestBookingRefund(
      { bookingId: '507f1f77bcf86cd799439011', kind: 'admin_full', actor: 'admin@test' },
      () => { throw new Error('must not contact provider'); },
    );

    expect(outcome.replayed).toBe(true);
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });
});

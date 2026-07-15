jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/email/emailService', () => ({
  EmailService: {
    sendCancellationConfirmation: jest.fn(),
    sendBookingStatusUpdate: jest.fn(),
    sendBookingConfirmation: jest.fn(),
    sendOperatorBookingUpdate: jest.fn(),
  },
}));

import Booking from '@/lib/models/Booking';
import { EmailService } from '@/lib/email/emailService';
import { resendBookingNotifications } from '@/lib/bookings/refundNotifications';

const findOne = Booking.findOne as unknown as jest.Mock;
const findOneAndUpdate = Booking.findOneAndUpdate as unknown as jest.Mock;
const updateOne = Booking.updateOne as unknown as jest.Mock;
const sendStatusUpdate = EmailService.sendBookingStatusUpdate as jest.Mock;
const sendConfirmation = EmailService.sendBookingConfirmation as jest.Mock;
const sendCancellation = EmailService.sendCancellationConfirmation as jest.Mock;
const sendOperator = EmailService.sendOperatorBookingUpdate as jest.Mock;

const BOOKING_ID = '507f1f77bcf86cd799439011';

function financialBooking() {
  return {
    _id: BOOKING_ID,
    tenantId: 'default',
    bookingReference: 'EEO-TEST',
    date: new Date('2027-01-15T00:00:00.000Z'),
    time: '10:00',
    status: 'Refunded',
    refundState: 'succeeded',
    refundKind: 'admin_full',
    refundAmount: 58.32,
    refundActor: 'admin:test',
    user: { email: 'customer@example.com', firstName: 'Test', lastName: 'Guest' },
    tour: { title: 'Safe Tour' },
  };
}

describe('resendBookingNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    sendStatusUpdate.mockResolvedValue(undefined);
    sendConfirmation.mockResolvedValue(undefined);
    sendCancellation.mockResolvedValue(undefined);
    sendOperator.mockResolvedValue(undefined);
  });

  it('releases the one-shot claim and re-runs the refund notification for financial bookings', async () => {
    findOne.mockReturnValueOnce({ select: () => ({ lean: async () => ({ _id: BOOKING_ID }) }) });
    findOneAndUpdate.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(financialBooking()) });

    const outcome = await resendBookingNotifications(BOOKING_ID, 'admin@test');

    expect(outcome).toEqual({ customer: 'sent', operator: 'sent' });
    // Claim released before the standard path re-claims it.
    expect(updateOne.mock.calls[0][1].$unset).toMatchObject({
      refundNotificationState: 1,
      refundNotificationSentAt: 1,
    });
    expect(sendStatusUpdate).toHaveBeenCalledTimes(1); // admin_full → status-update email
    expect(sendOperator).toHaveBeenCalledTimes(1);
  });

  it('re-sends the REAL booking confirmation (voucher email) for live bookings', async () => {
    findOne
      .mockReturnValueOnce({ select: () => ({ lean: async () => null }) })
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({
          _id: BOOKING_ID,
          bookingReference: 'EEO-TEST',
          date: new Date('2027-01-15T00:00:00.000Z'),
          time: '10:00',
          status: 'Confirmed',
          user: { email: 'customer@example.com', firstName: 'Test', lastName: 'Guest' },
          tour: { title: 'Safe Tour' },
        }),
      });

    const outcome = await resendBookingNotifications(BOOKING_ID, 'admin@test');

    expect(outcome).toEqual({ customer: 'sent', operator: 'sent' });
    expect(findOneAndUpdate).not.toHaveBeenCalled(); // no claim involved
    expect(sendConfirmation).toHaveBeenCalledWith(expect.objectContaining({ bookingId: 'EEO-TEST' }));
    expect(sendStatusUpdate).not.toHaveBeenCalled();
    // Sent marker recorded, failure flags cleared.
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: BOOKING_ID }),
      expect.objectContaining({
        $set: expect.objectContaining({ confirmationSentAt: expect.any(Date) }),
        $unset: expect.objectContaining({ confirmationEmailFailedAt: 1 }),
      }),
    );
    expect(sendOperator).toHaveBeenCalledWith(expect.objectContaining({ changedBy: 'admin@test' }));
  });

  it('reports partial failure without throwing when one transport fails', async () => {
    findOne
      .mockReturnValueOnce({ select: () => ({ lean: async () => null }) })
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue({
          _id: BOOKING_ID,
          bookingReference: 'EEO-TEST',
          date: new Date('2027-01-15T00:00:00.000Z'),
          time: '10:00',
          status: 'Confirmed',
          user: { email: 'customer@example.com', firstName: 'Test' },
          tour: { title: 'Safe Tour' },
        }),
      });
    sendConfirmation.mockRejectedValueOnce(new Error('mailgun down'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(resendBookingNotifications(BOOKING_ID, 'admin@test'))
      .resolves.toEqual({ customer: 'failed', operator: 'sent' });
    consoleError.mockRestore();
  });

  it('returns null when the booking does not exist', async () => {
    findOne
      .mockReturnValueOnce({ select: () => ({ lean: async () => null }) })
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(null) });

    await expect(resendBookingNotifications(BOOKING_ID, 'admin@test')).resolves.toBeNull();
  });
});

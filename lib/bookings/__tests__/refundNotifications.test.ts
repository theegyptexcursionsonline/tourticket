jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
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
    sendOperatorBookingUpdate: jest.fn(),
  },
}));

import Booking from '@/lib/models/Booking';
import { EmailService } from '@/lib/email/emailService';
import { sendBookingRefundNotification } from '@/lib/bookings/refundNotifications';

const findOneAndUpdate = Booking.findOneAndUpdate as unknown as jest.Mock;
const updateOne = Booking.updateOne as unknown as jest.Mock;
const sendCancellation = EmailService.sendCancellationConfirmation as jest.Mock;
const sendOperator = EmailService.sendOperatorBookingUpdate as jest.Mock;

function claimResult(value: unknown) {
  return { populate: jest.fn().mockResolvedValue(value) };
}

function finalizedCancellation() {
  return {
    _id: '507f1f77bcf86cd799439011',
    tenantId: 'default',
    bookingReference: 'EEO-TEST',
    date: new Date('2027-01-15T00:00:00.000Z'),
    time: '10:00',
    status: 'Cancelled',
    refundState: 'succeeded',
    refundKind: 'customer_cancel',
    refundAmount: 50,
    refundReason: 'Customer cancellation',
    user: { email: 'customer@example.com', firstName: 'Test', lastName: 'Guest' },
    tour: { title: 'Safe Tour' },
  };
}

describe('refund notification durable claim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    sendCancellation.mockResolvedValue(undefined);
    sendOperator.mockResolvedValue(undefined);
  });

  it('allows only one provider send across concurrent callers', async () => {
    findOneAndUpdate
      .mockReturnValueOnce(claimResult(finalizedCancellation()))
      .mockReturnValueOnce(claimResult(null));

    const outcomes = await Promise.all([
      sendBookingRefundNotification('507f1f77bcf86cd799439011'),
      sendBookingRefundNotification('507f1f77bcf86cd799439011'),
    ]);

    expect(outcomes).toEqual(expect.arrayContaining([
      { customer: 'sent', operator: 'sent' },
      { customer: 'already_handled', operator: 'skipped' },
    ]));
    expect(sendCancellation).toHaveBeenCalledTimes(1);
    expect(sendOperator).toHaveBeenCalledTimes(1);
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ refundNotificationState: 'sending' }),
      expect.objectContaining({ $set: expect.objectContaining({ refundNotificationState: 'sent' }) }),
    );
  });

  it('records notification failure without changing completed financial state', async () => {
    findOneAndUpdate.mockReturnValueOnce(claimResult(finalizedCancellation()));
    sendCancellation.mockRejectedValueOnce(Object.assign(new Error('transport timeout'), { status: 504 }));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(sendBookingRefundNotification('507f1f77bcf86cd799439011'))
      .resolves.toEqual({ customer: 'failed', operator: 'sent' });

    const update = updateOne.mock.calls[0]?.[1];
    expect(update.$set).toEqual(expect.objectContaining({
      refundNotificationState: 'failed',
      refundNotificationFailureCode: 'Error:504',
    }));
    expect(update.$set).not.toHaveProperty('status');
    expect(update.$set).not.toHaveProperty('refundState');
    consoleError.mockRestore();
  });

  it('still notifies the operator when the customer email fails, and reports an operator failure without blocking the customer email', async () => {
    findOneAndUpdate.mockReturnValueOnce(claimResult(finalizedCancellation()));
    sendOperator.mockRejectedValueOnce(new Error('operator mailbox down'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(sendBookingRefundNotification('507f1f77bcf86cd799439011'))
      .resolves.toEqual({ customer: 'sent', operator: 'failed' });
    expect(sendCancellation).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

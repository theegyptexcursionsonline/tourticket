jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
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
    sendRefundIssued: jest.fn(),
    sendOperatorBookingUpdate: jest.fn(),
  },
}));

import Booking from '@/lib/models/Booking';
import { EmailService } from '@/lib/email/emailService';
import { sendBookingRefundNotification } from '@/lib/bookings/refundNotifications';

const findOneAndUpdate = Booking.findOneAndUpdate as unknown as jest.Mock;
const updateOne = Booking.updateOne as unknown as jest.Mock;
const findById = Booking.findById as unknown as jest.Mock;

/** The notifier reads the booking's own tenant before it claims anything. */
function ownedByTenant(tenantId = 'default') {
  findById.mockReturnValue({ select: () => ({ lean: async () => ({ tenantId }) }) });
}
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
    ownedByTenant();
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

/**
 * Before this, every query here carried a literal `tenantId: 'default'`. A
 * white-label booking matched nothing, the claim came back empty, the caller
 * read that as `already_handled`, and the refund email was never sent to
 * anybody — with no failure state recorded and no way to resend it.
 */
describe('white-label tenants', () => {
  const BRAND_BOOKING = {
    ...{
      _id: '507f1f77bcf86cd799439011',
      bookingReference: 'ELGO-TEST',
      date: new Date('2027-01-15T00:00:00.000Z'),
      time: '10:00',
      status: 'Cancelled',
      refundState: 'succeeded',
      refundKind: 'customer_cancel',
      refundAmount: 50,
      user: { email: 'customer@example.com', firstName: 'Test', lastName: 'Guest' },
      tour: { title: 'Brand Tour' },
    },
    tenantId: 'el-gouna',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    sendCancellation.mockResolvedValue(undefined);
    sendOperator.mockResolvedValue(undefined);
  });

  it('claims and sends for a booking owned by a named brand', async () => {
    ownedByTenant('el-gouna');
    findOneAndUpdate.mockReturnValueOnce(claimResult(BRAND_BOOKING));

    const outcome = await sendBookingRefundNotification('507f1f77bcf86cd799439011');

    expect(outcome).toEqual({ customer: 'sent', operator: 'sent' });
    expect(sendCancellation).toHaveBeenCalledTimes(1);
  });

  it('claims against the brand\u2019s own tenant, not the platform\u2019s', async () => {
    ownedByTenant('el-gouna');
    findOneAndUpdate.mockReturnValueOnce(claimResult(BRAND_BOOKING));

    await sendBookingRefundNotification('507f1f77bcf86cd799439011');

    const claimFilter = findOneAndUpdate.mock.calls[0][0];
    expect(claimFilter).toMatchObject({ tenantId: 'el-gouna' });
    // A named brand must match exactly: the permissive default-tenant shape
    // would let one brand's refund claim another brand's booking.
    expect(claimFilter.$or).toBeUndefined();
  });

  it('keeps the receipt write inside the same tenant', async () => {
    ownedByTenant('el-gouna');
    findOneAndUpdate.mockReturnValueOnce(claimResult(BRAND_BOOKING));

    await sendBookingRefundNotification('507f1f77bcf86cd799439011');

    const receipt = updateOne.mock.calls.at(-1)![0];
    expect(receipt).toMatchObject({ tenantId: 'el-gouna' });
  });

  it('is still idempotent per tenant \u2014 a second caller sends nothing', async () => {
    ownedByTenant('el-gouna');
    findOneAndUpdate
      .mockReturnValueOnce(claimResult(BRAND_BOOKING))
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
  });

  it('still matches a legacy default-brand row that predates the tenant field', async () => {
    // The default brand's rows are historically inconsistent: some carry
    // 'default', some have no tenantId at all. An exact match would miss them.
    findById.mockReturnValue({ select: () => ({ lean: async () => ({}) }) });
    findOneAndUpdate.mockReturnValueOnce(claimResult(finalizedCancellation()));

    await sendBookingRefundNotification('507f1f77bcf86cd799439011');

    expect(findOneAndUpdate.mock.calls[0][0].$or).toEqual(expect.arrayContaining([
      { tenantId: 'default' },
      { tenantId: { $exists: false } },
    ]));
  });
});

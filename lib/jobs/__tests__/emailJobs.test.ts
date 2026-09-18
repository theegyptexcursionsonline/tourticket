/**
 * The daily reminder and thank-you jobs are about to be put on a schedule for
 * the first time. Before that can be safe they must be idempotent per booking:
 * a re-run, an overlapping run or a manual invocation must not mail the same
 * customer twice.
 */
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: { find: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/auth/welcomeRecommendations', () => ({
  __esModule: true,
  loadWelcomeTourRecommendations: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/email/emailService', () => ({
  __esModule: true,
  EmailService: { sendTripReminder: jest.fn(), sendTripCompletion: jest.fn() },
}));

import Booking from '@/lib/models/Booking';
import { EmailService } from '@/lib/email/emailService';
import { sendTripReminders, sendTripCompletionEmails } from '@/lib/jobs/emailJobs';

const find = Booking.find as unknown as jest.Mock;
const updateOne = Booking.updateOne as unknown as jest.Mock;
const sendReminder = EmailService.sendTripReminder as jest.Mock;
const sendCompletion = EmailService.sendTripCompletion as jest.Mock;

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    tenantId: 'default',
    bookingReference: 'EEO-10421',
    date: new Date('2026-09-25T00:00:00.000Z'),
    time: '08:00 AM',
    tour: { title: 'Pyramids of Giza', slug: 'pyramids-of-giza', meetingPoint: 'Hotel lobby' },
    user: { email: 'traveller@example.com', firstName: 'Amira', lastName: 'Hassan' },
    ...overrides,
  };
}

function findReturns(rows: unknown[]) {
  find.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(rows) });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  sendReminder.mockResolvedValue(undefined);
  sendCompletion.mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('sendTripReminders', () => {
  it('claims each booking before sending, and reports what it actually sent', async () => {
    findReturns([bookingRow()]);
    updateOne.mockResolvedValue({ modifiedCount: 1 });

    const result = await sendTripReminders();

    expect(result).toEqual({ success: true, matched: 1, sent: 1, failed: 0, skipped: 0 });
    // The claim is written BEFORE the send, guarded on "not already claimed".
    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toMatchObject({ tenantId: 'default', tripReminderSentAt: { $exists: false } });
    expect(update.$set).toHaveProperty('tripReminderSentAt');
  });

  it('does not send when the claim was lost to a concurrent run', async () => {
    findReturns([bookingRow()]);
    // A filter that matches nothing returns a successful-looking result, so the
    // count is what decides — not the absence of an error.
    updateOne.mockResolvedValue({ modifiedCount: 0 });

    const result = await sendTripReminders();

    expect(sendReminder).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: 0, skipped: 1 });
  });

  it('excludes already-notified bookings from the query itself', async () => {
    findReturns([]);
    await sendTripReminders();
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      tripReminderSentAt: { $exists: false },
      status: 'Confirmed',
    }));
  });

  it('releases the claim when the send fails, so the next run can retry', async () => {
    findReturns([bookingRow()]);
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    sendReminder.mockRejectedValueOnce(new Error('mailgun down'));

    const result = await sendTripReminders();

    expect(result).toMatchObject({ sent: 0, failed: 1, success: false });
    expect(updateOne.mock.calls[1][1]).toEqual({ $unset: { tripReminderSentAt: 1 } });
  });

  it('claims within the booking’s own tenant, not a hardcoded one', async () => {
    findReturns([bookingRow({ tenantId: 'el-gouna' })]);
    updateOne.mockResolvedValue({ modifiedCount: 1 });

    await sendTripReminders();

    expect(updateOne.mock.calls[0][0]).toMatchObject({ tenantId: 'el-gouna' });
  });

  it('sends the customer-facing reference, never a raw database id', async () => {
    findReturns([bookingRow()]);
    updateOne.mockResolvedValue({ modifiedCount: 1 });

    await sendTripReminders();

    const payload = sendReminder.mock.calls[0][0];
    expect(payload.bookingId).toBe('EEO-10421');
    expect(payload.bookingId).not.toBe('507f1f77bcf86cd799439011');
  });

  it('invents no weather forecast', async () => {
    findReturns([bookingRow()]);
    updateOne.mockResolvedValue({ modifiedCount: 1 });

    await sendTripReminders();

    expect(sendReminder.mock.calls[0][0].weatherInfo).toBeUndefined();
  });

  it('skips a booking with no usable recipient instead of calling the transport', async () => {
    findReturns([bookingRow({ user: { email: '', firstName: 'A', lastName: 'B' } })]);

    const result = await sendTripReminders();

    expect(sendReminder).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
    expect(result).toMatchObject({ failed: 1, sent: 0 });
  });
});

describe('sendTripCompletionEmails', () => {
  it('claims per booking and never links a page that does not exist', async () => {
    findReturns([bookingRow()]);
    updateOne.mockResolvedValue({ modifiedCount: 1 });

    const result = await sendTripCompletionEmails();

    expect(result).toMatchObject({ sent: 1, skipped: 0, failed: 0 });
    const payload = sendCompletion.mock.calls[0][0];
    // `/share-photos/:id` is not a route in this application.
    expect(payload.photoSharingLink).toBeUndefined();
    expect(payload.reviewLink).toContain('?review=true');
  });

  it('does not re-send to a booking an earlier run already claimed', async () => {
    findReturns([bookingRow()]);
    updateOne.mockResolvedValue({ modifiedCount: 0 });

    const result = await sendTripCompletionEmails();

    expect(sendCompletion).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: 0, skipped: 1 });
  });

  it('still sends the thank-you when recommendations cannot be loaded', async () => {
    const { loadWelcomeTourRecommendations } = jest.requireMock('@/lib/auth/welcomeRecommendations');
    loadWelcomeTourRecommendations.mockRejectedValueOnce(new Error('catalogue unavailable'));
    findReturns([bookingRow()]);
    updateOne.mockResolvedValue({ modifiedCount: 1 });

    const result = await sendTripCompletionEmails();

    expect(result).toMatchObject({ sent: 1 });
    expect(sendCompletion.mock.calls[0][0].recommendedTours).toEqual([]);
  });

  it('recommends real catalogue entries, not hardcoded tours', async () => {
    const { loadWelcomeTourRecommendations } = jest.requireMock('@/lib/auth/welcomeRecommendations');
    loadWelcomeTourRecommendations.mockResolvedValueOnce([
      { title: 'Alexandria Day Trip', slug: 'alexandria-day-trip', discountPrice: 82, images: ['https://cdn.example/a.jpg'] },
      { title: 'No Price Tour', slug: 'no-price', discountPrice: 0, images: [] },
    ]);
    findReturns([bookingRow()]);
    updateOne.mockResolvedValue({ modifiedCount: 1 });

    await sendTripCompletionEmails();

    const tours = sendCompletion.mock.calls[0][0].recommendedTours;
    expect(tours).toHaveLength(1);
    expect(tours[0]).toMatchObject({ title: 'Alexandria Day Trip', price: 'From $82' });
    // A catalogue entry with no price is dropped rather than given an invented one.
    expect(tours.some((tour: { title: string }) => tour.title === 'No Price Tour')).toBe(false);
  });
});

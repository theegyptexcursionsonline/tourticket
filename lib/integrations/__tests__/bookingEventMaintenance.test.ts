import Booking from '@/lib/models/Booking';
import {
  enqueuePersistedBookingEvent,
} from '@/lib/integrations/bookingEventProducers';
import { processBookingEventOutbox } from '@/lib/integrations/bookingEventOutbox';
import {
  reconcileBookingEventOutbox,
  runBookingEventMaintenance,
} from '@/lib/integrations/bookingEventMaintenance';

jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: { aggregate: jest.fn() },
}));
jest.mock('@/lib/models/FoxesConnectBookingEvent', () => ({
  __esModule: true,
  default: { collection: { name: 'foxesconnectbookingevents' } },
}));
jest.mock('@/lib/integrations/bookingEventProducers', () => ({
  bookingDepartureAt: jest.fn((booking: { departureAt?: Date }) => booking.departureAt || new Date(Number.NaN)),
  enqueuePersistedBookingEvent: jest.fn(),
}));
jest.mock('@/lib/integrations/bookingEventOutbox', () => ({
  processBookingEventOutbox: jest.fn(),
}));

const aggregate = (Booking as unknown as { aggregate: jest.Mock }).aggregate;
const enqueue = enqueuePersistedBookingEvent as jest.Mock;
const drain = processBookingEventOutbox as jest.Mock;

describe('booking-event maintenance', () => {
  const now = new Date('2026-09-03T07:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    enqueue.mockResolvedValue({ eventId: 'event', status: 'queued' });
    drain.mockResolvedValue({ claimed: 1, delivered: 1, retryable: 0, uncertain: 0, failed: 0 });
  });

  it('repairs all authoritative producer classes and only queues due reminders', async () => {
    const confirmed = { _id: 'confirmed' };
    const pending = { _id: 'pending' };
    const completed = { _id: 'completed' };
    const dueReminder = { _id: 'due', departureAt: new Date('2026-09-04T06:00:00.000Z') };
    const earlyReminder = { _id: 'early', departureAt: new Date('2026-09-04T08:00:00.000Z') };
    aggregate
      .mockResolvedValueOnce([confirmed])
      .mockResolvedValueOnce([pending])
      .mockResolvedValueOnce([completed])
      .mockResolvedValueOnce([dueReminder, earlyReminder]);

    await expect(reconcileBookingEventOutbox({ now, limit: 50 })).resolves.toEqual({
      inspected: 4,
      enqueued: 4,
      failed: 0,
    });
    expect(enqueue.mock.calls.map((call) => call[0].type)).toEqual([
      'booking_confirmed',
      'payment_pending',
      'service_completed',
      'service_reminder_24h',
    ]);
    for (const pipeline of aggregate.mock.calls.map((call) => call[0])) {
      expect(pipeline).toEqual(expect.arrayContaining([
        expect.objectContaining({ $lookup: expect.objectContaining({ foreignField: 'eventId' }) }),
      ]));
    }
  });

  it('continues after one malformed recovery candidate and drains the durable queue', async () => {
    aggregate
      .mockResolvedValueOnce([{ _id: 'bad' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    enqueue.mockRejectedValueOnce(new Error('invalid persisted fact'));

    await expect(runBookingEventMaintenance({ now, reconciliationLimit: 10, deliveryLimit: 5 }))
      .resolves.toEqual({
        reconciliation: { inspected: 1, enqueued: 0, failed: 1 },
        delivery: { claimed: 1, delivered: 1, retryable: 0, uncertain: 0, failed: 0 },
      });
    expect(drain).toHaveBeenCalledWith({ now: expect.any(Function), limit: 5 });
  });
});

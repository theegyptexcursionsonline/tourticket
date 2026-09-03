import { createHash, createHmac } from 'node:crypto';
import FoxesConnectBookingEventModel from '@/lib/models/FoxesConnectBookingEvent';
import Booking from '@/lib/models/Booking';
import {
  enqueueBookingEvent,
  processBookingEventOutbox,
} from '@/lib/integrations/bookingEventOutbox';
import { createBookingLifecycleEvent, prepareBookingEvent } from '@/lib/integrations/foxesConnectBookingEvents';

jest.mock('@/lib/models/FoxesConnectBookingEvent', () => ({
  __esModule: true,
  default: {
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

const model = FoxesConnectBookingEventModel as unknown as {
  updateOne: jest.Mock;
  updateMany: jest.Mock;
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
};
const bookingModel = Booking as unknown as { findOne: jest.Mock };

const env = {
  NODE_ENV: 'test',
  FOXESCONNECT_BOOKING_EVENTS_URL: 'https://support.example.test/api/integrations/booking-events',
  FOXESCONNECT_WORKSPACE_KEY: 'eeo-production',
  FOXESCONNECT_BOOKING_EVENTS_SECRET: '0123456789abcdef0123456789abcdef',
} as NodeJS.ProcessEnv;

const now = new Date('2026-09-03T07:00:00.000Z');
const event = createBookingLifecycleEvent({
  type: 'booking_confirmed',
  bookingId: '507f1f77bcf86cd799439011',
  occurredAt: '2026-09-03T06:30:00.000Z',
  reference: 'EEO-123456',
});

function findOneResult(value: unknown) {
  return { select: () => ({ lean: async () => value }) };
}

function claimedResults(...values: unknown[]) {
  for (const value of values) {
    model.findOneAndUpdate.mockImplementationOnce(() => ({ lean: async () => value }));
  }
}

describe('FoxesConnect booking-event outbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    model.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    model.updateMany.mockResolvedValue({ modifiedCount: 0 });
    bookingModel.findOne.mockReturnValue(findOneResult({
      status: 'Confirmed',
      paymentStatus: 'paid',
      paymentConfirmedAt: now,
    }));
  });

  it('stores exact immutable bytes idempotently and rejects eventId body collisions', async () => {
    model.findOne.mockImplementation(() => {
      const insert = model.updateOne.mock.calls.at(-1)[1].$setOnInsert;
      return findOneResult({ bodySha256: insert.bodySha256, status: 'queued' });
    });

    await enqueueBookingEvent({ event, bookingId: '507f1f77bcf86cd799439011', eventVersion: 'v1', now });
    await enqueueBookingEvent({ event, bookingId: '507f1f77bcf86cd799439011', eventVersion: 'v1', now });

    const first = model.updateOne.mock.calls[0][1].$setOnInsert;
    const second = model.updateOne.mock.calls[1][1].$setOnInsert;
    expect(first.rawBody).toBe(second.rawBody);
    expect(first.bodySha256).toBe(createHash('sha256').update(first.rawBody).digest('hex'));
    expect(model.updateOne.mock.calls[0][2]).toEqual({ upsert: true });

    model.findOne.mockReturnValueOnce(findOneResult({ bodySha256: '0'.repeat(64), status: 'queued' }));
    await expect(enqueueBookingEvent({
      event: { ...event, reference: 'DIFFERENT' },
      bookingId: '507f1f77bcf86cd799439011',
      eventVersion: 'v1',
      now,
    })).rejects.toMatchObject({ code: 'BOOKING_EVENT_ID_COLLISION' });
  });

  it('delivers a claimed event with the persisted body and exact HMAC contract', async () => {
    const rawBody = prepareBookingEvent(event).rawBody;
    claimedResults({
      eventId: event.eventId,
      bookingId: '507f1f77bcf86cd799439011',
      type: event.type,
      eventVersion: 'v1',
      rawBody,
      bodySha256: createHash('sha256').update(rawBody).digest('hex'),
      attempts: 1,
      leaseToken: 'lease-1',
    }, null);
    const fetchImpl = jest.fn().mockResolvedValue(new Response(null, { status: 200 }));

    await expect(processBookingEventOutbox({ env, fetchImpl, now: () => now, limit: 2 })).resolves.toEqual({
      claimed: 1,
      delivered: 1,
      retryable: 0,
      uncertain: 0,
      suppressed: 0,
      failed: 0,
    });

    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(request.body).toBe(rawBody);
    const timestamp = Math.floor(now.getTime() / 1_000);
    const signature = createHmac('sha256', env.FOXESCONNECT_BOOKING_EVENTS_SECRET!)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    expect((request.headers as Record<string, string>)['x-foxes-signature']).toBe(`t=${timestamp},v1=${signature}`);
    expect((request.headers as Record<string, string>)['x-foxes-workspace']).toBe('eeo-production');
    expect(model.updateOne).toHaveBeenCalledWith(
      { eventId: event.eventId, leaseToken: 'lease-1', status: 'processing' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'delivered' }) }),
    );
  });

  it('persists an ambiguous timeout as uncertain without auto-replaying it', async () => {
    const rawBody = prepareBookingEvent(event).rawBody;
    claimedResults({
      eventId: event.eventId,
      bookingId: '507f1f77bcf86cd799439011',
      type: event.type,
      eventVersion: 'v1',
      rawBody,
      bodySha256: createHash('sha256').update(rawBody).digest('hex'),
      attempts: 1,
      leaseToken: 'lease-1',
    }, null);
    const fetchImpl = jest.fn().mockRejectedValue(new Error('connection reset'));

    await expect(processBookingEventOutbox({ env, fetchImpl, now: () => now, limit: 2 })).resolves.toMatchObject({
      claimed: 1,
      uncertain: 1,
    });
    expect(model.updateOne).toHaveBeenCalledWith(
      { eventId: event.eventId, leaseToken: 'lease-1', status: 'processing' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'uncertain',
          lastErrorCode: 'DELIVERY_OUTCOME_UNCERTAIN',
        }),
      }),
    );
    expect(model.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ attempts: { $lt: 12 } });
    expect(model.findOneAndUpdate.mock.calls[0][0].status.$in).toEqual(['queued', 'retryable']);
  });

  it('marks an expired processing lease uncertain without sending it again', async () => {
    model.updateMany.mockResolvedValueOnce({ modifiedCount: 1 });
    claimedResults(null);
    const fetchImpl = jest.fn();

    await expect(processBookingEventOutbox({ env, fetchImpl, now: () => now, limit: 2 })).resolves.toEqual({
      claimed: 0,
      delivered: 0,
      retryable: 0,
      uncertain: 1,
      suppressed: 0,
      failed: 0,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(model.updateMany).toHaveBeenCalledWith(
      { status: 'processing', leaseExpiresAt: { $lte: now } },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'uncertain' }) }),
    );
  });

  it('fails closed with missing configuration, without a network attempt or payload loss', async () => {
    const rawBody = prepareBookingEvent(event).rawBody;
    claimedResults({
      eventId: event.eventId,
      bookingId: '507f1f77bcf86cd799439011',
      type: event.type,
      eventVersion: 'v1',
      rawBody,
      bodySha256: createHash('sha256').update(rawBody).digest('hex'),
      attempts: 1,
      leaseToken: 'lease-1',
    }, null);
    const fetchImpl = jest.fn();

    await expect(processBookingEventOutbox({ env: { NODE_ENV: 'test' }, fetchImpl, now: () => now, limit: 2 }))
      .resolves.toMatchObject({ claimed: 1, retryable: 1 });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(model.updateOne).toHaveBeenCalledWith(
      { eventId: event.eventId, leaseToken: 'lease-1', status: 'processing' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'retryable',
          lastErrorCode: 'BOOKING_EVENTS_CONFIG_MISSING',
        }),
      }),
    );
  });

  it('makes a definitive rejection terminal and never performs an unbounded retry loop', async () => {
    const rawBody = prepareBookingEvent(event).rawBody;
    claimedResults({
      eventId: event.eventId,
      bookingId: '507f1f77bcf86cd799439011',
      type: event.type,
      eventVersion: 'v1',
      rawBody,
      bodySha256: createHash('sha256').update(rawBody).digest('hex'),
      attempts: 1,
      leaseToken: 'lease-1',
    }, null);
    const fetchImpl = jest.fn().mockResolvedValue(new Response(null, { status: 400 }));

    await expect(processBookingEventOutbox({ env, fetchImpl, now: () => now, limit: 1000 })).resolves.toMatchObject({
      claimed: 1,
      failed: 1,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(model.updateOne).toHaveBeenCalledWith(
      { eventId: event.eventId, leaseToken: 'lease-1', status: 'processing' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'failed' }) }),
    );
  });

  it('suppresses a pending-payment retry after the booking is confirmed', async () => {
    const pendingEvent = createBookingLifecycleEvent({
      type: 'payment_pending',
      bookingId: '507f1f77bcf86cd799439011',
      occurredAt: '2026-09-03T06:00:00.000Z',
    });
    const rawBody = prepareBookingEvent(pendingEvent).rawBody;
    claimedResults({
      eventId: pendingEvent.eventId,
      bookingId: '507f1f77bcf86cd799439011',
      type: pendingEvent.type,
      eventVersion: 'v1',
      rawBody,
      bodySha256: createHash('sha256').update(rawBody).digest('hex'),
      attempts: 2,
      leaseToken: 'lease-pending',
    }, null);
    bookingModel.findOne.mockReturnValue(findOneResult({
      status: 'Confirmed',
      paymentStatus: 'paid',
      paymentConfirmedAt: now,
    }));
    const fetchImpl = jest.fn();

    await expect(processBookingEventOutbox({ env, fetchImpl, now: () => now, limit: 2 }))
      .resolves.toMatchObject({ claimed: 1, delivered: 0, suppressed: 1 });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(model.updateOne).toHaveBeenCalledWith(
      { eventId: pendingEvent.eventId, leaseToken: 'lease-pending', status: 'processing' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'superseded',
          lastErrorCode: 'BOOKING_EVENT_SUPERSEDED',
        }),
      }),
    );
  });

  it.each(['Cancelled', 'Refunded', 'Partial_Refund'])(
    'suppresses a delayed confirmation after the booking becomes %s',
    async (status) => {
      const rawBody = prepareBookingEvent(event).rawBody;
      claimedResults({
        eventId: event.eventId,
        bookingId: '507f1f77bcf86cd799439011',
        type: event.type,
        eventVersion: 'v1',
        rawBody,
        bodySha256: createHash('sha256').update(rawBody).digest('hex'),
        attempts: 2,
        leaseToken: 'lease-confirmed',
      }, null);
      bookingModel.findOne.mockReturnValue(findOneResult({
        status,
        paymentStatus: 'paid',
        paymentConfirmedAt: now,
      }));
      const fetchImpl = jest.fn();

      await expect(processBookingEventOutbox({ env, fetchImpl, now: () => now, limit: 2 }))
        .resolves.toMatchObject({ claimed: 1, delivered: 0, suppressed: 1 });
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(model.updateOne).toHaveBeenCalledWith(
        { eventId: event.eventId, leaseToken: 'lease-confirmed', status: 'processing' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'superseded',
            lastErrorCode: 'BOOKING_EVENT_SUPERSEDED',
          }),
        }),
      );
    },
  );

  it('suppresses a reminder after the service is rescheduled', async () => {
    const reminder = createBookingLifecycleEvent({
      type: 'service_reminder_24h',
      bookingId: '507f1f77bcf86cd799439011',
      eventVersion: '20260904T1000',
      occurredAt: '2026-09-03T07:00:00.000Z',
    });
    const rawBody = prepareBookingEvent(reminder).rawBody;
    claimedResults({
      eventId: reminder.eventId,
      bookingId: '507f1f77bcf86cd799439011',
      type: reminder.type,
      eventVersion: '20260904T1000',
      rawBody,
      bodySha256: createHash('sha256').update(rawBody).digest('hex'),
      attempts: 2,
      leaseToken: 'lease-reminder',
    }, null);
    bookingModel.findOne.mockReturnValue(findOneResult({
      status: 'Confirmed',
      paymentStatus: 'paid',
      dateString: '2026-09-05',
      time: '10:00',
    }));
    const fetchImpl = jest.fn();

    await expect(processBookingEventOutbox({ env, fetchImpl, now: () => now, limit: 2 }))
      .resolves.toMatchObject({ claimed: 1, delivered: 0, suppressed: 1 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports a lost settlement lease as uncertain instead of delivered', async () => {
    const rawBody = prepareBookingEvent(event).rawBody;
    claimedResults({
      eventId: event.eventId,
      bookingId: '507f1f77bcf86cd799439011',
      type: event.type,
      eventVersion: 'v1',
      rawBody,
      bodySha256: createHash('sha256').update(rawBody).digest('hex'),
      attempts: 1,
      leaseToken: 'lost-lease',
    }, null);
    model.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 });

    await expect(processBookingEventOutbox({
      env,
      fetchImpl: jest.fn().mockResolvedValue(new Response(null, { status: 200 })),
      now: () => now,
      limit: 2,
    })).resolves.toMatchObject({ claimed: 1, delivered: 0, uncertain: 1 });
  });

  it('rejects tampered stored bytes before any network side effect', async () => {
    const rawBody = prepareBookingEvent(event).rawBody;
    claimedResults({
      eventId: event.eventId,
      bookingId: '507f1f77bcf86cd799439011',
      type: event.type,
      eventVersion: 'v1',
      rawBody,
      bodySha256: '0'.repeat(64),
      attempts: 1,
      leaseToken: 'lease-tampered',
    }, null);
    const fetchImpl = jest.fn();

    await expect(processBookingEventOutbox({ env, fetchImpl, now: () => now, limit: 2 }))
      .resolves.toMatchObject({ claimed: 1, failed: 1 });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(model.updateOne).toHaveBeenCalledWith(
      { eventId: event.eventId, leaseToken: 'lease-tampered', status: 'processing' },
      expect.objectContaining({
        $set: expect.objectContaining({ lastErrorCode: 'BOOKING_EVENT_BODY_TAMPERED' }),
      }),
    );
  });
});

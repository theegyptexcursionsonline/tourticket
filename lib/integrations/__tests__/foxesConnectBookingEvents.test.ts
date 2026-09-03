import { createHmac } from 'node:crypto';
import {
  BookingEventConfigurationError,
  BookingEventValidationError,
  createBookingLifecycleEvent,
  deliverBookingLifecycleEvent,
  emitBookingEvent,
  FOXESCONNECT_BOOKING_EVENT_TYPES,
  type BookingEventDeliveryOptions,
  type FoxesConnectBookingEvent,
} from '@/lib/integrations/foxesConnectBookingEvents';

const env = {
  NODE_ENV: 'test',
  FOXESCONNECT_BOOKING_EVENTS_URL: 'https://support.example.test/api/integrations/booking-events',
  FOXESCONNECT_WORKSPACE_KEY: 'eeo-production',
  FOXESCONNECT_BOOKING_EVENTS_SECRET: '0123456789abcdef0123456789abcdef',
} as NodeJS.ProcessEnv;

const event: FoxesConnectBookingEvent = {
  eventId: 'tourticket:507f1f77bcf86cd799439011:booking_confirmed:v1',
  type: 'booking_confirmed',
  occurredAt: '2026-09-03T06:30:00.000Z',
  reference: 'EEO-123456',
  customer: { name: 'QA Customer', phone: '+20 100 000 0000', locale: 'en' },
  data: { serviceTime: '10:00', nested: { z: 2, a: 1 } },
};

const response = (status: number) => new Response(null, { status });

describe('FoxesConnect booking-event emitter', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('supports all six contracted event types with stable retry-safe ids', () => {
    expect(FOXESCONNECT_BOOKING_EVENT_TYPES).toEqual([
      'booking_confirmed',
      'pickup_confirmed',
      'driver_assigned',
      'service_reminder_24h',
      'service_completed',
      'payment_pending',
    ]);

    for (const type of FOXESCONNECT_BOOKING_EVENT_TYPES) {
      const first = createBookingLifecycleEvent({
        type,
        bookingId: '507f1f77bcf86cd799439011',
        occurredAt: '2026-09-03T06:30:00Z',
        reference: 'EEO-123456',
      });
      const replay = createBookingLifecycleEvent({
        type,
        bookingId: '507f1f77bcf86cd799439011',
        occurredAt: '2026-09-03T06:30:00Z',
        reference: 'EEO-123456',
      });
      expect(first).toEqual(replay);
      expect(first.eventId).toBe(`tourticket:507f1f77bcf86cd799439011:${type}:v1`);
    }
  });

  it('signs the exact raw body and reuses identical JSON bytes for bounded retries', async () => {
    const fetchImpl = jest.fn<ReturnType<NonNullable<BookingEventDeliveryOptions['fetchImpl']>>, Parameters<NonNullable<BookingEventDeliveryOptions['fetchImpl']>>>()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));
    const result = await emitBookingEvent(event, {
      env,
      fetchImpl,
      now: () => new Date('2026-09-03T07:00:00.000Z'),
      wait: async () => undefined,
    });

    expect(result).toEqual({ status: 'delivered', attempts: 2, httpStatus: 200 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const first = fetchImpl.mock.calls[0][1]!;
    const second = fetchImpl.mock.calls[1][1]!;
    expect(first.body).toBe(second.body);
    const rawBody = String(first.body);
    const timestamp = 1_788_418_800;
    const expected = createHmac('sha256', env.FOXESCONNECT_BOOKING_EVENTS_SECRET!)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    expect((first.headers as Record<string, string>)['x-foxes-signature']).toBe(`t=${timestamp},v1=${expected}`);
    expect((first.headers as Record<string, string>)['x-foxes-workspace']).toBe('eeo-production');
    expect(rawBody).not.toContain(env.FOXESCONNECT_BOOKING_EVENTS_SECRET!);
    expect(rawBody).not.toContain('eeo-production');
    expect(rawBody.indexOf('"a":1')).toBeLessThan(rawBody.indexOf('"z":2'));
  });

  it('lets a receiver dedupe a replayed event without a second business effect', async () => {
    const seen = new Set<string>();
    let businessEffects = 0;
    const bodies: string[] = [];
    const fetchImpl = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = String(init?.body);
      bodies.push(body);
      const parsed = JSON.parse(body) as { eventId: string };
      if (!seen.has(parsed.eventId)) {
        seen.add(parsed.eventId);
        businessEffects += 1;
      }
      return response(200);
    });

    await emitBookingEvent(event, { env, fetchImpl });
    await emitBookingEvent(event, { env, fetchImpl });

    expect(bodies[0]).toBe(bodies[1]);
    expect(businessEffects).toBe(1);
  });

  it('does not retry a definitive rejection and bounds transient HTTP retries', async () => {
    const rejected = jest.fn().mockResolvedValue(response(401));
    await expect(emitBookingEvent(event, { env, fetchImpl: rejected })).resolves.toEqual({
      status: 'failed',
      attempts: 1,
      httpStatus: 401,
      code: 'BOOKING_EVENT_REJECTED',
      retryable: false,
    });
    expect(rejected).toHaveBeenCalledTimes(1);

    const unavailable = jest.fn().mockResolvedValue(response(503));
    await expect(emitBookingEvent(event, {
      env,
      fetchImpl: unavailable,
      wait: async () => undefined,
      maxAttempts: 3,
    })).resolves.toEqual({
      status: 'failed',
      attempts: 3,
      httpStatus: 503,
      code: 'BOOKING_EVENT_RETRY_EXHAUSTED',
      retryable: true,
    });
    expect(unavailable).toHaveBeenCalledTimes(3);
  });

  it('classifies a timed-out request as uncertain instead of assuming failure', async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    const pending = emitBookingEvent(event, { env, fetchImpl, timeoutMs: 100, maxAttempts: 1 });
    await jest.advanceTimersByTimeAsync(100);

    await expect(pending).resolves.toEqual({
      status: 'uncertain',
      attempts: 1,
      code: 'DELIVERY_OUTCOME_UNCERTAIN',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('stops immediately after an ambiguous network attempt', async () => {
    const fetchImpl = jest.fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(response(503));

    await expect(emitBookingEvent(event, {
      env,
      fetchImpl,
      maxAttempts: 2,
      wait: async () => undefined,
    })).resolves.toEqual({
      status: 'uncertain',
      attempts: 1,
      code: 'DELIVERY_OUTCOME_UNCERTAIN',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed before fetch when any required configuration is absent or weak', async () => {
    const fetchImpl = jest.fn();
    for (const missing of [
      'FOXESCONNECT_BOOKING_EVENTS_URL',
      'FOXESCONNECT_WORKSPACE_KEY',
      'FOXESCONNECT_BOOKING_EVENTS_SECRET',
    ] as const) {
      const incomplete = { ...env };
      delete incomplete[missing];
      await expect(emitBookingEvent(event, { env: incomplete, fetchImpl })).rejects.toMatchObject({
        name: 'BookingEventConfigurationError',
        code: 'BOOKING_EVENTS_CONFIG_MISSING',
      } satisfies Partial<BookingEventConfigurationError>);
    }
    await expect(emitBookingEvent(event, {
      env: { ...env, FOXESCONNECT_BOOKING_EVENTS_SECRET: 'too-short' },
      fetchImpl,
    })).rejects.toMatchObject({ code: 'BOOKING_EVENTS_SECRET_WEAK' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects non-JSON-safe or oversized data before network delivery', async () => {
    const fetchImpl = jest.fn();
    await expect(emitBookingEvent({
      ...event,
      data: { total: Number.NaN },
    }, { env, fetchImpl })).rejects.toBeInstanceOf(BookingEventValidationError);
    await expect(emitBookingEvent({
      ...event,
      data: { oversized: 'x'.repeat(33 * 1024) },
    }, { env, fetchImpl })).rejects.toMatchObject({ code: 'BOOKING_EVENT_TOO_LARGE' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('pins customer phone to the FoxesConnect 32-character ingest boundary', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response(200));
    await expect(emitBookingEvent({
      ...event,
      customer: { phone: '+'.padEnd(32, '1') },
    }, { env, fetchImpl })).resolves.toMatchObject({ status: 'delivered' });
    await expect(emitBookingEvent({
      ...event,
      customer: { phone: '+'.padEnd(33, '1') },
    }, { env, fetchImpl })).rejects.toMatchObject({ code: 'BOOKING_EVENT_INVALID' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('delivers a lifecycle input with the contract fields and no channel side effect', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response(200));
    const result = await deliverBookingLifecycleEvent({
      type: 'payment_pending',
      bookingId: '507f1f77bcf86cd799439011',
      occurredAt: '2026-09-03T06:30:00Z',
      reference: 'EEO-123456',
      customerName: 'QA Customer',
      customerPhone: '+20 100 000 0000',
      tourTitle: 'QA Tour',
      serviceDate: '2026-09-05',
      serviceTime: '10:00',
      bookingStatus: 'Pending',
      paymentStatus: 'pending',
      totalPrice: 125,
      currency: 'USD',
    }, { env, fetchImpl });

    expect(result.status).toBe('delivered');
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      eventId: 'tourticket:507f1f77bcf86cd799439011:payment_pending:v1',
      type: 'payment_pending',
      reference: 'EEO-123456',
      customer: { name: 'QA Customer', phone: '+20 100 000 0000' },
      data: {
        bookingStatus: 'Pending',
        currency: 'USD',
        paymentStatus: 'pending',
        serviceDate: '2026-09-05',
        serviceTime: '10:00',
        totalPrice: 125,
        tourTitle: 'QA Tour',
      },
    });
    expect(Object.keys(body)).toEqual(['customer', 'data', 'eventId', 'occurredAt', 'reference', 'type']);
  });

});

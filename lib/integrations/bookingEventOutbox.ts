import { createHash, randomUUID } from 'node:crypto';
import FoxesConnectBookingEventModel from '@/lib/models/FoxesConnectBookingEvent';
import Booking from '@/lib/models/Booking';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { localDepartureToUtc } from '@/lib/revenue/departureSchedule';
import {
  BookingEventConfigurationError,
  BookingEventValidationError,
  emitPreparedBookingEvent,
  prepareBookingEvent,
  type BookingEventDeliveryOptions,
  type BookingEventDeliveryResult,
  type FoxesConnectBookingEvent,
  type FoxesConnectBookingEventType,
} from '@/lib/integrations/foxesConnectBookingEvents';

const MAX_OUTBOX_ATTEMPTS = 12;
// Five sequential 2.5-second delivery attempts stay inside the platform's
// 26-second function budget even when every receiver call times out.
const DEFAULT_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 100;
const LEASE_MS = 60_000;
const ACTIONABLE_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;
const TERMINAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

export type EnqueueBookingEventInput = {
  event: FoxesConnectBookingEvent;
  bookingId: string;
  eventVersion: string;
  now?: Date;
};

export type BookingEventOutboxRunResult = {
  claimed: number;
  delivered: number;
  retryable: number;
  uncertain: number;
  suppressed: number;
  failed: number;
};

type ClaimedEvent = {
  eventId: string;
  bookingId: string;
  type: FoxesConnectBookingEventType;
  eventVersion: string;
  rawBody: string;
  bodySha256: string;
  attempts: number;
  leaseToken: string;
};

function boundedBatchSize(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_BATCH_SIZE;
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(value!)));
}

type CurrentBookingState = {
  date?: Date | string;
  dateString?: string;
  time?: string;
  status?: string;
  paymentStatus?: string;
  paymentConfirmedAt?: Date;
};

function retryDelayMs(attempts: number) {
  return Math.min(60 * 60 * 1_000, 30_000 * (2 ** Math.max(0, attempts - 1)));
}

/**
 * Persist immutable delivery bytes before attempting transport. Re-enqueueing
 * the same event is a no-op, while reusing an eventId for different bytes is a
 * hard error instead of silently corrupting the receiver's dedupe contract.
 */
export async function enqueueBookingEvent(input: EnqueueBookingEventInput) {
  const prepared = prepareBookingEvent(input.event);
  const now = input.now || new Date();
  const bodySha256 = createHash('sha256').update(prepared.rawBody).digest('hex');
  const insert = {
    _id: prepared.event.eventId,
    eventId: prepared.event.eventId,
    bookingId: input.bookingId,
    type: prepared.event.type,
    eventVersion: input.eventVersion,
    rawBody: prepared.rawBody,
    bodySha256,
    status: 'queued' as const,
    attempts: 0,
    availableAt: now,
    purgeAt: new Date(now.getTime() + ACTIONABLE_RETENTION_MS),
  };

  try {
    await FoxesConnectBookingEventModel.updateOne(
      { _id: insert.eventId },
      { $setOnInsert: insert },
      { upsert: true },
    );
  } catch (error) {
    // A concurrent upsert can lose the unique-index race. The identity check
    // below determines whether that winner stored the same immutable event.
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 11000) throw error;
  }

  const stored = await FoxesConnectBookingEventModel.findOne({ eventId: insert.eventId })
    .select('bodySha256 status')
    .lean<{ bodySha256: string; status: string } | null>();
  if (!stored || stored.bodySha256 !== bodySha256) {
    throw new BookingEventValidationError(
      'BOOKING_EVENT_ID_COLLISION',
      'A booking event id was reused with a different immutable body.',
    );
  }
  return { eventId: insert.eventId, status: stored.status };
}

async function claimNext(now: Date): Promise<ClaimedEvent | null> {
  const leaseToken = randomUUID();
  const claimed = await FoxesConnectBookingEventModel.findOneAndUpdate(
    {
      attempts: { $lt: MAX_OUTBOX_ATTEMPTS },
      status: { $in: ['queued', 'retryable'] },
      availableAt: { $lte: now },
    },
    {
      $set: {
        status: 'processing',
        leaseToken,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { availableAt: 1, createdAt: 1 } },
  ).lean<ClaimedEvent | null>();
  return claimed;
}

async function settleClaim(
  claimed: ClaimedEvent,
  result: BookingEventDeliveryResult,
  now: Date,
) {
  const exhausted = claimed.attempts >= MAX_OUTBOX_ATTEMPTS;
  if (result.status === 'delivered') {
    const settlement = await FoxesConnectBookingEventModel.updateOne(
      { eventId: claimed.eventId, leaseToken: claimed.leaseToken, status: 'processing' },
      {
        $set: {
          status: 'delivered',
          deliveredAt: now,
          lastHttpStatus: result.httpStatus,
          purgeAt: new Date(now.getTime() + TERMINAL_RETENTION_MS),
        },
        $unset: { leaseToken: 1, leaseExpiresAt: 1, lastErrorCode: 1 },
      },
    );
    return settlement.modifiedCount === 1 ? 'delivered' as const : 'uncertain' as const;
  }

  if (result.status === 'uncertain') {
    const settlement = await FoxesConnectBookingEventModel.updateOne(
      { eventId: claimed.eventId, leaseToken: claimed.leaseToken, status: 'processing' },
      {
        $set: {
          status: 'uncertain',
          lastErrorCode: result.code,
          availableAt: now,
          purgeAt: new Date(now.getTime() + TERMINAL_RETENTION_MS),
        },
        $unset: { leaseToken: 1, leaseExpiresAt: 1 },
      },
    );
    return settlement.modifiedCount === 1 ? 'uncertain' as const : 'uncertain' as const;
  }

  const retryable = result.retryable;
  const nextStatus = retryable && !exhausted ? 'retryable' : 'failed';
  const settlement = await FoxesConnectBookingEventModel.updateOne(
    { eventId: claimed.eventId, leaseToken: claimed.leaseToken, status: 'processing' },
    {
      $set: {
        status: nextStatus,
        lastErrorCode: result.code,
        ...(result.httpStatus ? { lastHttpStatus: result.httpStatus } : {}),
        availableAt: retryable && !exhausted
          ? new Date(now.getTime() + retryDelayMs(claimed.attempts))
          : now,
        ...(exhausted || !retryable
          ? { purgeAt: new Date(now.getTime() + TERMINAL_RETENTION_MS) }
          : {}),
      },
      $unset: { leaseToken: 1, leaseExpiresAt: 1 },
    },
  );
  return settlement.modifiedCount === 1 ? nextStatus : 'uncertain' as const;
}

async function settleSuperseded(claimed: ClaimedEvent, code: string, now: Date) {
  const settlement = await FoxesConnectBookingEventModel.updateOne(
    { eventId: claimed.eventId, leaseToken: claimed.leaseToken, status: 'processing' },
    {
      $set: {
        status: 'superseded',
        lastErrorCode: code,
        purgeAt: new Date(now.getTime() + TERMINAL_RETENTION_MS),
      },
      $unset: { leaseToken: 1, leaseExpiresAt: 1 },
    },
  );
  return settlement.modifiedCount === 1 ? 'suppressed' as const : 'uncertain' as const;
}

function bookingDateOnly(booking: CurrentBookingState) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(booking.dateString || ''))) return String(booking.dateString);
  const date = booking.date ? new Date(booking.date) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

async function validateCurrentState(claimed: ClaimedEvent, now: Date) {
  const booking = await Booking.findOne({
    _id: claimed.bookingId,
    $and: [DEFAULT_TENANT_FILTER],
  }).select('date dateString time status paymentStatus paymentConfirmedAt').lean<CurrentBookingState | null>();
  if (!booking) return { current: false, code: 'BOOKING_EVENT_BOOKING_MISSING' } as const;

  if (claimed.type === 'payment_pending') {
    return booking.status === 'Pending' && booking.paymentStatus === 'pending'
      ? { current: true } as const
      : { current: false, code: 'BOOKING_EVENT_SUPERSEDED' } as const;
  }
  if (claimed.type === 'service_completed') {
    return booking.status === 'Completed'
      ? { current: true } as const
      : { current: false, code: 'BOOKING_EVENT_SUPERSEDED' } as const;
  }
  if (claimed.type === 'service_reminder_24h') {
    const date = bookingDateOnly(booking);
    const time = String(booking.time || '');
    const version = date && /^\d{2}:\d{2}$/.test(time)
      ? `${date.replaceAll('-', '')}T${time.replace(':', '')}`
      : null;
    const departure = date && version
      ? new Date(localDepartureToUtc(date, time)).getTime()
      : Number.NaN;
    return booking.status === 'Confirmed'
      && booking.paymentStatus === 'paid'
      && version === claimed.eventVersion
      && Number.isFinite(departure)
      && departure > now.getTime()
      ? { current: true } as const
      : { current: false, code: 'BOOKING_EVENT_SUPERSEDED' } as const;
  }
  if (claimed.type === 'booking_confirmed') {
    return ['Confirmed', 'Completed'].includes(String(booking.status || ''))
      && booking.paymentStatus === 'paid'
      && Boolean(booking.paymentConfirmedAt)
      ? { current: true } as const
      : { current: false, code: 'BOOKING_EVENT_SUPERSEDED' } as const;
  }
  // No TourTicket pickup/driver producer exists yet. If a future authoritative
  // producer explicitly queues either contract type, its occurrence is the
  // authority until those domain models provide a current-state guard.
  return { current: true } as const;
}

/**
 * Drain a bounded outbox batch under atomic leases. An expired lease or
 * network-ambiguous send is retained as uncertain for manual reconciliation;
 * only explicit retryable HTTP responses are automatically replayed.
 */
export async function processBookingEventOutbox(
  options: BookingEventDeliveryOptions & { limit?: number } = {},
): Promise<BookingEventOutboxRunResult> {
  const clock = options.now || (() => new Date());
  const now = clock();
  const limit = boundedBatchSize(options.limit);
  const totals: BookingEventOutboxRunResult = {
    claimed: 0,
    delivered: 0,
    retryable: 0,
    uncertain: 0,
    suppressed: 0,
    failed: 0,
  };

  // A process can die after FoxesConnect commits but before local settlement.
  // Expired leases are therefore terminally uncertain and require operator
  // reconciliation; they are never claimed and auto-replayed.
  const abandoned = await FoxesConnectBookingEventModel.updateMany(
    { status: 'processing', leaseExpiresAt: { $lte: now } },
    {
      $set: {
        status: 'uncertain',
        lastErrorCode: 'DELIVERY_OUTCOME_UNCERTAIN',
        purgeAt: new Date(now.getTime() + TERMINAL_RETENTION_MS),
      },
      $unset: { leaseToken: 1, leaseExpiresAt: 1 },
    },
  );
  totals.uncertain += abandoned.modifiedCount || 0;

  for (let index = 0; index < limit; index += 1) {
    const claimed = await claimNext(clock());
    if (!claimed) break;
    totals.claimed += 1;

    try {
      const actualSha256 = createHash('sha256').update(claimed.rawBody).digest('hex');
      if (actualSha256 !== claimed.bodySha256) {
        throw new BookingEventValidationError(
          'BOOKING_EVENT_BODY_TAMPERED',
          'Stored booking-event bytes do not match their immutable digest.',
        );
      }
      const event = JSON.parse(claimed.rawBody) as FoxesConnectBookingEvent;
      const currentState = await validateCurrentState(claimed, clock());
      if (!currentState.current) {
        const outcome = await settleSuperseded(claimed, currentState.code, clock());
        totals[outcome] += 1;
        continue;
      }
      const result = await emitPreparedBookingEvent(
        { event, rawBody: claimed.rawBody },
        { ...options, now: clock, maxAttempts: 1 },
      );
      const outcome = await settleClaim(claimed, result, clock());
      totals[outcome] += 1;
    } catch (error) {
      const terminal = error instanceof BookingEventValidationError;
      const code = error instanceof BookingEventConfigurationError || terminal
        ? error.code
        : 'BOOKING_EVENT_DELIVERY_FAILED';
      const outcome = await settleClaim(claimed, {
        status: 'failed',
        attempts: 0,
        code,
        retryable: !terminal,
      }, clock());
      totals[outcome] += 1;
    }
  }

  return totals;
}

export const BOOKING_EVENT_OUTBOX_MAX_ATTEMPTS = MAX_OUTBOX_ATTEMPTS;

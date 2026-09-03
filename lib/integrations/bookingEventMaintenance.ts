import Booking from '@/lib/models/Booking';
import FoxesConnectBookingEvent from '@/lib/models/FoxesConnectBookingEvent';
import {
  bookingDepartureAt,
  enqueuePersistedBookingEvent,
  type BookingEventRecord,
} from '@/lib/integrations/bookingEventProducers';
import {
  processBookingEventOutbox,
  type BookingEventOutboxRunResult,
} from '@/lib/integrations/bookingEventOutbox';
import type { FoxesConnectBookingEventType } from '@/lib/integrations/foxesConnectBookingEvents';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const REPAIR_WINDOW_MS = 48 * 60 * 60 * 1_000;
// Per event class. Missing identities are excluded by lookup, so later runs
// advance through the tail without making one cron invocation unbounded.
const DEFAULT_RECONCILIATION_LIMIT = 10;

type ReconciliationResult = {
  inspected: number;
  enqueued: number;
  failed: number;
};

type EventSpec = {
  type: Extract<FoxesConnectBookingEventType, 'booking_confirmed' | 'payment_pending' | 'service_completed'>;
  match: Record<string, unknown>;
};

function boundedLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_RECONCILIATION_LIMIT;
  return Math.max(1, Math.min(250, Math.floor(value!)));
}

async function missingFixedVersionBookings(spec: EventSpec, limit: number) {
  const eventId = {
    $concat: [
      'tourticket:',
      { $toString: '$_id' },
      `:${spec.type}:v1`,
    ],
  };
  return Booking.aggregate<BookingEventRecord>([
    { $match: spec.match },
    { $addFields: { _foxesConnectEventId: eventId } },
    {
      $lookup: {
        from: FoxesConnectBookingEvent.collection.name,
        localField: '_foxesConnectEventId',
        foreignField: 'eventId',
        as: '_foxesConnectEvents',
      },
    },
    { $match: { _foxesConnectEvents: { $eq: [] } } },
    { $sort: { _id: 1 } },
    { $limit: limit },
    { $project: { _foxesConnectEvents: 0, _foxesConnectEventId: 0 } },
  ]);
}

async function missingReminderBookings(now: Date, limit: number) {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const end = new Date(now.getTime() + 48 * 60 * 60 * 1_000);
  const dueBy = new Date(now.getTime() + 24 * 60 * 60 * 1_000);
  const serviceDate = {
    $ifNull: [
      '$dateString',
      { $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'UTC' } },
    ],
  };
  const normalizedDate = {
    $replaceAll: {
      input: serviceDate,
      find: '-',
      replacement: '',
    },
  };
  const normalizedTime = { $replaceAll: { input: '$time', find: ':', replacement: '' } };
  const eventId = {
    $concat: [
      'tourticket:',
      { $toString: '$_id' },
      ':service_reminder_24h:',
      normalizedDate,
      'T',
      normalizedTime,
    ],
  };
  const departureAt = {
    $dateFromString: {
      dateString: { $concat: [serviceDate, 'T', '$time', ':00'] },
      timezone: 'Africa/Cairo',
      onError: null,
      onNull: null,
    },
  };
  const candidates = await Booking.aggregate<BookingEventRecord>([
    {
      $match: {
        $and: [DEFAULT_TENANT_FILTER],
        status: 'Confirmed',
        paymentStatus: 'paid',
        date: { $gte: today, $lte: end },
        time: { $regex: /^(?:[01]\d|2[0-3]):[0-5]\d$/ },
      },
    },
    {
      $addFields: {
        _foxesConnectEventId: eventId,
        _foxesConnectDepartureAt: departureAt,
      },
    },
    { $match: { _foxesConnectDepartureAt: { $gt: now, $lte: dueBy } } },
    {
      $lookup: {
        from: FoxesConnectBookingEvent.collection.name,
        localField: '_foxesConnectEventId',
        foreignField: 'eventId',
        as: '_foxesConnectEvents',
      },
    },
    { $match: { _foxesConnectEvents: { $eq: [] } } },
    { $sort: { date: 1, _id: 1 } },
    { $limit: limit },
    { $project: { _foxesConnectEvents: 0, _foxesConnectEventId: 0, _foxesConnectDepartureAt: 0 } },
  ]);
  const dueByTime = dueBy.getTime();
  return candidates.filter((booking) => {
    const departure = bookingDepartureAt(booking).getTime();
    return Number.isFinite(departure) && departure > now.getTime() && departure <= dueByTime;
  });
}

/**
 * Repair the narrow crash window between a booking write and its outbox
 * insert. The lookup excludes already queued identities, so each bounded run
 * advances through the remaining tail rather than repeatedly scanning only
 * the first page.
 */
export async function reconcileBookingEventOutbox(
  options: { now?: Date; limit?: number } = {},
): Promise<ReconciliationResult> {
  const now = options.now || new Date();
  const limit = boundedLimit(options.limit);
  const recent = new Date(now.getTime() - REPAIR_WINDOW_MS);
  const specs: EventSpec[] = [
    {
      type: 'booking_confirmed',
      match: {
        $and: [DEFAULT_TENANT_FILTER],
        status: { $in: ['Confirmed', 'Completed'] },
        paymentStatus: 'paid',
        paymentConfirmedAt: { $gte: recent },
      },
    },
    {
      type: 'payment_pending',
      match: {
        $and: [DEFAULT_TENANT_FILTER],
        status: 'Pending',
        paymentStatus: 'pending',
        createdAt: { $gte: recent },
      },
    },
    {
      type: 'service_completed',
      match: {
        $and: [DEFAULT_TENANT_FILTER],
        status: 'Completed',
        updatedAt: { $gte: recent },
      },
    },
  ];
  const groups = await Promise.all([
    ...specs.map(async (spec) => ({
      type: spec.type,
      bookings: await missingFixedVersionBookings(spec, limit),
    })),
    {
      type: 'service_reminder_24h' as const,
      bookings: await missingReminderBookings(now, limit),
    },
  ]);
  const result: ReconciliationResult = { inspected: 0, enqueued: 0, failed: 0 };

  for (const group of groups) {
    for (const booking of group.bookings) {
      result.inspected += 1;
      try {
        await enqueuePersistedBookingEvent({ type: group.type, booking });
        result.enqueued += 1;
      } catch (error) {
        result.failed += 1;
        console.error('FoxesConnect booking-event reconciliation failed.', {
          bookingId: String(booking._id),
          type: group.type,
          code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        });
      }
    }
  }
  return result;
}

export async function runBookingEventMaintenance(options: {
  now?: Date;
  reconciliationLimit?: number;
  deliveryLimit?: number;
} = {}): Promise<{ reconciliation: ReconciliationResult; delivery: BookingEventOutboxRunResult }> {
  const now = options.now || new Date();
  const reconciliation = await reconcileBookingEventOutbox({
    now,
    limit: options.reconciliationLimit,
  });
  const delivery = await processBookingEventOutbox({
    now: () => now,
    limit: options.deliveryLimit,
  });
  return { reconciliation, delivery };
}

import { localDepartureToUtc } from '@/lib/revenue/departureSchedule';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { isDefaultTenant } from '@/lib/tenant/tenantScope';
import {
  BookingEventValidationError,
  createBookingLifecycleEvent,
  type FoxesConnectBookingEvent,
  type FoxesConnectBookingEventType,
  type JsonValue,
} from '@/lib/integrations/foxesConnectBookingEvents';

export type BookingEventRecord = {
  _id: unknown;
  tenantId?: string | null;
  bookingReference?: string | null;
  date?: Date | string | null;
  dateString?: string | null;
  time?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentConfirmedAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  totalPrice?: number | null;
  currency?: string | null;
  customerPhone?: string | null;
  user?: unknown;
  tour?: unknown;
};

export type BookingEventCustomer = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  locale?: string | null;
};

export type BookingEventTour = { title?: string | null };

export type PersistedBookingEventInput = {
  type: FoxesConnectBookingEventType;
  booking: BookingEventRecord;
  customer?: BookingEventCustomer | null;
  tour?: BookingEventTour | null;
  occurredAt?: Date | string;
  eventVersion?: string;
  pickupLocation?: string | null;
  driverName?: string | null;
  data?: Record<string, JsonValue>;
};

function dateOnly(booking: BookingEventRecord) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(booking.dateString || ''))) return String(booking.dateString);
  const date = booking.date ? new Date(booking.date) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

export function bookingDepartureAt(booking: BookingEventRecord) {
  const date = dateOnly(booking);
  const time = String(booking.time || '');
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return new Date(Number.NaN);
  return new Date(localDepartureToUtc(date, time));
}

function defaultOccurredAt(type: FoxesConnectBookingEventType, booking: BookingEventRecord) {
  if (type === 'service_reminder_24h') {
    return new Date(bookingDepartureAt(booking).getTime() - 24 * 60 * 60 * 1_000);
  }
  if (type === 'service_completed') return new Date(booking.updatedAt || Number.NaN);
  if (type === 'booking_confirmed') return new Date(booking.paymentConfirmedAt || Number.NaN);
  if (type === 'payment_pending') return new Date(booking.createdAt || Number.NaN);
  // TourTicket has no authoritative pickup-confirmation or driver-assignment
  // timestamp today. Those types require an explicit occurrence from a future
  // real domain transition; incidental booking fields are never treated as one.
  return new Date(Number.NaN);
}

function defaultEventVersion(type: FoxesConnectBookingEventType, booking: BookingEventRecord) {
  if (type !== 'service_reminder_24h') return 'v1';
  const date = dateOnly(booking);
  const time = String(booking.time || '');
  if (!date || !/^\d{2}:\d{2}$/.test(time)) {
    throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'A reminder requires a valid service date and time.');
  }
  return `${date.replaceAll('-', '')}T${time.replace(':', '')}`;
}

function customerName(customer?: BookingEventCustomer | null) {
  const explicit = String(customer?.name || '').trim();
  if (explicit) return explicit;
  const joined = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
  return joined || null;
}

function populatedCustomer(value: unknown): BookingEventCustomer | null {
  if (!value || typeof value !== 'object' || !('firstName' in value || 'name' in value)) return null;
  return value as BookingEventCustomer;
}

function populatedTour(value: unknown): BookingEventTour | null {
  if (!value || typeof value !== 'object' || !('title' in value)) return null;
  return value as BookingEventTour;
}

async function loadPersistedContext(input: PersistedBookingEventInput) {
  let customer = input.customer || populatedCustomer(input.booking.user);
  let tour = input.tour || populatedTour(input.booking.tour);
  const userId = customer ? null : input.booking.user;
  const tourId = tour ? null : input.booking.tour;

  if (userId || tourId) {
    const [{ default: User }, { default: Tour }] = await Promise.all([
      import('@/lib/models/user'),
      import('@/lib/models/Tour'),
    ]);
    const [storedCustomer, storedTour] = await Promise.all([
      userId
        ? User.findById(userId).select('firstName lastName phone').lean<BookingEventCustomer | null>()
        : null,
      tourId
        ? Tour.findOne({ _id: tourId, $and: [DEFAULT_TENANT_FILTER] })
          .select('title').lean<BookingEventTour | null>()
        : null,
    ]);
    customer = customer || storedCustomer;
    tour = tour || storedTour;
  }
  return { customer, tour };
}

/**
 * Translate one authoritative, already-persisted TourTicket fact into the
 * shared contract. The result is pure so both a request hook and recovery
 * sweep create byte-identical payloads for the same event identity.
 */
export function createPersistedBookingEvent(input: PersistedBookingEventInput): FoxesConnectBookingEvent {
  return createBookingLifecycleEvent({
    type: input.type,
    bookingId: String(input.booking._id),
    eventVersion: input.eventVersion || defaultEventVersion(input.type, input.booking),
    occurredAt: input.occurredAt || defaultOccurredAt(input.type, input.booking),
    reference: input.booking.bookingReference || null,
    customerName: customerName(input.customer) || undefined,
    customerPhone: input.booking.customerPhone || input.customer?.phone || undefined,
    locale: input.customer?.locale || undefined,
    tourTitle: input.tour?.title || undefined,
    serviceDate: dateOnly(input.booking),
    serviceTime: input.booking.time || null,
    bookingStatus: input.booking.status || null,
    paymentStatus: input.booking.paymentStatus || null,
    totalPrice: input.booking.totalPrice,
    currency: input.booking.currency || null,
    pickupLocation: input.pickupLocation,
    driverName: input.driverName,
    data: input.data,
  });
}

/** Queue an immutable event; network delivery is handled by the leased worker. */
export async function enqueuePersistedBookingEvent(input: PersistedBookingEventInput) {
  if (!isDefaultTenant(input.booking.tenantId)) {
    throw new BookingEventValidationError(
      'BOOKING_EVENT_TENANT_FORBIDDEN',
      'FoxesConnect booking events are scoped to the default TourTicket tenant.',
    );
  }
  const eventVersion = input.eventVersion || defaultEventVersion(input.type, input.booking);
  const context = await loadPersistedContext(input);
  const event = createPersistedBookingEvent({ ...input, ...context, eventVersion });
  // Keep the payload builder usable in isolation from Mongoose (including
  // contract tests and non-worker tooling); only queueing loads the model.
  const { enqueueBookingEvent } = await import('@/lib/integrations/bookingEventOutbox');
  return enqueueBookingEvent({
    event,
    bookingId: String(input.booking._id),
    eventVersion,
  });
}

/**
 * Request-path hook: the booking mutation has already committed, so an outbox
 * write problem must not turn it into a misleading 5xx. The scheduled
 * authoritative-state reconciliation repairs that narrow crash/failure gap.
 */
export async function queuePersistedBookingEvent(input: PersistedBookingEventInput) {
  try {
    const result = await enqueuePersistedBookingEvent(input);
    return { queued: true as const, ...result };
  } catch (error) {
    const code = error instanceof BookingEventValidationError
      ? error.code
      : 'BOOKING_EVENT_OUTBOX_WRITE_FAILED';
    console.error('FoxesConnect booking event could not be queued.', {
      bookingId: String(input.booking._id),
      type: input.type,
      code,
    });
    return { queued: false as const, code };
  }
}

import { createHmac } from 'node:crypto';

export const FOXESCONNECT_BOOKING_EVENT_TYPES = [
  'booking_confirmed',
  'pickup_confirmed',
  'driver_assigned',
  'service_reminder_24h',
  'service_completed',
  'payment_pending',
] as const;

export type FoxesConnectBookingEventType = (typeof FOXESCONNECT_BOOKING_EVENT_TYPES)[number];

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type FoxesConnectBookingEvent = {
  eventId: string;
  type: FoxesConnectBookingEventType;
  occurredAt: string;
  reference?: string | null;
  customer?: {
    name?: string | null;
    phone?: string | null;
    locale?: string | null;
  };
  data?: Record<string, JsonValue>;
};

export type BookingLifecycleEventInput = {
  type: FoxesConnectBookingEventType;
  /** Immutable TourTicket booking identity, normally the Mongo ObjectId. */
  bookingId: string;
  /** Increment only when the business event itself is intentionally repeated. */
  eventVersion?: string;
  occurredAt: Date | string;
  reference?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  locale?: string | null;
  tourTitle?: string | null;
  serviceDate?: string | null;
  serviceTime?: string | null;
  bookingStatus?: string | null;
  paymentStatus?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  pickupLocation?: string | null;
  driverName?: string | null;
  data?: Record<string, JsonValue>;
};

export type BookingEventDeliveryResult =
  | { status: 'delivered'; attempts: number; httpStatus: number }
  | { status: 'failed'; attempts: number; httpStatus?: number; code: string; retryable: boolean }
  | { status: 'uncertain'; attempts: number; code: 'DELIVERY_OUTCOME_UNCERTAIN' };

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type BookingEventDeliveryOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  now?: () => Date;
  wait?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
  maxAttempts?: number;
};

export type PreparedBookingEvent = {
  event: FoxesConnectBookingEvent;
  rawBody: string;
};

export class BookingEventConfigurationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'BookingEventConfigurationError';
  }
}

export class BookingEventValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'BookingEventValidationError';
  }
}

const MAX_BODY_BYTES = 32 * 1024;
const DEFAULT_TIMEOUT_MS = 2_500;
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429]);

function configuredValue(env: NodeJS.ProcessEnv, name: string) {
  return String(env[name] || '').trim();
}

function loadConfiguration(env: NodeJS.ProcessEnv) {
  const endpoint = configuredValue(env, 'FOXESCONNECT_BOOKING_EVENTS_URL');
  const workspaceKey = configuredValue(env, 'FOXESCONNECT_WORKSPACE_KEY');
  // A signing secret is byte material. Do not trim or otherwise normalize it;
  // both systems must HMAC the exact configured value.
  const secret = String(env.FOXESCONNECT_BOOKING_EVENTS_SECRET || '');
  if (!endpoint || !workspaceKey || !secret) {
    throw new BookingEventConfigurationError(
      'BOOKING_EVENTS_CONFIG_MISSING',
      'FoxesConnect booking-event delivery is not configured.',
    );
  }
  if (workspaceKey.length > 200 || /[\u0000-\u001f\u007f]/.test(workspaceKey)) {
    throw new BookingEventConfigurationError(
      'BOOKING_EVENTS_WORKSPACE_INVALID',
      'The FoxesConnect workspace key is invalid.',
    );
  }
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new BookingEventConfigurationError(
      'BOOKING_EVENTS_SECRET_WEAK',
      'The FoxesConnect booking-event secret must contain at least 32 bytes.',
    );
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new BookingEventConfigurationError(
      'BOOKING_EVENTS_URL_INVALID',
      'The FoxesConnect booking-event URL is invalid.',
    );
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new BookingEventConfigurationError(
      'BOOKING_EVENTS_URL_INVALID',
      'The FoxesConnect booking-event URL must be HTTPS and contain no credentials.',
    );
  }
  return { endpoint: url.toString(), workspaceKey, secret };
}

function normalizedText(value: string | null | undefined, maximum: number, field: string) {
  if (value === undefined || value === null) return value;
  const normalized = value.trim();
  if (normalized.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)) {
    throw new BookingEventValidationError('BOOKING_EVENT_INVALID', `${field} is invalid.`);
  }
  return normalized || null;
}

function canonicalJsonValue(value: unknown, seen: Set<object>): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'Event data contains a non-finite number.');
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'Event data is not JSON-safe.');
  }
  if (seen.has(value)) {
    throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'Event data contains a circular reference.');
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => canonicalJsonValue(item, seen));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'Event data must contain only plain objects.');
    }
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined) continue;
      result[key] = canonicalJsonValue(item, seen);
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

function serializeEvent(event: FoxesConnectBookingEvent) {
  const eventId = event.eventId;
  if (typeof eventId !== 'string' || eventId.length < 1 || eventId.length > 200
    || /[\u0000-\u001f\u007f]/.test(eventId)) {
    throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'eventId is invalid.');
  }
  if (!FOXESCONNECT_BOOKING_EVENT_TYPES.includes(event.type)) {
    throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'Event type is invalid.');
  }
  const occurredAt = new Date(event.occurredAt);
  if (!Number.isFinite(occurredAt.getTime())) {
    throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'occurredAt is invalid.');
  }

  const normalized: FoxesConnectBookingEvent = {
    eventId,
    type: event.type,
    occurredAt: occurredAt.toISOString(),
  };
  if (event.reference !== undefined) normalized.reference = normalizedText(event.reference, 120, 'reference');
  if (event.customer) {
    normalized.customer = {
      ...(event.customer.name !== undefined ? { name: normalizedText(event.customer.name, 160, 'customer.name') } : {}),
      ...(event.customer.phone !== undefined ? { phone: normalizedText(event.customer.phone, 32, 'customer.phone') } : {}),
      ...(event.customer.locale !== undefined ? { locale: normalizedText(event.customer.locale, 12, 'customer.locale') } : {}),
    };
  }
  if (event.data !== undefined) {
    normalized.data = canonicalJsonValue(event.data, new Set()) as Record<string, JsonValue>;
  }

  const body = JSON.stringify(canonicalJsonValue(normalized, new Set()));
  if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    throw new BookingEventValidationError('BOOKING_EVENT_TOO_LARGE', 'Booking event exceeds 32 KB.');
  }
  return body;
}

/**
 * Validate and freeze the exact bytes that will be signed. Durable delivery
 * stores both values so a retry after a process restart cannot reserialize a
 * mutable booking record into a different request body.
 */
export function prepareBookingEvent(event: FoxesConnectBookingEvent): PreparedBookingEvent {
  const rawBody = serializeEvent(event);
  return {
    event: JSON.parse(rawBody) as FoxesConnectBookingEvent,
    rawBody,
  };
}

function retryableHttpStatus(status: number) {
  return RETRYABLE_HTTP_STATUSES.has(status) || status >= 500;
}

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(value!)));
}

const defaultWait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Deliver one immutable booking fact to FoxesConnect. The exact JSON body is
 * serialized once and reused for every bounded retry; only the signature
 * timestamp changes. A timeout remains explicitly uncertain because the
 * receiver may have committed the event before the connection was lost.
 */
export async function emitPreparedBookingEvent(
  prepared: PreparedBookingEvent,
  options: BookingEventDeliveryOptions = {},
): Promise<BookingEventDeliveryResult> {
  const config = loadConfiguration(options.env || process.env);
  const rawBody = serializeEvent(prepared.event);
  if (rawBody !== prepared.rawBody) {
    throw new BookingEventValidationError(
      'BOOKING_EVENT_BODY_MISMATCH',
      'Prepared booking-event bytes do not match the validated event.',
    );
  }
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || (() => new Date());
  const wait = options.wait || defaultWait;
  const timeoutMs = boundedInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, 100, 10_000);
  const maxAttempts = boundedInteger(options.maxAttempts, DEFAULT_MAX_ATTEMPTS, 1, 5);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timestamp = Math.floor(now().getTime() / 1_000);
    const signature = createHmac('sha256', config.secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    timeout.unref?.();

    try {
      const response = await fetchImpl(config.endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-foxes-workspace': config.workspaceKey,
          'x-foxes-signature': `t=${timestamp},v1=${signature}`,
        },
        body: rawBody,
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal,
      });
      if (response.ok) return { status: 'delivered', attempts: attempt, httpStatus: response.status };
      const retryable = retryableHttpStatus(response.status);
      if (!retryable || attempt === maxAttempts) {
        return {
          status: 'failed',
          attempts: attempt,
          httpStatus: response.status,
          code: retryable ? 'BOOKING_EVENT_RETRY_EXHAUSTED' : 'BOOKING_EVENT_REJECTED',
          retryable,
        };
      }
    } catch {
      // Once fetch has started, a network error cannot prove that the receiver
      // did not commit. Stop immediately: an operator may safely reconcile the
      // stable eventId, but the sender never auto-replays an uncertain effect.
      return { status: 'uncertain', attempts: attempt, code: 'DELIVERY_OUTCOME_UNCERTAIN' };
    } finally {
      clearTimeout(timeout);
    }

    await wait(Math.min(1_000, 100 * (2 ** (attempt - 1))));
  }

  return { status: 'failed', attempts: maxAttempts, code: 'BOOKING_EVENT_RETRY_EXHAUSTED', retryable: true };
}

export async function emitBookingEvent(
  event: FoxesConnectBookingEvent,
  options: BookingEventDeliveryOptions = {},
) {
  return emitPreparedBookingEvent(prepareBookingEvent(event), options);
}

/** Build the stable cross-system event identity and least-necessary payload. */
export function createBookingLifecycleEvent(input: BookingLifecycleEventInput): FoxesConnectBookingEvent {
  const bookingId = normalizedText(input.bookingId, 80, 'bookingId');
  const eventVersion = normalizedText(input.eventVersion || 'v1', 40, 'eventVersion');
  if (!bookingId || !eventVersion || !/^[A-Za-z0-9._-]+$/.test(bookingId) || !/^[A-Za-z0-9._-]+$/.test(eventVersion)) {
    throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'Booking event identity is invalid.');
  }
  const occurredAt = new Date(input.occurredAt);
  if (!Number.isFinite(occurredAt.getTime())) {
    throw new BookingEventValidationError('BOOKING_EVENT_INVALID', 'Booking event occurrence is invalid.');
  }

  const data: Record<string, JsonValue> = { ...(input.data || {}) };
  const add = (key: string, value: string | number | null | undefined) => {
    if (value !== undefined && value !== null && value !== '') data[key] = value;
  };
  add('tourTitle', input.tourTitle);
  add('serviceDate', input.serviceDate);
  add('serviceTime', input.serviceTime);
  add('bookingStatus', input.bookingStatus);
  add('paymentStatus', input.paymentStatus);
  add('totalPrice', input.totalPrice);
  add('currency', input.currency);
  add('pickupLocation', input.pickupLocation);
  add('driverName', input.driverName);

  const customer = {
    ...(input.customerName !== undefined ? { name: input.customerName } : {}),
    ...(input.customerPhone !== undefined ? { phone: input.customerPhone } : {}),
    ...(input.locale !== undefined ? { locale: input.locale } : {}),
  };
  return {
    eventId: `tourticket:${bookingId}:${input.type}:${eventVersion}`,
    type: input.type,
    occurredAt: occurredAt.toISOString(),
    ...(input.reference !== undefined ? { reference: input.reference } : {}),
    ...(Object.keys(customer).length > 0 ? { customer } : {}),
    ...(Object.keys(data).length > 0 ? { data } : {}),
  };
}

/** Convenience used by lifecycle hooks; it never invokes a customer channel. */
export function deliverBookingLifecycleEvent(
  input: BookingLifecycleEventInput,
  options: BookingEventDeliveryOptions = {},
) {
  return emitBookingEvent(createBookingLifecycleEvent(input), options);
}

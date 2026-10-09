import { createHmac, timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

/**
 * The booking feed the Foxes booking API reads (booking platform Phase 2; blueprint
 * `planning/fouad-asks-2026-10-09/booking-platform/BLUEPRINT-phase2-intake.md`, "Feed contract").
 *
 * - One signed consumer. `x-foxes-feed-signature: t=<unix>,v1=<hex HMAC-SHA256(secret,
 *   "<t>.GET <path>?<sorted, percent-encoded query>")>`, five minutes either way. Anything else
 *   is a 401 that never says why.
 * - Changes since a cursor, in (updatedAt, _id) order, or the bookings of a service-day window.
 * - Each item is the booking's whole current state in the agreed FoxesConnect vocabulary. The
 *   default (EEO) tenant only. Nothing is logged about a guest.
 */

export const FEED_SIGNATURE_HEADER = 'x-foxes-feed-signature';
export const FEED_SIGNATURE_WINDOW_S = 300;
export const FEED_SECRET_MIN_BYTES = 32;
export const FEED_PAGE_LIMIT = 100;
/** Writes in flight settle before they are read, so a commit that lands late is not skipped. */
export const FEED_SETTLE_MS = 10_000;
const WINDOW_MAX_DAYS = 120;
/** A booking's `date` may sit anywhere in its service day in any zone; the window reads wide, then exact. */
const WINDOW_SLACK_MS = 14 * 60 * 60_000;

export function canonicalFeedQuery(params: URLSearchParams): string {
  return [...params.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) => (aKey < bKey ? -1 : aKey > bKey ? 1 : aValue < bValue ? -1 : aValue > bValue ? 1 : 0))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/** True only for a well-formed, in-window signature of exactly this request. The secret is used as configured. */
export function verifyFeedSignature(secret: string, header: string | null | undefined, method: string, pathname: string, params: URLSearchParams, nowS: number): boolean {
  if (!header || Buffer.byteLength(secret, 'utf8') < FEED_SECRET_MIN_BYTES) return false;
  const match = /^t=(\d{1,12}),v1=([0-9a-f]{64})$/.exec(header.trim());
  if (!match) return false;
  const t = Number(match[1]);
  if (!Number.isSafeInteger(t) || Math.abs(nowS - t) > FEED_SIGNATURE_WINDOW_S) return false;
  const signing = `${t}.${method.toUpperCase()} ${pathname}?${canonicalFeedQuery(params)}`;
  const expected = createHmac('sha256', secret).update(signing).digest();
  const given = Buffer.from(match[2], 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export class FeedRequestError extends Error {
  constructor(public readonly field: string) {
    super(`Invalid ${field}`);
    this.name = 'FeedRequestError';
  }
}

export type FeedRequest =
  | { mode: 'changes'; limit: number; since: Date | null; after: { at: Date; id: mongoose.Types.ObjectId } | null }
  | { mode: 'window'; limit: number; serviceFrom: string; serviceTo: string; after: { at: Date; id: mongoose.Types.ObjectId } | null };

const encodeCursor = (at: Date, id: unknown) => Buffer.from(JSON.stringify({ a: at.toISOString(), i: String(id) })).toString('base64url');

function decodeCursor(raw: string): { at: Date; id: mongoose.Types.ObjectId } {
  try {
    const value = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    const at = new Date(value?.a);
    if (typeof value?.a === 'string' && Number.isFinite(at.getTime()) && mongoose.isValidObjectId(value?.i)) {
      return { at, id: new mongoose.Types.ObjectId(String(value.i)) };
    }
  } catch { /* refused below */ }
  throw new FeedRequestError('cursor');
}

const isDay = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

/** The request's own parameters, strictly: an unknown parameter or mixed modes is refused. */
export function parseFeedRequest(params: URLSearchParams): FeedRequest {
  const allowed = new Set(['limit', 'cursor', 'since', 'serviceFrom', 'serviceTo']);
  for (const key of params.keys()) if (!allowed.has(key)) throw new FeedRequestError(key);
  for (const key of allowed) if (params.getAll(key).length > 1) throw new FeedRequestError(key);
  const rawLimit = params.get('limit');
  const limit = rawLimit === null ? FEED_PAGE_LIMIT : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > FEED_PAGE_LIMIT) throw new FeedRequestError('limit');
  const cursor = params.get('cursor');
  const after = cursor ? decodeCursor(cursor) : null;
  const serviceFrom = params.get('serviceFrom');
  const serviceTo = params.get('serviceTo');
  if (serviceFrom !== null || serviceTo !== null) {
    if (params.has('since')) throw new FeedRequestError('since');
    if (!isDay(serviceFrom)) throw new FeedRequestError('serviceFrom');
    if (!isDay(serviceTo)) throw new FeedRequestError('serviceTo');
    const days = (Date.parse(`${serviceTo}T00:00:00Z`) - Date.parse(`${serviceFrom}T00:00:00Z`)) / 86_400_000;
    if (days < 0 || days > WINDOW_MAX_DAYS) throw new FeedRequestError('serviceTo');
    return { mode: 'window', limit, serviceFrom: serviceFrom as string, serviceTo: serviceTo as string, after };
  }
  const rawSince = params.get('since');
  let since: Date | null = null;
  if (rawSince !== null) {
    if (cursor) throw new FeedRequestError('since');
    since = new Date(rawSince);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(rawSince) || !Number.isFinite(since.getTime())) throw new FeedRequestError('since');
  }
  return { mode: 'changes', limit, since, after };
}

/** The Mongo query and order for one page (the caller reads limit + 1 to know whether more follow). */
export function feedQuery(request: FeedRequest, now: Date): { filter: Record<string, unknown>; sort: Record<string, 1> } {
  const and: Record<string, unknown>[] = [DEFAULT_TENANT_FILTER];
  if (request.mode === 'changes') {
    and.push({ updatedAt: { $lte: new Date(now.getTime() - FEED_SETTLE_MS) } });
    if (request.after) and.push({ $or: [{ updatedAt: { $gt: request.after.at } }, { updatedAt: request.after.at, _id: { $gt: request.after.id } }] });
    else if (request.since) and.push({ updatedAt: { $gte: request.since } });
    return { filter: { $and: and }, sort: { updatedAt: 1, _id: 1 } };
  }
  and.push({ date: {
    $gte: new Date(Date.parse(`${request.serviceFrom}T00:00:00.000Z`) - WINDOW_SLACK_MS),
    $lte: new Date(Date.parse(`${request.serviceTo}T23:59:59.999Z`) + WINDOW_SLACK_MS),
  } });
  if (request.after) and.push({ $or: [{ date: { $gt: request.after.at } }, { date: request.after.at, _id: { $gt: request.after.id } }] });
  return { filter: { $and: and }, sort: { date: 1, _id: 1 } };
}

/** The position after the last row read, in the order of this request's mode. */
export function cursorAfter(request: FeedRequest, row: { _id: unknown; updatedAt?: Date | string | null; date?: Date | string | null }): string {
  const at = new Date((request.mode === 'changes' ? row.updatedAt : row.date) as Date | string);
  return encodeCursor(at, row._id);
}

export type FeedBookingRow = {
  _id: unknown;
  bookingReference?: string | null;
  date?: Date | string | null;
  dateString?: string | null;
  time?: string | null;
  guests?: number | null;
  adultGuests?: number | null;
  childGuests?: number | null;
  infantGuests?: number | null;
  totalPrice?: number | null;
  currency?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  amountPaid?: number | null;
  refundAmount?: number | null;
  customerPhone?: string | null;
  pickupLocation?: string | null;
  hotelPickupDetails?: string | null;
  hotelPickupLocation?: { name?: string | null; address?: string | null } | null;
  selectedBookingOption?: { title?: string | null } | null;
  duplicateOf?: unknown;
  paymentReconciliationState?: string | null;
  updatedAt?: Date | string | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null } | null;
  tour?: { _id?: unknown; title?: string | null } | null;
  tourId?: unknown;
};

/** Display text: control characters become spaces, runs of space collapse, and it is cut to fit. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = [...value].map((char) => (char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f ? ' ' : char)).join('').replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, max) : null;
}

/** A contact detail is never cut: one that does not fit is left out rather than corrupted. */
function contact(value: unknown, max: number): string | null {
  const clean = text(value, Number.MAX_SAFE_INTEGER);
  return clean && clean.length <= max ? clean : null;
}

const CURRENCY_DECIMALS: Readonly<Record<string, number>> = Object.freeze({ JPY: 0, KRW: 0, KWD: 3, BHD: 3, OMR: 3 });
function money(value: number, currency: string): { value: string; currency: string } | null {
  if (!Number.isFinite(value) || value < 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  return { value: value.toFixed(CURRENCY_DECIMALS[currency] ?? 2), currency };
}

function serviceDay(row: FeedBookingRow): string | null {
  if (isDay(row.dateString ?? null)) return row.dateString as string;
  const date = row.date ? new Date(row.date) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

const STATUS: Readonly<Record<string, string>> = Object.freeze({
  Confirmed: 'confirmed', Pending: 'pending', Completed: 'completed', Cancelled: 'cancelled', Refunded: 'cancelled', Partial_Refund: 'confirmed',
});

/**
 * One EEO booking as a feed item, or null when it cannot be identified (no reference). An unknown
 * status is passed on as it is, so the booking API records "status not understood" and keeps the
 * booking's last good state instead of guessing.
 */
export function toFeedItem(row: FeedBookingRow): Record<string, unknown> | null {
  const reference = text(row.bookingReference, 120);
  const updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
  if (!reference || !updatedAt || !Number.isFinite(updatedAt.getTime())) return null;
  const currency = String(row.currency || '').toUpperCase();
  const total = Number(row.totalPrice);
  const paid = Number(row.amountPaid ?? (row.paymentStatus === 'paid' ? total : 0)) || 0;
  const refunded = Number(row.refundAmount) || 0;
  // A duplicate charge record is not a second booking: if it was ever sent, it is now cancelled.
  const duplicate = Boolean(row.duplicateOf) || row.paymentReconciliationState === 'duplicate_suppressed';
  const status = duplicate ? 'cancelled' : STATUS[String(row.status)] ?? String(row.status || '').toLowerCase();
  const paymentStatus = row.status === 'Refunded' || (paid > 0 && refunded >= paid) ? 'refunded'
    : row.status === 'Partial_Refund' || refunded > 0 ? 'partially_refunded'
      : row.paymentStatus === 'paid' ? 'paid'
        : paid > 0 ? 'partially_paid'
          : 'unpaid';
  const adults = Math.max(0, Number(row.adultGuests) || 0);
  const children = Math.max(0, Number(row.childGuests) || 0);
  const infants = Math.max(0, Number(row.infantGuests) || 0);
  const totalGuests = Math.max(0, Math.floor(Number(row.guests) || adults + children + infants));
  const breakdown = [['Adult', adults], ['Child', children], ['Infant', infants]]
    .filter(([, count]) => Number(count) > 0)
    .map(([label, count]) => ({ label, count }));
  const user = row.user && typeof row.user === 'object' ? row.user : null;
  const tour = row.tour && typeof row.tour === 'object' ? row.tour : null;
  const name = text(`${user?.firstName || ''} ${user?.lastName || ''}`, 160);
  const due = Math.round((total - paid) * 1000) / 1000;
  // Money the guest still owes on the day (a cash booking entered by EEO staff). Card and bank
  // bookings are paid to EEO before the day, so nothing is collected for them.
  const collect = !duplicate && status !== 'cancelled' && ['cash', 'pay_later'].includes(String(row.paymentMethod)) && row.paymentStatus !== 'paid' && due > 0
    ? money(due, currency) : null;
  return {
    source: 'eeo',
    externalRef: reference,
    sourceBookingId: String(row._id),
    sourceSite: null,
    status,
    paymentStatus,
    tour: {
      name: text(tour?.title, 200) || 'Tour no longer listed',
      code: tour?._id ? String(tour._id) : row.tourId ? String(row.tourId) : null,
      option: text(row.selectedBookingOption?.title, 200),
    },
    serviceDate: serviceDay(row),
    serviceTime: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(row.time || '')) ? row.time : null,
    timezone: 'Africa/Cairo',
    guests: {
      total: Math.min(totalGuests, 999),
      ...(breakdown.length && adults + children + infants === totalGuests ? { breakdown } : {}),
    },
    amount: money(total, currency),
    customer: {
      name,
      email: contact(user?.email, 254),
      phone: contact(row.customerPhone || user?.phone, 32),
      locale: null,
    },
    pickup: {
      hotel: text(row.hotelPickupLocation?.name, 200) || text(row.hotelPickupDetails, 200) || text(row.pickupLocation, 200),
      room: null,
      time: null,
    },
    collect,
    updatedAt: updatedAt.toISOString(),
  };
}

/** True when an item belongs in a window page (the query reads wide; the day is checked exactly). */
export function inWindow(item: Record<string, unknown>, request: FeedRequest): boolean {
  if (request.mode !== 'window') return true;
  const day = item.serviceDate as string | null;
  return Boolean(day && day >= request.serviceFrom && day <= request.serviceTo);
}

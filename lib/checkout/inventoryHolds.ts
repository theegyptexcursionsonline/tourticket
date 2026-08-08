import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import Booking from '@/lib/models/Booking';
import CheckoutInventoryHold from '@/lib/models/CheckoutInventoryHold';
import CheckoutInventoryLease from '@/lib/models/CheckoutInventoryLease';
import { assertRevenuePriceTargetSellable } from '@/lib/revenue/sellableDeparture';
import { normalizePriceDate } from '@/lib/revenue/pricingResolver';
import { paidTenantValue } from '@/lib/tenant/paidTenant';

export interface InventoryHoldCartItem {
  _id?: unknown;
  id?: unknown;
  selectedDate?: string;
  selectedTime?: string;
  quantity?: number;
  childQuantity?: number;
  infantQuantity?: number;
  selectedBookingOption?: { pricingKey?: string };
}

export class InventoryHoldError extends Error {
  status = 409;
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'InventoryHoldError';
  }
}

type InventoryTarget = {
  tenantId: string;
  tourId: string;
  date: string;
  time: string;
  optionKey: string;
  guests: number;
};

type HoldRow = {
  _id: Types.ObjectId;
  reservationKey: string;
  paymentIntentId?: string;
  itemIndex: number;
  tourId: Types.ObjectId;
  dateString: string;
  time: string;
  optionKey: string;
  guests: number;
  state: 'active' | 'converted' | 'released' | 'expired';
  expiresAt: Date;
  convertedBookingId?: Types.ObjectId;
};

const CLEANUP_MS = 30 * 24 * 60 * 60 * 1000;

function holdDurationMs() {
  const configured = Number(process.env.CHECKOUT_INVENTORY_HOLD_MINUTES || 20);
  const minutes = Number.isFinite(configured) ? Math.max(5, Math.min(60, configured)) : 20;
  return minutes * 60 * 1000;
}

function targetFor(item: InventoryHoldCartItem, tenantId = 'default'): InventoryTarget {
  const tourId = String(item._id || item.id || '');
  const date = String(item.selectedDate || '');
  const time = String(item.selectedTime || '');
  const optionKey = String(item.selectedBookingOption?.pricingKey || '');
  const guests = Number(item.quantity || 0) + Number(item.childQuantity || 0) + Number(item.infantQuantity || 0);
  if (!/^[a-f0-9]{24}$/i.test(tourId)
    || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
    || !optionKey
    || !Number.isInteger(guests)
    || guests < 1
    || guests > 50) {
    throw new InventoryHoldError('INVALID_INVENTORY_TARGET', 'Select a valid departure, option, and guest count.');
  }
  return { tenantId: paidTenantValue(tenantId), tourId, date, time, optionKey, guests };
}

function scopeKey(target: Pick<InventoryTarget, 'tenantId' | 'tourId' | 'date' | 'time'>) {
  return `${target.tenantId}:${target.tourId}:${target.date}:${target.time}`;
}

export function assertInventoryCapacity(input: {
  capacity: number;
  booked: number;
  activeHeld: number;
  requested: number;
}) {
  const capacity = Number(input.capacity);
  const booked = Math.max(0, Number(input.booked));
  const activeHeld = Math.max(0, Number(input.activeHeld));
  const requested = Number(input.requested);
  if (![capacity, booked, activeHeld, requested].every(Number.isFinite) || requested <= 0) {
    throw new InventoryHoldError('INVALID_INVENTORY_CAPACITY', 'Inventory capacity data is invalid.');
  }
  const available = Math.max(0, capacity - booked - activeHeld);
  if (requested > available) {
    throw new InventoryHoldError('INVENTORY_UNAVAILABLE', 'The selected departure no longer has enough unreserved capacity.');
  }
  return { availableBefore: available, availableAfter: available - requested };
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function acquireCheckoutInventoryLease(key: string, ttlMs = 60_000) {
  if (!/^[A-Za-z0-9:._-]{1,300}$/.test(key)) {
    throw new InventoryHoldError('INVALID_INVENTORY_LEASE', 'Inventory lease scope is invalid.');
  }
  const token = randomUUID();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const now = new Date();
    try {
      const lease = await CheckoutInventoryLease.findOneAndUpdate(
        {
          scopeKey: key,
          $or: [
            { leaseExpiresAt: { $lte: now } },
            { leaseExpiresAt: { $exists: false } },
            { leaseToken: token },
          ],
        },
        {
          $set: {
            leaseToken: token,
            leaseExpiresAt: new Date(now.getTime() + Math.max(5_000, Math.min(120_000, ttlMs))),
            cleanupAt: new Date(now.getTime() + CLEANUP_MS),
          },
          $setOnInsert: { scopeKey: key },
        },
        { upsert: true, new: true },
      ).lean<{ leaseToken?: string } | null>();
      if (lease?.leaseToken === token) {
        return token;
      }
    } catch (error: unknown) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    await wait(15 + attempt * 2);
  }
  throw new InventoryHoldError('INVENTORY_BUSY', 'Inventory is busy. Retry the checkout.');
}

export async function releaseCheckoutInventoryLease(key: string, token: string) {
  await CheckoutInventoryLease.updateOne(
    { scopeKey: key, leaseToken: token },
    { $unset: { leaseToken: 1 }, $set: { leaseExpiresAt: new Date(0) } },
  ).catch(() => undefined);
}

async function withInventoryLease<T>(target: InventoryTarget, work: () => Promise<T>) {
  const key = scopeKey(target);
  const token = await acquireCheckoutInventoryLease(key);
  try {
    return await work();
  } finally {
    await releaseCheckoutInventoryLease(key, token);
  }
}

/**
 * Serialize an operator reschedule with checkout holds for the destination
 * departure. Existing booking guests are credited back only when the booking
 * already occupies that exact departure; all active checkout holds still count.
 */
export async function withBookingInventoryCapacity<T>(input: {
  bookingId: string;
  current: InventoryHoldCartItem;
  next: InventoryHoldCartItem;
  work: () => Promise<T>;
}) {
  if (!/^[a-f0-9]{24}$/i.test(input.bookingId)) {
    throw new InventoryHoldError('INVALID_BOOKING_INVENTORY', 'Booking inventory identity is invalid.');
  }
  const current = targetFor(input.current);
  const next = targetFor(input.next);
  return withInventoryLease(next, async () => {
    let evidence;
    try {
      evidence = await assertRevenuePriceTargetSellable({
        tenantId: next.tenantId,
        tourId: next.tourId,
        optionKey: next.optionKey,
        date: next.date,
        time: next.time,
      });
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code || 'DEPARTURE_UNAVAILABLE')
        : 'DEPARTURE_UNAVAILABLE';
      throw new InventoryHoldError(
        code,
        error instanceof Error ? error.message : 'The requested departure is unavailable.',
      );
    }
    const held = await activeHeldGuests(next);
    const sameDeparture = current.tourId === next.tourId
      && current.date === next.date
      && current.time === next.time;
    assertInventoryCapacity({
      capacity: evidence.capacity,
      booked: Math.max(0, evidence.booked - (sameDeparture ? current.guests : 0)),
      activeHeld: held,
      requested: next.guests,
    });
    return input.work();
  });
}

function sameTarget(hold: HoldRow, target: InventoryTarget) {
  return String(hold.tourId) === target.tourId
    && hold.dateString === target.date
    && hold.time === target.time
    && hold.optionKey === target.optionKey
    && Number(hold.guests) === target.guests;
}

async function activeHeldGuests(target: InventoryTarget, excludeId?: Types.ObjectId) {
  const query: Record<string, unknown> = {
    tenantId: target.tenantId,
    tourId: target.tourId,
    date: normalizePriceDate(target.date),
    time: target.time,
    state: 'active',
    expiresAt: { $gt: new Date() },
  };
  if (excludeId) query._id = { $ne: excludeId };
  const rows = await CheckoutInventoryHold.find(query).select('guests').lean<Array<{ guests?: number }>>();
  return rows.reduce((total, row) => total + Math.max(0, Number(row.guests || 0)), 0);
}

async function reserveOne(reservationKey: string, item: InventoryHoldCartItem, itemIndex: number) {
  const target = targetFor(item);
  return withInventoryLease(target, async () => {
    const existing = await CheckoutInventoryHold.findOne({
      tenantId: target.tenantId,
      reservationKey,
      itemIndex,
    }).lean<HoldRow | null>();
    if (existing && !sameTarget(existing, target)) {
      throw new InventoryHoldError('INVENTORY_IDEMPOTENCY_CONFLICT', 'The reservation key is already bound to different inventory.');
    }
    if (existing?.state === 'converted') return existing;
    // A retry must return the original hold window, not extend inventory
    // indefinitely every time a client repeats the same idempotent request.
    if (existing?.state === 'active' && new Date(existing.expiresAt).getTime() > Date.now()) return existing;

    const evidence = await assertRevenuePriceTargetSellable({
      tenantId: target.tenantId,
      tourId: target.tourId,
      optionKey: target.optionKey,
      date: target.date,
      time: target.time,
    });
    const held = await activeHeldGuests(target, existing?._id);
    assertInventoryCapacity({
      capacity: evidence.capacity,
      booked: evidence.booked,
      activeHeld: held,
      requested: target.guests,
    });

    const now = new Date();
    return CheckoutInventoryHold.findOneAndUpdate(
      { tenantId: target.tenantId, reservationKey, itemIndex },
      {
        $set: {
          tourId: target.tourId,
          date: normalizePriceDate(target.date),
          dateString: target.date,
          time: target.time,
          optionKey: target.optionKey,
          guests: target.guests,
          state: 'active',
          expiresAt: new Date(now.getTime() + holdDurationMs()),
          cleanupAt: new Date(now.getTime() + CLEANUP_MS),
        },
        $unset: {
          releaseReason: 1,
          releasedAt: 1,
          convertedAt: 1,
          convertedBookingId: 1,
        },
      },
      { upsert: true, new: true },
    );
  });
}

export async function createInventoryHolds(input: {
  reservationKey: string;
  cart: InventoryHoldCartItem[];
}) {
  if (!/^[a-f0-9]{64}$/i.test(input.reservationKey) || !Array.isArray(input.cart) || input.cart.length === 0 || input.cart.length > 10) {
    throw new InventoryHoldError('INVALID_INVENTORY_RESERVATION', 'Inventory reservation input is invalid.');
  }
  const holds = [];
  try {
    for (let itemIndex = 0; itemIndex < input.cart.length; itemIndex += 1) {
      holds.push(await reserveOne(input.reservationKey, input.cart[itemIndex], itemIndex));
    }
    return holds;
  } catch (error) {
    await releaseInventoryHolds({ reservationKey: input.reservationKey, reason: 'reservation_failed' });
    throw error;
  }
}

export async function bindInventoryHoldsToPayment(reservationKey: string, paymentIntentId: string) {
  if (!/^[a-f0-9]{64}$/i.test(reservationKey) || !/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
    throw new InventoryHoldError('INVALID_INVENTORY_PAYMENT', 'Inventory payment binding is invalid.');
  }
  const conflicting = await CheckoutInventoryHold.exists({
    tenantId: 'default',
    reservationKey,
    paymentIntentId: { $exists: true, $ne: paymentIntentId },
  });
  if (conflicting) {
    throw new InventoryHoldError('INVENTORY_PAYMENT_CONFLICT', 'Inventory is already bound to a different payment.');
  }
  const result = await CheckoutInventoryHold.updateMany(
    { tenantId: 'default', reservationKey, state: 'active' },
    { $set: { paymentIntentId } },
  );
  if (result.matchedCount === 0) {
    const alreadyBound = await CheckoutInventoryHold.countDocuments({
      tenantId: 'default',
      reservationKey,
      paymentIntentId,
      state: 'converted',
    });
    if (alreadyBound > 0) return alreadyBound;
    throw new InventoryHoldError('INVENTORY_HOLD_MISSING', 'No active inventory hold exists for this payment.');
  }
  return result.matchedCount;
}

export async function releaseInventoryHolds(input: {
  tenantId?: string;
  reservationKey?: string;
  paymentIntentId?: string;
  reason: string;
}) {
  if (!input.reservationKey && !input.paymentIntentId) return 0;
  const tenantId = paidTenantValue(input.tenantId || 'default');
  const now = new Date();
  const result = await CheckoutInventoryHold.updateMany(
    {
      tenantId,
      state: 'active',
      ...(input.reservationKey ? { reservationKey: input.reservationKey } : {}),
      ...(input.paymentIntentId ? { paymentIntentId: input.paymentIntentId } : {}),
    },
    {
      $set: {
        state: 'released',
        releaseReason: input.reason,
        releasedAt: now,
        cleanupAt: new Date(now.getTime() + CLEANUP_MS),
      },
    },
  );
  return result.modifiedCount;
}

async function ensureOneForPayment(input: {
  tenantId: string;
  paymentIntentId: string;
  reservationKey: string;
  item: InventoryHoldCartItem;
  itemIndex: number;
}) {
  const target = targetFor(input.item, input.tenantId);
  return withInventoryLease(target, async () => {
    const booking = await Booking.findOne({
      tenantId: target.tenantId,
      paymentId: input.paymentIntentId,
      paymentItemIndex: input.itemIndex,
    }).select('_id').lean<{ _id: Types.ObjectId } | null>();
    let hold = await CheckoutInventoryHold.findOne({
      tenantId: target.tenantId,
      paymentIntentId: input.paymentIntentId,
      itemIndex: input.itemIndex,
    }).lean<HoldRow | null>();
    if (hold && !sameTarget(hold, target)) {
      throw new InventoryHoldError('INVENTORY_PAYMENT_CONFLICT', 'Payment inventory does not match the charged quote.');
    }
    if (booking) {
      const now = new Date();
      hold = await CheckoutInventoryHold.findOneAndUpdate(
        hold ? { _id: hold._id } : {
          tenantId: target.tenantId,
          reservationKey: input.reservationKey,
          itemIndex: input.itemIndex,
        },
        {
          $set: {
            paymentIntentId: input.paymentIntentId,
            tourId: target.tourId,
            date: normalizePriceDate(target.date),
            dateString: target.date,
            time: target.time,
            optionKey: target.optionKey,
            guests: target.guests,
            state: 'converted',
            convertedBookingId: booking._id,
            convertedAt: now,
            expiresAt: now,
            cleanupAt: new Date(now.getTime() + CLEANUP_MS),
          },
          $unset: { releaseReason: 1, releasedAt: 1 },
        },
        { upsert: true, new: true },
      ).lean<HoldRow | null>();
      return hold;
    }
    if (hold?.state === 'converted') return hold;
    if (hold?.state === 'active' && new Date(hold.expiresAt).getTime() > Date.now()) return hold;

    const evidence = await assertRevenuePriceTargetSellable({
      tenantId: target.tenantId,
      tourId: target.tourId,
      optionKey: target.optionKey,
      date: target.date,
      time: target.time,
    });
    const held = await activeHeldGuests(target, hold?._id);
    assertInventoryCapacity({
      capacity: evidence.capacity,
      booked: evidence.booked,
      activeHeld: held,
      requested: target.guests,
    });
    const now = new Date();
    hold = await CheckoutInventoryHold.findOneAndUpdate(
      hold ? { _id: hold._id } : {
        tenantId: target.tenantId,
        reservationKey: input.reservationKey,
        itemIndex: input.itemIndex,
      },
      {
        $set: {
          paymentIntentId: input.paymentIntentId,
          tourId: target.tourId,
          date: normalizePriceDate(target.date),
          dateString: target.date,
          time: target.time,
          optionKey: target.optionKey,
          guests: target.guests,
          state: 'active',
          expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
          cleanupAt: new Date(now.getTime() + CLEANUP_MS),
        },
        $unset: { releaseReason: 1, releasedAt: 1 },
      },
      { upsert: true, new: true },
    ).lean<HoldRow | null>();
    return hold;
  });
}

export async function ensureInventoryHoldsForPayment(input: {
  tenantId?: string;
  paymentIntentId: string;
  reservationKey: string;
  cart: InventoryHoldCartItem[];
}) {
  if (!/^pi_[A-Za-z0-9_]+$/.test(input.paymentIntentId)
    || !/^[a-f0-9]{64}$/i.test(input.reservationKey)
    || !Array.isArray(input.cart)
    || input.cart.length === 0
    || input.cart.length > 10) {
    throw new InventoryHoldError('INVALID_INVENTORY_PAYMENT', 'Paid inventory input is invalid.');
  }
  const holds = [];
  const tenantId = paidTenantValue(input.tenantId || 'default');
  for (let itemIndex = 0; itemIndex < input.cart.length; itemIndex += 1) {
    holds.push(await ensureOneForPayment({ ...input, tenantId, item: input.cart[itemIndex], itemIndex }));
  }
  return holds;
}

export async function convertInventoryHold(input: {
  tenantId?: string;
  paymentIntentId: string;
  itemIndex: number;
  bookingId: Types.ObjectId;
}) {
  const tenantId = paidTenantValue(input.tenantId || 'default');
  const hold = await CheckoutInventoryHold.findOne({
    tenantId,
    paymentIntentId: input.paymentIntentId,
    itemIndex: input.itemIndex,
  });
  if (!hold) throw new InventoryHoldError('INVENTORY_HOLD_MISSING', 'The paid inventory hold is missing.');
  if (hold.state === 'converted') {
    if (String(hold.convertedBookingId) !== String(input.bookingId)) {
      throw new InventoryHoldError('INVENTORY_CONVERSION_CONFLICT', 'Inventory was converted to a different booking.');
    }
    return hold;
  }
  if (hold.state !== 'active') {
    throw new InventoryHoldError('INVENTORY_HOLD_INACTIVE', 'The paid inventory hold is not active.');
  }
  const converted = await CheckoutInventoryHold.findOneAndUpdate(
    { _id: hold._id, state: 'active' },
    {
      $set: {
        state: 'converted',
        convertedBookingId: input.bookingId,
        convertedAt: new Date(),
        cleanupAt: new Date(Date.now() + CLEANUP_MS),
      },
    },
    { new: true },
  );
  if (!converted) throw new InventoryHoldError('INVENTORY_HOLD_INACTIVE', 'The paid inventory hold is not active.');
  return converted;
}

export async function convertInventoryReservationHold(input: {
  reservationKey: string;
  itemIndex: number;
  bookingId: Types.ObjectId;
}) {
  if (!/^[a-f0-9]{64}$/i.test(input.reservationKey)) {
    throw new InventoryHoldError('INVALID_INVENTORY_RESERVATION', 'Inventory reservation input is invalid.');
  }
  const hold = await CheckoutInventoryHold.findOne({
    tenantId: 'default',
    reservationKey: input.reservationKey,
    itemIndex: input.itemIndex,
  });
  if (!hold) throw new InventoryHoldError('INVENTORY_HOLD_MISSING', 'The inventory hold is missing.');
  if (hold.state === 'converted') {
    if (String(hold.convertedBookingId) !== String(input.bookingId)) {
      throw new InventoryHoldError('INVENTORY_CONVERSION_CONFLICT', 'Inventory was converted to a different booking.');
    }
    return hold;
  }
  const converted = await CheckoutInventoryHold.findOneAndUpdate(
    { _id: hold._id, state: 'active' },
    {
      $set: {
        state: 'converted',
        convertedBookingId: input.bookingId,
        convertedAt: new Date(),
        cleanupAt: new Date(Date.now() + CLEANUP_MS),
      },
    },
    { new: true },
  );
  if (!converted) throw new InventoryHoldError('INVENTORY_HOLD_INACTIVE', 'The inventory hold is not active.');
  return converted;
}

export async function expireInventoryHolds(paymentIntentId: string) {
  const now = new Date();
  const result = await CheckoutInventoryHold.updateMany(
    { tenantId: 'default', paymentIntentId, state: 'active', expiresAt: { $lte: now } },
    {
      $set: {
        state: 'expired',
        releaseReason: 'hold_expired',
        releasedAt: now,
        cleanupAt: new Date(now.getTime() + CLEANUP_MS),
      },
    },
  );
  return result.modifiedCount;
}

export async function expiredInventoryPaymentIds(limit = 100) {
  const rows = await CheckoutInventoryHold.find({
    tenantId: 'default',
    state: 'active',
    expiresAt: { $lte: new Date() },
    paymentIntentId: { $type: 'string' },
  }).select('paymentIntentId').limit(Math.max(1, Math.min(500, Math.floor(limit)))).lean<Array<{ paymentIntentId?: string }>>();
  return Array.from(new Set(rows.map((row) => row.paymentIntentId).filter((value): value is string => Boolean(value))));
}

export async function expireUnboundInventoryHolds() {
  const now = new Date();
  const result = await CheckoutInventoryHold.updateMany(
    {
      tenantId: 'default',
      state: 'active',
      expiresAt: { $lte: now },
      paymentIntentId: { $exists: false },
    },
    {
      $set: {
        state: 'expired',
        releaseReason: 'unbound_hold_expired',
        releasedAt: now,
        cleanupAt: new Date(now.getTime() + CLEANUP_MS),
      },
    },
  );
  return result.modifiedCount;
}

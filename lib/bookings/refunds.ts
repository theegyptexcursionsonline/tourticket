import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import Booking, { type BookingStatus } from '@/lib/models/Booking';
import { roundMoney } from '@/lib/checkout/cartTotals';
import {
  calculateCancellationPolicy,
} from '@/lib/bookings/cancellationPolicy';

export { calculateCancellationPolicy, CANCELLATION_POLICY_VERSION } from '@/lib/bookings/cancellationPolicy';

export type BookingRefundKind = 'customer_cancel' | 'admin_cancel' | 'admin_full' | 'admin_partial';
export type BookingRefundState = 'not_required' | 'manual_required' | 'pending' | 'succeeded' | 'failed';

type RefundBooking = {
  _id: unknown;
  __v: number;
  tenantId: string;
  user: unknown;
  date: Date;
  dateString?: string;
  time: string;
  status: BookingStatus;
  totalPrice: number;
  currency: string;
  paymentId?: string;
  paymentMethod?: string;
  refundState?: BookingRefundState;
  refundRequestKey?: string;
  refundProviderIdempotencyKey?: string;
  refundProviderId?: string;
  refundPaymentIntentId?: string;
  refundChargeId?: string;
  refundRequestedAmount?: number;
  refundProviderStatus?: string;
  refundKind?: BookingRefundKind;
  refundSourceStatus?: BookingStatus;
  refundAmount?: number;
};

export class BookingRefundError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'BookingRefundError';
  }
}

export function sanitizeRefundReason(value: unknown, fallback: string) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new BookingRefundError(422, 'INVALID_REFUND_REASON', 'Refund reason must be text.');
  }
  const normalized = String(value || fallback)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized || normalized.length > 500) {
    throw new BookingRefundError(422, 'INVALID_REFUND_REASON', 'Refund reason must contain 1 to 500 characters.');
  }
  return normalized;
}

function bookingDateString(booking: RefundBooking) {
  const value = booking.dateString || new Date(booking.date).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(booking.time)) {
    throw new BookingRefundError(409, 'INVALID_BOOKING_DEPARTURE', 'Booking departure is invalid and requires support review.');
  }
  return value;
}

function finalStatusFor(kind: BookingRefundKind): BookingStatus {
  if (kind === 'admin_full') return 'Refunded';
  if (kind === 'admin_partial') return 'Partial_Refund';
  return 'Cancelled';
}

function cancellationKind(kind: BookingRefundKind) {
  return kind === 'customer_cancel' || kind === 'admin_cancel';
}

function ensureEligibleStatus(booking: RefundBooking, kind: BookingRefundKind) {
  const allowed = cancellationKind(kind)
    ? ['Confirmed', 'Pending']
    : ['Confirmed', 'Pending', 'Completed', 'Cancelled'];
  if (!allowed.includes(booking.status)) {
    throw new BookingRefundError(409, 'REFUND_STATE_CONFLICT', `Booking status ${booking.status} cannot enter this refund flow.`);
  }
}

function requestedAmountFor(booking: RefundBooking, input: RequestBookingRefundInput) {
  if (cancellationKind(input.kind)) {
    const policy = calculateCancellationPolicy({
      dateString: bookingDateString(booking),
      time: booking.time,
      totalPrice: booking.totalPrice,
      now: input.now,
    });
    if (input.kind === 'customer_cancel' && !policy.customerCancellationAllowed) {
      throw new BookingRefundError(409, 'CANCELLATION_WINDOW_CLOSED', 'Cancellations are only allowed at least 24 hours before the departure time.');
    }
    return { amount: policy.refundAmount, policy };
  }
  const total = roundMoney(Number(booking.totalPrice || 0));
  if (input.kind === 'admin_full') return { amount: total, policy: undefined };
  const requested = roundMoney(Number(input.requestedAmount));
  if (!Number.isFinite(requested) || requested <= 0 || requested >= total) {
    throw new BookingRefundError(422, 'INVALID_PARTIAL_REFUND', 'Partial refund must be greater than zero and less than the booking total.');
  }
  return { amount: requested, policy: undefined };
}

function isStripeBooking(booking: RefundBooking) {
  return /^pi_[A-Za-z0-9_]+$/.test(String(booking.paymentId || ''))
    && !['bank', 'cash', 'pay_later'].includes(String(booking.paymentMethod || '').toLowerCase());
}

export type PriorRefundResolution = 'replay' | 'conflict' | 'proceed';

// Decides what a new refund request may do given the booking's prior refund
// outcome. A completed cancellation that refunded NOTHING (the 0% policy
// window — refundState 'not_required') must not permanently block a
// deliberate admin refund: the customer's money is still captured, so an
// admin_full/admin_partial afterwards is legitimate (this is exactly the
// "cancel first, then refund" flow the admin uses). Real completed refunds
// ('succeeded') and manual-review outcomes ('manual_required', non-Stripe
// money) remain terminal.
export function resolvePriorRefund(
  refundState: string | undefined,
  refundKind: string | undefined,
  refundAmount: number,
  requestedKind: BookingRefundKind,
): PriorRefundResolution {
  if (!['succeeded', 'not_required', 'manual_required'].includes(String(refundState))) return 'proceed';
  if (refundKind === requestedKind) return 'replay';
  if (
    refundState === 'not_required'
    && roundMoney(refundAmount) === 0
    && (requestedKind === 'admin_full' || requestedKind === 'admin_partial')
  ) {
    return 'proceed';
  }
  return 'conflict';
}

export interface RequestBookingRefundInput {
  bookingId: string;
  ownerId?: string;
  kind: BookingRefundKind;
  actor: string;
  reason?: unknown;
  requestedAmount?: number;
  requestKey?: string;
  now?: Date;
}

export type BookingRefundOutcome = {
  bookingId: string;
  state: BookingRefundState;
  status: BookingStatus;
  requestedAmount: number;
  actualRefundAmount: number;
  refundPercentage?: number;
  departureAtUtc?: string;
  providerRefundId?: string;
  replayed: boolean;
  newlyFinalized: boolean;
};

async function loadBooking(input: RequestBookingRefundInput) {
  return Booking.findOne({
    _id: input.bookingId,
    tenantId: 'default',
    ...(input.ownerId ? { user: input.ownerId } : {}),
  }).select('_id __v tenantId user date dateString time status totalPrice currency paymentId paymentMethod refundState refundRequestKey refundProviderIdempotencyKey refundProviderId refundPaymentIntentId refundChargeId refundRequestedAmount refundProviderStatus refundKind refundSourceStatus refundAmount').lean<RefundBooking | null>();
}

function outcome(booking: RefundBooking, replayed: boolean, newlyFinalized = false): BookingRefundOutcome {
  return {
    bookingId: String(booking._id),
    state: booking.refundState || 'failed',
    status: booking.status,
    requestedAmount: Number(booking.refundRequestedAmount || 0),
    actualRefundAmount: Number(booking.refundAmount || 0),
    providerRefundId: booking.refundProviderId,
    replayed,
    newlyFinalized,
  };
}

async function finalizeWithoutStripe(input: {
  booking: RefundBooking;
  request: RequestBookingRefundInput;
  amount: number;
  reason: string;
  state: 'not_required' | 'manual_required';
  policy?: ReturnType<typeof calculateCancellationPolicy>;
}) {
  const now = new Date();
  const updated = await Booking.findOneAndUpdate(
    {
      _id: input.booking._id,
      tenantId: 'default',
      __v: input.booking.__v,
      status: input.booking.status,
      // 'not_required' is claimable again — see resolvePriorRefund.
      $or: [{ refundState: { $exists: false } }, { refundState: 'failed' }, { refundState: 'not_required' }],
    },
    {
      $set: {
        status: 'Cancelled',
        refundState: input.state,
        refundKind: input.request.kind,
        refundActor: input.request.actor.slice(0, 255),
        refundReason: input.reason,
        refundRequestedAmount: input.amount,
        refundAmount: 0,
        refundPolicyVersion: input.policy?.policyVersion,
        refundRequestedAt: now,
        refundCompletedAt: now,
      },
      $inc: { __v: 1 },
      $push: {
        editHistory: {
          editedAt: now,
          editedBy: input.request.actor.slice(0, 255),
          editedByName: input.request.actor.slice(0, 255),
          field: 'status',
          previousValue: input.booking.status,
          newValue: 'Cancelled',
          changeType: 'status_change',
        },
      },
    },
    { new: true },
  ).lean<RefundBooking | null>();
  if (updated) {
    return {
      ...outcome(updated, false, true),
      refundPercentage: input.policy?.refundPercentage,
      departureAtUtc: input.policy?.departureAtUtc,
    };
  }
  const current = await loadBooking(input.request);
  if (current && ['not_required', 'manual_required'].includes(String(current.refundState))) return outcome(current, true);
  throw new BookingRefundError(409, 'REFUND_STATE_CONFLICT', 'Booking changed while cancellation was being processed.');
}

async function markProviderFailure(bookingId: string, idempotencyKey: string, code: string, definitive: boolean) {
  await Booking.updateOne(
    { _id: bookingId, tenantId: 'default', refundProviderIdempotencyKey: idempotencyKey, refundState: 'pending' },
    {
      $set: {
        ...(definitive ? { refundState: 'failed' } : {}),
        refundFailureCode: code.slice(0, 200),
        refundProviderStatus: definitive ? 'failed' : 'request_uncertain',
      },
    },
  );
}

function isDefinitiveStripeRejection(error: unknown) {
  const type = String((error as { type?: string })?.type || '');
  return type === 'StripeInvalidRequestError' || type === 'StripeCardError';
}

export async function requestBookingRefund(
  input: RequestBookingRefundInput,
  stripeProvider: () => Stripe,
): Promise<BookingRefundOutcome> {
  if (!/^[a-f0-9]{24}$/i.test(input.bookingId)) throw new BookingRefundError(400, 'INVALID_BOOKING_ID', 'Booking ID is invalid.');
  const reason = sanitizeRefundReason(input.reason, cancellationKind(input.kind) ? 'Booking cancellation requested' : 'Refund requested by administrator');
  let booking = await loadBooking(input);
  if (!booking) throw new BookingRefundError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');

  const priorResolution = resolvePriorRefund(
    booking.refundState,
    booking.refundKind,
    Number(booking.refundAmount || 0),
    input.kind,
  );
  if (priorResolution === 'replay') return outcome(booking, true);
  if (priorResolution === 'conflict') {
    throw new BookingRefundError(409, 'REFUND_STATE_CONFLICT', 'A different cancellation or refund has already completed.');
  }
  ensureEligibleStatus(booking, input.kind);
  // Once a provider claim exists, retries must reuse its monetary snapshot.
  // Re-evaluating the clock could cross a 3/7-day boundary and strand an
  // otherwise idempotent refund with a different amount.
  const persistedPendingAmount = booking.refundState === 'pending'
    ? roundMoney(Number(booking.refundRequestedAmount))
    : undefined;
  const calculated = persistedPendingAmount !== undefined && cancellationKind(input.kind)
    ? {
        amount: persistedPendingAmount,
        policy: calculateCancellationPolicy({
          dateString: bookingDateString(booking),
          time: booking.time,
          totalPrice: booking.totalPrice,
          now: input.now,
        }),
      }
    : requestedAmountFor(booking, input);
  const amount = persistedPendingAmount !== undefined && Number.isFinite(persistedPendingAmount)
    ? persistedPendingAmount
    : calculated.amount;
  const policy = calculated.policy
    ? {
        ...calculated.policy,
        ...(persistedPendingAmount !== undefined ? {
          refundAmount: persistedPendingAmount,
          refundPercentage: Number(booking.totalPrice) > 0
            ? Math.round((persistedPendingAmount / Number(booking.totalPrice)) * 100)
            : 0,
          customerCancellationAllowed: true,
        } : {}),
      }
    : calculated.policy;

  if (amount === 0) {
    if (!cancellationKind(input.kind)) throw new BookingRefundError(422, 'INVALID_REFUND_AMOUNT', 'Refund amount must be greater than zero.');
    return finalizeWithoutStripe({ booking, request: input, amount, reason, state: 'not_required', policy });
  }

  if (!isStripeBooking(booking)) {
    if (!cancellationKind(input.kind)) {
      throw new BookingRefundError(409, 'MANUAL_REFUND_REQUIRED', 'This payment was not collected through Stripe. Cancel or refund it through its original payment channel.');
    }
    return finalizeWithoutStripe({ booking, request: input, amount, reason, state: 'manual_required', policy });
  }

  if (booking.refundState === 'pending') {
    if (booking.refundKind !== input.kind || roundMoney(Number(booking.refundRequestedAmount)) !== amount) {
      throw new BookingRefundError(409, 'REFUND_IN_PROGRESS', 'A different refund is already in progress for this booking.');
    }
  } else {
    const requestKey = /^[A-Za-z0-9._:-]{8,100}$/.test(String(input.requestKey || ''))
      ? String(input.requestKey)
      : randomUUID();
    const providerIdempotencyKey = `booking-refund:${input.bookingId}:${requestKey}`;
    const claimed = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        tenantId: 'default',
        __v: booking.__v,
        status: booking.status,
        // 'not_required' is claimable again: it means a prior operation
        // completed WITHOUT refunding money (0% policy cancellation), which
        // resolvePriorRefund allows an admin refund to supersede.
        $or: [{ refundState: { $exists: false } }, { refundState: 'failed' }, { refundState: 'not_required' }],
      },
      {
        $set: {
          refundState: 'pending',
          refundRequestKey: requestKey,
          refundProviderIdempotencyKey: providerIdempotencyKey,
          refundRequestedAmount: amount,
          refundReason: reason,
          refundKind: input.kind,
          refundSourceStatus: booking.status,
          refundActor: input.actor.slice(0, 255),
          refundPolicyVersion: policy?.policyVersion,
          refundRequestedAt: new Date(),
          refundProviderStatus: 'claim_created',
        },
        $unset: {
          refundProviderId: 1,
          refundFailureCode: 1,
          refundCompletedAt: 1,
          // A prior $0 cancellation may have already consumed the one-shot
          // notification claim with its own email. This claim starts a NEW
          // financial outcome, which must be able to send its own
          // notification once it completes — release the old claim with the
          // refund claim itself. Replays of an already-notified refund never
          // reach this update (resolvePriorRefund returns 'replay' first),
          // so a correctly-sent refund email can never be duplicated.
          refundNotificationState: 1,
          refundNotificationSentAt: 1,
          refundNotificationClaimToken: 1,
          refundNotificationClaimedAt: 1,
          refundNotificationFailureCode: 1,
        },
        $inc: { __v: 1 },
      },
      { new: true },
    ).lean<RefundBooking | null>();
    if (claimed) booking = claimed;
    else {
      const concurrent = await loadBooking(input);
      if (!concurrent) throw new BookingRefundError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
      if (concurrent.refundState !== 'pending'
        || concurrent.refundKind !== input.kind
        || roundMoney(Number(concurrent.refundRequestedAmount)) !== amount) {
        throw new BookingRefundError(409, 'REFUND_STATE_CONFLICT', 'Booking changed while the refund was being claimed.');
      }
      booking = concurrent;
    }
  }

  const idempotencyKey = String(booking.refundProviderIdempotencyKey || '');
  if (!idempotencyKey) throw new BookingRefundError(500, 'REFUND_CLAIM_INVALID', 'Refund claim is missing its provider idempotency key.');

  let intent: Stripe.PaymentIntent;
  let stripe: Stripe;
  try {
    stripe = stripeProvider();
    intent = await stripe.paymentIntents.retrieve(String(booking.paymentId), { expand: ['latest_charge'] });
  } catch (error) {
    const definitive = isDefinitiveStripeRejection(error);
    await markProviderFailure(input.bookingId, idempotencyKey, definitive ? 'payment_intent_invalid' : 'payment_intent_retrieval_uncertain', definitive);
    throw new BookingRefundError(
      definitive ? 409 : 503,
      definitive ? 'PAYMENT_BINDING_INVALID' : 'REFUND_PROVIDER_UNAVAILABLE',
      definitive
        ? 'The original Stripe payment cannot be safely bound to this refund.'
        : 'Payment provider could not be reached. The same refund can be retried safely.',
    );
  }
  const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
  const amountMinor = Math.round(amount * 100);
  if (intent.id !== booking.paymentId
    || intent.status !== 'succeeded'
    || intent.currency.toUpperCase() !== String(booking.currency || 'USD').toUpperCase()
    || Number(intent.amount_received || intent.amount) < amountMinor
    || !chargeId) {
    await markProviderFailure(input.bookingId, idempotencyKey, 'payment_binding_invalid', true);
    throw new BookingRefundError(409, 'PAYMENT_BINDING_INVALID', 'The original Stripe payment cannot be safely bound to this refund.');
  }
  await Booking.updateOne(
    { _id: input.bookingId, tenantId: 'default', refundProviderIdempotencyKey: idempotencyKey, refundState: 'pending' },
    { $set: { refundPaymentIntentId: intent.id, refundChargeId: chargeId, refundProviderStatus: 'provider_requested' } },
  );

  let providerRefund: Stripe.Refund;
  try {
    providerRefund = await stripe.refunds.create(
      {
        charge: chargeId,
        amount: amountMinor,
        reason: 'requested_by_customer',
        metadata: {
          booking_id: input.bookingId,
          payment_intent_id: intent.id,
          refund_kind: input.kind,
          policy_version: policy?.policyVersion || 'admin-directed',
        },
      },
      { idempotencyKey },
    );
  } catch (error) {
    const definitive = isDefinitiveStripeRejection(error);
    await markProviderFailure(input.bookingId, idempotencyKey, definitive ? 'refund_provider_rejected' : 'refund_request_uncertain', definitive);
    throw new BookingRefundError(
      definitive ? 502 : 503,
      definitive ? 'REFUND_PROVIDER_REJECTED' : 'REFUND_PROVIDER_UNAVAILABLE',
      definitive
        ? 'Stripe rejected the refund; the booking was not marked as refunded or cancelled.'
        : 'Refund confirmation is pending. Retry safely with the same request.',
    );
  }

  const providerStatus = String(providerRefund.status || 'pending');
  await Booking.updateOne(
    { _id: input.bookingId, tenantId: 'default', refundProviderIdempotencyKey: idempotencyKey, refundState: 'pending' },
    { $set: { refundProviderId: providerRefund.id, refundProviderStatus: providerStatus } },
  );
  if (providerStatus === 'failed' || providerStatus === 'canceled') {
    await markProviderFailure(input.bookingId, idempotencyKey, `provider_${providerStatus}`, true);
    throw new BookingRefundError(502, 'REFUND_PROVIDER_REJECTED', 'Stripe rejected the refund; the booking was not marked as refunded or cancelled.');
  }
  if (providerStatus !== 'succeeded') {
    const pending = await loadBooking(input);
    if (!pending) throw new BookingRefundError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
    return { ...outcome(pending, false), refundPercentage: policy?.refundPercentage, departureAtUtc: policy?.departureAtUtc };
  }

  const completedAt = new Date();
  const targetStatus = finalStatusFor(input.kind);
  const finalized = await Booking.findOneAndUpdate(
    {
      _id: input.bookingId,
      tenantId: 'default',
      refundState: 'pending',
      refundProviderIdempotencyKey: idempotencyKey,
      status: booking.refundSourceStatus || booking.status,
    },
    {
      $set: {
        status: targetStatus,
        refundState: 'succeeded',
        refundProviderId: providerRefund.id,
        refundProviderStatus: providerStatus,
        refundAmount: amount,
        refundDate: completedAt,
        refundCompletedAt: completedAt,
      },
      $push: {
        editHistory: {
          editedAt: completedAt,
          editedBy: input.actor.slice(0, 255),
          editedByName: input.actor.slice(0, 255),
          field: 'status',
          previousValue: booking.status,
          newValue: targetStatus,
          changeType: 'refund',
        },
      },
    },
    { new: true },
  ).lean<RefundBooking | null>();
  if (finalized) {
    return {
      ...outcome(finalized, false, true),
      refundPercentage: policy?.refundPercentage,
      departureAtUtc: policy?.departureAtUtc,
    };
  }
  const current = await loadBooking(input);
  if (current?.refundState === 'succeeded' && current.refundProviderId === providerRefund.id) return outcome(current, true);
  throw new BookingRefundError(500, 'REFUND_FINALIZATION_FAILED', 'Stripe refunded the payment but booking finalization requires support review.');
}

export async function reconcileStripeBookingRefund(refund: Stripe.Refund) {
  const metadata = refund.metadata || {};
  const bookingId = metadata.booking_id;
  const paymentIntentId = metadata.payment_intent_id;
  if (!/^[a-f0-9]{24}$/i.test(String(bookingId || '')) || !/^pi_[A-Za-z0-9_]+$/.test(String(paymentIntentId || ''))) {
    return { handled: false, reason: 'missing_booking_binding' };
  }
  const booking = await Booking.findOne({ _id: bookingId, tenantId: 'default', paymentId: paymentIntentId })
    .select('_id status refundState refundKind refundSourceStatus refundRequestedAmount refundProviderId')
    .lean<RefundBooking | null>();
  if (!booking) return { handled: false, reason: 'booking_binding_not_found' };
  if (booking.refundProviderId && booking.refundProviderId !== refund.id) {
    throw new BookingRefundError(409, 'REFUND_PROVIDER_CONFLICT', 'Stripe refund ID does not match the claimed booking refund.');
  }
  const providerStatus = String(refund.status || 'pending');
  if (providerStatus === 'failed' || providerStatus === 'canceled') {
    await Booking.updateOne(
      { _id: bookingId, tenantId: 'default', refundState: 'pending' },
      { $set: { refundState: 'failed', refundProviderId: refund.id, refundProviderStatus: providerStatus, refundFailureCode: `provider_${providerStatus}` } },
    );
    return { handled: true, finalized: false, state: 'failed', bookingId };
  }
  if (providerStatus !== 'succeeded') {
    await Booking.updateOne(
      { _id: bookingId, tenantId: 'default', refundState: 'pending' },
      { $set: { refundProviderId: refund.id, refundProviderStatus: providerStatus } },
    );
    return { handled: true, finalized: false, state: 'pending', bookingId };
  }
  const amount = roundMoney(Number(refund.amount || 0) / 100);
  if (amount !== roundMoney(Number(booking.refundRequestedAmount || 0)) || !booking.refundKind) {
    throw new BookingRefundError(409, 'REFUND_AMOUNT_CONFLICT', 'Stripe refund amount does not match the claimed booking refund.');
  }
  const targetStatus = finalStatusFor(booking.refundKind);
  const now = new Date();
  const updated = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      tenantId: 'default',
      refundState: 'pending',
      status: booking.refundSourceStatus || booking.status,
    },
    {
      $set: {
        status: targetStatus,
        refundState: 'succeeded',
        refundProviderId: refund.id,
        refundProviderStatus: 'succeeded',
        refundAmount: amount,
        refundDate: now,
        refundCompletedAt: now,
      },
    },
    { new: true },
  ).lean<RefundBooking | null>();
  return { handled: true, finalized: Boolean(updated), state: 'succeeded', bookingId };
}

/**
 * Inventory-guard refunds are created before a booking can be bound into the
 * refund metadata. If the sibling checkout races in a moment later, Stripe's
 * later refund.updated event is the durable chance to reconcile that booking.
 * PaymentIntent ids are account-wide identities, so an unbound refund is safe
 * to allocate only when exactly one booking exists for the payment.
 */
export async function reconcileUnboundStripeRefund(refund: Stripe.Refund) {
  const paymentIntentId = typeof refund.payment_intent === 'string'
    ? refund.payment_intent
    : refund.payment_intent?.id;
  if (!/^pi_[A-Za-z0-9_]+$/.test(String(paymentIntentId || ''))) {
    return { handled: false, reason: 'missing_payment_binding' };
  }
  if (String(refund.status || 'pending') !== 'succeeded') {
    return { handled: false, reason: 'refund_not_final' };
  }
  const amount = roundMoney(Number(refund.amount || 0) / 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { handled: false, reason: 'invalid_refund_amount' };
  }

  const bookings = await Booking.find({ paymentId: paymentIntentId })
    .select('_id totalPrice refundState refundProviderId')
    .lean<Array<Pick<RefundBooking, '_id' | 'totalPrice' | 'refundState' | 'refundProviderId'>>>();
  if (bookings.length !== 1) {
    return {
      handled: false,
      reason: bookings.length === 0 ? 'booking_not_found' : 'multiple_bookings_require_review',
    };
  }

  const booking = bookings[0];
  if (booking.refundState === 'succeeded' && booking.refundProviderId === refund.id) {
    return {
      handled: true,
      finalized: false,
      replayed: true,
      state: 'succeeded',
      bookingId: String(booking._id),
    };
  }
  const fullyRefunded = amount >= roundMoney(Number(booking.totalPrice || 0));
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, refundState: { $ne: 'succeeded' } },
    {
      $set: {
        status: fullyRefunded ? 'Refunded' : 'Partial_Refund',
        refundState: 'succeeded',
        refundProviderId: refund.id,
        refundProviderStatus: 'succeeded',
        refundPaymentIntentId: paymentIntentId,
        refundAmount: amount,
        refundDate: new Date(),
        refundCompletedAt: new Date(),
        refundReason: 'Automatic payment reconciliation',
      },
    },
    { new: true },
  ).lean<RefundBooking | null>();
  return {
    handled: true,
    finalized: Boolean(updated),
    replayed: !updated,
    state: 'succeeded',
    bookingId: String(booking._id),
  };
}

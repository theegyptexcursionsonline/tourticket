import mongoose from 'mongoose';
import type Stripe from 'stripe';
import Booking from '../lib/models/Booking';
import {
  BookingRefundError,
  reconcileStripeBookingRefund,
  requestBookingRefund,
} from '../lib/bookings/refunds';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class FakeStripe {
  statuses: string[] = [];
  throwNext = false;
  intentStatus = 'succeeded';
  calls: string[] = [];
  creations = 0;
  refundsByKey = new Map<string, Record<string, unknown>>();

  paymentIntents: Stripe.PaymentIntentsResource;
  refunds: Stripe.RefundsResource;

  constructor() {
    this.paymentIntents = {
      retrieve: (async (paymentIntentId: string) => ({
        id: paymentIntentId,
        status: this.intentStatus,
        currency: 'usd',
        amount: 10_000,
        amount_received: 10_000,
        latest_charge: `ch_${paymentIntentId}`,
      })) as Stripe.PaymentIntentsResource['retrieve'],
    } as Stripe.PaymentIntentsResource;
    this.refunds = {
      create: (async (
        params: Stripe.RefundCreateParams,
        options?: Stripe.RequestOptions,
      ) => {
      const key = String(options?.idempotencyKey || '');
      this.calls.push(key);
      const replay = this.refundsByKey.get(key);
      if (replay) return replay as unknown as Stripe.Refund;
      if (this.throwNext) {
        this.throwNext = false;
        throw new Error('simulated provider timeout');
      }
      const providerStatus = this.statuses.shift() || 'succeeded';
      const metadata = params.metadata && typeof params.metadata === 'object' ? params.metadata : {};
      const refund = {
        id: `re_local_${++this.creations}`,
        object: 'refund',
        amount: params.amount,
        charge: params.charge,
        currency: 'usd',
        metadata,
        payment_intent: metadata.payment_intent_id,
        status: providerStatus,
      };
      this.refundsByKey.set(key, refund);
        return refund as unknown as Stripe.Refund;
      }) as Stripe.RefundsResource['create'],
    } as Stripe.RefundsResource;
  }

  provider = () => this as unknown as Stripe;
}

async function makeBooking(input: {
  suffix: string;
  paymentMethod?: string;
  paymentId?: string;
}) {
  const date = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  return Booking.create({
    tenantId: 'default',
    bookingReference: `EEO-REFUND-${input.suffix}`,
    tour: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    date: new Date(`${date}T00:00:00.000Z`),
    dateString: date,
    time: '10:00',
    guests: 1,
    adultGuests: 1,
    totalPrice: 100,
    currency: 'USD',
    status: 'Confirmed',
    paymentId: input.paymentId || `pi_refund_${input.suffix}`,
    paymentItemIndex: 0,
    paymentMethod: input.paymentMethod || 'card',
  });
}

async function run() {
  const uri = process.env.MONGODB_URI || '';
  const parsed = new URL(uri);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || !parsed.pathname.endsWith('booking_refund_test')) {
    throw new Error('Refund verification requires a local booking_refund_test database.');
  }
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Booking.syncIndexes();

  const concurrentBooking = await makeBooking({ suffix: 'CONCURRENT' });
  const concurrentStripe = new FakeStripe();
  const request = {
    bookingId: String(concurrentBooking._id),
    ownerId: String(concurrentBooking.user),
    kind: 'customer_cancel' as const,
    actor: `customer:${String(concurrentBooking.user)}`,
    reason: 'Plans changed',
  };
  const concurrent = await Promise.all([
    requestBookingRefund(request, concurrentStripe.provider),
    requestBookingRefund(request, concurrentStripe.provider),
  ]);
  const concurrentStored = await Booking.findById(concurrentBooking._id).lean();
  assert(concurrent.every((result) => result.state === 'succeeded'), 'Concurrent cancellation did not converge on succeeded state.');
  assert(concurrentStripe.creations === 1, 'Concurrent requests created more than one provider refund.');
  assert(concurrentStored?.status === 'Cancelled' && concurrentStored.refundAmount === 100, 'Concurrent refund did not atomically finalize cancellation.');

  const retryBooking = await makeBooking({ suffix: 'RETRY' });
  const retryStripe = new FakeStripe();
  retryStripe.throwNext = true;
  try {
    await requestBookingRefund({
      bookingId: String(retryBooking._id), kind: 'admin_full', actor: 'admin:test', reason: 'Operator refund',
    }, retryStripe.provider);
    throw new Error('Expected simulated provider timeout');
  } catch (error) {
    assert(error instanceof BookingRefundError && error.code === 'REFUND_PROVIDER_UNAVAILABLE', 'Provider timeout was not represented as retry-safe uncertainty.');
  }
  const pendingAfterTimeout = await Booking.findById(retryBooking._id).lean();
  assert(pendingAfterTimeout?.refundState === 'pending' && pendingAfterTimeout.status === 'Confirmed', 'Uncertain provider request falsely changed booking status.');
  const retryResult = await requestBookingRefund({
    bookingId: String(retryBooking._id), kind: 'admin_full', actor: 'admin:test', reason: 'Operator refund',
  }, retryStripe.provider);
  assert(retryResult.state === 'succeeded' && retryStripe.calls[0] === retryStripe.calls[1], 'Retry did not reuse the persisted provider idempotency key.');

  const failedBooking = await makeBooking({ suffix: 'FAILED' });
  const failedStripe = new FakeStripe();
  failedStripe.statuses.push('failed', 'succeeded');
  await requestBookingRefund({
    bookingId: String(failedBooking._id), kind: 'admin_full', actor: 'admin:test', reason: 'First attempt',
  }, failedStripe.provider).then(
    () => { throw new Error('Expected definitive failed refund'); },
    (error) => assert(error instanceof BookingRefundError && error.code === 'REFUND_PROVIDER_REJECTED', 'Definitive provider failure was not exposed safely.'),
  );
  // Stripe has definitively failed the first refund, so a new server claim is
  // allowed to use a new idempotency key without double-refund risk.
  await requestBookingRefund({
    bookingId: String(failedBooking._id), kind: 'admin_full', actor: 'admin:test', reason: 'Second attempt',
  }, failedStripe.provider);
  assert(failedStripe.calls.length === 2 && failedStripe.calls[0] !== failedStripe.calls[1], 'Definitive failure retry did not use a fresh provider attempt.');

  const bankBooking = await makeBooking({ suffix: 'BANK', paymentMethod: 'bank', paymentId: 'BANK-LOCAL' });
  let bankProviderCalled = false;
  const bankResult = await requestBookingRefund({
    bookingId: String(bankBooking._id), kind: 'admin_cancel', actor: 'admin:test', reason: 'Offline cancellation',
  }, () => {
    bankProviderCalled = true;
    throw new Error('Provider should not be called');
  });
  assert(bankResult.state === 'manual_required' && bankResult.actualRefundAmount === 0 && !bankProviderCalled, 'Non-Stripe cancellation falsely claimed an online refund.');
  await requestBookingRefund({
    bookingId: String((await makeBooking({ suffix: 'BANKREFUND', paymentMethod: 'cash', paymentId: 'CASH-LOCAL' }))._id),
    kind: 'admin_full', actor: 'admin:test', reason: 'Cash refund',
  }, () => { throw new Error('Provider should not be called'); }).then(
    () => { throw new Error('Expected manual refund requirement'); },
    (error) => assert(error instanceof BookingRefundError && error.code === 'MANUAL_REFUND_REQUIRED', 'Direct non-Stripe refund was not blocked.'),
  );

  const webhookBooking = await makeBooking({ suffix: 'WEBHOOK' });
  const webhookStripe = new FakeStripe();
  webhookStripe.statuses.push('pending');
  const pendingResult = await requestBookingRefund({
    bookingId: String(webhookBooking._id), kind: 'customer_cancel', ownerId: String(webhookBooking.user), actor: 'customer:test', reason: 'Pending rail',
  }, webhookStripe.provider);
  assert(pendingResult.state === 'pending' && pendingResult.status === 'Confirmed', 'Pending provider refund falsely finalized the booking.');
  const webhookDeparture = new Date(`${webhookBooking.dateString}T08:00:00.000Z`);
  const lateRetry = await requestBookingRefund({
    bookingId: String(webhookBooking._id),
    kind: 'customer_cancel',
    ownerId: String(webhookBooking.user),
    actor: 'customer:test',
    reason: 'Pending rail',
    now: new Date(webhookDeparture.getTime() - 3_600_000),
  }, webhookStripe.provider);
  assert(lateRetry.state === 'pending' && lateRetry.requestedAmount === pendingResult.requestedAmount, 'Pending retry recomputed policy across a time boundary.');
  const pendingRefund = Array.from(webhookStripe.refundsByKey.values())[0];
  const reconciled = await reconcileStripeBookingRefund({ ...pendingRefund, status: 'succeeded' } as unknown as Stripe.Refund);
  const webhookStored = await Booking.findById(webhookBooking._id).lean();
  assert(reconciled.finalized === true && webhookStored?.status === 'Cancelled' && webhookStored.refundState === 'succeeded', 'Webhook did not finalize exact pending refund evidence.');

  const invalidBindingBooking = await makeBooking({ suffix: 'BINDING' });
  const invalidBindingStripe = new FakeStripe();
  invalidBindingStripe.intentStatus = 'requires_payment_method';
  await requestBookingRefund({
    bookingId: String(invalidBindingBooking._id), kind: 'admin_full', actor: 'admin:test', reason: 'Invalid binding',
  }, invalidBindingStripe.provider).then(
    () => { throw new Error('Expected payment binding rejection'); },
    (error) => assert(error instanceof BookingRefundError && error.code === 'PAYMENT_BINDING_INVALID', 'Invalid payment binding was not rejected.'),
  );
  const invalidStored = await Booking.findById(invalidBindingBooking._id).lean();
  assert(invalidStored?.status === 'Confirmed' && invalidStored.refundState === 'failed', 'Invalid payment binding falsely changed the booking status.');

  console.log(JSON.stringify({
    isolatedDatabase: parsed.pathname.slice(1),
    concurrentProviderCreations: concurrentStripe.creations,
    uncertainRetrySameKey: retryStripe.calls[0] === retryStripe.calls[1],
    definitiveRetryFreshKey: failedStripe.calls[0] !== failedStripe.calls[1],
    nonStripeState: bankResult.state,
    webhookFinalized: reconciled.finalized,
    pendingBoundarySnapshotPreserved: lateRetry.requestedAmount === pendingResult.requestedAmount,
    invalidBindingStatus: invalidStored?.status,
  }));
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});

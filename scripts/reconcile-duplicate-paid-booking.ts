/**
 * Safely reconcile one proven cross-writer duplicate without deleting evidence.
 *
 * Default is read-only. Remote mutation requires all three explicit guards:
 *   CONFIRM_DUPLICATE_BOOKING_RECONCILIATION=YES
 *   ALLOW_REMOTE_DUPLICATE_BOOKING_RECONCILIATION=YES
 *   --apply
 *
 * Exact IDs are mandatory; this script never guesses which booking is primary.
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import Stripe from 'stripe';
import { isLocalMongoUri } from '../lib/bookings/duplicateBookingReconciliation';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
  if (!value) throw new Error(`Missing required ${prefix}<value>`);
  return value;
}

function stableDate(value: unknown): string {
  return new Date(String(value)).toISOString();
}

function sameValue(left: unknown, right: unknown): boolean {
  return String(left ?? '') === String(right ?? '');
}

const uri = process.env.MONGODB_URI || '';
const reconciliationStripeKey = process.env.RECONCILIATION_STRIPE_SECRET_KEY || '';
const apply = process.argv.includes('--apply');
const paymentId = argument('payment-id');
const tenantId = argument('tenant');
const primaryId = argument('primary-booking-id');
const duplicateId = argument('duplicate-booking-id');
const paymentMode = argument('payment-mode');

if (!uri) throw new Error('MONGODB_URI is not defined');
if (!reconciliationStripeKey) throw new Error('RECONCILIATION_STRIPE_SECRET_KEY is required for provider verification.');
if (!mongoose.isValidObjectId(primaryId) || !mongoose.isValidObjectId(duplicateId) || primaryId === duplicateId) {
  throw new Error('Primary and duplicate booking IDs must be different valid ObjectIds.');
}
if (!['test', 'live'].includes(paymentMode)) throw new Error('payment-mode must be test or live.');
if (apply && process.env.CONFIRM_DUPLICATE_BOOKING_RECONCILIATION !== 'YES') {
  throw new Error('Refusing mutation without CONFIRM_DUPLICATE_BOOKING_RECONCILIATION=YES.');
}
if (apply && !isLocalMongoUri(uri)
  && process.env.ALLOW_REMOTE_DUPLICATE_BOOKING_RECONCILIATION !== 'YES') {
  throw new Error('Remote mutation also requires ALLOW_REMOTE_DUPLICATE_BOOKING_RECONCILIATION=YES.');
}

async function main(): Promise<void> {
  await mongoose.connect(uri);
  const bookings = mongoose.connection.db!.collection('bookings');
  const stripe = new Stripe(reconciliationStripeKey);
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
  if (paymentIntent.status !== 'succeeded') throw new Error('Provider payment is not succeeded.');
  if ((paymentIntent.livemode ? 'live' : 'test') !== paymentMode) {
    throw new Error('Requested payment mode does not match provider evidence.');
  }
  const paymentBookingCount = await bookings.countDocuments({ tenantId, paymentId });
  if (paymentBookingCount !== 2) {
    throw new Error(`Expected exactly two booking records for this payment; found ${paymentBookingCount}.`);
  }
  const [primary, duplicate] = await Promise.all([
    bookings.findOne({ _id: new mongoose.Types.ObjectId(primaryId), tenantId, paymentId }),
    bookings.findOne({ _id: new mongoose.Types.ObjectId(duplicateId), tenantId, paymentId }),
  ]);
  if (!primary || !duplicate) throw new Error('The exact scoped booking pair was not found.');
  if (primary.paymentReconciliationState || duplicate.paymentReconciliationState) {
    throw new Error('One of the bookings has already been reconciled.');
  }

  const invariants: Array<[string, unknown, unknown]> = [
    ['tenantId', primary.tenantId, duplicate.tenantId],
    ['paymentId', primary.paymentId, duplicate.paymentId],
    ['tour', primary.tour, duplicate.tour],
    ['user', primary.user, duplicate.user],
    ['date', stableDate(primary.date), stableDate(duplicate.date)],
    ['dateString', primary.dateString, duplicate.dateString],
    ['time', primary.time, duplicate.time],
    ['guests', primary.guests, duplicate.guests],
    ['totalPrice', primary.totalPrice, duplicate.totalPrice],
    ['currency', primary.currency || 'USD', duplicate.currency || 'USD'],
  ];
  const mismatch = invariants.find(([, left, right]) => !sameValue(left, right));
  if (mismatch) throw new Error(`Bookings differ on ${mismatch[0]}; refusing reconciliation.`);
  const creationGapMs = Math.abs(new Date(primary.createdAt).getTime() - new Date(duplicate.createdAt).getTime());
  if (creationGapMs > 10_000) throw new Error('Bookings were created more than 10 seconds apart; refusing reconciliation.');
  if (!['Confirmed', 'confirmed'].includes(String(primary.status))
    || !['Confirmed', 'confirmed'].includes(String(duplicate.status))) {
    throw new Error('Both records must still be confirmed before reconciliation.');
  }
  const expectedAmount = Math.round(Number(primary.totalPrice) * 100);
  if (paymentIntent.amount_received !== expectedAmount || paymentIntent.currency.toUpperCase() !== String(primary.currency || 'USD').toUpperCase()) {
    throw new Error('Provider amount or currency does not match the single primary booking.');
  }

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    tenantId,
    paymentId,
    paymentMode,
    primary: { id: String(primary._id), reference: primary.bookingReference },
    duplicate: { id: String(duplicate._id), reference: duplicate.bookingReference },
    creationGapMs,
    providerEvidence: {
      status: paymentIntent.status,
      mode: paymentIntent.livemode ? 'live' : 'test',
      amountReceived: paymentIntent.amount_received,
      currency: paymentIntent.currency.toUpperCase(),
    },
    invariantChecks: invariants.map(([name]) => name),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) return;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const duplicateResult = await bookings.updateOne(
        {
          _id: duplicate._id,
          tenantId,
          paymentId,
          paymentReconciliationState: { $exists: false },
        },
        {
          $set: {
            status: 'Cancelled',
            paymentStatus: 'pending',
            amountPaid: 0,
            paymentReconciliationState: 'duplicate_suppressed',
            duplicateOf: primary._id,
            duplicateReconciliation: {
              reconciledAt: now,
              reconciledBy: 'duplicate-paid-booking-reconciler',
              reason: 'Cross-writer duplicate: one provider payment produced two booking documents.',
              originalStatus: duplicate.status,
              originalPaymentStatus: duplicate.paymentStatus,
              originalAmountPaid: duplicate.amountPaid,
              originalPaymentItemIndex: duplicate.paymentItemIndex,
              originalCheckoutItemKey: duplicate.checkoutItemKey,
            },
          },
          $unset: { paymentItemIndex: '', checkoutItemKey: '' },
        },
        { session },
      );
      if (duplicateResult.modifiedCount !== 1) throw new Error('Duplicate changed concurrently; transaction aborted.');

      const primaryResult = await bookings.updateOne(
        {
          _id: primary._id,
          tenantId,
          paymentId,
          paymentReconciliationState: { $exists: false },
        },
        {
          $set: {
            paymentItemIndex: 0,
            checkoutItemKey: `${tenantId}:${paymentId}:0`,
            paymentReconciliationState: 'verified_primary',
            paymentDetails: {
              provider: 'stripe',
              mode: paymentMode,
              source: 'eeo-mobile',
              transactionId: paymentId,
            },
          },
        },
        { session },
      );
      if (primaryResult.modifiedCount !== 1) throw new Error('Primary changed concurrently; transaction aborted.');
    });
  } finally {
    await session.endSession();
  }
  console.log(JSON.stringify({ applied: true, primaryId, duplicateId }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());

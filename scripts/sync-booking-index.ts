/**
 * Verify or migrate booking payment idempotency for multi-item checkouts.
 *
 * Read-only verification (default):
 *   pnpm tsx scripts/sync-booking-index.ts
 *
 * Apply only during an approved maintenance window after a backup:
 *   CONFIRM_BOOKING_PAYMENT_INDEX_MIGRATION=YES \
 *     pnpm tsx scripts/sync-booking-index.ts --apply
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const uri = process.env.MONGODB_URI;
const apply = process.argv.includes('--apply');

if (!uri) throw new Error('MONGODB_URI is not defined');
if (apply && process.env.CONFIRM_BOOKING_PAYMENT_INDEX_MIGRATION !== 'YES') {
  throw new Error('Refusing to mutate indexes without CONFIRM_BOOKING_PAYMENT_INDEX_MIGRATION=YES');
}
const databaseHost = new URL(uri).hostname;
if (
  apply
  && !['127.0.0.1', 'localhost'].includes(databaseHost)
  && process.env.ALLOW_REMOTE_BOOKING_INDEX_MIGRATION !== 'YES'
) {
  throw new Error('Remote index mutation also requires ALLOW_REMOTE_BOOKING_INDEX_MIGRATION=YES');
}

async function main() {
  await mongoose.connect(uri as string);
  const db = mongoose.connection.db!;
  const collectionExists = Boolean(await db.listCollections({ name: 'bookings' }).next());
  if (!collectionExists && apply) await db.createCollection('bookings');
  const collection = db.collection('bookings');
  const indexes = collectionExists || apply ? await collection.indexes() : [];
  const quoteCollectionExists = Boolean(await db.listCollections({ name: 'checkoutpaymentquotes' }).next());
  if (!quoteCollectionExists && apply) await db.createCollection('checkoutpaymentquotes');
  const quoteCollection = db.collection('checkoutpaymentquotes');
  const quoteIndexes = quoteCollectionExists || apply ? await quoteCollection.indexes() : [];
  const holdCollectionExists = Boolean(await db.listCollections({ name: 'checkoutinventoryholds' }).next());
  if (!holdCollectionExists && apply) await db.createCollection('checkoutinventoryholds');
  const holdCollection = db.collection('checkoutinventoryholds');
  const holdIndexes = holdCollectionExists || apply ? await holdCollection.indexes() : [];
  const leaseCollectionExists = Boolean(await db.listCollections({ name: 'checkoutinventoryleases' }).next());
  if (!leaseCollectionExists && apply) await db.createCollection('checkoutinventoryleases');
  const leaseCollection = db.collection('checkoutinventoryleases');
  const leaseIndexes = leaseCollectionExists || apply ? await leaseCollection.indexes() : [];
  const tourCollectionExists = Boolean(await db.listCollections({ name: 'tours' }).next());
  if (!tourCollectionExists && apply) await db.createCollection('tours');
  const tourCollection = db.collection('tours');
  const tourIndexes = tourCollectionExists || apply ? await tourCollection.indexes() : [];
  const legacyPaymentIndexes = indexes.filter((index) => (
    index.unique === true
    && Object.keys(index.key).length === 1
    && index.key.paymentId === 1
  ));
  const targetIndex = indexes.find((index) => index.name === 'tenant_payment_item_unique');
  const refundReconciliationIndex = indexes.find((index) => index.name === 'tenant_refund_reconciliation');
  const refundNotificationIndex = indexes.find((index) => index.name === 'tenant_refund_notification_monitoring');
  const inventoryReservationIndex = indexes.find((index) => index.name === 'tenant_inventory_reservation_monitoring');
  const quotePaymentIndex = quoteIndexes.find((index) => (
    index.unique === true
    && Object.keys(index.key).length === 1
    && index.key.paymentIntentId === 1
  ));
  const quoteExpiryIndex = quoteIndexes.find((index) => (
    Object.keys(index.key).length === 1
    && index.key.expiresAt === 1
    && Number(index.expireAfterSeconds) === 0
  ));
  const holdReservationIndex = holdIndexes.find((index) => index.name === 'tenant_reservation_item_unique' && index.unique === true);
  const holdPaymentIndex = holdIndexes.find((index) => index.name === 'tenant_payment_hold_item_unique' && index.unique === true);
  const holdScopeIndex = holdIndexes.find((index) => index.name === 'inventory_hold_scope_active');
  const holdCleanupIndex = holdIndexes.find((index) => index.name === 'inventory_hold_cleanup' && Number(index.expireAfterSeconds) === 0);
  const leaseScopeIndex = leaseIndexes.find((index) => index.name === 'inventory_scope_unique' && index.unique === true);
  const leaseCleanupIndex = leaseIndexes.find((index) => index.name === 'inventory_lease_cleanup' && Number(index.expireAfterSeconds) === 0);
  const pricingProjectionRetryIndex = tourIndexes.find((index) => index.name === 'pricing_search_projection_retry');
  const missingTenant = await collection.countDocuments({
    $or: [
      { tenantId: { $exists: false } },
      { tenantId: null },
      { tenantId: '' },
    ],
  });
  const missingItemIndex = await collection.countDocuments({
    paymentId: { $type: 'string' },
    paymentItemIndex: { $not: { $type: 'number' } },
  });
  const missingPricingProjection = tourCollectionExists || apply
    ? await tourCollection.countDocuments({
      pricingSummary: { $exists: true },
      $or: [
        { 'pricingSearchProjection.status': { $exists: false } },
        { 'pricingSearchProjection.authoritativeVersion': { $exists: false } },
        { 'pricingSearchProjection.projectionToken': { $exists: false } },
      ],
    })
    : 0;

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'verify',
    missingTenant,
    missingItemIndex,
    targetIndexPresent: Boolean(targetIndex),
    refundReconciliationIndexPresent: Boolean(refundReconciliationIndex),
    refundNotificationIndexPresent: Boolean(refundNotificationIndex),
    inventoryReservationIndexPresent: Boolean(inventoryReservationIndex),
    quotePaymentIndexPresent: Boolean(quotePaymentIndex),
    quoteExpiryIndexPresent: Boolean(quoteExpiryIndex),
    inventoryHoldIndexesPresent: Boolean(holdReservationIndex && holdPaymentIndex && holdScopeIndex && holdCleanupIndex),
    inventoryLeaseIndexesPresent: Boolean(leaseScopeIndex && leaseCleanupIndex),
    pricingProjectionRetryIndexPresent: Boolean(pricingProjectionRetryIndex),
    missingPricingProjection,
    legacyUniquePaymentIndexes: legacyPaymentIndexes.map((index) => index.name),
  }, null, 2));

  if (!apply) {
    if (
      missingTenant
      || missingItemIndex
      || !targetIndex
      || !refundReconciliationIndex
      || !refundNotificationIndex
      || !inventoryReservationIndex
      || legacyPaymentIndexes.length
      || !quotePaymentIndex
      || !quoteExpiryIndex
      || !holdReservationIndex
      || !holdPaymentIndex
      || !holdScopeIndex
      || !holdCleanupIndex
      || !leaseScopeIndex
      || !leaseCleanupIndex
      || !pricingProjectionRetryIndex
      || missingPricingProjection
    ) {
      process.exitCode = 2;
    }
    return;
  }

  await collection.updateMany(
    {
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' },
      ],
    },
    { $set: { tenantId: 'default' } },
  );
  await tourCollection.updateMany(
    {
      pricingSummary: { $exists: true },
      $or: [
        { 'pricingSearchProjection.status': { $exists: false } },
        { 'pricingSearchProjection.authoritativeVersion': { $exists: false } },
        { 'pricingSearchProjection.projectionToken': { $exists: false } },
      ],
    },
    [{
      $set: {
        pricingSearchProjection: {
          status: 'pending',
          summaryVersion: { $ifNull: ['$pricingSummary.version', 0] },
          authoritativeVersion: { $ifNull: ['$pricingSummary.version', 0] },
          projectionToken: {
            $concat: [
              { $toString: '$_id' },
              ':pricing:',
              { $toString: { $ifNull: ['$pricingSummary.version', 0] } },
            ],
          },
          attempts: 0,
          nextAttemptAt: '$$NOW',
        },
      },
    }],
  );
  await collection.updateMany(
    {
      paymentId: { $type: 'string' },
      paymentItemIndex: { $not: { $type: 'number' } },
    },
    { $set: { paymentItemIndex: 0 } },
  );

  // Create the replacement before removing the old unique index. This keeps
  // idempotency protected throughout the migration.
  if (!targetIndex) {
    await collection.createIndex(
      { tenantId: 1, paymentId: 1, paymentItemIndex: 1 },
      {
        unique: true,
        name: 'tenant_payment_item_unique',
        partialFilterExpression: {
          paymentId: { $type: 'string' },
          paymentItemIndex: { $type: 'number' },
        },
      },
    );
  }
  if (!refundReconciliationIndex) {
    await collection.createIndex(
      { tenantId: 1, refundState: 1, updatedAt: 1 },
      { name: 'tenant_refund_reconciliation' },
    );
  }
  if (!refundNotificationIndex) {
    await collection.createIndex(
      { tenantId: 1, refundNotificationState: 1, refundNotificationClaimedAt: 1 },
      { name: 'tenant_refund_notification_monitoring' },
    );
  }
  if (!inventoryReservationIndex) {
    await collection.createIndex(
      { tenantId: 1, inventoryReservationState: 1, updatedAt: 1 },
      { name: 'tenant_inventory_reservation_monitoring' },
    );
  }

  for (const index of legacyPaymentIndexes) {
    if (index.name) await collection.dropIndex(index.name);
  }

  if (!quotePaymentIndex) {
    await quoteCollection.createIndex(
      { paymentIntentId: 1 },
      { unique: true, name: 'payment_intent_unique' },
    );
  }
  if (!quoteExpiryIndex) {
    await quoteCollection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'checkout_quote_expiry' },
    );
  }

  if (!holdReservationIndex) {
    await holdCollection.createIndex(
      { tenantId: 1, reservationKey: 1, itemIndex: 1 },
      { unique: true, name: 'tenant_reservation_item_unique' },
    );
  }
  if (!holdScopeIndex) {
    await holdCollection.createIndex(
      { tenantId: 1, tourId: 1, date: 1, time: 1, state: 1, expiresAt: 1 },
      { name: 'inventory_hold_scope_active' },
    );
  }
  if (!holdPaymentIndex) {
    await holdCollection.createIndex(
      { tenantId: 1, paymentIntentId: 1, itemIndex: 1 },
      {
        unique: true,
        name: 'tenant_payment_hold_item_unique',
        partialFilterExpression: { paymentIntentId: { $type: 'string' } },
      },
    );
  }
  if (!holdCleanupIndex) {
    await holdCollection.createIndex(
      { cleanupAt: 1 },
      { expireAfterSeconds: 0, name: 'inventory_hold_cleanup' },
    );
  }
  if (!leaseScopeIndex) {
    await leaseCollection.createIndex(
      { scopeKey: 1 },
      { unique: true, name: 'inventory_scope_unique' },
    );
  }
  if (!leaseCleanupIndex) {
    await leaseCollection.createIndex(
      { cleanupAt: 1 },
      { expireAfterSeconds: 0, name: 'inventory_lease_cleanup' },
    );
  }
  if (!pricingProjectionRetryIndex) {
    await tourCollection.createIndex(
      { 'pricingSearchProjection.status': 1, 'pricingSearchProjection.nextAttemptAt': 1 },
      { name: 'pricing_search_projection_retry' },
    );
  }

  console.log('Booking, checkout inventory, and pricing projection index migration completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

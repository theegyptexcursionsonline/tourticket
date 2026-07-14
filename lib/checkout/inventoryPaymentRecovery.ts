import * as Sentry from '@sentry/nextjs';
import type Stripe from 'stripe';
import Booking from '@/lib/models/Booking';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import { releaseInventoryHolds } from '@/lib/checkout/inventoryHolds';

export async function markPaymentInventoryConverted(paymentIntentId: string) {
  await CheckoutPaymentQuote.updateOne(
    {
      tenantId: 'default',
      paymentIntentId,
      inventoryState: { $nin: ['refunding', 'refunded', 'refund_failed'] },
    },
    { $set: { inventoryState: 'converted', inventoryUpdatedAt: new Date() } },
  );
}

export async function releasePaymentInventory(paymentIntentId: string, reason: string) {
  await releaseInventoryHolds({ paymentIntentId, reason });
  await CheckoutPaymentQuote.updateOne(
    {
      tenantId: 'default',
      paymentIntentId,
      inventoryState: { $nin: ['converted', 'refunding', 'refunded', 'refund_failed'] },
    },
    {
      $set: {
        inventoryState: 'released',
        inventoryFailureReason: reason.slice(0, 300),
        inventoryUpdatedAt: new Date(),
      },
    },
  );
}

/**
 * A succeeded charge that cannot be fulfilled must never remain as revenue.
 * Stripe idempotency makes this safe when the browser and webhook race.
 */
export async function refundUnavailablePaidInventory(input: {
  stripe: Stripe;
  paymentIntentId: string;
  reason: string;
}) {
  const existing = await CheckoutPaymentQuote.findOne({
    tenantId: 'default',
    paymentIntentId: input.paymentIntentId,
  }).select('inventoryState inventoryRefundId').lean<{
    inventoryState?: string;
    inventoryRefundId?: string;
  } | null>();
  if (existing?.inventoryState === 'refunded' && existing.inventoryRefundId) {
    return { id: existing.inventoryRefundId, replayed: true };
  }

  await CheckoutPaymentQuote.updateOne(
    { tenantId: 'default', paymentIntentId: input.paymentIntentId },
    {
      $set: {
        inventoryState: 'refunding',
        inventoryFailureReason: input.reason.slice(0, 300),
        inventoryUpdatedAt: new Date(),
      },
    },
  );

  // If a previous process crashed after creating only part of a multi-item
  // booking, release that capacity before refunding the whole charge.
  await Booking.updateMany(
    {
      tenantId: 'default',
      paymentId: input.paymentIntentId,
      status: { $in: ['Pending', 'Confirmed'] },
    },
    {
      $set: {
        status: 'Cancelled',
        refundReason: 'Automatic refund: paid inventory could not be fulfilled',
      },
      $push: {
        editHistory: {
          editedAt: new Date(),
          editedBy: 'inventory-guard',
          editedByName: 'Checkout inventory guard',
          field: 'status',
          previousValue: 'Pending or Confirmed',
          newValue: 'Cancelled',
          changeType: 'refund',
        },
      },
    },
  );

  try {
    const refund = await input.stripe.refunds.create(
      {
        payment_intent: input.paymentIntentId,
        reason: 'requested_by_customer',
        metadata: { reason_code: 'inventory_unavailable' },
      },
      { idempotencyKey: `inventory-unavailable-${input.paymentIntentId}` },
    );
    await releaseInventoryHolds({ paymentIntentId: input.paymentIntentId, reason: 'paid_inventory_refunded' });
    await CheckoutPaymentQuote.updateOne(
      { tenantId: 'default', paymentIntentId: input.paymentIntentId },
      {
        $set: {
          inventoryState: 'refunded',
          inventoryRefundId: refund.id,
          inventoryUpdatedAt: new Date(),
        },
      },
    );
    return { id: refund.id, replayed: false };
  } catch (error) {
    await CheckoutPaymentQuote.updateOne(
      { tenantId: 'default', paymentIntentId: input.paymentIntentId },
      { $set: { inventoryState: 'refund_failed', inventoryUpdatedAt: new Date() } },
    ).catch(() => undefined);
    Sentry.captureException(error, {
      level: 'fatal',
      tags: { subsystem: 'checkout-inventory', paymentIntentId: input.paymentIntentId },
    });
    throw error;
  }
}

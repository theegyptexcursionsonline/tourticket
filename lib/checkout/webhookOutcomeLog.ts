import type Stripe from 'stripe';
import WebhookProcessingLog from '@/lib/models/WebhookProcessingLog';
import { paidTenantId } from '@/lib/tenant/paidTenant';

/**
 * Persist what the Stripe webhook decided about one event.
 *
 * Deliberately never throws. This is observability: if writing the record
 * fails, the payment must still be fulfilled and Stripe must still get its
 * 2xx. Losing a log line is an inconvenience; failing a paid booking because
 * the log was unavailable would be the same class of harm this exists to catch.
 */
export async function recordWebhookOutcome(input: {
  event: Stripe.Event;
  paymentIntent: Stripe.PaymentIntent;
  outcome: string;
  created: boolean;
  bookingReference?: string;
  durationMs?: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { event, paymentIntent } = input;
    await WebhookProcessingLog.updateOne(
      { eventId: event.id },
      {
        $set: {
          eventType: event.type,
          paymentId: paymentIntent.id,
          tenantId: paidTenantId(paymentIntent.metadata),
          outcome: input.outcome,
          created: input.created,
          bookingReference: input.bookingReference,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customerEmail: paymentIntent.metadata?.customer_email,
          durationMs: input.durationMs,
          errorMessage: input.errorMessage,
        },
      },
      { upsert: true },
    );

    // A paid event that produced no booking is the shape of every incident this
    // path has had. Make it findable in the logs too, not only in the database.
    if (!input.created) {
      console.error('[Webhook] PAID BUT NOT BOOKED', {
        paymentId: paymentIntent.id,
        outcome: input.outcome,
        tenant: paidTenantId(paymentIntent.metadata),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      });
    }
  } catch (logError) {
    console.error('[Webhook] Could not record processing outcome', logError);
  }
}

// lib/checkout/paymentFailedNotification.ts
import type Stripe from 'stripe';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import { EmailService } from '@/lib/email/emailService';
import { isValidEmailAddress } from '@/lib/mailgun';
import { paidTenantId, paidTenantValue } from '@/lib/tenant/paidTenant';

export type PaymentFailedNotificationOutcome =
  | 'sent'
  | 'already_handled'
  | 'no_recipient'
  | 'failed';

/**
 * Turn a provider failure code into something a customer can act on.
 *
 * Stripe's own strings ("payment_intent requires action", "card_declined") tell
 * the reader nothing they can do. Anything unrecognised falls back to a neutral
 * sentence rather than a raw code, and never blames the customer.
 */
export function describePaymentFailure(intent: Stripe.PaymentIntent): string {
  const error = intent.last_payment_error;
  const code = String(error?.decline_code || error?.code || '').toLowerCase();

  switch (code) {
    case 'insufficient_funds':
      return 'Your bank reported insufficient funds on this card.';
    case 'expired_card':
      return 'The card has expired.';
    case 'incorrect_cvc':
    case 'invalid_cvc':
      return 'The security code did not match the card.';
    case 'incorrect_number':
    case 'invalid_number':
      return 'The card number was not accepted.';
    case 'authentication_required':
      return 'Your bank asked you to confirm the payment and the confirmation did not come through in time.';
    case 'do_not_honor':
    case 'generic_decline':
    case 'card_declined':
      return 'Your bank declined the payment without telling us why. They can usually approve it if you call them or retry.';
    case 'processing_error':
      return 'The payment could not be processed just now. Trying again usually works.';
    default:
      return 'The payment did not complete. Your bank did not give us a reason we can pass on.';
  }
}

/**
 * Tell the customer their payment did not go through — exactly once.
 *
 * Stripe emits `payment_intent.payment_failed` again for every retry on the
 * same intent, so the quote row is claimed with a guarded write before anything
 * is sent. `modifiedCount !== 1` means another delivery owns the claim; a
 * version filter that matches nothing returns a successful-looking result, so
 * the count is checked rather than the absence of an error.
 */
export async function notifyPaymentFailed(
  intent: Stripe.PaymentIntent,
): Promise<PaymentFailedNotificationOutcome> {
  const tenantValue = paidTenantValue(paidTenantId(intent.metadata));
  const quote = await CheckoutPaymentQuote.findOne({
    paymentIntentId: intent.id,
    tenantId: tenantValue,
  }).lean();

  const email = quote?.customer?.email || intent.metadata?.customer_email;
  if (!isValidEmailAddress(email)) return 'no_recipient';

  const claim = await CheckoutPaymentQuote.updateOne(
    {
      paymentIntentId: intent.id,
      tenantId: tenantValue,
      paymentFailedNotifiedAt: { $exists: false },
    },
    { $set: { paymentFailedNotifiedAt: new Date() } },
  );
  // No quote row at all (a legacy or externally created intent) also lands
  // here. Without a durable claim we cannot promise "once", so we stay silent
  // rather than risk mailing the same customer on every Stripe retry.
  if (claim.modifiedCount !== 1) return 'already_handled';

  const name = quote?.customer?.firstName
    ? `${quote.customer.firstName} ${quote.customer.lastName || ''}`.trim()
    : (intent.metadata?.customer_name || 'there');
  const currency = (intent.currency || 'usd').toUpperCase();
  const amount = `${(Number(intent.amount) || 0) / 100} ${currency}`;

  try {
    await EmailService.sendPaymentFailed({
      customerName: name,
      customerEmail: email,
      tourTitle: intent.metadata?.tours || 'your booking',
      amount,
      reason: describePaymentFailure(intent),
      attemptedAt: new Date(Number(intent.created) * 1000).toISOString().slice(0, 10),
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
    });
    return 'sent';
  } catch (error) {
    // The claim deliberately stays in place. A transport timeout can follow
    // provider acceptance, so retrying could put two "payment failed" emails in
    // an inbox that is already having a bad day.
    await CheckoutPaymentQuote.updateOne(
      { paymentIntentId: intent.id, tenantId: tenantValue },
      { $set: { inventoryFailureReason: 'payment_failed_notice_undelivered' } },
    ).catch(() => undefined);
    console.error(
      `Payment-failed notice not delivered intent=${intent.id} reason=${error instanceof Error ? error.name : 'unknown_error'}`,
    );
    return 'failed';
  }
}

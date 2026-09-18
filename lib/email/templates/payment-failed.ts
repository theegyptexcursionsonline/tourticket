import type { EmailSpec } from '../layout';
import type { PaymentFailedEmailData } from '../type';
import { brandOf, money, rows, sections, siteUrl, type WithBrand } from './shared';

export function paymentFailed(data: WithBrand<PaymentFailedEmailData>): EmailSpec {
  return {
    preheader: 'Nothing was charged and your place is not held. You can try again now.',
    brand: brandOf(data),
    statusLabel: 'Action required',
    statusTone: 'warning',
    headline: 'We could not take your payment',
    summary: `Hi ${data.customerName}, your card was not charged, so this booking is not held. You can try again below — it usually takes a minute.`,
    facts: {
      eyebrow: 'Attempted booking',
      title: data.tourTitle,
      rows: rows(
        money(data.amount) ? { label: 'Amount', value: money(data.amount)!, ltr: true, strong: true } : null,
        data.attemptedAt ? { label: 'Attempted', value: data.attemptedAt, ltr: true } : null,
      ),
    },
    sections: sections(
      {
        kind: 'note',
        tone: 'warning',
        title: 'What your bank told us',
        // Never the raw provider string: a customer reading "payment intent
        // requires action" learns nothing they can act on.
        body: [data.reason],
      },
      {
        kind: 'list',
        title: 'What usually fixes it',
        items: [
          'Check the card number, expiry date and security code.',
          'Confirm the card allows international or online payments.',
          'Try a different card, or approve the payment in your banking app if it asked you to.',
        ],
      },
    ),
    cta: { label: 'Try the payment again', url: data.retryUrl || siteUrl(data, '/checkout') },
    helpText: 'Still not working? Reply to this email and we will hold your place while we sort it out.',
    footerReason: 'You are receiving this because a payment you started with us did not complete.',
  };
}

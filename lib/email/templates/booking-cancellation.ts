import type { EmailSpec } from '../layout';
import type { CancellationData } from '../type';
import { brandOf, money, rows, sections, siteUrl, type WithBrand } from './shared';

export function bookingCancellation(data: WithBrand<CancellationData>): EmailSpec {
  const refunded = Boolean(money(data.refundAmount));
  return {
    preheader: refunded
      ? `${data.refundAmount} is on its way back to your original payment method.`
      : `${data.tourTitle} on ${data.bookingDate} is cancelled. No further action is needed.`,
    brand: brandOf(data),
    statusLabel: 'Cancelled',
    statusTone: 'negative',
    headline: 'Booking cancelled',
    summary: `Hi ${data.customerName}, your cancellation is confirmed. The details are below for your records.`,
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      rows: rows(
        { label: 'Original date', value: data.bookingDate },
        refunded ? { label: 'Refund', value: money(data.refundAmount)!, ltr: true, strong: true } : null,
      ),
    },
    sections: sections(
      data.cancellationReason
        ? { kind: 'note', title: 'Reason provided', body: [data.cancellationReason] }
        : null,
      refunded
        ? {
          kind: 'note',
          title: 'Refund on its way',
          body: [
            `${data.refundAmount} will return to your original payment method${
              data.refundProcessingDays ? ` within ${data.refundProcessingDays} business days` : ''
            }. No action is needed from you.`,
          ],
        }
        // "No refund" and "refund not calculated yet" are different states, so
        // this says only what the record actually proves.
        : { kind: 'note', title: 'Refund', body: ['No refund is due under the cancellation policy for this booking. If you believe that is wrong, reply to this email and we will review it.'] },
      {
        kind: 'note',
        title: 'Need to travel soon?',
        body: ['Reply to this email and we will help you find a new date or tour. Your account keeps all your traveller details.'],
      },
    ),
    cta: { label: 'Explore other tours', url: siteUrl(data, '/') },
    helpText: 'Questions about this cancellation? Reply to this email and a real person will answer.',
    reference: data.bookingId,
    footerReason: 'You are receiving this because a booking on your account was cancelled.',
  };
}

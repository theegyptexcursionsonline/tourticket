import type { EmailSpec } from '../layout';
import type { RefundIssuedEmailData } from '../type';
import { brandOf, money, rows, sections, siteUrl, type WithBrand } from './shared';

export function refundIssued(data: WithBrand<RefundIssuedEmailData>): EmailSpec {
  const partial = data.refundType === 'partial';
  return {
    preheader: `${data.refundAmount} is on its way back to the card you paid with.`,
    brand: brandOf(data),
    statusLabel: 'Refunded',
    statusTone: 'positive',
    headline: partial ? 'A partial refund is on its way' : 'Your refund is on its way',
    summary: `Hi ${data.customerName}, your payment provider has confirmed a refund of ${data.refundAmount} on this booking. No action is needed from you.`,
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      rows: rows(
        { label: 'Original date', value: data.bookingDate },
        money(data.refundAmount) ? { label: 'Refund amount', value: money(data.refundAmount)!, ltr: true, strong: true } : null,
        money(data.originalAmount) ? { label: 'Originally paid', value: money(data.originalAmount)!, ltr: true } : null,
        { label: 'Booking status', value: data.newStatus },
      ),
    },
    sections: sections(
      {
        kind: 'note',
        title: 'When it arrives',
        body: [
          `Your bank decides the final timing, but refunds normally land within ${data.refundProcessingDays ?? 5} business days on the card you originally paid with.`,
          'It will appear as a refund from us, not as a new payment.',
        ],
      },
      data.refundReason ? { kind: 'note', title: 'Reason', body: [data.refundReason] } : null,
    ),
    cta: { label: 'View my booking', url: siteUrl(data, '/user/bookings') },
    helpText: 'If the refund has not arrived after five business days, reply to this email with your reference and we will chase it.',
    reference: data.bookingId,
    footerReason: 'You are receiving this because a refund was confirmed on your booking.',
  };
}

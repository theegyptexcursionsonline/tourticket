import type { EmailSpec } from '../layout';
import type { PaymentEmailData } from '../type';
import { brandOf, money, rows, siteUrl, type WithBrand } from './shared';

export function paymentConfirmation(data: WithBrand<PaymentEmailData>): EmailSpec {
  const bookingsUrl = siteUrl(data, '/user/bookings');
  return {
    preheader: `${data.amount} received for ${data.tourTitle}. Your booking is fully secured.`,
    brand: brandOf(data),
    statusLabel: 'Paid',
    statusTone: 'positive',
    headline: 'Payment received',
    summary: `Hi ${data.customerName}, your payment went through and your booking is fully secured. Here is the transaction summary for your records.`,
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      // No amount means no amount row: a receipt never prints "Amount paid:"
      // with nothing beside it.
      rows: rows(
        money(data.amount) ? { label: 'Amount paid', value: money(data.amount)!, ltr: true, strong: true } : null,
        { label: 'Currency', value: data.currency, ltr: true },
      ),
    },
    sections: [
      {
        kind: 'table',
        title: 'Payment details',
        // No 'Booking ID' or 'Tour' row: the fact block above already states
        // both, and a receipt that repeats them is just longer.
        rows: [
          { label: 'Payment method', value: data.paymentMethod },
          { label: 'Payment ID', value: data.paymentId, ltr: true },
        ],
      },
      {
        kind: 'note',
        title: 'What happens next',
        body: [
          'A receipt has been saved to your account.',
          'Your booking dashboard shows every upcoming experience.',
          'We will send final instructions 24 hours before your tour.',
        ],
      },
    ],
    cta: { label: 'View my booking', url: bookingsUrl },
    helpText: 'Questions about this charge? Reply to this email and a real person will answer.',
    reference: data.bookingId,
    footerReason: 'You are receiving this because a payment was made on your booking.',
  };
}

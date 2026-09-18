import type { EmailSpec } from '../layout';
import type { BankTransferEmailData } from '../type';
import { brandOf, money, rows, sections, siteUrl, type WithBrand } from './shared';

export function bankTransferInstructions(data: WithBrand<BankTransferEmailData>): EmailSpec {
  return {
    preheader: `Transfer ${data.totalPrice} ${data.currency} within 48 hours using reference ${data.bookingId}.`,
    brand: brandOf(data),
    statusLabel: 'Action required',
    statusTone: 'warning',
    headline: 'Complete your payment',
    summary: `Hi ${data.customerName}, thank you for booking ${data.tourTitle}. To confirm it, please transfer ${data.totalPrice} ${data.currency} using the bank details below.`,
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      rows: rows(
        { label: 'Date', value: data.bookingDate },
        data.bookingTime ? { label: 'Time', value: data.bookingTime, ltr: true } : null,
        { label: 'Participants', value: data.participants, ltr: true },
        money(data.totalPrice) ? { label: 'Amount due', value: `${money(data.totalPrice)} ${data.currency}`, ltr: true, strong: true } : null,
      ),
    },
    sections: sections(
      {
        kind: 'table',
        title: 'Bank details',
        rows: rows(
          { label: 'Bank', value: data.bankName },
          { label: 'Account name', value: data.accountName },
          { label: 'Account number', value: data.accountNumber, ltr: true },
          { label: 'IBAN', value: data.iban, ltr: true },
          { label: 'SWIFT / BIC', value: data.swiftCode, ltr: true },
          money(data.totalPrice) ? { label: 'Amount', value: `${money(data.totalPrice)} ${data.currency}`, ltr: true } : null,
          { label: 'Transfer reference', value: data.bookingId, ltr: true },
        ),
      },
      {
        kind: 'note',
        tone: 'warning',
        title: 'Your booking is held as pending',
        body: [
          `Please complete the payment within 48 hours and use ${data.bookingId} as the transfer reference so we can match it to your booking.`,
          'We will email your confirmation and vouchers as soon as the payment arrives.',
        ],
      },
      data.specialRequests
        ? { kind: 'note', title: 'Special requests', body: [data.specialRequests] }
        : null,
      data.hotelPickupDetails
        ? { kind: 'note', title: 'Hotel pickup', body: [data.hotelPickupDetails] }
        : null,
    ),
    cta: { label: 'View my booking', url: siteUrl(data, '/user/bookings') },
    helpText: 'Questions, or already paid? Reply to this email and we will check for you.',
    reference: data.bookingId,
    footerReason: 'You are receiving this because you chose bank transfer at checkout.',
  };
}

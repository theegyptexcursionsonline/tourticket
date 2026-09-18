import type { EmailSpec } from '../layout';
import type { BookingStatusUpdateData } from '../type';
import { brandOf, rows, sections, siteUrl, type WithBrand } from './shared';

export function bookingUpdate(data: WithBrand<BookingStatusUpdateData>): EmailSpec {
  return {
    preheader: `${data.tourTitle} on ${data.bookingDate} — ${data.statusMessage}`.slice(0, 90),
    brand: brandOf(data),
    statusLabel: data.newStatus,
    statusTone: 'neutral',
    headline: 'Your booking was updated',
    summary: `Hi ${data.customerName}, the status of your booking for ${data.tourTitle} has changed.`,
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      rows: rows(
        { label: 'Date', value: data.bookingDate },
        { label: 'Time', value: data.bookingTime, ltr: true },
        { label: 'Status', value: data.newStatus, strong: true },
      ),
    },
    sections: sections(
      { kind: 'note', title: 'What this means', body: [data.statusMessage] },
      data.additionalInfo ? { kind: 'note', body: [data.additionalInfo] } : null,
    ),
    cta: { label: 'View my bookings', url: siteUrl(data, '/user/bookings') },
    helpText: 'Need help? Reply to this email and a real person will answer.',
    reference: data.bookingId,
    footerReason: 'You are receiving this because the status of your booking changed.',
  };
}

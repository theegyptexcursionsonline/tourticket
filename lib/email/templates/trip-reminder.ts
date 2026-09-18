import type { EmailSpec } from '../layout';
import type { TripReminderData } from '../type';
import { brandOf, rows, sections, siteUrl, whatsappLine, type WithBrand } from './shared';

export function tripReminder(data: WithBrand<TripReminderData>): EmailSpec {
  return {
    preheader: `Meet at ${data.meetingPoint} on ${data.bookingDate} at ${data.bookingTime}.`,
    brand: brandOf(data),
    statusLabel: 'Tomorrow',
    statusTone: 'positive',
    headline: 'Your tour is tomorrow',
    summary: `Hi ${data.customerName}, your experience begins in less than 24 hours. Here is everything you need for an effortless arrival.`,
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      rows: rows(
        { label: 'Date', value: data.bookingDate },
        { label: 'Time', value: data.bookingTime, ltr: true },
        { label: 'Meeting point', value: data.meetingPoint },
      ),
    },
    sections: sections(
      {
        kind: 'list',
        title: 'Before you go',
        items: [
          'Tonight: pack your essentials, charge your phone, and keep this email handy.',
          'One hour before: leave early so you reach the meeting point 15 minutes ahead of time.',
          'On arrival: show your booking reference and enjoy your experience.',
        ],
      },
      data.weatherInfo ? { kind: 'note', title: 'Weather outlook', body: [data.weatherInfo] } : null,
      data.whatToBring?.length ? { kind: 'list', title: 'What to bring', items: data.whatToBring } : null,
      data.importantNotes ? { kind: 'note', tone: 'warning', title: 'Important notes', body: [data.importantNotes] } : null,
    ),
    cta: { label: 'View my booking', url: siteUrl(data, '/user/bookings') },
    helpText: data.contactNumber
      ? `Need us on the day? ${whatsappLine(data.contactNumber)}, or reply to this email.`
      : 'Need us on the day? Reply to this email and a real person will answer.',
    reference: data.bookingId,
    // No `unsubscribeUrl`: this product has no reminder opt-out surface yet, and
    // a link that does not unsubscribe anyone is worse than none. The reminder
    // is booking mail for a booking the reader made, which §4 of the standard
    // exempts, so it carries the "why you received this" line instead.
    footerReason: 'You are receiving this reminder because you have a tour departing tomorrow.',
  };
}

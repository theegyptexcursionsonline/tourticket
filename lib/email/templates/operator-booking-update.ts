import type { EmailSpec } from '../layout';
import type { OperatorBookingUpdateData } from '../type';
import { brandOf, guestSummary, pickupSection, rows, sections, siteUrl, type WithBrand } from './shared';

export function operatorBookingUpdate(data: WithBrand<OperatorBookingUpdateData>): EmailSpec {
  const guests = guestSummary({
    adults: data.adultGuests,
    children: data.childGuests,
    infants: data.infantGuests,
  });

  return {
    preheader: `${data.tourTitle} — ${data.changesSummary}`.slice(0, 90),
    brand: brandOf(data),
    statusLabel: 'Booking updated',
    statusTone: 'warning',
    headline: 'Booking details changed',
    summary: data.changesSummary,
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      rows: rows(
        { label: 'Date & time', value: `${data.bookingDate} · ${data.bookingTime}`, ltr: true },
        { label: 'Status', value: data.newStatus, strong: true },
      ),
    },
    sections: sections(
      {
        kind: 'table',
        title: 'Customer',
        rows: rows(
          { label: 'Name', value: data.customerName },
          { label: 'Email', value: data.customerEmail, ltr: true },
          data.customerPhone ? { label: 'Phone', value: data.customerPhone, ltr: true } : null,
          guests ? { label: 'Guests', value: guests, ltr: true } : null,
        ),
      },
      pickupSection(data),
      data.specialRequests ? { kind: 'note', title: 'Special requests', body: [data.specialRequests] } : null,
      { kind: 'table', title: 'Audit', rows: [{ label: 'Changed by', value: `${data.changedBy} · ${data.changedAt}` }] },
    ),
    cta: { label: 'View in dashboard', url: siteUrl(data, '/admin/bookings') },
    reference: data.bookingId,
    footerReason: 'You are receiving this because you are on this brand’s operations notification list.',
  };
}

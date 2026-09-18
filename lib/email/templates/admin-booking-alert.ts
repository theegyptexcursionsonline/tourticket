import type { EmailSpec } from '../layout';
import type { AdminAlertData } from '../type';
import {
  brandOf, guestSummary, humanizeCountdown, money, pickupSection, rows, sections, siteUrl,
  type WithBrand,
} from './shared';

export function adminBookingAlert(data: WithBrand<AdminAlertData>): EmailSpec {
  const countdown = humanizeCountdown(data.timeUntil);
  return {
    preheader: `${data.tourTitle} — ${data.totalPrice} — travelling ${data.bookingDate}.`,
    brand: brandOf(data),
    statusLabel: 'New booking',
    statusTone: 'positive',
    headline: 'New booking received',
    summary: 'Admin copy — review the details and sync with operations.',
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      rows: rows(
        { label: 'Travel date', value: data.bookingDate },
        data.paymentMethod ? { label: 'Payment', value: data.paymentMethod } : null,
        data.discountCode
          ? { label: 'Promo code', value: `${data.discountCode}${data.discountAmount ? ` (-${data.discountAmount})` : ''}`, ltr: true }
          : null,
        countdown ? { label: 'Departure in', value: countdown } : null,
        money(data.totalPrice) ? { label: 'Total value', value: money(data.totalPrice)!, ltr: true, strong: true } : null,
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
        ),
      },
      data.specialRequests ? { kind: 'note', title: 'Special requests', body: [data.specialRequests] } : null,
      pickupSection(data),
      data.tours?.length
        ? {
          kind: 'items',
          title: 'Tours & pax',
          items: data.tours.map((tour) => ({
            title: tour.title,
            amount: tour.price,
            meta: [
              `${tour.date} · ${tour.time}`,
              guestSummary({ adults: tour.adults, children: tour.children, infants: tour.infants, option: tour.bookingOption }),
              tour.addOns?.length ? `Add-ons: ${tour.addOns.join(', ')}` : '',
            ].filter(Boolean).join(' — '),
          })),
        }
        : null,
    ),
    cta: { label: 'Open admin dashboard', url: data.adminDashboardLink || siteUrl(data, '/admin/bookings') },
    reference: data.bookingId,
    footerReason: 'You are receiving this because you are on this brand’s booking notification list.',
  };
}

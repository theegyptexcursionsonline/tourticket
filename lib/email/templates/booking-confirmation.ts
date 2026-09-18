import type { EmailSpec, EmailTableSection } from '../layout';
import type { BookingEmailData } from '../type';
import {
  brandOf, guestSummary, humanizeCountdown, money, pickupSection, rows, sections, siteUrl,
  whatsappLine, type WithBrand,
} from './shared';

/** Fields the service adds to `BookingEmailData` before rendering. */
export type BookingConfirmationInput = WithBrand<BookingEmailData & {
  verificationUrl?: string;
  qrCodeCid?: string;
}>;

/**
 * The payment breakdown, or nothing.
 *
 * The block needs a real total to be worth showing: a partial `pricingDetails`
 * (or none at all) previously rendered "Subtotal / Service fee / Taxes & fees /
 * Total paid" with blanks beside every label.
 */
function pricingTable(data: BookingConfirmationInput): EmailTableSection | null {
  const details = data.pricingDetails;
  const total = money(details?.total) ?? money(data.totalPrice);
  if (!total) return null;

  const discount = money(details?.discount);
  const breakdown = rows(
    money(details?.subtotal) ? { label: 'Subtotal', value: money(details?.subtotal)!, ltr: true } : null,
    money(details?.serviceFee) ? { label: 'Service fee', value: money(details?.serviceFee)!, ltr: true } : null,
    money(details?.tax) ? { label: 'Taxes & fees', value: money(details?.tax)!, ltr: true } : null,
    discount
      ? {
        label: data.discountCode ? `Promo · ${data.discountCode}` : 'Discount',
        value: `-${discount}`,
        ltr: true,
      }
      : null,
  );

  return {
    kind: 'table',
    title: 'Payment',
    rows: breakdown,
    total: { label: 'Total paid', value: total, ltr: true },
  };
}

export function bookingConfirmation(data: BookingConfirmationInput): EmailSpec {
  const bookingsUrl = siteUrl(data, '/user/bookings');
  const countdown = humanizeCountdown(data.timeUntil);

  const guestLine = [
    data.customerName,
    data.customerEmail,
    data.customerPhone,
  ].filter(Boolean).join(' · ');

  return {
    preheader: `${data.tourTitle} on ${data.bookingDate} — reference ${data.bookingId}. Your ticket is inside.`,
    brand: brandOf(data),
    statusLabel: 'Confirmed',
    statusTone: 'positive',
    headline: 'Booking confirmed',
    summary: `Hi ${data.customerName}, you're all set. This email is your ticket — keep it with you on the day.`,
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      subtitle: data.bookingOption,
      rows: rows(
        { label: 'Date', value: data.bookingDate },
        { label: 'Time', value: data.bookingTime, ltr: true },
        { label: 'Guests', value: data.participants, ltr: true },
        data.participantBreakdown ? { label: 'Breakdown', value: data.participantBreakdown, ltr: true } : null,
        data.meetingPoint ? { label: 'Meeting point', value: data.meetingPoint } : null,
        countdown ? { label: 'Starts in', value: countdown } : null,
        money(data.totalPrice) ? { label: 'Total paid', value: money(data.totalPrice)!, ltr: true, strong: true } : null,
      ),
    },
    sections: sections(
      data.qrCodeCid
        ? {
          kind: 'image' as const,
          title: 'Your ticket',
          src: `cid:${data.qrCodeCid}`,
          alt: `QR code for booking ${data.bookingId}`,
          // The reference below is the fallback: a guest whose client blocks
          // images can still be checked in by quoting it at the meeting point.
          caption: `Show this code at the meeting point, or quote booking ${data.bookingId}.`,
          href: data.verificationUrl,
          width: 200,
        }
        : {
          kind: 'note' as const,
          title: 'Your ticket',
          body: [`Quote booking ${data.bookingId} at the meeting point. Your full booking stays available at ${bookingsUrl}.`],
        },
      pickupSection(data),
      data.orderedItems?.length
        ? {
          kind: 'items' as const,
          title: 'Order summary',
          items: data.orderedItems.map((item) => ({
            title: item.title,
            meta: guestSummary({
              adults: item.adults,
              children: item.children,
              infants: item.infants,
              option: item.bookingOption,
            }),
            amount: item.totalPrice,
            image: item.image,
          })),
        }
        : null,
      // A money row shows a real amount or is not rendered, and the whole
      // block is omitted rather than shown with an empty total — a receipt
      // with a blank total is a support ticket, not a receipt.
      pricingTable(data),
      data.specialRequests
        ? { kind: 'note' as const, title: 'Special requests', body: [data.specialRequests] }
        : null,
      { kind: 'table' as const, title: 'Guest', rows: [{ label: 'Booked by', value: guestLine, ltr: true }] },
    ),
    cta: { label: 'View my booking', url: bookingsUrl },
    helpText: data.contactNumber
      ? `Need changes? Reply to this email or ${whatsappLine(data.contactNumber)}.`
      : 'Need changes? Reply to this email and a real person will answer.',
    reference: data.bookingId,
    footerReason: 'You are receiving this because you booked an experience with us.',
  };
}

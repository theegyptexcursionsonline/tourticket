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
    // No heading: a column of amounts ending in "Total paid" needs no label,
    // and on a phone the label was a whole line.
    rows: breakdown,
    total: { label: 'Total paid', value: total, ltr: true },
  };
}

export function bookingConfirmation(data: BookingConfirmationInput): EmailSpec {
  const bookingsUrl = siteUrl(data, '/user/bookings');
  const countdown = humanizeCountdown(data.timeUntil);

  // No email address: the customer is reading this at it, so printing it back
  // proves nothing and cost a wrapped line on a phone. The phone number stays —
  // a wrong number is worth catching before a hotel pickup.
  const guestLine = [
    data.customerName,
    data.customerPhone,
  ].filter(Boolean).join(' · ');

  return {
    preheader: `${data.tourTitle} on ${data.bookingDate} — reference ${data.bookingId}. Your ticket is inside.`,
    brand: brandOf(data),
    statusLabel: 'Confirmed',
    statusTone: 'positive',
    headline: 'Booking confirmed',
    summary: `Hi ${data.customerName}, you're all set — this email is your ticket.`,
    facts: {
      eyebrow: `Booking ${data.bookingId}`,
      title: data.tourTitle,
      subtitle: data.bookingOption,
      rows: rows(
        { label: 'Date', value: data.bookingDate },
        { label: 'Time', value: data.bookingTime, ltr: true },
        // The breakdown already states the counts AND their prices, so it IS
        // the guests row when it exists; printing both said the same thing
        // twice and cost a line doing it.
        {
          label: 'Guests',
          value: data.participantBreakdown || data.participants,
          ltr: true,
        },
        // The pickup block below names the hotel, its address and the pickup
        // instruction, so a "Meeting point: Hotel lobby" row beside it is the
        // same fact twice. Shown only when there is no pickup block.
        data.meetingPoint && !data.hotelPickupDetails && !data.hotelPickupLocation?.address
          ? { label: 'Meeting point', value: data.meetingPoint }
          : null,
        // No countdown row: it is the departure date above, restated in
        // another unit. The preheader already carries the urgency.
        // No total here. `data.totalPrice` is the tour total BEFORE the service
        // fee, taxes and any promo, so showing it as "Total paid" beside the
        // payment summary put two different figures under the same label — and
        // the larger one was not what the customer was charged. The payment
        // block below is the single authority for money in this email.
      ),
    },
    sections: sections(
      data.qrCodeCid
        ? {
          kind: 'image' as const,
          // No heading: the caption under the code says what it is, and a
          // section title above a QR code is a line that earns nothing on a
          // phone.
          src: `cid:${data.qrCodeCid}`,
          // Short: a long alt wrapped to three lines at 390px, and the
          // caption underneath already carries the reference.
          alt: 'Booking QR code',
          // The reference below is the fallback: a guest whose client blocks
          // images can still be checked in by quoting it at the meeting point.
          caption: `Show at the meeting point, or quote ${data.bookingId}.`,
          href: data.verificationUrl,
          // Comfortably scannable at arm's length; 200px bought nothing but
          // 40px of scroll.
          // 104px is ~27% of a 390px screen and scans from arm's length on any
          // phone camera; the caption's reference is the manual fallback.
          width: 104,
          height: 104,
        }
        : {
          kind: 'note' as const,
          title: 'Your ticket',
          body: [`Quote booking ${data.bookingId} at the meeting point. Your full booking stays available at ${bookingsUrl}.`],
        },
      pickupSection(data),
      // Only a multi-tour cart earns a line-item panel. For a single booking the
      // fact block above already names the tour, the option and the guests, so
      // the panel restated them and added a third price to a message that only
      // needs one.
      (data.orderedItems?.length ?? 0) > 1
        ? {
          kind: 'items' as const,
          title: 'Order summary',
          items: (data.orderedItems ?? []).map((item) => ({
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
    ),
    cta: { label: 'View my booking', url: bookingsUrl },
    // The booking's contact details live here rather than in a section of
    // their own: they are what support needs, and a titled one-row table cost
    // ~80px on a phone to say the same thing.
    helpText: [
      // The contact line the layout prints underneath already says how to
      // reach us, so a "Need changes? Reply to this email" sentence above it
      // was the same instruction twice.
      `Booked by ${guestLine}.`,
    ].join(' '),
    reference: data.bookingId,
    footerReason: 'You are receiving this because you booked an experience with us.',
  };
}

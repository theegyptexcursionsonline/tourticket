import type { EmailSpec } from '../layout';
import type { TripCompletionData } from '../type';
import { brandOf, sections, siteUrl, type WithBrand } from './shared';

export function tripCompletion(data: WithBrand<TripCompletionData>): EmailSpec {
  return {
    preheader: `Tell us how ${data.tourTitle} went — your review helps the next traveller choose well.`,
    brand: brandOf(data),
    statusLabel: 'Completed',
    statusTone: 'positive',
    headline: 'Thank you for travelling with us',
    summary: `Hi ${data.customerName}, we hope ${data.tourTitle} on ${data.bookingDate} left you with memories worth keeping.`,
    facts: {
      title: data.tourTitle,
      rows: [{ label: 'Travelled on', value: data.bookingDate }],
    },
    sections: sections(
      {
        kind: 'note',
        title: 'How was it?',
        body: ['Your review helps other travellers discover trusted experiences — we read every word.'],
      },
      data.photoSharingLink
        ? {
          kind: 'note',
          title: 'Share your photos',
          body: [`Got great shots? Share them with us at ${data.photoSharingLink}.`],
        }
        : null,
      data.recommendedTours?.length
        ? {
          kind: 'items',
          title: 'Your next adventure',
          items: data.recommendedTours.map((tour) => ({
            title: tour.title,
            amount: tour.price,
            image: tour.image,
            meta: tour.link,
          })),
        }
        : null,
      {
        kind: 'note',
        title: 'Good to know',
        body: [`Keep this email for your records — your booking details stay available at ${siteUrl(data, '/user/bookings')}.`],
      },
    ),
    cta: { label: 'Leave a review', url: data.reviewLink },
    helpText: 'Questions or receipts? Reply to this email — we are happy to help.',
    footerReason: 'You are receiving this because you recently travelled with us.',
  };
}

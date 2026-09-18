import type { EmailSpec } from '../layout';
import type { WelcomeEmailData } from '../type';
import { brandOf, sections, siteUrl, type WithBrand } from './shared';

export function welcome(data: WithBrand<WelcomeEmailData>): EmailSpec {
  // Verification, when it is pending, is the one thing the reader must do — so
  // it becomes the single primary action and the dashboard drops to a link.
  const verifying = Boolean(data.verificationLink);
  return {
    preheader: verifying
      ? 'One tap confirms your email address and opens your account.'
      : 'Your account is ready — open your dashboard to start planning.',
    brand: brandOf(data),
    statusLabel: 'Welcome',
    statusTone: 'positive',
    headline: `Welcome to ${data.companyName}`,
    summary: verifying
      ? `Hi ${data.customerName}, confirm your email address to finish setting up your account.`
      : `Hi ${data.customerName}, your account is ready. Here is what you can do next.`,
    sections: sections(
      {
        kind: 'list',
        title: 'With your account',
        items: [
          'Made-to-measure itineraries curated by guides who live and breathe Egypt.',
          'Concierge-level care from real people, by WhatsApp, phone or email.',
          'Insider access: private entries, hidden gems and flexible upgrades, plus saved favourites.',
        ],
      },
      data.recommendedTours?.length
        ? {
          kind: 'items',
          title: 'Handpicked for you',
          items: data.recommendedTours.map((tour) => ({
            title: tour.title,
            amount: tour.price,
            image: tour.image,
            meta: tour.link,
          })),
        }
        : null,
      {
        kind: 'list',
        title: 'Make the most of today',
        items: [
          'Complete your traveller profile so we can tailor suggestions.',
          'Bookmark tours you love and compare them later.',
          'Message our team if you want help designing a custom experience.',
        ],
      },
      {
        kind: 'note',
        body: [`Revisit your bookings any time at ${siteUrl(data, '/user/bookings')}.`],
      },
    ),
    cta: verifying
      ? { label: 'Verify my email', url: data.verificationLink! }
      : { label: 'Open my dashboard', url: data.dashboardLink },
    helpText: 'Questions? Reply to this email and a real person will answer.',
    footerReason: `You are receiving this because an account was created for this address at ${data.companyName}.`,
  };
}

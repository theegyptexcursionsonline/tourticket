import { Bricolage_Grotesque } from 'next/font/google';

/** Display face for the offer pages, self-hosted at build time. */
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--offer-display',
  display: 'swap',
});

export const OFFER_FONT_CLASS = bricolage.variable;

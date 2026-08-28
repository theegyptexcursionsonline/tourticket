// app/[locale]/page.tsx
// Using ISR (Incremental Static Regeneration) with 60-second revalidation
// Benefits: Lightning-fast page loads + Fresh content every 60 seconds
// The page is statically generated and cached, then revalidated in the background

import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import HomePageServer from './HomePageServer';
import { metadataAlternates, openGraphLocale } from '@/lib/i18n/seoAlternates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Egypt Excursions Online - Tours, Activities & Experiences',
    description: 'Discover Egypt\'s wonders with unforgettable tours and experiences. From Pyramids to Nile cruises, book your adventure today.',
    alternates: metadataAlternates(locale, '/'),
    openGraph: { locale: openGraphLocale(locale) },
  };
}

// Ensure Next.js picks up the ISR config for the homepage route.
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomePageServer />;
}

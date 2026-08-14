import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DestinationsClientPage from './DestinationsClientPage';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { IDestination } from '@/lib/models/Destination';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { selectLocalizedTaxonomyEntries } from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { contentPath } from '@/lib/content/contentUrl';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

const destinationsPageMeta = {
  en: {
    title: 'All Destinations | Egypt Excursions Online',
    description:
      'Explore amazing destinations across Egypt. Discover tours and activities in Cairo, Luxor, Aswan, Hurghada, Sharm El Sheikh, and more.',
  },
  ar: {
    title: 'جميع الوجهات | Egypt Excursions Online',
    description:
      'استكشف أجمل الوجهات في مصر واكتشف الجولات والأنشطة في القاهرة والأقصر وأسوان والغردقة وشرم الشيخ وغيرها.',
  },
} as const;

const getPageMeta = (locale: string) =>
  locale.startsWith('ar') ? destinationsPageMeta.ar : destinationsPageMeta.en;

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = getPageMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: 'website',
    },
    alternates: {
      canonical: '/destinations',
      languages: {
        'en': '/destinations',
        'ar': '/ar/destinations',
        'es': '/es/destinations',
        'fr': '/fr/destinations',
        'de': '/de/destinations',
        'x-default': '/destinations',
      },
    },
  };
};

// Server-side function to fetch all destinations and their tour counts
async function getDestinationsWithTourCounts(locale: string): Promise<IDestination[]> {
  // Skip database fetch during build if MONGODB_URI is not set
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ Skipping destinations fetch - MONGODB_URI not set');
    return [];
  }

  try {
    await dbConnect();
    
    // Fetch all destinations (default site only — tenant docs stay on their sites)
    const [destinations, destinationCounts] = await Promise.all([
      Destination.find({ isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER }).lean(),
      Tour.aggregate<{ _id: unknown; tourCount: number }>([
        { $match: { isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER } },
        { $group: { _id: '$destination', tourCount: { $sum: 1 } } },
      ]),
    ]);
    const countByDestination = new Map(destinationCounts.map((row) => [String(row._id), row.tourCount]));
    const destinationsWithCounts = filterVisibleTaxonomyEntries(
      destinations.map((destination) => ({
        ...destination,
        tourCount: countByDestination.get(String(destination._id)) || 0,
      })),
      { requireTours: true },
    );

    const serialized = JSON.parse(JSON.stringify(destinationsWithCounts)) as Record<string, unknown>[];
    return selectLocalizedTaxonomyEntries(
      serialized,
      locale,
      [
        'name',
        'country',
        'description',
        'longDescription',
        'bestTimeToVisit',
        'currency',
        'timezone',
        'climate',
        'visaRequirements',
        'languagesSpoken',
        'highlights',
        'thingsToDo',
        'localCustoms',
        'metaTitle',
        'metaDescription',
      ]
    ).map((destination: Record<string, unknown>) =>
      localizeEntityFields(destination, locale, [
        'name',
        'country',
        'description',
        'longDescription',
        'bestTimeToVisit',
        'currency',
        'timezone',
        'climate',
        'visaRequirements',
        'languagesSpoken',
        'highlights',
        'thingsToDo',
        'localCustoms',
        'metaTitle',
        'metaDescription',
      ])
    ) as unknown as IDestination[];
  } catch (error) {
    console.error('Failed to fetch destinations:', error);
    return [];
  }
}

// The main server component for the /destinations route
export default async function DestinationsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const destinations = await getDestinationsWithTourCounts(locale);

  return (
    <>
      <CollectionSchema
        name="All Destinations"
        description="Explore amazing destinations across Egypt"
        url="/destinations"
        items={destinations.map((destination) => ({
          name: destination.name,
          url: contentPath('destination', destination.slug, destination.urlType, null, destination.parentPage?.slug),
          image: destination.image,
        }))}
      />
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <DestinationsClientPage destinations={destinations as (IDestination & { tourCount: number })[]} />
      </main>
      <Footer />
    </>
  );
}

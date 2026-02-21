import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import DestinationsClientPage from './DestinationsClientPage';
import { IDestination } from '@/lib/models/Destination';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;

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
    
    // Fetch all destinations
    const destinations = await Destination.find({}).lean();
    
    // For each destination, count the number of published tours
    const destinationsWithCounts = await Promise.all(
      destinations.map(async (dest) => {
        const tourCount = await Tour.countDocuments({
          destination: dest._id,
          isPublished: true
        });
        return {
          ...dest,
          tourCount: tourCount,
        };
      })
    );

    const serialized = JSON.parse(JSON.stringify(destinationsWithCounts));
    return serialized.map((destination: Record<string, unknown>) =>
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
    ) as IDestination[];
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
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <DestinationsClientPage destinations={destinations} />
      </main>
      <Footer />
      {/* AI Search Widget */}
      <AISearchWidget />
    </>
  );
}

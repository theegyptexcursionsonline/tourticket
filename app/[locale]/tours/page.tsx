// app/tours/page.tsx
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import ToursClientPage from './ToursClientPage';
import { ITour } from '@/lib/models/Tour';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;

const toursPageMeta = {
  en: {
    title: 'All Tours & Activities | Egypt Excursions Online',
    description:
      'Browse our complete collection of tours and experiences in Egypt. Find the perfect adventure for your trip.',
  },
  ar: {
    title: 'جميع الجولات والأنشطة | Egypt Excursions Online',
    description:
      'تصفح مجموعتنا الكاملة من الجولات والتجارب في مصر واعثر على المغامرة المناسبة لرحلتك.',
  },
} as const;

const getPageMeta = (locale: string) =>
  locale.startsWith('ar') ? toursPageMeta.ar : toursPageMeta.en;

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

// Server-side function to fetch all tours with populated data
async function getAllTours(locale: string): Promise<ITour[]> {
  // Skip database fetch during build if MONGODB_URI is not set
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ Skipping tours fetch - MONGODB_URI not set');
    return [];
  }

  try {
    await dbConnect();
    
    const tours = await Tour.find({ isPublished: true })
      .populate('destination', 'name description country translations')
      .populate('category', 'name description longDescription translations')
      .sort({ featured: -1, createdAt: -1 }) // Featured first, then most recent
      .lean();
    
    const serializedTours = JSON.parse(JSON.stringify(tours));
    return serializedTours.map((tour: Record<string, unknown>) => {
      const localizedTour = localizeEntityFields(tour, locale, [
        'title',
        'description',
        'longDescription',
        'location',
        'duration',
        'includes',
        'highlights',
        'whatsIncluded',
        'whatsNotIncluded',
        'tags',
        'metaTitle',
        'metaDescription',
      ]);

      if (localizedTour.destination && typeof localizedTour.destination === 'object') {
        localizedTour.destination = localizeEntityFields(
          localizedTour.destination as Record<string, unknown>,
          locale,
          ['name', 'description', 'country']
        );
      }

      if (localizedTour.category && typeof localizedTour.category === 'object') {
        localizedTour.category = localizeEntityFields(
          localizedTour.category as Record<string, unknown>,
          locale,
          ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription']
        );
      }

      if (Array.isArray(localizedTour.categories)) {
        localizedTour.categories = localizedTour.categories.map((category: unknown) => {
          if (!category || typeof category !== 'object') return category;
          return localizeEntityFields(
            category as Record<string, unknown>,
            locale,
            ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription']
          );
        });
      }

      return localizedTour as unknown as ITour;
    });
  } catch (error) {
    console.error('Failed to fetch tours:', error);
    return [];
  }
}

// The main server component for the /tours route
export default async function ToursIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tours = await getAllTours(locale);

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <ToursClientPage tours={tours} />
      </main>
      <Footer />
      {/* AI Search Widget */}
      <AISearchWidget />
    </>
  );
}

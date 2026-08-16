// app/tours/page.tsx
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ToursClientPage from './ToursClientPage';
import ToursListSchema from '@/components/schema/ToursListSchema';
import { ITour } from '@/lib/models/Tour';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { selectLocalizedTours } from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

// Netlify exposes the production database only to the runtime function. Static
// generation therefore produced and cached an empty catalogue at deploy time.
// Keep this route runtime-rendered; the card-only projection below keeps it
// inside the public response budget without shipping full tour documents.
export const dynamic = 'force-dynamic';

const toursPageMeta = {
  en: {
    title: 'All Tours & Activities | Egypt Excursions Online',
    description:
      'Browse our complete collection of tours and experiences in Egypt. Find the perfect adventure for your trip.',
  },
  de: {
    title: 'Alle Touren & Aktivitäten | Egypt Excursions Online',
    description:
      'Entdecken Sie unsere komplette Auswahl an Touren und Erlebnissen in Ägypten und finden Sie die passende Aktivität für Ihre Reise.',
  },
  ar: {
    title: 'جميع الجولات والأنشطة | Egypt Excursions Online',
    description:
      'تصفح مجموعتنا الكاملة من الجولات والتجارب في مصر واعثر على المغامرة المناسبة لرحلتك.',
  },
} as const;

const getPageMeta = (locale: string) =>
  locale.startsWith('ar')
    ? toursPageMeta.ar
    : locale.startsWith('de')
      ? toursPageMeta.de
      : toursPageMeta.en;

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
      canonical: '/tours',
      languages: {
        'en': '/tours',
        'ar': '/ar/tours',
        'es': '/es/tours',
        'fr': '/fr/tours',
        'de': '/de/tours',
        'x-default': '/tours',
      },
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

    // The index only renders card/search fields. Loading every tour's full
    // itinerary, FAQs, add-ons and booking configuration pushed the Netlify
    // response past the public proxy deadline as the catalogue grew.
    const baseTours = await Tour.find({ isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
      .select([
        'title',
        'description',
        'slug',
        'image',
        'pricingSummary',
        'discountPrice',
        'originalPrice',
        'rating',
        'reviewCount',
        'duration',
        'isFeatured',
        'featured',
        'urlType',
        'destination',
        'category',
        'categories',
        'translations',
        'language',
        'tenantId',
        'createdAt',
      ].join(' '))
      .populate('destination', 'name description country translations')
      .populate('category', 'name description longDescription translations')
      .populate('categories', 'name translations')
      .sort({ featured: -1, createdAt: -1 }) // Featured first, then most recent
      .lean();

    const serializedBaseTours = JSON.parse(JSON.stringify(baseTours)) as Record<string, unknown>[];
    const candidateSlugs = serializedBaseTours
      .map((tour) => String(tour.slug || ''))
      .filter(Boolean);

    const filteredTours = selectLocalizedTours(
      serializedBaseTours.filter((tour) => candidateSlugs.includes(String(tour.slug || ''))),
      locale
    );

    return filteredTours.map((tour: Record<string, unknown>) => {
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
    }).sort((left, right) => {
      const leftFeatured = left.isFeatured ? 1 : 0;
      const rightFeatured = right.isFeatured ? 1 : 0;
      if (leftFeatured !== rightFeatured) return rightFeatured - leftFeatured;

      const leftCreated = new Date(left.createdAt || 0).getTime();
      const rightCreated = new Date(right.createdAt || 0).getTime();
      return rightCreated - leftCreated;
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
  const schemaListName = locale.startsWith('de')
    ? 'Alle Touren & Aktivitäten in Ägypten'
    : locale.startsWith('ar')
      ? 'جميع الجولات والأنشطة في مصر'
      : 'All Tours & Activities in Egypt';
  const schemaListDescription = locale.startsWith('de')
    ? 'Entdecken Sie unsere komplette Auswahl an Touren und Erlebnissen in Ägypten'
    : locale.startsWith('ar')
      ? 'تصفح مجموعتنا الكاملة من الجولات والتجارب في مصر'
      : 'Browse our complete collection of tours and experiences in Egypt';

  return (
    <>
      <ToursListSchema
        tours={tours.map((tour) => ({ title: tour.title, slug: tour.slug, image: tour.image, discountPrice: tour.pricingSummary?.fromPrice ?? tour.discountPrice, originalPrice: tour.originalPrice, rating: tour.rating, reviewCount: tour.reviewCount, duration: tour.duration }))}
        listName={schemaListName}
        listDescription={schemaListDescription}
      />
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <ToursClientPage tours={tours as unknown as React.ComponentProps<typeof ToursClientPage>['tours']} />
      </main>
      <Footer />
    </>
  );
}

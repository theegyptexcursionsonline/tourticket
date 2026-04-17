// app/tours/page.tsx
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import ToursClientPage from './ToursClientPage';
import ToursListSchema from '@/components/schema/ToursListSchema';
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

const defaultTenantFilter = {
  $or: [
    { tenantId: 'default' },
    { tenantId: { $exists: false } },
    { tenantId: null },
    { tenantId: '' },
  ],
};

const getLocaleBucket = (
  translations: unknown,
  locale: string
): Record<string, unknown> | undefined => {
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    return undefined;
  }

  const record = translations as Record<string, unknown>;
  const normalizedLocale = locale.toLowerCase();
  const baseLocale = normalizedLocale.split('-')[0];

  for (const key of [normalizedLocale, locale, baseLocale]) {
    const bucket = record[key];
    if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) {
      return bucket as Record<string, unknown>;
    }
  }

  return undefined;
};

const hasUsableLocaleContent = (
  bucket: Record<string, unknown> | undefined,
  fields: string[]
) =>
  fields.some((field) => {
    const value = bucket?.[field];
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) {
      return value.some((item) => typeof item === 'string' && item.trim().length > 0);
    }
    return false;
  });

const germanContentPattern =
  /\b(und|mit|von|nach|tage|stunden|uhr|abholung|ausflug|kreuzfahrt|erlebnis|ganzt[aä]gig|halbt[aä]gig|gef[üu]hrte|privat|inklusive|schnorchel|nil|pyramiden|entdeckung)\b/i;

function tourHasGermanContent(tour: Record<string, unknown>) {
  if (
    hasUsableLocaleContent(getLocaleBucket(tour.translations, 'de'), [
      'title',
      'description',
      'duration',
      'highlights',
      'includes',
      'metaTitle',
      'metaDescription',
    ])
  ) {
    return true;
  }

  const snippets = [
    tour.title,
    tour.description,
    tour.duration,
    tour.metaTitle,
    tour.metaDescription,
    ...(Array.isArray(tour.highlights) ? tour.highlights : []),
    ...(Array.isArray(tour.includes) ? tour.includes : []),
  ]
    .map((value) => String(value || '').replace(/<[^>]+>/g, ' ').trim())
    .filter(Boolean);

  return snippets.some((value) => germanContentPattern.test(value));
}

function shouldIncludeTourForLocale(tour: Record<string, unknown>, locale: string) {
  if (!locale.startsWith('de')) {
    return true;
  }

  return tourHasGermanContent(tour);
}

function scoreTourForLocale(tour: Record<string, unknown>, locale: string) {
  const tenantId = String(tour.tenantId || '');
  let score = 0;

  if (tenantId === 'default') score += 4;
  else if (!tenantId) score += 2;

  if (locale.startsWith('de') && tourHasGermanContent(tour)) {
    score += 6;
  }

  if (tour.isFeatured) score += 1;

  return score;
}

function dedupeToursBySlug(tours: Record<string, unknown>[], locale: string) {
  const bestBySlug = new Map<string, Record<string, unknown>>();

  for (const tour of tours) {
    const slug = String(tour.slug || '');
    if (!slug) continue;

    const existing = bestBySlug.get(slug);
    if (!existing || scoreTourForLocale(tour, locale) > scoreTourForLocale(existing, locale)) {
      bestBySlug.set(slug, tour);
    }
  }

  return Array.from(bestBySlug.values());
}

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

    const baseTours = await Tour.find({ isPublished: true, ...defaultTenantFilter })
      .populate('destination', 'name description country translations')
      .populate('category', 'name description longDescription translations')
      .sort({ featured: -1, createdAt: -1 }) // Featured first, then most recent
      .lean();

    const serializedBaseTours = JSON.parse(JSON.stringify(baseTours)) as Record<string, unknown>[];
    const candidateSlugs = serializedBaseTours
      .map((tour) => String(tour.slug || ''))
      .filter(Boolean);

    let serializedCandidates = serializedBaseTours;

    if (locale.startsWith('de') && candidateSlugs.length > 0) {
      const localizedCandidates = await Tour.find({
        isPublished: true,
        slug: { $in: candidateSlugs },
      })
        .populate('destination', 'name description country translations')
        .populate('category', 'name description longDescription translations')
        .lean();

      serializedCandidates = JSON.parse(JSON.stringify(localizedCandidates)) as Record<string, unknown>[];
    }

    const filteredTours = dedupeToursBySlug(
      serializedCandidates.filter((tour) => candidateSlugs.includes(String(tour.slug || ''))),
      locale
    ).filter((tour) => shouldIncludeTourForLocale(tour, locale));

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
    }).sort((left: any, right: any) => {
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
        tours={(tours as any[]).map((t: any) => ({ title: t.title, slug: t.slug, image: t.image, discountPrice: t.discountPrice, originalPrice: t.originalPrice, rating: t.rating, reviewCount: t.reviewCount, duration: t.duration }))}
        listName={schemaListName}
        listDescription={schemaListDescription}
      />
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

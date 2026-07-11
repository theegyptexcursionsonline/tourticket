// Pure tour-detail renderer (no URL resolution). Route entry points decide
// whether a given URL should render this or 301-redirect to the tour's
// canonical path; they call renderTourDetail() only when it should render.
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';
import TourDetailClientPage from './TourDetailClientPage';
import { ITour } from '@/lib/models/Tour';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { localizeTour } from '@/lib/i18n/localizeTour';
import {
  selectLocalizedTourCandidate,
  selectLocalizedTours,
} from '@/lib/i18n/localizedCollections';
import { getStopSaleDatesForTour } from '@/lib/stopSaleFetcher';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';
import { localizeHtmlLinks } from '@/lib/i18n/localizeHtmlLinks';

const localizeTourFields = (tour: ITour, locale: string) =>
  localizeTour(tour as unknown as Record<string, unknown>, locale) as unknown as ITour;

const localizeTaxonomyFields = (entity: unknown, locale: string, fields: string[]) =>
  localizeEntityFields(entity as Record<string, unknown>, locale, fields);

type TourReview = { _id: string; rating: number; [key: string]: unknown };

const getEntityId = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value !== 'object' || value === null || !('_id' in value)) return undefined;
  return value._id == null ? undefined : String(value._id);
};

export async function getTourBySlug(slug: string, locale: string): Promise<{ tour: ITour; reviews: TourReview[] } | null> {
  try {
    await dbConnect();

    const baseTour = await Tour.findOne({ slug, isPublished: true, ...DEFAULT_TENANT_FILTER })
      .populate('destination', 'name slug')
      .populate('category', 'name slug')
      .lean();

    if (!baseTour && !locale.startsWith('de')) {
      return null;
    }

    let selectedTour = JSON.parse(JSON.stringify(baseTour || null)) as Record<string, unknown> | null;

    if (locale.startsWith('de')) {
      const localizedTourMatches = await Tour.find({ slug, isPublished: true })
        .populate('destination', 'name slug translations')
        .populate('category', 'name slug translations')
        .lean();

      selectedTour = selectLocalizedTourCandidate(
        JSON.parse(JSON.stringify(localizedTourMatches)) as Record<string, unknown>[],
        locale
      );
    }

    const tour = selectedTour as ITour | null;
    if (!tour) {
      return null;
    }

    const reviews = await Review.find({ tour: tour._id })
      .populate('user', 'firstName lastName picture')
      .sort({ createdAt: -1 })
      .lean();

    return {
      tour: JSON.parse(JSON.stringify(tour)),
      reviews: JSON.parse(JSON.stringify(reviews)) as TourReview[]
    };
  } catch (error) {
    console.error(`[TourDetail] Error loading tour "${slug}":`, error);
    throw error;
  }
}

async function getRelatedTours(
  categoryIds: unknown,
  currentTourId: string,
  locale: string
): Promise<ITour[]> {
  await dbConnect();

  let categoryIdArray: string[] = [];
  if (Array.isArray(categoryIds)) {
    categoryIdArray = categoryIds.map(getEntityId).filter((id): id is string => Boolean(id));
  } else if (categoryIds) {
    const catId = getEntityId(categoryIds);
    if (catId) categoryIdArray = [catId];
  }

  if (categoryIdArray.length === 0) {
    return [];
  }

  const baseRelatedTours = await Tour.find({
    category: { $in: categoryIdArray },
    _id: { $ne: currentTourId },
    isPublished: true,
    ...DEFAULT_TENANT_FILTER,
  })
    .populate('destination', 'name')
    .populate('category', 'name')
    .select('title slug image discountPrice originalPrice duration destination category rating reviewCount tags')
    .limit(3)
    .lean();

  const serializedBaseRelatedTours = JSON.parse(JSON.stringify(baseRelatedTours)) as Record<string, unknown>[];
  const candidateSlugs = serializedBaseRelatedTours
    .map((tour) => String(tour.slug || ''))
    .filter(Boolean);

  let serializedRelatedCandidates = serializedBaseRelatedTours;

  if (locale.startsWith('de') && candidateSlugs.length > 0) {
    const localizedRelatedTours = await Tour.find({
      category: { $in: categoryIdArray },
      _id: { $ne: currentTourId },
      isPublished: true,
      slug: { $in: candidateSlugs },
    })
      .populate('destination', 'name slug translations')
      .populate('category', 'name slug translations')
      .select('title slug image discountPrice originalPrice duration destination category rating reviewCount tags translations tenantId')
      .lean();

    serializedRelatedCandidates = JSON.parse(JSON.stringify(localizedRelatedTours)) as Record<string, unknown>[];
  }

  return selectLocalizedTours(
    serializedRelatedCandidates.filter((tour) => candidateSlugs.includes(String(tour.slug || ''))),
    locale
  ) as unknown as ITour[];
}

// Metadata for a tour, with the canonical path supplied by the calling route
// (so /tour/x, /experience/x and /x all advertise the right canonical URL).
export async function getTourMetadata(slug: string, locale: string, canonicalPath: string): Promise<Metadata | null> {
  const result = await getTourBySlug(slug, locale);
  if (!result) return null;

  const localizedTour = localizeTourFields(result.tour, locale);
  const destination = typeof localizedTour.destination === 'object'
    ? localizedTour.destination as unknown as { name?: string }
    : null;

  return {
    title: localizedTour.metaTitle || `${localizedTour.title} | ${destination?.name || 'Travel'} Tours`,
    description: localizedTour.metaDescription || localizedTour.description,
    keywords: localizedTour.keywords || [localizedTour.title, destination?.name].filter((keyword): keyword is string => Boolean(keyword)),
    alternates: metadataAlternates(locale, canonicalPath),
    openGraph: {
      title: localizedTour.title,
      description: localizedTour.description,
      images: localizedTour.image ? [{ url: localizedTour.image, alt: localizedTour.title }] : [],
      type: 'website',
    },
  };
}

export async function renderTourDetail(slug: string, locale: string): Promise<React.ReactElement | null> {
  const result = await getTourBySlug(slug, locale);
  if (!result) return null;

  const { tour, reviews } = result;

  const tourIdString = String(tour._id || '');
  const [relatedToursResult, initialStopSaleDates] = await Promise.all([
    getRelatedTours(tour.category, tourIdString, locale).catch((error) => {
      console.error(`[TourDetail] Failed to load related tours for: ${slug}`, error);
      return [] as ITour[];
    }),
    getStopSaleDatesForTour(tourIdString, 6),
  ]);
  const relatedTours: ITour[] = relatedToursResult;

  const localizedTour = localizeTourFields(tour, locale);

  if (localizedTour.destination && typeof localizedTour.destination === 'object') {
    localizedTour.destination = localizeTaxonomyFields(
      localizedTour.destination as unknown,
      locale,
      ['name', 'description', 'country', 'metaTitle', 'metaDescription']
    ) as unknown as ITour['destination'];
  }

  if (localizedTour.category && !Array.isArray(localizedTour.category) && typeof localizedTour.category === 'object') {
    localizedTour.category = localizeTaxonomyFields(
      localizedTour.category as unknown,
      locale,
      ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription']
    ) as unknown as ITour['category'];
  }

  if (typeof localizedTour.longDescription === 'string') {
    localizedTour.longDescription = localizeHtmlLinks(localizedTour.longDescription, locale);
  }
  if (typeof localizedTour.description === 'string') {
    localizedTour.description = localizeHtmlLinks(localizedTour.description, locale);
  }

  const localizedRelatedTours = relatedTours.map((relatedTour) => {
    const localizedRelated = localizeTourFields(relatedTour, locale);

    if (localizedRelated.destination && typeof localizedRelated.destination === 'object') {
      localizedRelated.destination = localizeTaxonomyFields(
        localizedRelated.destination as unknown,
        locale,
        ['name', 'description', 'country', 'metaTitle', 'metaDescription']
      ) as unknown as ITour['destination'];
    }

    if (localizedRelated.category && !Array.isArray(localizedRelated.category) && typeof localizedRelated.category === 'object') {
      localizedRelated.category = localizeTaxonomyFields(
        localizedRelated.category as unknown,
        locale,
        ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription']
      ) as unknown as ITour['category'];
    }

    return localizedRelated;
  });

  return (
    <>
      <Header2 startSolid />
      <TourDetailClientPage
        tour={localizedTour}
        relatedTours={localizedRelatedTours}
        initialReviews={reviews}
        initialStopSaleDates={initialStopSaleDates}
      />
      <Footer />
    </>
  );
}

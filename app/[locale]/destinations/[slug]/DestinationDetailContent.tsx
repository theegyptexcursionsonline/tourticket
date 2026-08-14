// Pure destination-detail renderer (no URL resolution). Route entry points
// decide render-vs-redirect and call renderDestinationDetail() when it should
// render.
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import ReviewModel from '@/lib/models/Review';
import DestinationPageClient from './DestinationPageClient';
import DestinationSchema from '@/components/schema/DestinationSchema';
import { localizeEntityFields, localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import {
  selectLocalizedTaxonomyEntries,
  selectLocalizedTours,
} from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { destinationStructuredFields } from '@/lib/i18n/translationFields';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';
import { localizeHtmlLinks } from '@/lib/i18n/localizeHtmlLinks';
import type { Category, Destination, Review, Tour } from '@/types';

export async function getDestinationMetadata(slug: string, locale: string, canonicalPath: string): Promise<Metadata | null> {
  await dbConnect();
  const destinationMatches = await DestinationModel.find({ slug, ...DEFAULT_TENANT_FILTER })
    .select('name description image country metaTitle metaDescription translations')
    .lean();
  const destinationCandidate = selectLocalizedTaxonomyEntries(
    JSON.parse(JSON.stringify(destinationMatches)) as Record<string, unknown>[],
    locale,
    ['name', 'description', 'country', 'longDescription', 'metaTitle', 'metaDescription']
  )[0];
  const destination = destinationCandidate
    ? localizeEntityFields(destinationCandidate, locale, [
        'name',
        'description',
        'country',
        'metaTitle',
        'metaDescription',
      ])
    : null;

  if (!destination) return null;

  // Country is optional — never let a blank one print "undefined" in the title.
  const namePart = destination.country
    ? `${destination.name}, ${destination.country}`
    : String(destination.name);
  const title = destination.metaTitle
    ? String(destination.metaTitle)
    : `${namePart} - Tours & Activities | Egypt Excursions Online`;
  const description =
    typeof destination.metaDescription === 'string'
      ? destination.metaDescription
      : (destination.description as string)?.substring(0, 160) ||
        `Discover the best tours and activities in ${destination.name}`;

  return {
    title,
    description,
    alternates: metadataAlternates(locale, canonicalPath),
    openGraph: {
      title: namePart,
      description,
      images: destination.image ? [destination.image as string] : [],
      type: 'website',
    },
  };
}

async function getPageData(slug: string, locale: string) {
  await dbConnect();

  const destinationMatches = await DestinationModel.find({ slug, ...DEFAULT_TENANT_FILTER }).lean();
  if (destinationMatches.length === 0) {
    return {
      destination: null,
      destinationTours: [],
      allCategories: [],
      reviews: [],
      relatedDestinations: []
    };
  }

  const serializedDestinationMatches = JSON.parse(JSON.stringify(destinationMatches)) as Record<string, unknown>[];
  const destinationCandidate = selectLocalizedTaxonomyEntries(
    serializedDestinationMatches,
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
  )[0];

  if (!destinationCandidate) {
    return {
      destination: null,
      destinationTours: [],
      allCategories: [],
      reviews: [],
      relatedDestinations: []
    };
  }

  const destinationIds = serializedDestinationMatches.map((destination) => String(destination._id));
  const baseDestinationTours = await TourModel.find({
    destination: { $in: destinationIds },
    isPublished: true,
    ...DEFAULT_TENANT_FILTER,
  }).populate('destination').populate('category').lean();

  const allCategories = await CategoryModel.find({}).lean();

  const serializedBaseTours = JSON.parse(JSON.stringify(baseDestinationTours)) as Record<string, unknown>[];
  const candidateSlugs = serializedBaseTours
    .map((tour) => String(tour.slug || ''))
    .filter(Boolean);

  let serializedTourCandidates = serializedBaseTours;

  if (locale.startsWith('de') && candidateSlugs.length > 0) {
    const localizedTourMatches = await TourModel.find({
      destination: { $in: destinationIds },
      isPublished: true,
      slug: { $in: candidateSlugs },
    }).populate('destination').populate('category').lean();

    serializedTourCandidates = JSON.parse(JSON.stringify(localizedTourMatches)) as Record<string, unknown>[];
  }

  const selectedDestinationTours = selectLocalizedTours(
    serializedTourCandidates.filter((tour) => candidateSlugs.includes(String(tour.slug || ''))),
    locale
  );

  const tourIds = selectedDestinationTours.map((tour) => String(tour._id));
  const reviews = await ReviewModel.find({
    tour: { $in: tourIds },
    verified: true
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  const relatedDestinationsRaw = await DestinationModel.find({
    _id: { $nin: destinationIds },
    $and: [
      DEFAULT_TENANT_FILTER,
      {
        $or: [
          { country: String(destinationCandidate.country || '') },
          { featured: true }
        ]
      }
    ]
  })
    .limit(4)
    .lean();

  const relatedDestinations = await Promise.all(
    relatedDestinationsRaw.map(async (dest) => {
      const tourCount = await TourModel.countDocuments({
        destination: dest._id,
        isPublished: true,
        ...DEFAULT_TENANT_FILTER,
      });
      return {
        ...dest,
        tourCount
      };
    })
  );

  const serializedCategories = JSON.parse(JSON.stringify(allCategories));
  const serializedReviews = JSON.parse(JSON.stringify(reviews)) as Review[];
  const serializedRelatedDest = JSON.parse(JSON.stringify(relatedDestinations)) as Record<string, unknown>[];
  const relatedDestinationCountBySlug = new Map<string, number>();

  for (const destination of serializedRelatedDest as Record<string, unknown>[]) {
    const slug = String(destination.slug || '');
    if (!slug) continue;
    const count = Number(destination.tourCount) || 0;
    relatedDestinationCountBySlug.set(slug, Math.max(relatedDestinationCountBySlug.get(slug) || 0, count));
  }

  const localizedDestination = localizeEntityFields(localizeStructuredEntries(
    destinationCandidate,
    locale,
    destinationStructuredFields
  ), locale, [
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
    'weatherWarnings',
  ]);

  // Temperatures live under averageTemperature but translate as flat strings,
  // so fold the localized values back into the shape the page renders.
  const tempBucket = (destinationCandidate as Record<string, unknown>).translations as
    | Record<string, Record<string, unknown>>
    | undefined;
  const localeTemps = locale === 'en' ? undefined : tempBucket?.[locale];
  if (localeTemps?.summerTemperature || localeTemps?.winterTemperature) {
    const source = (destinationCandidate as Record<string, unknown>).averageTemperature as
      | Record<string, unknown>
      | undefined;
    (localizedDestination as Record<string, unknown>).averageTemperature = {
      ...(source || {}),
      ...(localeTemps.summerTemperature ? { summer: localeTemps.summerTemperature } : {}),
      ...(localeTemps.winterTemperature ? { winter: localeTemps.winterTemperature } : {}),
    };
  }

  for (const field of ['longDescription', 'description'] as const) {
    const ld = localizedDestination as Record<string, unknown>;
    if (typeof ld[field] === 'string') {
      ld[field] = localizeHtmlLinks(ld[field] as string, locale);
    }
  }

  const localizedTours = selectedDestinationTours.map((tour: Record<string, unknown>) =>
    localizeEntityFields(tour, locale, [
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
    ])
  );

  const localizedCategories = serializedCategories.map((category: Record<string, unknown>) =>
    localizeEntityFields(category, locale, [
      'name',
      'description',
      'longDescription',
      'highlights',
      'features',
      'metaTitle',
      'metaDescription',
    ])
  );

  const localizedRelatedDestinations = selectLocalizedTaxonomyEntries(
    serializedRelatedDest,
    locale,
    [
      'name',
      'country',
      'description',
      'longDescription',
      'highlights',
      'thingsToDo',
      'metaTitle',
      'metaDescription',
    ]
  ).map((dest: Record<string, unknown>) =>
    ({
      ...localizeEntityFields(dest, locale, [
        'name',
        'country',
        'description',
        'longDescription',
        'highlights',
        'thingsToDo',
        'metaTitle',
        'metaDescription',
      ]),
      tourCount:
        relatedDestinationCountBySlug.get(String(dest.slug || '')) ||
        Number(dest.tourCount) ||
        0,
    })
  );

  return {
    destination: localizedDestination as unknown as Destination,
    destinationTours: localizedTours as unknown as Tour[],
    allCategories: localizedCategories as unknown as Category[],
    reviews: serializedReviews,
    relatedDestinations: localizedRelatedDestinations as unknown as Destination[]
  };
}

export async function renderDestinationDetail(slug: string, locale: string): Promise<React.ReactElement | null> {
  const { destination, destinationTours, allCategories, reviews, relatedDestinations } = await getPageData(slug, locale);

  if (!destination) return null;

  return (
    <>
      <DestinationSchema
        name={destination.name as string}
        slug={slug}
        description={destination.description as string}
        image={destination.image as string}
        country={destination.country as string}
        urlType={destination.urlType}
        parentPage={destination.parentPage}
        tours={destinationTours.map((tour) => ({ title: tour.title, slug: tour.slug, image: tour.image, discountPrice: tour.discountPrice, originalPrice: tour.originalPrice, rating: tour.rating, reviewCount: tour.reviewCount }))}
      />
      <DestinationPageClient
        destination={destination}
        destinationTours={destinationTours}
        allCategories={allCategories}
        reviews={reviews}
        relatedDestinations={relatedDestinations}
      />
    </>
  );
}

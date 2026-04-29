// app/destinations/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import ReviewModel from '@/lib/models/Review';
import DestinationPageClient from './DestinationPageClient';
import DestinationSchema from '@/components/schema/DestinationSchema';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import {
  selectLocalizedTaxonomyEntries,
  selectLocalizedTours,
} from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

// Enable ISR with 60 second revalidation for fast page loads
export const revalidate = 60;
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  try {
    const { locale, slug } = await params;
    await dbConnect();
    const destinationMatches = await DestinationModel.find({ slug })
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

    if (!destination) {
      return {
        title: 'Destination Not Found',
        description: 'The destination you are looking for does not exist.',
      };
    }

    const title = destination.metaTitle
      ? String(destination.metaTitle)
      : `${destination.name}, ${destination.country} - Tours & Activities | Egypt Excursions Online`;
    const description =
      typeof destination.metaDescription === 'string'
        ? destination.metaDescription
        : (destination.description as string)?.substring(0, 160) ||
          `Discover the best tours and activities in ${destination.name}`;

    return {
      title,
      description,
      openGraph: {
        title: `${destination.name}, ${destination.country}`,
        description,
        images: destination.image ? [destination.image] : [],
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Destination - Egypt Excursions Online',
      description: 'Explore amazing destinations in Egypt',
    };
  }
}

async function getPageData(slug: string, locale: string) {
  await dbConnect();

  const destinationMatches = await DestinationModel.find({ slug }).lean();
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

  const destinationIds = serializedDestinationMatches.map((destination) => (destination as any)._id);
  const baseDestinationTours = await TourModel.find({
    destination: { $in: destinationIds },
    isPublished: true,
    ...DEFAULT_TENANT_FILTER,
  }).populate('destination').populate('category').lean();

  const allCategories = await CategoryModel.find({}).lean();

  // Fetch reviews for tours in this destination
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

  const tourIds = selectedDestinationTours.map((tour) => (tour as any)._id);
  const reviews = await ReviewModel.find({
    tour: { $in: tourIds },
    verified: true
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  // Fetch related destinations (same country or similar)
  const relatedDestinationsRaw = await DestinationModel.find({
    _id: { $nin: destinationIds },
    $or: [
      { country: (destinationCandidate as any).country },
      { featured: true }
    ]
  })
    .limit(4)
    .lean();

  // Calculate tour count for each related destination
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
  const serializedReviews = JSON.parse(JSON.stringify(reviews));
  const serializedRelatedDest = JSON.parse(JSON.stringify(relatedDestinations));
  const relatedDestinationCountBySlug = new Map<string, number>();

  for (const destination of serializedRelatedDest as Record<string, unknown>[]) {
    const slug = String(destination.slug || '');
    if (!slug) continue;
    const count = Number(destination.tourCount) || 0;
    relatedDestinationCountBySlug.set(slug, Math.max(relatedDestinationCountBySlug.get(slug) || 0, count));
  }

  const localizedDestination = localizeEntityFields(destinationCandidate, locale, [
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
  ]);

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
    destination: localizedDestination,
    destinationTours: localizedTours,
    allCategories: localizedCategories,
    reviews: serializedReviews,
    relatedDestinations: localizedRelatedDestinations
  };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const { destination, destinationTours, allCategories, reviews, relatedDestinations } = await getPageData(
    slug,
    locale
  );

  if (!destination) {
    notFound();
  }

  return (
    <>
      <DestinationSchema
        name={destination.name as string}
        slug={slug}
        description={destination.description as string}
        image={destination.image as string}
        country={destination.country as string}
        tours={destinationTours.map((t: any) => ({ title: t.title, slug: t.slug, image: t.image, discountPrice: t.discountPrice, originalPrice: t.originalPrice, rating: t.rating, reviewCount: t.reviewCount }))}
      />
      <DestinationPageClient
        destination={destination as any}
        destinationTours={destinationTours as any}
        allCategories={allCategories}
        reviews={reviews}
        relatedDestinations={relatedDestinations as any}
      />
    </>
  );
}

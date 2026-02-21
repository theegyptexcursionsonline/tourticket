// app/destinations/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import ReviewModel from '@/lib/models/Review';
import DestinationPageClient from './DestinationPageClient';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';

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
    const destinationRaw = await DestinationModel.findOne({ slug })
      .select('name description image country metaTitle metaDescription translations')
      .lean();
    const destination = destinationRaw
      ? localizeEntityFields(destinationRaw as Record<string, unknown>, locale, [
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

  const destinationRaw = await DestinationModel.findOne({ slug }).lean();
  if (!destinationRaw) {
    return {
      destination: null,
      destinationTours: [],
      allCategories: [],
      reviews: [],
      relatedDestinations: []
    };
  }

  // Fetch published tours for this destination
  const destinationTours = await TourModel.find({
    destination: destinationRaw._id,
    isPublished: true
  }).lean();

  const allCategories = await CategoryModel.find({}).lean();

  // Fetch reviews for tours in this destination
  const tourIds = destinationTours.map(tour => tour._id);
  const reviews = await ReviewModel.find({
    tour: { $in: tourIds },
    verified: true
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  // Fetch related destinations (same country or similar)
  const relatedDestinationsRaw = await DestinationModel.find({
    _id: { $ne: destinationRaw._id },
    $or: [
      { country: destinationRaw.country },
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
        isPublished: true
      });
      return {
        ...dest,
        tourCount
      };
    })
  );

  const serializedDestination = JSON.parse(JSON.stringify(destinationRaw));
  const serializedTours = JSON.parse(JSON.stringify(destinationTours));
  const serializedCategories = JSON.parse(JSON.stringify(allCategories));
  const serializedReviews = JSON.parse(JSON.stringify(reviews));
  const serializedRelatedDest = JSON.parse(JSON.stringify(relatedDestinations));

  const localizedDestination = localizeEntityFields(serializedDestination, locale, [
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

  const localizedTours = serializedTours.map((tour: Record<string, unknown>) =>
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

  const localizedRelatedDestinations = serializedRelatedDest.map((dest: Record<string, unknown>) =>
    localizeEntityFields(dest, locale, [
      'name',
      'country',
      'description',
      'longDescription',
      'highlights',
      'thingsToDo',
      'metaTitle',
      'metaDescription',
    ])
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
    <DestinationPageClient
      destination={destination}
      destinationTours={destinationTours}
      allCategories={allCategories}
      reviews={reviews}
      relatedDestinations={relatedDestinations}
    />
  );
}

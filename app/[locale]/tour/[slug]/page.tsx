// app/tour/[slug]/page.tsx

import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import DestinationModel from '@/lib/models/Destination';
import CategoryModel from '@/lib/models/Category';
import ReviewModel from '@/lib/models/Review';
import UserModel from '@/lib/models/user';
import { Tour, Review } from '@/types';
import TourPageClient from './TourPageClient';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

// Fetch tour data and reviews from database
async function getTourData(
  slug: string,
  locale: string
): Promise<{ tour: Tour | null; relatedTours: Tour[]; reviews: Review[] }> {
  try {
    await dbConnect();

    // Find the tour by slug and populate references
    const tour = await TourModel.findOne({ slug })
      .populate({
        path: 'destination',
        model: DestinationModel,
        select: 'name slug'
      })
      .populate({
        path: 'category',
        model: CategoryModel,
        select: 'name slug'
      })
      .lean();

    if (!tour) {
      return { tour: null, relatedTours: [], reviews: [] };
    }

    // Find reviews for this tour
    const reviews = await ReviewModel.find({ tour: tour._id })
        .populate({
            path: 'user',
            model: UserModel,
            select: 'name picture'
        })
        .sort({ createdAt: -1 })
        .lean();

    // Find related tours from the same destination
    const relatedTours = await TourModel.find({
      destination: tour.destination,
      _id: { $ne: tour._id },
      isPublished: true
    })
    .populate({
      path: 'destination',
      model: DestinationModel,
      select: 'name'
    })
    .limit(3)
    .lean();

    // Serialize the data for client component
    const serializedTour = JSON.parse(JSON.stringify(tour));
    const serializedRelatedTours = JSON.parse(JSON.stringify(relatedTours));
    const serializedReviews = JSON.parse(JSON.stringify(reviews));


    const localizedTour = localizeEntityFields(serializedTour, locale, [
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
      'cancellationPolicy',
      'meetingPoint',
      'operatedBy',
      'transportationDetails',
      'mealInfo',
      'weatherPolicy',
      'photoPolicy',
      'tipPolicy',
      'healthSafety',
      'culturalInfo',
      'seasonalVariations',
      'localCustoms',
      'whatToBring',
      'whatToWear',
      'physicalRequirements',
      'accessibilityInfo',
      'languages',
      'ageRestriction',
    ]) as Tour;

    if (localizedTour.destination && typeof localizedTour.destination === 'object') {
      localizedTour.destination = localizeEntityFields(
        localizedTour.destination as Record<string, unknown>,
        locale,
        ['name', 'description', 'country']
      ) as any;
    }

    if (localizedTour.category && typeof localizedTour.category === 'object') {
      localizedTour.category = localizeEntityFields(
        localizedTour.category as Record<string, unknown>,
        locale,
        ['name', 'description', 'longDescription']
      ) as any;
    }

    const localizedRelatedTours = serializedRelatedTours.map((relatedTour: Record<string, unknown>) => {
      const localizedRelatedTour = localizeEntityFields(relatedTour, locale, [
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

      if (localizedRelatedTour.destination && typeof localizedRelatedTour.destination === 'object') {
        localizedRelatedTour.destination = localizeEntityFields(
          localizedRelatedTour.destination as Record<string, unknown>,
          locale,
          ['name', 'description', 'country']
        );
      }

      if (localizedRelatedTour.category && typeof localizedRelatedTour.category === 'object') {
        localizedRelatedTour.category = localizeEntityFields(
          localizedRelatedTour.category as Record<string, unknown>,
          locale,
          ['name', 'description', 'longDescription']
        );
      }

      return localizedRelatedTour;
    }) as Tour[];

    return { tour: localizedTour, relatedTours: localizedRelatedTours, reviews: serializedReviews };
  } catch (error) {
    console.error('Error fetching tour data:', error);
    return { tour: null, relatedTours: [], reviews: [] };
  }
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  try {
    const { locale, slug } = await params;
    await dbConnect();
    const tourRaw = await TourModel.findOne({ slug })
      .select('title description image discountPrice originalPrice metaTitle metaDescription translations')
      .lean();

    const tour = tourRaw
      ? localizeEntityFields(tourRaw as Record<string, unknown>, locale, [
          'title',
          'description',
          'metaTitle',
          'metaDescription',
        ])
      : null;

    if (!tour) {
      return {
        title: 'Tour Not Found',
        description: 'The tour you are looking for does not exist.',
      };
    }

    const price = tour.discountPrice || tour.originalPrice || 0;
    return {
      title: tour.metaTitle || `${tour.title} - Egypt Excursions Online`,
      description:
        tour.metaDescription ||
        tour.description?.substring(0, 160) ||
        `Book ${tour.title} with Egypt Excursions Online`,
      openGraph: {
        title: tour.title,
        description:
          tour.metaDescription || tour.description?.substring(0, 160),
        images: tour.image ? [tour.image] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: tour.title,
        description:
          tour.metaDescription || tour.description?.substring(0, 160),
        images: tour.image ? [tour.image] : [],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Tour - Egypt Excursions Online',
      description: 'Discover amazing tours and experiences in Egypt',
    };
  }
}

// Main page component
export default async function TourPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const { tour, relatedTours, reviews } = await getTourData(slug, locale);

  if (!tour) {
    notFound();
  }

  return <TourPageClient tour={tour} relatedTours={relatedTours} initialReviews={reviews} />;
}

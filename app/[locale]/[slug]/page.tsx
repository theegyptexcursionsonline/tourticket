import React from 'react';
import { notFound } from 'next/navigation';
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

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const localizeTourFields = (tour: ITour, locale: string) =>
  localizeTour(tour as unknown as Record<string, unknown>, locale) as unknown as ITour;

const localizeTaxonomyFields = (entity: unknown, locale: string, fields: string[]) =>
  localizeEntityFields(entity as Record<string, unknown>, locale, fields);

async function getTourBySlug(slug: string): Promise<{ tour: ITour; reviews: any[] } | null> {
  try {
    console.log(`[TourDetail] Connecting to DB for slug: ${slug}`);
    await dbConnect();
    console.log(`[TourDetail] DB connected, querying tour: ${slug}`);

    const tour = await Tour.findOne({ slug })
      .populate('destination', 'name slug')
      .populate('category', 'name slug')
      .lean();

    if (!tour) {
      console.log(`[TourDetail] Tour not found: ${slug}`);
      return null;
    }

    console.log(`[TourDetail] Tour found: ${tour.title}, fetching reviews`);

    // Fetch reviews separately
    const reviews = await Review.find({ tour: tour._id })
      .populate('user', 'firstName lastName picture')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[TourDetail] Loaded ${reviews.length} reviews for: ${slug}`);

    return {
      tour: JSON.parse(JSON.stringify(tour)),
      reviews: JSON.parse(JSON.stringify(reviews))
    };
  } catch (error) {
    console.error(`[TourDetail] Error loading tour "${slug}":`, error);
    throw error;
  }
}

async function getRelatedTours(categoryIds: string | string[] | any, currentTourId: string): Promise<ITour[]> {
  await dbConnect();

  // Extract category IDs from populated categories or use the IDs directly
  let categoryIdArray: string[] = [];
  if (Array.isArray(categoryIds)) {
    categoryIdArray = categoryIds.map(cat => typeof cat === 'object' ? cat._id?.toString() : cat?.toString()).filter(Boolean);
  } else if (categoryIds) {
    const catId = typeof categoryIds === 'object' ? categoryIds._id?.toString() : categoryIds?.toString();
    if (catId) categoryIdArray = [catId];
  }

  if (categoryIdArray.length === 0) {
    return [];
  }

  const relatedTours = await Tour.find({
    category: { $in: categoryIdArray },
    _id: { $ne: currentTourId },
    isPublished: true
  })
    .populate('destination', 'name')
    .populate('category', 'name')
    .select('title slug image discountPrice originalPrice duration destination category rating reviewCount tags')
    .limit(3)
    .lean();

  return JSON.parse(JSON.stringify(relatedTours));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const result = await getTourBySlug(slug);

  if (!result) {
    return {
      title: 'Tour Not Found',
    };
  }

  const localizedTour = localizeTourFields(result.tour, locale);
  const destination = typeof localizedTour.destination === 'object' ? (localizedTour.destination as any) : null;

  return {
    title: localizedTour.metaTitle || `${localizedTour.title} | ${destination?.name || 'Travel'} Tours`,
    description: localizedTour.metaDescription || localizedTour.description,
    keywords: localizedTour.keywords || [localizedTour.title, destination?.name].filter(Boolean),
    openGraph: {
      title: localizedTour.title,
      description: localizedTour.description,
      images: localizedTour.image ? [{ url: localizedTour.image, alt: localizedTour.title }] : [],
      type: 'website',
    },
  };
}

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

export default async function TourDetailPage({ params }: PageProps) {
  const { slug, locale } = await params;
  console.log(`[TourDetail] Rendering page for slug: ${slug}`);

  const result = await getTourBySlug(slug);

  if (!result) {
    notFound();
  }

  const { tour, reviews } = result;

  let relatedTours: ITour[] = [];
  try {
    relatedTours = await getRelatedTours(tour.category, (tour._id as any)?.toString());
  } catch (error) {
    console.error(`[TourDetail] Failed to load related tours for: ${slug}`, error);
  }

  const localizedTour = localizeTourFields(tour, locale);

  if (localizedTour.destination && typeof localizedTour.destination === 'object') {
    localizedTour.destination = localizeTaxonomyFields(
      localizedTour.destination as unknown,
      locale,
      ['name', 'description', 'country', 'metaTitle', 'metaDescription']
    ) as any;
  }

  if (localizedTour.category && !Array.isArray(localizedTour.category) && typeof localizedTour.category === 'object') {
    localizedTour.category = localizeTaxonomyFields(
      localizedTour.category as unknown,
      locale,
      ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription']
    ) as any;
  }

  const localizedRelatedTours = relatedTours.map((relatedTour) => {
    const localizedRelated = localizeTourFields(relatedTour, locale);

    if (localizedRelated.destination && typeof localizedRelated.destination === 'object') {
      localizedRelated.destination = localizeTaxonomyFields(
        localizedRelated.destination as unknown,
        locale,
        ['name', 'description', 'country', 'metaTitle', 'metaDescription']
      ) as any;
    }

    if (localizedRelated.category && !Array.isArray(localizedRelated.category) && typeof localizedRelated.category === 'object') {
      localizedRelated.category = localizeTaxonomyFields(
        localizedRelated.category as unknown,
        locale,
        ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription']
      ) as any;
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
      />
      <Footer />
    </>
  );
}

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;
export const dynamicParams = true;

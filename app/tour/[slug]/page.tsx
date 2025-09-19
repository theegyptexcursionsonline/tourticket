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

// Generate static params for pre-building
export async function generateStaticParams() {
  try {
    await dbConnect();
    const tours = await TourModel.find({ isPublished: true }).select('slug').lean();
    return tours.map((tour) => ({
      slug: tour.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// Fetch tour data and reviews from database
async function getTourData(slug: string): Promise<{ tour: Tour | null; relatedTours: Tour[]; reviews: Review[] }> {
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


    return { tour: serializedTour, relatedTours: serializedRelatedTours, reviews: serializedReviews };
  } catch (error) {
    console.error('Error fetching tour data:', error);
    return { tour: null, relatedTours: [], reviews: [] };
  }
}

// Main page component
export default async function TourPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { tour, relatedTours, reviews } = await getTourData(slug);

  if (!tour) {
    notFound();
  }

  return <TourPageClient tour={tour} relatedTours={relatedTours} initialReviews={reviews} />;
}
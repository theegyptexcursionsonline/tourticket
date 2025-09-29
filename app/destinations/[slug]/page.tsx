// app/destinations/[slug]/page.tsx (updated)
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import ReviewModel from '@/lib/models/Review';
import { Tour, Destination, Category, Review } from '@/types';
import DestinationPageClient from './DestinationPageClient';

// ... (keep existing mock functions)

async function getPageData(slug: string) {
  await dbConnect();

  const destination = await DestinationModel.findOne({ slug }).lean();
  if (!destination) {
    return { 
      destination: null, 
      destinationTours: [], 
      allCategories: [],
      reviews: [],
      relatedDestinations: []
    };
  }

  let destinationTours = await TourModel.find({ destination: destination._id }).lean();
  let allCategories = await CategoryModel.find({}).lean();

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
  const relatedDestinations = await DestinationModel.find({
    _id: { $ne: destination._id },
    $or: [
      { country: destination.country },
      { featured: true }
    ]
  })
    .limit(4)
    .lean();

  // If no real tours found, use mock data
  if (!destinationTours || destinationTours.length === 0) {
    console.log(`No tours found for ${destination.name}, using mock data`);
    destinationTours = generateMockTours(destination);
    destination.tourCount = destinationTours.length;
  }

  if (!allCategories || allCategories.length === 0) {
    allCategories = getMockCategories();
  }

  const serializedDestination = JSON.parse(JSON.stringify(destination));
  const serializedTours = JSON.parse(JSON.stringify(destinationTours));
  const serializedCategories = JSON.parse(JSON.stringify(allCategories));
  const serializedReviews = JSON.parse(JSON.stringify(reviews));
  const serializedRelatedDest = JSON.parse(JSON.stringify(relatedDestinations));

  return { 
    destination: serializedDestination, 
    destinationTours: serializedTours, 
    allCategories: serializedCategories,
    reviews: serializedReviews,
    relatedDestinations: serializedRelatedDest
  };
}

export default async function DestinationPage({ params }: { params: { slug: string } }) {
  const { destination, destinationTours, allCategories, reviews, relatedDestinations } = await getPageData(params.slug);

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
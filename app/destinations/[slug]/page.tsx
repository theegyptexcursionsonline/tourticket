// app/destinations/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import ReviewModel from '@/lib/models/Review';
import DestinationPageClient from './DestinationPageClient';

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

  // Fetch published tours for this destination
  const destinationTours = await TourModel.find({
    destination: destination._id,
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
    _id: { $ne: destination._id },
    $or: [
      { country: destination.country },
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
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import DestinationModel from '@/lib/models/Destination';
import { Tour } from '@/types';
import TourPageClient from './TourPageClient'; // We will create this client component next

// This function tells Next.js which tour pages to pre-build.
// It MUST be in a server component.
export async function generateStaticParams() {
  await dbConnect();
  const tours = await TourModel.find({}).select('slug').lean();
  return tours.map((tour) => ({
    slug: tour.slug,
  }));
}

// This function fetches the data for a specific tour on the server.
async function getTourData(slug: string): Promise<{ tour: Tour | null; relatedTours: Tour[] }> {
  await dbConnect();

  // Find the tour by its slug and populate its destination
  const tour = await TourModel.findOne({ slug })
    .populate({
      path: 'destination',
      model: DestinationModel,
      select: 'name'
    })
    .lean();

  if (!tour) {
    return { tour: null, relatedTours: [] };
  }

  // Find related tours from the same destination
  const relatedTours = await TourModel.find({
    destination: tour.destination,
    _id: { $ne: tour._id }, // Exclude the current tour
  })
  .limit(3)
  .lean();

  // Next.js requires plain objects to be passed from Server to Client Components,
  // so we serialize the data to ensure all values (like MongoDB's ObjectId) are strings.
  const serializedTour = JSON.parse(JSON.stringify(tour));
  const serializedRelatedTours = JSON.parse(JSON.stringify(relatedTours));

  return { tour: serializedTour, relatedTours: serializedRelatedTours };
}


// This is the main Page component. It's a Server Component by default.
export default async function TourPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { tour, relatedTours } = await getTourData(slug);

  // If the tour is not found, render the 404 page.
  if (!tour) {
    notFound();
  }

  // Render the Client Component and pass the fetched data as props.
  return <TourPageClient tour={tour} relatedTours={relatedTours} />;
}
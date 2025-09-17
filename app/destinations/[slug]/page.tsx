import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import { Tour, Destination, Category } from '@/types';
import DestinationPageClient from './DestinationPageClient'; 

// This function tells Next.js which destination pages to pre-build.
export async function generateStaticParams() {
  await dbConnect();
  const destinations = await DestinationModel.find({}).select('slug').lean();
  return destinations.map((dest) => ({
    slug: dest.slug,
  }));
}

// This function fetches all the necessary data for the destination page on the server.
async function getPageData(slug: string) {
  await dbConnect();

  const destination = await DestinationModel.findOne({ slug }).lean();
  if (!destination) {
    return { destination: null, destinationTours: [], allCategories: [] };
  }

  const destinationTours = await TourModel.find({ destination: destination._id }).lean();
  const allCategories = await CategoryModel.find({}).lean();

  // Serialize data to pass to client component
  const serializedDestination = JSON.parse(JSON.stringify(destination));
  const serializedTours = JSON.parse(JSON.stringify(destinationTours));
  const serializedCategories = JSON.parse(JSON.stringify(allCategories));

  return { 
    destination: serializedDestination, 
    destinationTours: serializedTours, 
    allCategories: serializedCategories 
  };
}

// This is the main Page component. It's a Server Component.
export default async function DestinationPage({ params }: { params: { slug: string } }) {
  const { destination, destinationTours, allCategories } = await getPageData(params.slug);

  if (!destination) {
    notFound();
  }

  // Render the Client Component and pass the fetched data as props.
  return (
    <DestinationPageClient
      destination={destination}
      destinationTours={destinationTours}
      allCategories={allCategories}
    />
  );
}
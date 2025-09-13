import React from 'react';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DestinationsClientPage from './DestinationsClientPage';
import { IDestination } from '@/lib/models/Destination';

// Server-side function to fetch all destinations and their tour counts
async function getDestinationsWithTourCounts(): Promise<IDestination[]> {
  await dbConnect();
  
  // Fetch all destinations
  const destinations = await Destination.find({}).lean();
  
  // For each destination, count the number of tours
  const destinationsWithCounts = await Promise.all(
    destinations.map(async (dest) => {
      const tourCount = await Tour.countDocuments({ destination: dest._id });
      return {
        ...dest,
        tourCount: tourCount,
      };
    })
  );

  // Serialize the data to pass to the client component
  return JSON.parse(JSON.stringify(destinationsWithCounts));
}

// The main server component for the /destinations route
export default async function DestinationsIndexPage() {
  const destinations = await getDestinationsWithTourCounts();

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <DestinationsClientPage destinations={destinations} />
      </main>
      <Footer />
    </>
  );
}

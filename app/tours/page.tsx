import React from 'react';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ToursClientPage from './ToursClientPage';
import { ITour } from '@/lib/models/Tour';

// Server-side function to fetch all tours with populated data
async function getAllTours(): Promise<ITour[]> {
  await dbConnect();
  
  const tours = await Tour.find({})
    .populate('destination', 'name')
    .populate('categories', 'name')
    .sort({ createdAt: -1 })
    .lean();
  
  // Serialize the data to pass to the client component
  return JSON.parse(JSON.stringify(tours));
}

// The main server component for the /tours route
export default async function ToursIndexPage() {
  const tours = await getAllTours();

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <ToursClientPage tours={tours} />
      </main>
      <Footer />
    </>
  );
}

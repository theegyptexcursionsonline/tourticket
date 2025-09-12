// app/admin/tours/edit/[id]/page.tsx

import TourForm from '@/components/TourForm'; // Make sure path to TourForm is correct
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

async function getTourById(id: string) {
  await dbConnect();
  try {
    const tour = await Tour.findById(id).populate('destination').populate('categories');
    if (!tour) {
      return null;
    }
    // Convert Mongoose document to a plain object for the client component
    return JSON.parse(JSON.stringify(tour));
  } catch (error) {
    // This can happen if the ID format is invalid for MongoDB ObjectId
    console.error("Failed to fetch tour by ID:", error);
    return null;
  }
}

interface EditTourPageProps {
  params: {
    id: string;
  };
}

export default async function EditTourPage({ params }: EditTourPageProps) {
  const { id } = params;
  const tour = await getTourById(id);

  if (!tour) {
    notFound(); // Triggers the not-found.tsx page if tour doesn't exist
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {/* CORRECTED: Replaced the <Button> with a styled <Link> */}
        <Link 
            href="/admin/tours"
            className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
        >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Tours</span>
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">Edit Tour: {tour.title}</h1>
      </div>
      
      <TourForm tourToEdit={tour} />
    </div>
  );
}
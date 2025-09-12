// app/admin/tours/page.tsx
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { PopulatedTour } from '@/types';
import Link from 'next/link';
import { ToursListClient } from './ToursListClient';

async function getTours(): Promise<PopulatedTour[]> {
  await dbConnect();
  const tours = await Tour.find({})
    .populate('destination')
    .sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(tours));
}

export default async function ToursPage() {
  const tours = await getTours();

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Manage Tours</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, edit and manage your tours. Use search or switch views below.
          </p>
        </div>

        <Link
          href="/admin/tours/new"
          className="inline-flex items-center gap-2 bg-gradient-to-tr from-sky-600 to-indigo-600 text-white px-4 py-2 rounded-md shadow hover:opacity-95 transition"
        >
          Add New Tour
        </Link>
      </div>

      {/* Pass data into the client component */}
      <ToursListClient tours={tours} />
    </div>
  );
}

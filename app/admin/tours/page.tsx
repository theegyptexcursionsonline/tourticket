// app/admin/tours/page.tsx
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { ITour } from '@/lib/models/Tour';
import { IDestination } from '@/lib/models/Destination';
import TourActions from './TourActions';

type PopulatedTour = Omit<ITour, 'destination'> & { _id: string; destination: IDestination; };

async function getTours(): Promise<PopulatedTour[]> {
  await dbConnect();
  const tours = await Tour.find({}).populate('destination').sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(tours));
}

export default async function ToursPage() {
  const tours = await getTours();
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(price);
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tours</h2>
          <p className="text-sm text-slate-600">Manage all the tours available on your website.</p>
        </div>
        <Link href="/admin/tours/new" className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm">
          <PlusCircle className="h-4 w-4" />
          Create New Tour
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3">Title</th>
              <th scope="col" className="px-6 py-3">Destination</th>
              <th scope="col" className="px-6 py-3">Price</th>
              <th scope="col" className="px-6 py-3">Duration</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tours.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">No tours found.</td>
              </tr>
            ) : (
              tours.map((tour) => (
                <tr key={tour._id} className="bg-white border-b hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{tour.title}</td>
                  <td className="px-6 py-4">{tour.destination?.name || 'N/A'}</td>
                  <td className="px-6 py-4">{formatPrice(tour.discountPrice)}</td>
                  <td className="px-6 py-4">{tour.duration}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        tour.isFeatured 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {tour.isFeatured ? 'Featured' : 'Standard'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <TourActions tourId={tour._id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
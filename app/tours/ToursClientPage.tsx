'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Star } from 'lucide-react';
import { ITour } from '@/lib/models/Tour';
import { useSettings } from '@/hooks/useSettings';

interface TourWithDetails extends ITour {
  destination: { name: string };
  categories: { name: string }[];
}

interface ToursClientPageProps {
  tours: TourWithDetails[];
}

const TourCard = ({ tour }: { tour: TourWithDetails }) => {
    const { formatPrice } = useSettings();
    return (
        <Link href={`/tour/${tour.slug}`} className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <div className="relative h-48">
            <Image
                src={tour.image || '/images/placeholder.png'}
                alt={`Image of ${tour.title}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
            </div>
            <div className="p-4 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-red-600 transition-colors h-14 line-clamp-2">{tour.title}</h3>
                <div className="flex items-center text-sm text-slate-500 mt-2">
                    <Clock size={14} className="mr-1.5" />
                    <span>{tour.duration}</span>
                    <Star size={14} className="ml-4 mr-1 text-yellow-400 fill-current" />
                    <span>{tour.rating || 'N/A'}</span>
                </div>
                 <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-slate-600">{tour.destination?.name}</div>
                    <div className="text-right">
                        {tour.originalPrice && <span className="text-sm text-slate-400 line-through mr-2">{formatPrice(tour.originalPrice)}</span>}
                        <span className="text-xl font-bold text-red-600">{formatPrice(tour.discountPrice)}</span>
                    </div>
                </div>
            </div>
        </Link>
    )
};


export default function ToursClientPage({ tours }: ToursClientPageProps) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">All Available Tours</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Browse our complete collection of handpicked experiences. Your next adventure awaits!
        </p>
      </div>

      {tours.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {tours.map((tour) => (
            <TourCard key={tour._id} tour={tour} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-slate-500">No tours are currently available. Please check back later.</p>
        </div>
      )}
    </div>
  );
}

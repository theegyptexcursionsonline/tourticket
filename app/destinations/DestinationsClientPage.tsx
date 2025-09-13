'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { IDestination } from '@/lib/models/Destination';

interface DestinationWithCount extends IDestination {
    tourCount: number;
}

interface DestinationsClientPageProps {
  destinations: DestinationWithCount[];
}

const DestinationCard = ({ destination }: { destination: DestinationWithCount }) => (
  <Link href={`/destinations/${destination.slug}`} className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
    <div className="relative h-48">
      <Image
        src={destination.image}
        alt={`Image of ${destination.name}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
       <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
    </div>
    <div className="p-4">
      <h3 className="text-xl font-bold text-slate-800 group-hover:text-red-600 transition-colors">{destination.name}</h3>
      <div className="flex items-center text-sm text-slate-500 mt-1">
        <MapPin size={14} className="mr-1.5" />
        <span>{destination.tourCount} tours available</span>
      </div>
    </div>
  </Link>
);


export default function DestinationsClientPage({ destinations }: DestinationsClientPageProps) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">Explore Our Destinations</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          From ancient wonders to modern marvels, find your next adventure in one of our handpicked locations.
        </p>
      </div>

      {destinations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {destinations.map((dest) => (
            <DestinationCard key={dest._id} destination={dest} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-slate-500">No destinations are currently available. Please check back later.</p>
        </div>
      )}
    </div>
  );
}

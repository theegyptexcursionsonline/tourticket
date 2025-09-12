// components/Destinations.tsx
'use client';
import { useState, useEffect } from 'react';
import ComingSoonModal from './ComingSoonModal';
import Link from 'next/link';
import Image from 'next/image';
import { Destination } from '@/types';
import { Loader2 } from 'lucide-react';

export default function Destinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('');

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await fetch('/api/admin/destinations');
        const data = await response.json();
        if (data.success) {
          setDestinations(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch destinations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDestinations();
  }, []);

  const handleDestinationClick = (destinationSlug: string, destinationName: string) => {
    const destination = destinations.find(d => d.slug === destinationSlug);
    
    if (destination) {
      window.location.href = `/destinations/${destinationSlug}`;
    } else {
      setSelectedDestination(destinationName);
      setModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <section className="bg-white py-16 animate-pulse">
        <div className="container mx-auto px-4">
          <div className="h-10 w-1/3 bg-slate-200 rounded-lg mb-8" />
          <div className="flex justify-center gap-8 flex-wrap">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="text-center group cursor-pointer">
                <div className="w-40 h-40 rounded-full bg-slate-200 shadow-lg" />
                <div className="h-6 w-24 mx-auto mt-4 bg-slate-200 rounded" />
                <div className="h-4 w-16 mx-auto mt-2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-slate-800 mb-8">
            Where are you going?
          </h2>
          <div className="flex justify-center gap-8 flex-wrap">
            {destinations.map((destination) => (
              <div
                key={destination._id}
                className="text-center group cursor-pointer"
                onClick={() => handleDestinationClick(destination.slug, destination.name)}
              >
                <div className="relative w-40 h-40 rounded-full overflow-hidden shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl">
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
                </div>
                <h3 className="mt-4 font-bold text-lg text-slate-800 group-hover:text-red-500 transition-colors">
                  {destination.name}
                </h3>
                <p className="text-sm text-slate-500">{destination.tourCount} tours</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ComingSoonModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        destination={selectedDestination}
      />
    </>
  );
}
'use client';
import { useState } from 'react';
import { destinations } from '@/lib/data/destinations';
import ComingSoonModal from './ComingSoonModal';

export default function Destinations() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('');

  const handleDestinationClick = (destinationSlug: string, destinationName: string) => {
    // Check if destination has tours
    const destination = destinations.find(d => d.slug === destinationSlug);
    if (destination && destination.tourCount > 0) {
      // Navigate to destination page
      window.location.href = `/destinations/${destinationSlug}`;
    } else {
      // Show coming soon modal
      setSelectedDestination(destinationName);
      setModalOpen(true);
    }
  };

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
                key={destination.id}
                className="text-center group cursor-pointer"
                onClick={() => handleDestinationClick(destination.slug, destination.name)}
              >
                <div className="relative w-40 h-40 rounded-full overflow-hidden shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl">
                  <img
                    src={destination.image}
                    alt={destination.name}
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
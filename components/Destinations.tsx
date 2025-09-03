'use client';
import { useState } from 'react';
import ComingSoonModal from './ComingSoonModal';

const destinations = [
  {
    name: 'AMSTERDAM',
    image: 'https://images.unsplash.com/photo-1525875263473-b3a21358b5c1?q=80&w=1974&auto=format&fit=crop',
  },
  {
    name: 'BERLIN',
    image: 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?q=80&w=2070&auto=format&fit=crop',
  },
  {
    name: 'COPENHAGEN',
    image: 'https://images.unsplash.com/photo-1512470876302-9722238a3a02?q=80&w=2072&auto=format&fit=crop',
  },
  {
    name: 'ROTTERDAM',
    image: 'https://images.unsplash.com/photo-1596201732943-ae62bfdfc088?q=80&w=1974&auto=format&fit=crop',
  },
  {
    name: 'STOCKHOLM',
    image: 'https://images.unsplash.com/photo-1588803120668-5a52a41d5568?q=80&w=2070&auto=format&fit=crop',
  },
];

export default function Destinations() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('');

  const handleDestinationClick = (destinationName: string) => {
    setSelectedDestination(destinationName);
    setModalOpen(true);
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
                key={destination.name}
                className="text-center group cursor-pointer"
                onClick={() => handleDestinationClick(destination.name)}
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

'use client';
import { useState } from 'react';
import ComingSoonModal from './ComingSoonModal';

const destinations = [
  {
    name: 'AMSTERDAM',
    image: '/images/amsterdam.png',
  },
  {
    name: 'BERLIN',
    image: '/images/berlin.png',
  },
  {
    name: 'COPENHAGEN',
    image: '/images/3.png',
  },
  {
    name: 'ROTTERDAM',
    image: '/images/4.png',
  },
  {
    name: 'STOCKHOLM',
    image: '/images/5.png',
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

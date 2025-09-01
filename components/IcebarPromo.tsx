'use client';

import { ArrowRight } from 'lucide-react';

export default function IcebarPromo() {
  return (
    <section className="relative bg-gray-900 py-24 sm:py-32">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1542373428-56c5b23a3e9c?q=80&w=2070&auto=format&fit=crop"
          alt="A vibrant, blue-lit bar interior suggesting an ice theme"
          className="w-full h-full object-cover opacity-30"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-3xl ml-auto text-white text-right">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-wider text-shadow-lg">
            Amsterdam Icebar
          </h2>
          <p className="mt-6 text-lg md:text-xl max-w-2xl ml-auto text-gray-200 text-shadow leading-relaxed">
            Brave the North Pole at Icebar Amsterdam! Carved from tons of natural ice, this -10°C wonderland offers a thrilling experience. Book your Icebar Amsterdam tickets now and enjoy an extra cold experience!
          </p>
          <div className="mt-10">
            <button className="bg-red-600 text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-red-700 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg">
              ABOUT PRODUCT
            </button>
          </div>
        </div>
      </div>
       <style jsx global>{`
        .text-shadow { text-shadow: 1px 1px 3px rgb(0 0 0 / 0.7); }
        .text-shadow-lg { text-shadow: 2px 2px 5px rgb(0 0 0 / 0.8); }
      `}</style>
    </section>
  );
}
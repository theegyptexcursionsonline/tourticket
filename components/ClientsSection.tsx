"use client";
import React from 'react';
import Image from 'next/image';

// --- Client Logo Data ---
// IMPORTANT: Make sure all logo images are placed in the `public/logo/` directory

// Top row clients (scrolling left)
const topRowClients = [
  { name: 'BHEL', logo: '/logo/bhel.png' },
  { name: 'Crompton Greaves', logo: '/logo/crompton.png' },
  { name: 'TBEA Energy', logo: '/logo/image3.png' },
  { name: 'Transformers & Rectifiers', logo: '/logo/image.png' },
  { name: 'Tesla Transformers Ltd.', logo: '/logo/image2.png' },
];

// Bottom row clients (scrolling right)
const bottomRowClients = [
  { name: 'Shirdi Sai Electricals', logo: '/logo/image1.png' },
  { name: 'Technical Associates', logo: '/logo/image4.png' },
  { name: 'Atlanta Electricals', logo: '/logo/image5.png' },
  { name: 'ECE Industries Ltd', logo: '/logo/image6.png' },
  { name: 'Raychem RPG', logo: '/logo/image7.png' },
];

const ScrollingClients = () => {
  // Create extended arrays for seamless looping
  const extendedTopClients = [...topRowClients, ...topRowClients, ...topRowClients];
  const extendedBottomClients = [...bottomRowClients, ...bottomRowClients, ...bottomRowClients];

  return (
    <div className="bg-slate-50 py-24 sm:py-32">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-700">Our Valued Clients</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Trusted by the Industry's Best
          </p>
        </div>
      </div>

      {/* Scrolling Marquee Container */}
      <div className="mt-16 w-full overflow-x-hidden">
        <div className="flex flex-col gap-y-6">
          {/* Top Row: Scrolling Left */}
          <div className="flex animate-[scroll-left_40s_linear_infinite] items-center gap-x-6">
            {extendedTopClients.map((client, index) => (
              <div
                key={`top-${index}`}
                className="flex h-24 w-48 flex-none items-center justify-center rounded-lg border border-gray-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <Image
                  src={client.logo}
                  alt={`${client.name} logo`}
                  width={160}
                  height={60}
                  className="h-full w-full object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                  priority={index < 5} // Prioritize loading first 5 images
                />
              </div>
            ))}
          </div>

          {/* Bottom Row: Scrolling Right */}
          <div className="flex animate-[scroll-right_40s_linear_infinite] items-center gap-x-6">
            {extendedBottomClients.map((client, index) => (
              <div
                key={`bottom-${index}`}
                className="flex h-24 w-48 flex-none items-center justify-center rounded-lg border border-gray-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <Image
                  src={client.logo}
                  alt={`${client.name} logo`}
                  width={160}
                  height={60}
                  className="h-full w-full object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        
        .animate-scroll-left {
          animation: scroll-left 40s linear infinite;
        }
        
        .animate-scroll-right {
          animation: scroll-right 40s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ScrollingClients;
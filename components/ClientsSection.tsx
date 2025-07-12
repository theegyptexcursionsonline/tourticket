import React from 'react';
import Image from 'next/image';

// --- Client Logo Data ---
// IMPORTANT: Replace these with your actual logo file names.
// Place your logo images in the `public/logos/` directory.
const clients = [
  { name: 'BHEL', logo: '/logos/bhel.png' },
  { name: 'Crompton Greaves', logo: '/logos/crompton.png' },
  { name: 'TBEA Energy', logo: '/logos/tbea.png' },
  { name: 'Transformers & Rectifiers', logo: '/logos/transformers.png' },
  { name: 'Tesla Transformers Ltd.', logo: '/logos/tesla.png' },
  { name: 'Shirdi Sai Electricals', logo: '/logos/shirdi.png' },
  { name: 'Technical Associates', logo: '/logos/technical.png' },
  { name: 'Atlanta Electricals', logo: '/logos/atlanta.png' },
  { name: 'ECE Industries Ltd', logo: '/logos/ece.png' },
  { name: 'Raychem RPG', logo: '/logos/raychem.png' },
];

const ScrollingClients = () => {
  // We duplicate the clients array to create a seamless loop
  const extendedClients = [...clients, ...clients];

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
            {extendedClients.map((client, index) => (
              <div key={`top-${index}`} className="flex h-24 w-48 flex-none items-center justify-center rounded-lg border border-gray-200/80 bg-white p-6 shadow-sm">
                {/* IMPORTANT: The Image component expects the logo path.
                  This is a placeholder. Update the `clients` array above with real paths.
                */}
                <div className="h-full w-full text-center font-semibold text-gray-600 flex items-center justify-center">{client.name}</div>
                {/* <Image src={client.logo} alt={client.name} width={158} height={48} className="h-full w-full object-contain" /> */}
              </div>
            ))}
          </div>

          {/* Bottom Row: Scrolling Right */}
          <div className="flex animate-[scroll-right_40s_linear_infinite] items-center gap-x-6">
            {extendedClients.map((client, index) => (
              <div key={`bottom-${index}`} className="flex h-24 w-48 flex-none items-center justify-center rounded-lg border border-gray-200/80 bg-white p-6 shadow-sm">
                <div className="h-full w-full text-center font-semibold text-gray-600 flex items-center justify-center">{client.name}</div>
                {/* <Image src={client.logo} alt={client.name} width={158} height={48} className="h-full w-full object-contain" /> */}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ScrollingClients;
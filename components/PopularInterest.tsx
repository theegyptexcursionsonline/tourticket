'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Smile, Users, Bus, Ship, Moon, Camera } from 'lucide-react';

// --- Reusable Icons Component ---
const icons = { Smile, Users, Bus, Ship, Moon, Camera } as const;
type IconKey = keyof typeof icons;

const interestDetails: { [key: string]: { icon: IconKey; color: string } } = {
  'FUN': { icon: 'Smile', color: 'from-red-500 to-rose-600' },
  'FAMILY-FRIENDLY': { icon: 'Users', color: 'from-blue-500 to-indigo-600' },
  'BUS TOURS': { icon: 'Bus', color: 'from-yellow-500 to-orange-600' },
  'ON THE WATER': { icon: 'Ship', color: 'from-cyan-500 to-sky-600' },
  'NIGHTLIFE': { icon: 'Moon', color: 'from-indigo-500 to-purple-600' },
  'SELFIE MUSEUM': { icon: 'Camera', color: 'from-pink-500 to-fuchsia-600' },
};

interface Interest {
  name: string;
  products: number;
  icon: IconKey;
  color: string;
}

const DEFAULT_ICON: IconKey = 'Smile';
const DEFAULT_COLOR = 'from-slate-500 to-slate-600';

const InterestCard = ({ interest }: { interest: Interest }) => {
  // Defensive: ensure we always have a valid Icon component
  const IconComponent = icons[interest.icon] ?? icons[DEFAULT_ICON];

  return (
    <Link
href={`/search?q=${encodeURIComponent(interest.name)}`}      className="relative block bg-slate-900 border-2 border-slate-800 transform transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:border-red-500 overflow-hidden group"
    >
      <div
        className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tr ${interest.color} rounded-full opacity-20 group-hover:scale-125 transition-transform duration-500`}
      />
      <div className="p-8 text-white relative z-10 flex flex-col justify-between h-48">
        {/* IconComponent is guaranteed */}
        <IconComponent className="w-12 h-12 text-white group-hover:text-red-500 transition-colors duration-300 mb-4" />
        <div>
          <h3 className="font-extrabold text-2xl tracking-tight leading-tight uppercase">
            {interest.name}
          </h3>
          <p className="text-sm text-slate-400 mt-2">{interest.products} products</p>
        </div>
      </div>
    </Link>
  );
};

export default function PopularInterests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await fetch('/api/interests');
        if (!response.ok) {
          throw new Error('Failed to fetch interests');
        }
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          const mappedInterests: Interest[] = data.data.map((raw: any) => {
            // Normalize the name (trim + uppercase) so it matches our interestDetails keys
            const rawName = (raw.name ?? '').toString();
            const key = rawName.trim().toUpperCase();

            const details = interestDetails[key];
            if (!details) {
              // Helpful during development if your API returns unexpected names
              // eslint-disable-next-line no-console
              console.warn(`[PopularInterests] No mapping for interest name "${rawName}" (normalized: "${key}"). Using defaults.`);
            }

            return {
              name: rawName || 'Unknown',
              products: typeof raw.products === 'number' ? raw.products : Number(raw.products) || 0,
              icon: details?.icon ?? DEFAULT_ICON,
              color: details?.color ?? DEFAULT_COLOR,
            };
          });

          setInterests(mappedInterests);
        } else {
          throw new Error(data.error || 'Failed to fetch interests');
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchInterests();
  }, []);

  if (loading) {
    return (
      <section className="bg-slate-50 py-20 font-sans">
        <div className="container mx-auto px-4 text-center">
          <p>Loading interests...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-slate-50 py-20 font-sans">
        <div className="container mx-auto px-4 text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-50 py-20 font-sans">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 text-center mb-12 tracking-tight">
          Activities based on popular interests
        </h2>
       {/* Replace this entire block in your code */}
<div className="flex flex-wrap justify-center gap-6 md:gap-8">
  {interests.map((interest) => (
    <div key={interest.name} className="basis-80">
      <InterestCard interest={interest} />
    </div>
  ))}
</div>
      </div>
    </section>
  );
}
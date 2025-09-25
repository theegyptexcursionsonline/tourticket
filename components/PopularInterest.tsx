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
  // Add more mappings as needed
  'CULTURAL TOURS': { icon: 'Camera', color: 'from-purple-500 to-pink-600' },
  'ADVENTURE TOUR': { icon: 'Smile', color: 'from-green-500 to-emerald-600' },
  'NATURE TOURS': { icon: 'Users', color: 'from-teal-500 to-cyan-600' },
  'HISTORICAL TOURS': { icon: 'Camera', color: 'from-amber-500 to-yellow-600' },
  'WATER ACTIVITIES': { icon: 'Ship', color: 'from-blue-500 to-cyan-600' },
  'PHOTOGRAPHY TOURS': { icon: 'Camera', color: 'from-pink-500 to-rose-600' },
  'FOOD & DRINK TOURS': { icon: 'Smile', color: 'from-orange-500 to-red-600' },
};

interface Interest {
  name: string;
  products: number;
  icon: IconKey;
  color: string;
}

interface AttractionPage {
  _id: string;
  title: string;
  slug: string;
  pageType: 'attraction' | 'category';
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
  };
  isPublished: boolean;
}

const DEFAULT_ICON: IconKey = 'Smile';
const DEFAULT_COLOR = 'from-slate-500 to-slate-600';

const InterestCard = ({
  interest,
  attractionPage
}: {
  interest: Interest;
  attractionPage?: AttractionPage;
}) => {
  const IconComponent = icons[interest.icon] ?? icons[DEFAULT_ICON];

  const getLink = () => {
    if (attractionPage && attractionPage.isPublished) {
      if (attractionPage.pageType === 'attraction') {
        return `/attraction/${attractionPage.slug}`;
      } else {
        return `/category/${attractionPage.slug}`;
      }
    }
    return `/search?q=${encodeURIComponent(interest.name)}`;
  };

  const linkUrl = getLink();
  const hasAttractionPage = attractionPage && attractionPage.isPublished;

  return (
    <Link
      href={linkUrl}
      className="relative block bg-slate-900 border-2 border-slate-800 transform transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:border-red-500 overflow-hidden group"
    >
      <div
        className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tr ${interest.color} rounded-full opacity-20 group-hover:scale-125 transition-transform duration-500`}
      />

      {hasAttractionPage && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold z-20">
          Page
        </div>
      )}

      <div className="p-8 text-white relative z-10 flex flex-col justify-between h-48">
        <div className="flex items-center justify-between mb-4">
          <IconComponent className="w-12 h-12 text-white group-hover:text-red-500 transition-colors duration-300" />
          {hasAttractionPage && (
            <div className="text-xs text-blue-300 font-medium">
              Dedicated Page
            </div>
          )}
        </div>

        <div>
          <h3 className="font-extrabold text-2xl tracking-tight leading-tight uppercase mb-2">
            {interest.name}
          </h3>
          <p className="text-sm text-slate-400">
            {interest.products} product{interest.products !== 1 ? 's' : ''}
          </p>

          <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs text-red-400 font-semibold">
              {hasAttractionPage ? '→ Visit dedicated page' : '→ Search tours'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function PopularInterests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [attractionPages, setAttractionPages] = useState<AttractionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [interestsResponse, attractionPagesResponse] = await Promise.all([
          fetch('/api/interests'),
          fetch('/api/attraction-pages')
        ]);

        if (!interestsResponse.ok) {
          throw new Error('Failed to fetch interests');
        }

        const interestsData = await interestsResponse.json();

        if (interestsData.success && Array.isArray(interestsData.data)) {
          const mappedInterests: Interest[] = interestsData.data.map((raw: any) => {
            const rawName = (raw.name ?? '').toString();
            const key = rawName.trim().toUpperCase();

            const details = interestDetails[key];
            if (!details) {
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
          throw new Error(interestsData.error || 'Failed to fetch interests');
        }

        if (attractionPagesResponse.ok) {
          const attractionPagesData = await attractionPagesResponse.json();
          if (attractionPagesData.success) {
            setAttractionPages(attractionPagesData.data || []);
          }
        }

      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getAttractionPageForInterest = (interest: Interest): AttractionPage | undefined => {
    return attractionPages.find(page => {
      if (!page.isPublished) return false;

      if (page.categoryId) {
        const categoryName = typeof page.categoryId === 'object' ? page.categoryId.name : '';
        const categorySlug = typeof page.categoryId === 'object' ? page.categoryId.slug : '';

        return categoryName.toLowerCase() === interest.name.toLowerCase() ||
               categorySlug.toLowerCase() === interest.name.toLowerCase().replace(/\s+/g, '-');
      }

      return page.title.toLowerCase().includes(interest.name.toLowerCase()) ||
             page.slug.toLowerCase() === interest.name.toLowerCase().replace(/\s+/g, '-');
    });
  };

  if (loading) {
    return (
      <section className="bg-slate-50 py-20 font-sans">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 text-center mb-12 tracking-tight">
            Activities based on popular interests
          </h2>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="basis-80">
                <div className="bg-slate-200 h-48 rounded-lg animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-slate-50 py-20 font-sans">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-8 tracking-tight">
            Activities based on popular interests
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-600">Error: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-50 py-20 font-sans">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Activities based on popular interests
          </h2>
        </div>

        {/* Interest Cards Grid */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          {interests.map((interest) => {
            const attractionPage = getAttractionPageForInterest(interest);
            return (
              <div key={interest.name} className="basis-80">
                <InterestCard
                  interest={interest}
                  attractionPage={attractionPage}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

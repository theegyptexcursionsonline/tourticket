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
  // Defensive: ensure we always have a valid Icon component
  const IconComponent = icons[interest.icon] ?? icons[DEFAULT_ICON];

  // Determine the best link for this interest
  const getLink = () => {
    if (attractionPage && attractionPage.isPublished) {
      // Use attraction page if available
      if (attractionPage.pageType === 'attraction') {
        return `/attraction/${attractionPage.slug}`;
      } else {
        return `/category/${attractionPage.slug}`;
      }
    }
    // Fallback to search
    return `/search?q=${encodeURIComponent(interest.name)}`;
  };

  const linkUrl = getLink();
  const hasAttractionPage = attractionPage && attractionPage.isPublished;

  return (
    <Link
      href={linkUrl}
      className="relative block bg-slate-900 border-2 border-slate-800 transform transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:border-red-500 overflow-hidden group"
    >
      {/* Enhanced gradient background */}
      <div
        className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tr ${interest.color} rounded-full opacity-20 group-hover:scale-125 transition-transform duration-500`}
      />
      
      {/* Featured badge for attraction pages */}
      {hasAttractionPage && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold z-20">
          Page
        </div>
      )}

      <div className="p-8 text-white relative z-10 flex flex-col justify-between h-48">
        {/* IconComponent with enhanced styling */}
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
          
          {/* Enhanced hover indicator */}
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
        // Fetch both interests and attraction pages in parallel
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
            // Normalize the name (trim + uppercase) so it matches our interestDetails keys
            const rawName = (raw.name ?? '').toString();
            const key = rawName.trim().toUpperCase();

            const details = interestDetails[key];
            if (!details) {
              // Helpful during development if your API returns unexpected names
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

        // Fetch attraction pages (don't fail if this fails)
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

  // Create a mapping between interests and attraction pages
  const getAttractionPageForInterest = (interest: Interest): AttractionPage | undefined => {
    return attractionPages.find(page => {
      if (!page.isPublished) return false;
      
      // Try to match by category name or slug
      if (page.categoryId) {
        const categoryName = typeof page.categoryId === 'object' ? page.categoryId.name : '';
        const categorySlug = typeof page.categoryId === 'object' ? page.categoryId.slug : '';
        
        return categoryName.toLowerCase() === interest.name.toLowerCase() ||
               categorySlug.toLowerCase() === interest.name.toLowerCase().replace(/\s+/g, '-');
      }
      
      // Try to match by page title or slug
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

  // Calculate stats
  const attractionPagesCount = attractionPages.filter(page => page.isPublished).length;
  const interestsWithPages = interests.filter(interest => 
    getAttractionPageForInterest(interest)
  ).length;

  return (
    <section className="bg-slate-50 py-20 font-sans">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Activities based on popular interests
          </h2>
          
          {/* Enhanced description if we have attraction pages */}
          {attractionPagesCount > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 max-w-4xl mx-auto mb-8">
              <p className="text-blue-800 text-sm">
                🚀 <strong>{interestsWithPages}</strong> of these interests now have dedicated landing pages 
                with comprehensive information, curated tours, and detailed guides!
              </p>
            </div>
          )}
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

        {/* Enhanced Stats Section */}
        {interests.length > 0 && (
          <div className="mt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-6 text-center border border-gray-100">
                <div className="text-2xl font-bold text-slate-900 mb-2">
                  {interests.length}
                </div>
                <div className="text-slate-600 font-medium">
                  Popular Categories
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 text-center border border-gray-100">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {interestsWithPages}
                </div>
                <div className="text-slate-600 font-medium">
                  With Dedicated Pages
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 text-center border border-gray-100">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {interests.reduce((total, interest) => total + interest.products, 0)}
                </div>
                <div className="text-slate-600 font-medium">
                  Total Products
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
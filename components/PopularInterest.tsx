'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Smile, Users, Bus, Ship, Moon, Camera, Star, ArrowRight, AlertCircle } from 'lucide-react';

// --- Reusable Icons Component ---
const icons = { Smile, Users, Bus, Ship, Moon, Camera } as const;
type IconKey = keyof typeof icons;

interface Interest {
  name: string;
  slug: string;
  products: number;
  icon: IconKey;
  color: string;
}

interface AttractionPage {
  _id: string;
  title: string;
  slug: string;
  pageType: 'attraction';
  isPublished: boolean;
  description: string;
  heroImage: string;
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
      return `/attraction/${attractionPage.slug}`;
    }
    // Create a dedicated landing page for each interest instead of search
    return `/interests/${interest.slug || interest.name.toLowerCase().replace(/\s+/g, '-')}`;
  };

  const linkUrl = getLink();
  const hasAttractionPage = attractionPage && attractionPage.isPublished;

  return (
    <Link
      href={linkUrl}
      className="relative block bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl transform transition-all duration-500 hover:scale-105 hover:shadow-2xl group overflow-hidden border border-slate-700/50 hover:border-slate-600"
      aria-label={`Explore ${interest.products} ${interest.name.toLowerCase()} tours`}
    >
      {/* Background Gradient Effect */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${interest.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl`}
      />
      
      {/* Floating Orb Background */}
      <div
        className={`absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-tr ${interest.color} rounded-full opacity-20 blur-xl group-hover:scale-125 group-hover:opacity-30 transition-all duration-700`}
      />

      {/* Featured Badge */}
      {hasAttractionPage && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-gradient-to-r from-emerald-400 to-blue-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
            <Star className="w-3 h-3 fill-current" />
            Attraction Page
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className="p-8 text-white relative z-10 flex flex-col justify-between min-h-[220px]">
        {/* Top Section with Icon */}
        <div className="flex items-start justify-between mb-6">
          <div className={`p-4 bg-gradient-to-br ${interest.color} rounded-2xl shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
            <IconComponent className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-xl leading-tight mb-2 group-hover:text-white transition-colors duration-300 line-clamp-2">
              {interest.name}
            </h3>
            
            <div className="flex items-center gap-2 text-slate-300 mb-4">
              <div className="w-2 h-2 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full"></div>
              <span className="text-sm font-medium">
                {interest.products} {interest.products === 1 ? 'tour' : 'tours'} available
              </span>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <span className="text-sm font-semibold text-slate-300 group-hover:text-white">
              {hasAttractionPage ? 'Visit attraction page' : 'View tours'}
            </span>
            <div className={`w-10 h-10 bg-gradient-to-r ${interest.color} rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300`}>
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Border Glow */}
      <div className={`absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r ${interest.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} style={{
        background: `linear-gradient(var(--tw-gradient-stops))`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        padding: '1px'
      }} />
    </Link>
  );
};

// --- Loading Skeleton Component ---
const LoadingSkeleton = () => (
  <div className="flex flex-wrap justify-center gap-6 md:gap-8 animate-pulse">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="basis-80">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 min-h-[220px] p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 bg-slate-700 rounded-2xl"></div>
          </div>
          <div className="space-y-4">
            <div className="h-6 w-3/4 bg-slate-700 rounded-lg"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
              <div className="h-4 w-20 bg-slate-700 rounded"></div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <div className="h-4 w-16 bg-slate-700 rounded"></div>
              <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// --- Error Display Component ---
const ErrorDisplay = ({ error }: { error: string }) => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto">
      <div className="bg-gradient-to-br from-red-900 to-red-800 border border-red-700 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 bg-red-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-red-200 mb-3">
          Unable to Load Attractions
        </h3>
        <p className="text-red-300 leading-relaxed">{error}</p>
      </div>
    </div>
  </div>
);

// --- Empty State Component ---
const EmptyState = () => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto">
      <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 bg-slate-600/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-200 mb-3">
          No Attractions Available
        </h3>
        <p className="text-slate-300 mb-6 leading-relaxed">
          We're currently updating our featured attractions. Please check back soon!
        </p>
        <Link
          href="/tours"
          className="inline-flex items-center gap-3 px-6 py-3 bg-slate-600 text-white rounded-full hover:bg-slate-500 transform hover:scale-105 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
        >
          Browse All Tours
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </div>
);

export default function PopularInterests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [attractionPages, setAttractionPages] = useState<AttractionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [interestsResponse, attractionPagesResponse] = await Promise.all([
          fetch('/api/attractions')
        ]);

        if (!interestsResponse.ok) {
          throw new Error('Failed to fetch interests');
        }

        const interestsData = await interestsResponse.json();

        if (interestsData.success && Array.isArray(interestsData.data)) {
          // Only process interests that have tours available
          const availableInterests = interestsData.data.filter((raw: any) => {
            const products = typeof raw.products === 'number' ? raw.products : Number(raw.products) || 0;
            return products > 0;
          });

          if (availableInterests.length === 0) {
            setInterests([]);
            setLoading(false);
            return;
          }

          const mappedInterests: Interest[] = availableInterests.map((raw: any) => ({
            name: raw.name || 'Unknown',
            slug: raw.slug || '',
            products: typeof raw.products === 'number' ? raw.products : Number(raw.products) || 0,
            icon: DEFAULT_ICON,
            color: DEFAULT_COLOR,
          }));

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
        console.error('Error fetching data:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getAttractionPageForInterest = (interest: Interest): AttractionPage | undefined => {
    return attractionPages.find(page => {
      if (!page.isPublished || page.pageType !== 'attraction') return false;

      return page.title.toLowerCase().includes(interest.name.toLowerCase()) ||
             page.slug.toLowerCase() === (interest.slug || interest.name.toLowerCase().replace(/\s+/g, '-'));
    });
  };

  return (
    <section className="bg-gradient-to-br from-slate-100 to-slate-200 py-24 font-sans">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-block p-3 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl mb-6 shadow-lg">
            <Star className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
            Featured Attraction Pages
          </h2>
          
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Discover our featured attractions with detailed information and curated experiences tailored to your interests.
          </p>
        </div>

        {/* Content Rendering */}
        {loading && <LoadingSkeleton />}
        {error && <ErrorDisplay error={error} />}
        
        {!loading && !error && interests.length === 0 && <EmptyState />}
        
        {!loading && !error && interests.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {interests.map((interest, index) => {
              const attractionPage = getAttractionPageForInterest(interest);
              return (
                <div key={`${interest.slug || interest.name}-${index}`} className="basis-80">
                  <InterestCard
                    interest={interest}
                    attractionPage={attractionPage}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, Star } from "lucide-react";

interface Interest {
  name: string;
  slug: string;
  products: number;
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

// --- InterestCard Component ---
const InterestCard = ({
  interest,
  attractionPage
}: {
  interest: Interest;
  attractionPage?: AttractionPage;
}) => {
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
      className="group block text-left bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-red-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 ease-out relative overflow-hidden backdrop-blur-sm"
      aria-label={`${hasAttractionPage ? 'Visit' : 'Search for'} ${interest.products} tours related to ${interest.name}`}
    >
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
      
      {/* Page Badge */}
      {hasAttractionPage && (
        <div className="absolute -top-1 -right-1 z-10">
          <div className="bg-gradient-to-r from-emerald-400 to-blue-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </div>
        </div>
      )}

      {/* Content Container */}
      <div className="relative z-10">
        {/* Interest Name */}
        <h4 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-red-600 transition-colors duration-300 line-clamp-2">
          {interest.name}
        </h4>

        {/* Products Count */}
        <div className="flex items-center gap-2 text-slate-500 mb-4">
          <Package className="w-4 h-4" />
          <span className="text-sm font-medium">
            {interest.products} {interest.products === 1 ? 'tour' : 'tours'} available
          </span>
        </div>

        {/* Action Indicator */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-red-600 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            {hasAttractionPage ? 'Visit page' : 'Explore tours'}
          </span>
          <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors duration-300">
            <ArrowRight className="w-4 h-4 text-red-600 transform group-hover:translate-x-0.5 transition-transform duration-300" />
          </div>
        </div>
      </div>

      {/* Hover Border Effect */}
      <div className="absolute inset-0 rounded-2xl border-2 border-red-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
    </Link>
  );
};

// --- Loading Skeleton Component ---
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 animate-pulse">
    {[...Array(18)].map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="space-y-4">
          <div className="h-5 w-3/4 bg-slate-200 rounded-lg"></div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 rounded"></div>
            <div className="h-4 w-20 bg-slate-200 rounded"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="h-3 w-16 bg-slate-200 rounded"></div>
            <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// --- Error Display Component ---
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 shadow-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-red-800 mb-3">
          Unable to Load Interests
        </h3>
        <p className="text-red-600 mb-6 leading-relaxed">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transform hover:scale-105 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Try Again
        </button>
      </div>
    </div>
  </div>
);

// --- Empty State Component ---
const EmptyState = () => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-3">
          No Interests Available
        </h3>
        <p className="text-slate-600 mb-6 leading-relaxed">
          We're currently updating our tour categories. Please check back soon for amazing new experiences!
        </p>
        <Link
          href="/tours"
          className="inline-flex items-center gap-3 px-6 py-3 bg-slate-600 text-white rounded-full hover:bg-slate-700 transform hover:scale-105 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
        >
          Browse All Tours
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </div>
);

// --- Main InterestGrid Component ---
export default function InterestGrid() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [attractionPages, setAttractionPages] = useState<AttractionPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [interestsResponse, attractionPagesResponse] = await Promise.all([
        fetch('/api/interests'),
        fetch('/api/attraction-pages')
      ]);

      if (!interestsResponse.ok) {
        throw new Error(`Failed to fetch interests: ${interestsResponse.status} ${interestsResponse.statusText}`);
      }

      const interestsData = await interestsResponse.json();

      if (interestsData.success) {
        const availableInterests = interestsData.data.filter((interest: Interest) => interest.products > 0);
        setInterests(availableInterests);
      } else {
        throw new Error(interestsData.error || 'Failed to fetch interests');
      }

      if (attractionPagesResponse.ok) {
        const attractionPagesData = await attractionPagesResponse.json();
        if (attractionPagesData.success) {
          setAttractionPages(attractionPagesData.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetry = () => {
    fetchData();
  };

  const getAttractionPageForInterest = (interest: Interest): AttractionPage | undefined => {
    return attractionPages.find(page => {
      if (!page.isPublished) return false;

      if (page.categoryId) {
        const categoryName = typeof page.categoryId === 'object' ? page.categoryId.name : '';
        const categorySlug = typeof page.categoryId === 'object' ? page.categoryId.slug : '';

        return categoryName.toLowerCase() === interest.name.toLowerCase() ||
               categorySlug.toLowerCase() === interest.slug.toLowerCase();
      }

      return page.title.toLowerCase().includes(interest.name.toLowerCase()) ||
             page.slug.toLowerCase() === interest.slug.toLowerCase();
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (error) {
      return <ErrorDisplay error={error} onRetry={handleRetry} />;
    }

    if (interests.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {interests.map((interest) => {
          const attractionPage = getAttractionPageForInterest(interest);
          return (
            <InterestCard
              key={interest.slug || interest.name}
              interest={interest}
              attractionPage={attractionPage}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section className="bg-gradient-to-br from-slate-50 to-slate-100/50 py-24">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-block p-2 bg-red-100 rounded-2xl mb-4">
            <Package className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Egypt Excursions Online
          </h2>
          
          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Discover amazing tours and experiences across Egypt. Choose from our curated categories
            to find the perfect adventure for you.
          </p>

          {/* Call-to-Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/search"
              className="inline-flex items-center gap-3 px-8 py-4 font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-300 group rounded-full shadow-lg hover:shadow-xl transform hover:scale-105"
              aria-label="Find the right interest for you"
            >
              <span>FIND THE RIGHT INTEREST FOR YOU</span>
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <Link
              href="/tours"
              className="inline-flex items-center gap-3 px-8 py-4 font-semibold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 group rounded-full shadow-lg hover:shadow-xl transform hover:scale-105"
              aria-label="Browse all tours"
            >
              <span>Browse All Tours</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Main Content */}
        {renderContent()}
      </div>
    </section>
  );
}
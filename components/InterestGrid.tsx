'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      className="block text-left bg-white p-5 shadow-lg border-2 border-transparent hover:border-red-600 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ease-in-out rounded-lg group relative overflow-hidden"
      aria-label={`${hasAttractionPage ? 'Visit' : 'Search for'} ${interest.products} tours related to ${interest.name}`}
    >
      {hasAttractionPage && (
        <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
          Page
        </div>
      )}

      <h4 className="font-extrabold text-slate-800 text-lg uppercase tracking-wide group-hover:text-red-600 transition-colors duration-300">
        {interest.name}
      </h4>
      <p className="text-sm text-slate-500 mt-1 group-hover:text-slate-700 transition-colors duration-300">
        {interest.products} product{interest.products !== 1 ? 's' : ''}
      </p>
      <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
          {hasAttractionPage ? 'Visit page' : 'Explore tours'}
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
};

// --- Loading Skeleton Component ---
const LoadingSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-pulse">
    {[...Array(18)].map((_, i) => (
      <div key={i} className="bg-white p-5 rounded-lg shadow-lg">
        <div className="h-6 w-3/4 bg-slate-200 rounded mb-2"></div>
        <div className="h-4 w-1/2 bg-slate-200 rounded mb-3"></div>
        <div className="h-3 w-1/3 bg-slate-200 rounded"></div>
      </div>
    ))}
  </div>
);

// --- Error Display Component ---
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="text-center py-12">
    <div className="max-w-md mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Unable to Load Interests
        </h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
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
  <div className="text-center py-12">
    <div className="max-w-md mx-auto">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          No Interests Available
        </h3>
        <p className="text-slate-600 mb-4">
          We're currently updating our tour categories. Please check back soon!
        </p>
        <Link
          href="/tours"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200"
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
    <section className="bg-slate-50 py-20">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Egypt Excursions Online
          </h2>
          <p className="text-lg text-slate-600 mb-6 max-w-2xl mx-auto">
            Discover amazing tours and experiences across Egypt. Choose from our curated categories
            to find the perfect adventure for you.
          </p>

          {/* Call-to-Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/search"
              className="inline-flex items-center gap-3 px-8 py-3 font-bold text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 group rounded-full"
              aria-label="Find the right interest for you"
            >
              <span>FIND THE RIGHT INTEREST FOR YOU</span>
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <Link
              href="/tours"
              className="inline-flex items-center gap-3 px-8 py-3 font-semibold text-slate-600 border-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-all duration-300 group rounded-full"
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

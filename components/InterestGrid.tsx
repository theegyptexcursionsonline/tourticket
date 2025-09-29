'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, Search, Filter } from "lucide-react";

interface Interest {
  _id?: string;
  type?: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
}

interface CategoryPage {
  _id: string;
  title: string;
  slug: string;
  pageType: 'category';
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
  };
  isPublished: boolean;
  heroImage?: string;
}

// --- InterestCard Component ---
const InterestCard = ({
  interest,
  categoryPage
}: {
  interest: Interest;
  categoryPage?: CategoryPage;
}) => {
  const getLink = () => {
    if (categoryPage && categoryPage.isPublished) {
      return `/category/${categoryPage.slug}`;
    }
    
    if (interest.type === 'attraction') {
      return `/attraction/${interest.slug}`;
    }
    
    return `/interests/${interest.slug}`;
  };

  const linkUrl = getLink();

  return (
    <Link
      href={linkUrl}
      className="group block text-left bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:border-red-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
    >
      {/* Gradient Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/40 to-orange-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative z-10">
        <h4 className="font-bold text-slate-900 text-base mb-3 group-hover:text-red-600 transition-colors line-clamp-2">
          {interest.name}
        </h4>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">
              {interest.products} {interest.products === 1 ? 'tour' : 'tours'}
            </span>
          </div>

          <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-500 transition-colors duration-300">
            <ArrowRight className="w-4 h-4 text-red-600 group-hover:text-white transform group-hover:translate-x-0.5 transition-all duration-300" />
          </div>
        </div>
      </div>
    </Link>
  );
};

// --- Loading Skeleton ---
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 animate-pulse">
    {[...Array(20)].map((_, i) => (
      <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="h-4 w-3/4 bg-slate-200 rounded mb-3"></div>
        <div className="flex justify-between items-center">
          <div className="h-3 w-20 bg-slate-200 rounded"></div>
          <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
);

// --- Error Display ---
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="text-center py-12">
    <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
      <Package className="w-12 h-12 text-red-600 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-red-900 mb-2">Unable to Load Categories</h3>
      <p className="text-red-700 text-sm mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
      >
        Try Again
      </button>
    </div>
  </div>
);

// --- Empty State ---
const EmptyState = () => (
  <div className="text-center py-12">
    <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-xl p-6">
      <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-slate-900 mb-2">No Categories Available</h3>
      <p className="text-slate-600 text-sm mb-4">
        Check back soon for amazing experiences!
      </p>
      <Link
        href="/tours"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold"
      >
        Browse All Tours
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

// --- Main Component ---
export default function InterestGrid() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [categoryPages, setCategoryPages] = useState<CategoryPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [interestsResponse, categoryPagesResponse] = await Promise.all([
        fetch('/api/interests'),
        fetch('/api/categories/pages')
      ]);

      if (!interestsResponse.ok) {
        throw new Error(`Failed to fetch interests: ${interestsResponse.status}`);
      }

      const interestsData = await interestsResponse.json();

      if (interestsData.success) {
        const availableInterests = interestsData.data.filter((interest: Interest) => {
          const products = typeof interest.products === 'number' ? interest.products : Number(interest.products) || 0;
          return products > 0;
        });
        setInterests(availableInterests);
      } else {
        throw new Error(interestsData.error || 'Failed to fetch interests');
      }

      if (categoryPagesResponse.ok) {
        const categoryPagesData = await categoryPagesResponse.json();
        if (categoryPagesData.success) {
          setCategoryPages(categoryPagesData.data || []);
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

  const getCategoryPageForInterest = (interest: Interest): CategoryPage | undefined => {
    return categoryPages.find(page => {
      if (!page.isPublished || page.pageType !== 'category') return false;

      if (page.categoryId) {
        const categoryName = typeof page.categoryId === 'object' ? page.categoryId.name : '';
        const categorySlug = typeof page.categoryId === 'object' ? page.categoryId.slug : '';

        return categoryName.toLowerCase() === interest.name.toLowerCase() ||
               categorySlug.toLowerCase() === (interest.slug || interest.name.toLowerCase().replace(/\s+/g, '-'));
      }

      return false;
    });
  };

  // Filter interests based on search
  const filteredInterests = interests.filter(interest =>
    interest.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (error) {
      return <ErrorDisplay error={error} onRetry={fetchData} />;
    }

    if (interests.length === 0) {
      return <EmptyState />;
    }

    if (filteredInterests.length === 0) {
      return (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Results Found</h3>
          <p className="text-slate-600 text-sm">
            Try adjusting your search terms
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {filteredInterests.map((interest) => {
          const categoryPage = getCategoryPageForInterest(interest);
          return (
            <InterestCard
              key={interest.slug || interest.name}
              interest={interest}
              categoryPage={categoryPage}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section className="bg-slate-50 py-16">
      <div className="container mx-auto px-4 max-w-[1400px]">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Browse All Categories
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Explore our complete collection of tours and experiences across Egypt
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && !error && filteredInterests.length > 0 && (
          <div className="mb-6 text-center">
            <p className="text-sm text-slate-600">
              Showing <span className="font-bold text-slate-900">{filteredInterests.length}</span> of {interests.length} categories
            </p>
          </div>
        )}

        {/* Main Content */}
        {renderContent()}
      </div>
    </section>
  );
}
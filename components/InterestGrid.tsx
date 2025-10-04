'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, Search, Sparkles, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Grid } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/grid';

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

// --- Premium InterestCard Component ---
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
      className="group relative block text-left bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-slate-100 hover:border-red-200"
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      {/* Top Accent Bar */}
      <div className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      
      {/* Content Container */}
      <div className="relative z-10 p-6 space-y-4">
        {/* Icon Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          
          {interest.featured && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
              Featured
            </span>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-red-600 transition-colors duration-300 line-clamp-2 min-h-[3.5rem]">
            {interest.name}
          </h4>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg group-hover:bg-red-50 transition-colors">
              <Package className="w-4 h-4 text-slate-600 group-hover:text-red-600 transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-medium">Available</span>
              <span className="text-sm font-bold text-slate-900">
                {interest.products} {interest.products === 1 ? 'Tour' : 'Tours'}
              </span>
            </div>
          </div>

          {/* Arrow Button */}
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-red-500 group-hover:to-orange-500 transition-all duration-300 shadow-sm group-hover:shadow-lg">
            <ArrowRight className="w-5 h-5 text-white transform group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </div>

      {/* Corner Decoration */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Link>
  );
};

// --- Premium Loading Skeleton ---
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
    {[...Array(20)].map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="space-y-3">
          <div className="h-5 w-3/4 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-1/2 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100">
          <div className="h-8 w-24 bg-slate-200 rounded-lg"></div>
          <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    ))}
  </div>
);

// --- Premium Error Display ---
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-8 shadow-xl">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Package className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Experiences</h3>
      <p className="text-slate-700 text-sm mb-6 leading-relaxed">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
      >
        <span>Try Again</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// --- Premium Empty State ---
const EmptyState = () => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-2xl p-8 shadow-xl">
      <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Package className="w-8 h-8 text-slate-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">No Experiences Available</h3>
      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
        Check back soon for amazing experiences across Egypt!
      </p>
      <Link
        href="/tours"
        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
      >
        <span>Browse All Tours</span>
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
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null);

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
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Results Found</h3>
          <p className="text-slate-600 text-sm">
            Try adjusting your search terms
          </p>
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Custom Navigation Buttons */}
        <button
          onClick={() => swiperRef?.slidePrev()}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white hover:bg-red-600 text-slate-800 hover:text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group -translate-x-1/2 hidden lg:flex"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={() => swiperRef?.slideNext()}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white hover:bg-red-600 text-slate-800 hover:text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group translate-x-1/2 hidden lg:flex"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Swiper with Grid Layout (2 rows) */}
        <Swiper
          modules={[Navigation, Pagination, Grid]}
          onSwiper={setSwiperRef}
          spaceBetween={24}
          slidesPerView={1}
          grid={{
            rows: 2,
            fill: 'row'
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
              grid: {
                rows: 2,
                fill: 'row'
              }
            },
            768: {
              slidesPerView: 3,
              grid: {
                rows: 2,
                fill: 'row'
              }
            },
            1024: {
              slidesPerView: 4,
              grid: {
                rows: 2,
                fill: 'row'
              }
            },
            1280: {
              slidesPerView: 5,
              grid: {
                rows: 2,
                fill: 'row'
              }
            }
          }}
          className="!pb-16"
        >
          {filteredInterests.map((interest) => {
            const categoryPage = getCategoryPageForInterest(interest);
            return (
              <SwiperSlide key={interest.slug || interest.name}>
                <InterestCard
                  interest={interest}
                  categoryPage={categoryPage}
                />
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    );
  };

  return (
    <section className="relative bg-gradient-to-b from-white via-slate-50 to-white py-20">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 max-w-[1400px] relative z-10">
        {/* Premium Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-100 to-orange-100 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">Discover Egypt</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 leading-tight">
            Browse All{' '}
            <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Experiences
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Explore our complete collection of unforgettable tours and experiences across the wonders of Egypt
          </p>
        </div>

        {/* Premium Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative flex items-center">
              <Search className="absolute left-5 w-5 h-5 text-slate-400 group-hover:text-red-500 transition-colors z-10" />
              <input
                type="text"
                placeholder="Search for experiences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md font-medium"
              />
            </div>
          </div>
        </div>

     

        {/* Main Content */}
        {renderContent()}
      </div>
    </section>
  );
}
// components/FeaturedToursServer.tsx
'use client';

import React, { useState } from 'react';
import { ArrowRight, Star, ShoppingCart, Clock, Users, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import BookingSidebar from '@/components/BookingSidebar';
import Link from 'next/link';

interface FeaturedToursServerProps {
  tours: Tour[];
}

// Safe Image Component
const SafeImage = ({
  src,
  alt,
  width,
  height,
  className
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!src || src.trim() === '' || imageError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}
        style={{ width, height }}
        role="img"
        aria-label="No image available"
      >
        <ImageIcon size={48} className="text-gray-400 mb-3" />
        <span className="text-gray-500 text-sm font-medium">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-t-3xl"
          style={{ width, height }}
          aria-hidden
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        priority={false}
      />
    </div>
  );
};

// Helper functions
const formatBookings = (num?: number) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
  if (num >= 1000) return `${Math.floor(num / 1000)}k`;
  return num.toString();
};

const getTagColor = (tag: string) => {
  if (tag.includes('%')) return 'bg-red-500 text-white shadow-lg';
  if (tag === 'Staff favourite') return 'bg-indigo-500 text-white shadow-lg';
  if (tag === 'Online only deal') return 'bg-emerald-500 text-white shadow-lg';
  if (tag === 'New') return 'bg-purple-500 text-white shadow-lg';
  if (tag === 'Best for Kids') return 'bg-yellow-400 text-black shadow-lg';
  return 'bg-white/95 text-gray-800 shadow-md';
};

// Tour Card Component
const TourCard = ({ tour, onAddToCartClick }: { tour: Tour; onAddToCartClick: (tour: Tour) => void }) => {
  const { formatPrice } = useSettings();

  return (
    <Link
      href={`/tour/${tour.slug || '#'}`}
      className="block w-[280px] sm:w-[320px] md:w-[360px] lg:w-[380px] xl:w-[400px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-red-500/10 border border-red-100 transform transition-all duration-500 hover:-translate-y-2 group focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
      aria-label={`Open tour ${tour.title || 'tour'}`}
    >
      <div className="relative">
        <SafeImage
          src={tour.image}
          alt={tour.title || 'Tour image'}
          width={400}
          height={240}
          className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        <div className="absolute top-4 left-4 z-20">
          <span className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900/80 backdrop-blur-sm rounded-full shadow-lg">
            Egypt Excursions Online
          </span>
        </div>

        {tour.tags && tour.tags.length > 0 && (
          <div className="absolute top-14 left-4 flex flex-wrap gap-2 z-20">
            {tour.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full backdrop-blur-sm ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="absolute top-4 right-4 z-20">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-2 shadow-lg border border-white/20">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-gray-800">
              {tour.rating ? tour.rating.toFixed(1) : '0.0'}
            </span>
          </div>
        </div>

        <div className="absolute left-4 bottom-4 z-20">
          <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-3 rounded-full font-black shadow-xl text-lg border-2 border-white/20">
            {formatPrice(tour.discountPrice || tour.originalPrice || 0)}
            {tour.originalPrice && tour.discountPrice && tour.originalPrice > tour.discountPrice && (
              <span className="ml-3 text-sm font-medium line-through text-red-100">
                {formatPrice(tour.originalPrice)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCartClick(tour);
          }}
          className="absolute bottom-4 right-4 z-30 bg-white text-red-600 p-4 rounded-full shadow-xl border-2 border-red-100 transition-all duration-300 transform hover:scale-110 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
          aria-label={`Add ${tour.title || 'tour'} to cart`}
          title="Add to cart"
        >
          <ShoppingCart size={20} className="transition-transform duration-300 group-hover:scale-110" />
        </button>
      </div>

      <div className="p-6 md:p-7 bg-white">
        <div className="mb-4">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-3 line-clamp-2 group-hover:text-red-600 transition-colors duration-300">
            {tour.title || 'Untitled Tour'}
          </h3>

          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
            {tour.description || 'A beautifully curated experience — enjoy local highlights, guided commentary, and flexible booking.'}
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <span className="font-medium">{tour.duration || 'Duration not specified'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <span className="font-medium">{formatBookings(tour.bookings)} booked</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-left">
            <div className="text-sm text-gray-500 mb-1">Starting from</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black text-gray-900">
                {formatPrice(tour.discountPrice || tour.originalPrice || 0)}
              </span>
              {tour.originalPrice && tour.discountPrice && tour.originalPrice > tour.discountPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(tour.originalPrice)}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">per person</div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">View details</span>
            <ArrowRight size={16} className="text-red-600 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function FeaturedToursServer({ tours }: FeaturedToursServerProps) {
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  const handleAddToCartClick = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };

  const closeSidebar = () => {
    setBookingSidebarOpen(false);
    setTimeout(() => setSelectedTour(null), 300);
  };

  // Validate and prepare tours
  const validatedTours = tours.map((tour: Tour) => ({
    ...tour,
    image: tour.image && tour.image.trim() !== '' ? tour.image : null,
    title: tour.title || 'Untitled Tour',
    slug: tour.slug || '',
    originalPrice: typeof tour.originalPrice === 'number' ? tour.originalPrice : null,
    discountPrice: typeof tour.discountPrice === 'number' ? tour.discountPrice : tour.originalPrice || 0,
    rating: typeof tour.rating === 'number' ? tour.rating : 0,
    bookings: typeof tour.bookings === 'number' ? tour.bookings : 0,
    duration: tour.duration || 'Duration not specified',
    tags: Array.isArray(tour.tags) ? tour.tags : [],
  }));

  const duplicatedTours = validatedTours.length > 0 ? [...validatedTours, ...validatedTours] : [];

  if (tours.length === 0) {
    return null;
  }

  return (
    <>
      <section className="bg-gradient-to-b from-white to-gray-50 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 sm:mb-12 md:mb-16 gap-4 sm:gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight">
                Canal Cruises Perfect For You
              </h2>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed">
                Discover top-rated experiences in Egypt — handpicked by local experts for unforgettable memories.
              </p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <Link
                href="/tours"
                className="inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white text-sm sm:text-base md:text-lg font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transform transition-all duration-300 border-2 border-transparent hover:border-white/20 w-full md:w-auto"
                aria-label="See all tours"
              >
                <span>See all tours</span>
                <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1 flex-shrink-0" />
              </Link>
            </div>
          </div>

          <div className="relative w-full overflow-hidden group py-4 sm:py-6 md:py-8">
            <div className="absolute top-0 left-0 w-16 sm:w-24 md:w-32 h-full bg-gradient-to-r from-gray-50 via-gray-50/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-16 sm:w-24 md:w-32 h-full bg-gradient-to-l from-gray-50 via-gray-50/80 to-transparent z-10 pointer-events-none" />

            <div className="flex gap-4 sm:gap-6 md:gap-8 animate-marquee group-hover:[animation-play-state:paused]">
              {duplicatedTours.map((tour, idx) => (
                <div key={`${(tour as any)._id || tour.slug}-${idx}`} className="flex-shrink-0 px-1 sm:px-2">
                  <TourCard tour={tour} onAddToCartClick={handleAddToCartClick} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {selectedTour && (
        <BookingSidebar
          isOpen={isBookingSidebarOpen}
          onClose={closeSidebar}
          tour={selectedTour as any}
        />
      )}

      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .animate-marquee {
          animation: marquee 40s linear infinite;
          will-change: transform;
          backface-visibility: hidden;
          perspective: 1000px;
        }

        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }

        @media (max-width: 640px) {
          .animate-marquee { animation-duration: 32s; }
        }
      `}</style>
    </>
  );
}

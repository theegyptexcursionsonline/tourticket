// components/FeaturedTours.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Star, ShoppingCart, Clock, Users, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import BookingSidebar from '@/components/BookingSidebar';
import Link from 'next/link';

/**
 * Enhanced FeaturedTours - "10x better" UI
 *
 * Key improvements:
 * - Larger, more elegant cards with rounded-3xl corners
 * - Glassy & gradient accents, smooth hover lift + glow
 * - Bigger "See all tours" pill button (prominent CTA)
 * - Large circular Add-to-cart button with ring + subtle shadow
 * - Prominent price badge + rating badge
 * - Responsive improvements and accessible focus states
 *
 * Note: This file assumes Tailwind CSS is configured in your project.
 */

// --- Safe Image Component ---
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

  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
  }, [src]);

  if (!src || src.trim() === '' || imageError) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}
        style={{ width, height }}
        role="img"
        aria-label="No image available"
      >
        <ImageIcon size={44} className="text-gray-300 mb-2" />
        <span className="text-gray-400 text-sm font-medium">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"
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

// Small helpers
const formatBookings = (num?: number) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
  if (num >= 1000) return `${Math.floor(num / 1000)}k`;
  return num.toString();
};

const getTagColor = (tag: string) => {
  if (tag.includes('%')) return 'bg-red-600 text-white';
  if (tag === 'Staff favourite') return 'bg-indigo-600 text-white';
  if (tag === 'Online only deal') return 'bg-emerald-600 text-white';
  if (tag === 'New') return 'bg-purple-600 text-white';
  if (tag === 'Best for Kids') return 'bg-yellow-400 text-black';
  return 'bg-gray-100 text-gray-800';
};

// Reusable Tour Card Component (polished)
const TourCard = ({ tour, onAddToCartClick }: { tour: Tour; onAddToCartClick: (tour: Tour) => void }) => {
  const { formatPrice } = useSettings();

  return (
    <Link
      href={`/tour/${tour.slug || '#'}`}
      className="block w-[360px] md:w-[380px] lg:w-[400px] bg-white/60 backdrop-blur-sm border border-transparent rounded-3xl overflow-hidden transform transition-all duration-400 hover:-translate-y-3 hover:shadow-2xl hover:border-white/40 group focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
      aria-label={`Open tour ${tour.title || 'tour'}`}
    >
      <div className="relative">
        <SafeImage
          src={tour.image}
          alt={tour.title || 'Tour image'}
          width={400}
          height={240}
          className="w-full h-56 object-cover rounded-t-3xl transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top-left tags */}
        {tour.tags && tour.tags.length > 0 && (
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20">
            {tour.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full shadow-sm ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Rating badge (top-right) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <div className="bg-white/85 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
            <Star size={16} className="text-yellow-500" />
            <span className="text-sm font-bold text-gray-800">{tour.rating ? tour.rating.toFixed(1) : '0.0'}</span>
          </div>
        </div>

        {/* Price pill (overlay bottom-left) */}
        <div className="absolute left-4 bottom-4 z-20">
          <div className="bg-gradient-to-r from-red-600 to-rose-500 text-white px-4 py-2 rounded-full font-extrabold shadow-lg text-lg">
            {formatPrice(tour.discountPrice || tour.originalPrice || 0)}
            {tour.originalPrice && tour.discountPrice && tour.originalPrice > tour.discountPrice && (
              <span className="ml-3 text-sm font-medium line-through text-white/75">{formatPrice(tour.originalPrice)}</span>
            )}
          </div>
        </div>

        {/* Add to cart (big circular) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCartClick(tour);
          }}
          className="absolute bottom-4 right-4 z-30 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl ring-0 ring-red-300/40 transition transform hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
          aria-label={`Add ${tour.title || 'tour'} to cart`}
          title="Add to cart"
        >
          <ShoppingCart size={22} />
        </button>
      </div>

      <div className="p-6 md:p-7">
        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 leading-tight mb-2 line-clamp-2">
          {tour.title || 'Untitled Tour'}
        </h3>

        <p className="text-sm text-gray-600 mb-4 max-w-[30rem]">
          {tour.excerpt || tour.summary || 'A beautifully curated experience — enjoy local highlights, guided commentary, and flexible booking.'}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <span className="text-sm font-medium">{tour.duration || 'Duration not specified'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-400" />
              <span className="text-sm font-medium">{formatBookings(tour.bookings)} booked</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-lg md:text-2xl font-extrabold text-gray-900">
              {formatPrice(tour.discountPrice || tour.originalPrice || 0)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

// Main Component
export default function FeaturedTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const response = await fetch('/api/admin/tours');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        if (data.success) {
          let featured = (data.data || []).filter((t: Tour) => t.isFeatured === true);
          if (featured.length === 0) featured = (data.data || []).slice(0, 6);
          const validatedTours = featured.map((tour: Tour) => ({
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
          setTours(validatedTours);
        } else throw new Error(data.error || 'API returned success: false');
      } catch (error: any) {
        console.error('Failed to fetch tours:', error);
        setFetchError(error.message || 'Failed to fetch tours');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTours();
  }, []);

  const handleAddToCartClick = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };

  const closeSidebar = () => {
    setBookingSidebarOpen(false);
    setTimeout(() => setSelectedTour(null), 300);
  };

  const retryFetch = () => {
    setIsLoading(true);
    setFetchError(null);
    window.location.reload();
  };

  const duplicatedTours = tours.length > 0 ? [...tours, ...tours] : [];

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="bg-white py-24">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-12">
            <div className="space-y-3">
              <div className="h-12 w-[420px] bg-slate-200 rounded-md animate-pulse" />
              <div className="h-6 w-[360px] bg-slate-200 rounded-md animate-pulse" />
            </div>
            <div className="h-14 w-48 bg-slate-200 rounded-full animate-pulse" />
          </div>

          <div className="flex gap-6 overflow-hidden py-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 px-3">
                <div className="w-[360px] h-[420px] bg-slate-200 rounded-3xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error
  if (fetchError) {
    return (
      <section className="bg-white py-24">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Featured Tours</h2>
            <p className="text-gray-600 mb-6">We couldn't load featured tours right now.</p>
            <div className="inline-flex gap-3">
              <button onClick={retryFetch} className="px-6 py-3 rounded-full bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition">Retry</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (tours.length === 0) {
    return (
      <section className="bg-white py-24">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3">Featured Tours</h2>
          <p className="text-gray-600">No featured tours available right now.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-b from-white to-gray-50 py-24">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                Canal Cruises Perfect For You
              </h2>
              <p className="mt-3 text-lg text-gray-600 max-w-2xl">
                Discover top-rated experiences in Amsterdam — handpicked by local experts for unforgettable memories.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/tours"
                className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-white text-lg font-bold shadow-2xl hover:scale-105 transform transition"
                aria-label="See all tours"
              >
                <span>See all tours</span>
                <ArrowRight size={20} />
              </Link>

            </div>
          </div>

          <div className="relative w-full overflow-hidden group py-6">
            {/* Soft gradient masks */}
            <div className="absolute top-0 left-0 w-28 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-28 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            <div className="flex gap-6 animate-marquee group-hover:[animation-play-state:paused]">
              {duplicatedTours.map((tour, idx) => (
                <div key={`${(tour as any)._id || tour.slug}-${idx}`} className="flex-shrink-0 px-2">
                  <TourCard tour={tour} onAddToCartClick={handleAddToCartClick} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <BookingSidebar
        isOpen={isBookingSidebarOpen}
        onClose={closeSidebar}
        tour={selectedTour}
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

        .font-sans { font-family: 'Poppins', sans-serif; }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .animate-marquee {
          animation: marquee 36s linear infinite;
        }

        /* Slight neon-glow on hover for premium look */
        .group:hover .glow {
          box-shadow: 0 12px 30px rgba(236, 72, 153, 0.18), 0 6px 12px rgba(0,0,0,0.06);
        }

        /* Ensure marquee is smooth on high perf devices */
        .animate-marquee { will-change: transform; }

        /* Utility: clamp width for better presentation on very small screens */
        @media (max-width: 640px) {
          .animate-marquee { animation-duration: 28s; }
        }
      `}</style>
    </>
  );
}

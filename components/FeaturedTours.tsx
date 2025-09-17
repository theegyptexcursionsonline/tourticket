// components/FeaturedTours.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Star, ShoppingCart, Clock, Users, Loader2, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import BookingSidebar from '@/components/BookingSidebar';
import Link from 'next/link';

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

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
  }, [src]);

  // Check if src is valid
  if (!src || src.trim() === '' || imageError) {
    return (
      <div 
        className={`bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <ImageIcon size={40} className="text-gray-400 mb-2" />
        <span className="text-gray-500 text-sm font-medium">No Image</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"
          style={{ width, height }}
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

// Reusable Tour Card Component
const TourCard = ({ tour, onAddToCartClick }: { tour: Tour; onAddToCartClick: (tour: Tour) => void }) => {
  const { formatPrice } = useSettings();

  const formatBookings = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k`;
    return num.toString();
  };

  const getTagColor = (tag: string) => {
    if (tag.includes('%')) return 'bg-red-600 text-white';
    if (tag === 'Staff favourite') return 'bg-blue-600 text-white';
    if (tag === 'Online only deal') return 'bg-emerald-600 text-white';
    if (tag === 'New') return 'bg-purple-600 text-white';
    if (tag === 'Best for Kids') return 'bg-yellow-500 text-black';
    return 'bg-gray-200 text-gray-800';
  };

  return (
    <Link 
      href={`/tour/${tour.slug || '#'}`}
      className="block flex-shrink-0 w-[340px] bg-white shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group"
    >
      <div className="relative">
        <SafeImage
          src={tour.image} 
          alt={tour.title || 'Tour image'} 
          width={340}
          height={192}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" 
        />
        
        {/* Tags */}
        {tour.tags && tour.tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
            {tour.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full shadow-sm ${getTagColor(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Add to Cart Button */}
        <button 
          onClick={(e) => {
            e.preventDefault(); 
            e.stopPropagation();
            onAddToCartClick(tour);
          }}
          className="absolute bottom-4 right-4 bg-white/70 backdrop-blur-sm text-gray-800 p-2.5 rounded-full transition-all duration-300 hover:bg-red-600 hover:text-white hover:scale-110 z-10"
          aria-label="Add to cart"
        >
          <ShoppingCart size={22} />
        </button>
      </div>
      
      <div className="p-5 flex flex-col h-[180px]">
        <h3 className="text-xl font-bold text-gray-900 leading-snug flex-grow line-clamp-2">
          {tour.title || 'Untitled Tour'}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 my-3">
          <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-gray-400"/>
            <span className="font-medium">{tour.duration || 'Duration not specified'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-gray-400"/>
            <span className="font-medium">{formatBookings(tour.bookings)} booked</span>
          </div>
        </div>
        
        <div className="mt-auto flex items-end justify-between">
          <div className="flex items-center gap-1.5 text-yellow-500">
            <Star size={20} className="fill-current" />
            <span className="font-bold text-lg text-gray-800">
              {tour.rating ? tour.rating.toFixed(1) : '0.0'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-red-600">
              {formatPrice(tour.discountPrice || tour.originalPrice || 0)}
            </span>
            {tour.originalPrice && tour.discountPrice && tour.originalPrice > tour.discountPrice && (
              <span className="ml-2 text-base font-normal text-gray-500 line-through">
                {formatPrice(tour.originalPrice)}
              </span>
            )}
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
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        if (data.success) {
          // Handle both isFeatured boolean field and fallback to first few tours
          let featured = (data.data || []).filter((t: Tour) => t.isFeatured === true);
          
          // If no tours are marked as featured, take the first 6 tours as fallback
          if (featured.length === 0) {
            console.log('No tours marked as featured, using first 6 tours as fallback');
            featured = (data.data || []).slice(0, 6);
          }
          
          // Validate and sanitize tour data
          const validatedTours = featured.map((tour: Tour) => ({
            ...tour,
            // Ensure image is either a valid string or null
            image: tour.image && tour.image.trim() !== '' ? tour.image : null,
            // Ensure title exists
            title: tour.title || 'Untitled Tour',
            // Ensure slug exists
            slug: tour.slug || '',
            // Ensure prices are numbers
            originalPrice: typeof tour.originalPrice === 'number' ? tour.originalPrice : null,
            discountPrice: typeof tour.discountPrice === 'number' ? tour.discountPrice : tour.originalPrice || 0,
            // Ensure rating is a number
            rating: typeof tour.rating === 'number' ? tour.rating : 0,
            // Ensure bookings is a number
            bookings: typeof tour.bookings === 'number' ? tour.bookings : 0,
            // Ensure duration exists
            duration: tour.duration || 'Duration not specified',
            // Ensure tags is an array
            tags: Array.isArray(tour.tags) ? tour.tags : [],
          }));
          
          setTours(validatedTours);
        } else {
          throw new Error(data.error || 'API returned success: false');
        }
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
    // Trigger re-fetch by updating the effect dependency
    window.location.reload();
  };
  
  // Duplicate tours for seamless animation
  const duplicatedTours = tours.length > 0 ? [...tours, ...tours] : [];

  // Loading state
  if (isLoading) {
    return (
      <section className="bg-white py-20 font-sans">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
            <div className="animate-pulse">
              <div className="h-12 w-96 bg-slate-200 rounded-lg mb-2" />
              <div className="h-6 w-80 bg-slate-200 rounded-lg" />
            </div>
            <div className="h-12 w-32 bg-slate-200 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-4 overflow-hidden py-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 px-4">
                <div className="w-[340px] h-[400px] bg-slate-200 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <section className="bg-white py-20 font-sans">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Featured Tours
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-800 font-medium">Failed to load featured tours</p>
              <p className="text-red-600 text-sm mt-2">{fetchError}</p>
              <button 
                onClick={retryFetch}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (tours.length === 0) {
    return (
      <section className="bg-white py-20 font-sans">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Featured Tours
            </h2>
            <p className="text-gray-600">No featured tours available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-white py-20 font-sans">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
            <div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
                Canal Cruises Perfect For You
              </h2>
              <p className="mt-2 text-lg text-gray-600 max-w-2xl">
                Discover top-rated experiences in Amsterdam, handpicked by our travel experts.
              </p>
            </div>
            <Link 
              href="/tours"
              className="flex-shrink-0 mt-6 sm:mt-0 flex items-center gap-2 bg-red-600 text-white font-semibold px-6 py-3 shadow-md hover:bg-red-700 transition-all duration-300"
            >
              <span>See all tours</span>
              <ArrowRight size={20} />
            </Link>
          </div>

          <div className="relative w-full overflow-hidden group py-8">
            {/* Gradient overlays */}
            <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
            
            {duplicatedTours.length > 0 && (
              <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
                {duplicatedTours.map((tour, index) => (
                  <div key={`${(tour as any)._id || tour.slug}-${index}`} className="flex-shrink-0 px-4">
                    <TourCard 
                      tour={tour} 
                      onAddToCartClick={handleAddToCartClick}
                    />
                  </div>
                ))}
              </div>
            )}
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
        
        .font-sans {
          font-family: 'Poppins', sans-serif;
        }

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
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </>
  );
}
// components/DayTrips.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Heart, ShoppingCart, Image as ImageIcon } from 'lucide-react';
import BookingSidebar from '@/components/BookingSidebar';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';
import Image from 'next/image';

type MaybeCategory = { slug?: string } | string | null | undefined;

// --- Safe Image Component ---
const SafeImage = ({ 
  src, 
  alt, 
  className 
}: { 
  src: string | null | undefined; 
  alt: string; 
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
      <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center ${className}`}>
        <ImageIcon size={32} className="text-gray-400 mb-2" />
        <span className="text-gray-500 text-xs font-medium">No Image</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className={`absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse ${className}`} />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover transition-transform duration-300 group-hover:scale-105 ${className}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        sizes="270px"
        priority={false}
      />
    </div>
  );
};

// --- Day Trip Card Component ---
const DayTripCard = ({ 
  trip, 
  onAddToCartClick 
}: { 
  trip: Tour; 
  onAddToCartClick: (trip: Tour) => void; 
}) => {
  const { formatPrice } = useSettings();

  return (
    <Link 
      href={`/tour/${trip.slug}`} 
      className="flex-shrink-0 w-[270px] bg-white rounded-xl shadow-lg overflow-hidden snap-start group transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
    >
      <div className="relative h-40">
        <SafeImage
          src={trip.image}
          alt={trip.title || 'Tour image'}
          className="w-full h-full rounded-t-xl"
        />
        
        {trip.tags?.find((tag: any) => typeof tag === 'string' && tag.includes('%')) && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
            {trip.tags.find((tag: any) => typeof tag === 'string' && tag.includes('%'))}
          </div>
        )}
        
        <button 
          className="absolute top-3 right-3 bg-white/80 p-2 rounded-full text-slate-600 backdrop-blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-white z-10"
          onClick={(e) => {
            e.preventDefault();
            console.log('Added to favorites:', trip.title);
          }}
          aria-label="Add to favorites"
        >
          <Heart size={20} />
        </button>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            onAddToCartClick(trip);
          }}
          className="absolute bottom-3 right-3 bg-red-600 text-white p-2.5 rounded-full shadow-lg transform translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-in-out hover:bg-red-700 hover:scale-110 z-10"
          aria-label="Add to cart"
        >
          <ShoppingCart size={20} />
        </button>
      </div>
      
      <div className="p-4 flex flex-col h-[180px]">
        <h3 className="font-bold text-base text-slate-800 transition-colors group-hover:text-red-600 line-clamp-2 flex-grow">
          {trip.title || 'Untitled Tour'}
        </h3>
        
        <p className="text-sm text-slate-500 mt-1">
          {trip.duration || 'Duration not specified'}
        </p>
        
        <div className="flex items-center mt-2 text-sm">
          <div className="flex items-center text-yellow-500">
            <Star size={16} fill="currentColor" />
            <span className="font-bold text-slate-800 ml-1">
              {typeof trip.rating === 'number' ? trip.rating.toFixed(1) : trip.rating || '0.0'}
            </span>
          </div>
          <span className="text-slate-500 ml-2">
            ({(trip.bookings || 0).toLocaleString()})
          </span>
        </div>
        
        <div className="flex items-baseline justify-end mt-auto pt-2">
          {trip.originalPrice && (
            <span className="text-slate-500 line-through mr-2">
              {formatPrice(trip.originalPrice)}
            </span>
          )}
          <span className="font-extrabold text-2xl text-slate-900">
            {formatPrice(trip.discountPrice || trip.originalPrice || 0)}
          </span>
        </div>
      </div>
    </Link>
  );
};

// --- Main Component ---
export default function DayTripsSection() {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();

    const parseCategorySlug = (category: MaybeCategory) => {
      if (!category) return null;
      if (typeof category === 'string') return category;
      if (typeof category === 'object' && 'slug' in category) return (category as any).slug;
      return null;
    };

    const fetchTours = async () => {
      setIsLoading(true);
      setFetchError(null);

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = '/api/admin/tours';
        console.info('[DayTrips] fetching', url);
        const response = await fetch(url, { headers, signal: controller.signal });

        const bodyText = await response.text();

        // Always log raw body for debugging
        console.debug('[DayTrips] raw response body:', bodyText);

        if (!response.ok) {
          let parsedBody: any = bodyText;
          try { parsedBody = JSON.parse(bodyText); } catch (e) { /* keep text */ }
          console.error('API call failed', {
            url,
            status: response.status,
            statusText: response.statusText,
            body: parsedBody,
          });
          const shortBody = typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody).slice(0, 300);
          setFetchError(`Server returned ${response.status} ${response.statusText}: ${shortBody}`);
          setTours([]);
          return;
        }

        const data = bodyText ? JSON.parse(bodyText) : null;
        if (!data) {
          setFetchError('API returned no data.');
          console.error('API returned empty response body for', url);
          setTours([]);
          return;
        }

        // Expecting { success: true, data: [...] } style response
        if (data.success && Array.isArray(data.data)) {
          // Filter for day-trips, but be tolerant:
          const dayTrips = (data.data as any[])
            .filter((t) => {
              // If there's a category slug or category string, accept it
              const slug = parseCategorySlug(t.category);
              // Accept if slug === 'day-trips' OR if a categoryId / category field indicates day trips
              return slug === 'day-trips' || slug === 'day_trips' || slug === 'daytrips' || slug === 'day trips' || (!slug && (t.tags || []).some((tg: any) => String(tg).toLowerCase().includes('day')));
            })
            .map((tour) => ({
              ...tour,
              image: tour.image && typeof tour.image === 'string' && tour.image.trim() !== '' ? tour.image : null,
              title: tour.title || 'Untitled Tour',
              originalPrice: typeof tour.originalPrice === 'number' ? tour.originalPrice : null,
              discountPrice: typeof tour.discountPrice === 'number' ? tour.discountPrice : (typeof tour.originalPrice === 'number' ? tour.originalPrice : 0),
              rating: typeof tour.rating === 'number' ? tour.rating : 0,
              bookings: typeof tour.bookings === 'number' ? tour.bookings : 0,
            }));

          if (!aborted) {
            setTours(dayTrips);
            setFetchError(dayTrips.length === 0 ? 'No day trips matched the category filter.' : null);
          }
        } else if (Array.isArray(data)) {
          // Some APIs return raw array
          const dayTrips = data
            .filter((t: any) => parseCategorySlug(t.category) === 'day-trips' || true) // be permissive
            .map((tour: any) => ({
              ...tour,
              image: tour.image && typeof tour.image === 'string' && tour.image.trim() !== '' ? tour.image : null,
              title: tour.title || 'Untitled Tour',
              originalPrice: typeof tour.originalPrice === 'number' ? tour.originalPrice : null,
              discountPrice: typeof tour.discountPrice === 'number' ? tour.discountPrice : (typeof tour.originalPrice === 'number' ? tour.originalPrice : 0),
              rating: typeof tour.rating === 'number' ? tour.rating : 0,
              bookings: typeof tour.bookings === 'number' ? tour.bookings : 0,
            }));

          if (!aborted) {
            setTours(dayTrips);
            setFetchError(dayTrips.length === 0 ? 'No tours returned from API.' : null);
          }
        } else {
          const errMsg = data?.error || 'API returned unexpected shape.';
          console.error('[DayTrips] unexpected API shape', data);
          setFetchError(String(errMsg));
          setTours([]);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn('[DayTrips] fetch aborted');
          return;
        }
        console.error('Failed to fetch tours:', error);
        setFetchError(error?.message ? String(error.message) : 'Unknown error while fetching tours.');
        setTours([]);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    };

    fetchTours();

    return () => {
      aborted = true;
      controller.abort();
    };
  }, []);

  const handleAddToCartClick = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };

  const closeSidebar = () => {
    setBookingSidebarOpen(false);
    setTimeout(() => setSelectedTour(null), 300);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainer.current) {
      const scrollAmount = direction === 'left' ? -294 : 294;
      scrollContainer.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const retryFetch = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/admin/tours');
      const text = await response.text();
      if (!response.ok) {
        let parsed = text;
        try { parsed = JSON.parse(text); } catch (e) {}
        setFetchError(`Server returned ${response.status} ${response.statusText}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed).slice(0, 300)}`);
        setTours([]);
      } else {
        const data = text ? JSON.parse(text) : null;
        if (data?.success) {
          const dayTrips = (data.data || []).map((tour: any) => ({
            ...tour,
            image: tour.image && typeof tour.image === 'string' && tour.image.trim() !== '' ? tour.image : null,
            title: tour.title || 'Untitled Tour',
            originalPrice: typeof tour.originalPrice === 'number' ? tour.originalPrice : null,
            discountPrice: typeof tour.discountPrice === 'number' ? tour.discountPrice : (typeof tour.originalPrice === 'number' ? tour.originalPrice : 0),
            rating: typeof tour.rating === 'number' ? tour.rating : 0,
            bookings: typeof tour.bookings === 'number' ? tour.bookings : 0,
          }));
          setTours(dayTrips);
          setFetchError(dayTrips.length === 0 ? 'No day trips matched the category filter.' : null);
        } else {
          setFetchError(data?.error ? String(data.error) : 'API returned success:false');
          setTours([]);
        }
      }
    } catch (err: any) {
      setFetchError(err?.message ? String(err.message) : 'Unknown error while retrying.');
      setTours([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="bg-slate-50 py-20 font-sans">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8 px-4">
            <div className="max-w-2xl animate-pulse">
              <div className="h-10 w-96 bg-slate-200 rounded-lg mb-2" />
              <div className="h-6 w-80 bg-slate-200 rounded-lg" />
            </div>
            <div className="hidden md:flex gap-3">
              <div className="h-12 w-12 bg-slate-200 rounded-full animate-pulse" />
              <div className="h-12 w-12 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex gap-6 overflow-hidden px-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[270px] h-[360px] bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error UI
  if (!isLoading && fetchError) {
    return (
      <section className="bg-slate-50 py-20 font-sans">
        <div className="container mx-auto text-center px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              Best Deals on Tours from Egypt
            </h2>
            <p className="mt-2 text-lg text-slate-600">
              Explore beyond the city with these top-rated day trips.
            </p>
          </div>

          <div className="mt-8">
            <div className="inline-block bg-white p-6 rounded-xl shadow max-w-4xl">
              <h3 className="text-xl font-semibold text-slate-800">
                Couldn't load day trips
              </h3>
              <p className="mt-2 text-slate-600">
                We had trouble loading tours. Please try again later.
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                  Show error details
                </summary>
                <pre className="mt-2 text-xs text-left p-3 bg-slate-100 rounded max-w-full overflow-auto break-words whitespace-pre-wrap">
                  {fetchError}
                </pre>
              </details>
              <div className="mt-4">
                <button
                  onClick={retryFetch}
                  disabled={isLoading}
                  className="bg-red-600 text-white font-bold py-2 px-6 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // If no day trips found, render nothing (or you can render a friendly message)
  if (!isLoading && tours.length === 0) {
    return null;
  }

  return (
    <>
      <section className="bg-slate-50 py-20 font-sans">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8 px-4">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                Best Deals on Tours from Egypt
              </h2>
              <p className="mt-2 text-lg text-slate-600">
                Explore beyond the city with these top-rated day trips, all with exclusive online discounts.
              </p>
            </div>
            <div className="hidden md:flex gap-3">
              <button 
                onClick={() => scroll('left')} 
                className="bg-white p-3 rounded-full shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600 hover:shadow-lg"
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => scroll('right')} 
                className="bg-white p-3 rounded-full shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600 hover:shadow-lg"
                aria-label="Scroll right"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          <div 
            ref={scrollContainer} 
            className="flex gap-6 overflow-x-auto pb-4 scroll-smooth px-4 snap-x snap-mandatory" 
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {tours.map(trip => (
              <DayTripCard 
                key={(trip as any)._id || trip.slug} 
                trip={trip} 
                onAddToCartClick={handleAddToCartClick} 
              />
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link 
              href="/search" 
              className="bg-red-600 text-white font-bold py-3.5 px-10 rounded-full text-base hover:bg-red-700 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl"
            >
              SEE ALL DAY TRIPS FROM AMSTERDAM
            </Link>
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
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
        .overflow-x-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
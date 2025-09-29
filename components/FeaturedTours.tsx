'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Star, ShoppingCart, Clock, Users, ImageIcon } from 'lucide-react';

/**
 * Enhanced FeaturedTours - Perfect Card Design
 *
 * NOTE: External Next.js dependencies (Image, Link, useSettings, BookingSidebar)
 * have been replaced with native or mock components for compilation in this environment.
 *
 * Key improvements:
 * - Solid white cards with proper shadows from the start
 * - Enhanced visual hierarchy and spacing
 * - Smooth hover animations with scale and glow effects
 * - Better contrast and readability
 * - Intuitive card appearance that's immediately recognizable
 * - Added Operator/Curation Chip
 */

// --- Mocked Types ---
interface Tour {
    _id?: string;
    slug?: string;
    image?: string | null;
    title?: string;
    excerpt?: string;
    summary?: string;
    originalPrice?: number | null;
    discountPrice?: number;
    rating?: number;
    bookings?: number;
    duration?: string;
    tags?: string[];
    isFeatured?: boolean;
}

// --- Mocked useSettings Hook ---
const useSettings = () => {
    // Mock implementation of a simple price formatter
    const formatPrice = (price: number | null) => {
        if (price === null || isNaN(price)) return 'Free';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(price);
    };
    return { formatPrice };
};

// --- Mocked BookingSidebar Component ---
const BookingSidebar = ({ isOpen, onClose, tour }: { isOpen: boolean; onClose: () => void; tour: Tour | null }) => {
    if (!isOpen || !tour) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] transition-all duration-300"
            style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Sidebar Content */}
            <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl p-6 flex flex-col">
                <div className="flex justify-between items-center pb-4 border-b">
                    <h3 className="text-xl font-bold text-gray-900">Book Tour: {tour.title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div className="flex-grow mt-4 text-gray-600">
                    <p>This is a mock booking form for {tour.title}.</p>
                    <p className="mt-2 text-sm text-red-500">
                        In a full Next.js application, this would contain complex booking logic.
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- Safe Image Component (Replaced Next/Image with standard <img>) ---
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
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}
        style={{ width, height, minWidth: width, minHeight: height }} // Added min-dimensions for carousel
        role="img"
        aria-label="No image available"
      >
        <ImageIcon size={48} className="text-gray-400 mb-3" />
        <span className="text-gray-500 text-sm font-medium">Image unavailable</span>
      </div>
    );
  }

  // Use standard <img> tag
  return (
    <div className="relative" style={{ width, height, minWidth: width, minHeight: height }}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-t-3xl"
          style={{ width, height }}
          aria-hidden
        />
      )}
      <img
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
        // In a real application, 'priority' is used, but here we just use native loading
        loading="lazy" 
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

// Enhanced Tour Card Component
const TourCard = ({ tour, onAddToCartClick }: { tour: Tour; onAddToCartClick: (tour: Tour) => void }) => {
  const { formatPrice } = useSettings();
  
  // Mock operator name based on user request and common practice
  const operatorName = "Operated by EgyptExcursionOnlien"; 
  const tourLink = `/tour/${tour.slug || '#'}`;

  return (
    // Replaced Link with standard <a> tag
    <a
      href={tourLink}
      className="block w-[360px] md:w-[380px] lg:w-[400px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-red-500/10 border border-red-100 transform transition-all duration-500 hover:-translate-y-2 group focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
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

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Top-left Operator Chip (NEW) */}
        <div className="absolute top-4 left-4 z-20">
          <span
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full bg-slate-900/80 text-white shadow-lg backdrop-blur-sm"
          >
            {operatorName}
          </span>
        </div>

        {/* Top-left tags (ADJUSTED POSITION to stack below operator chip) */}
        {tour.tags && tour.tags.length > 0 && (
          <div className="absolute top-[68px] left-4 flex flex-wrap gap-2 z-20">
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

        {/* Rating badge (top-right) */}
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-2 shadow-lg border border-white/20">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-gray-800">
              {tour.rating ? tour.rating.toFixed(1) : '0.0'}
            </span>
          </div>
        </div>

        {/* Price pill (overlay bottom-left) */}
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

        {/* Add to cart button (enhanced) */}
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

      {/* Card content with better spacing */}
      <div className="p-6 md:p-7 bg-white">
        <div className="mb-4">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-3 line-clamp-2 group-hover:text-red-600 transition-colors duration-300">
            {tour.title || 'Untitled Tour'}
          </h3>

          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
            {tour.excerpt || tour.summary || 'A beautifully curated experience — enjoy local highlights, guided commentary, and flexible booking.'}
          </p>
        </div>

        {/* Stats row */}
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

        {/* Price section */}
        <div className="flex items-center justify-between">
          <div className="text-right">
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
    </a>
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
    // Mocked data fetch since the API endpoint is not available in this environment.
    const mockTours: Tour[] = [
        {
            slug: 'amsterdam-canal-cruise',
            image: 'https://placehold.co/400x240/1f2937/ffffff?text=Canal+Cruise',
            title: 'Amsterdam City Canal Cruise: 1-Hour Classic Tour',
            excerpt: 'Experience the best of Amsterdam' ,
            originalPrice: 35,
            discountPrice: 28,
            rating: 4.8,
            bookings: 12500,
            duration: '1 hr',
            tags: ['-20%', 'Staff favourite'],
            isFeatured: true
        },
        {
            slug: 'zaanse-schans-windmills',
            image: 'https://placehold.co/400x240/4c7c59/ffffff?text=Windmills',
            title: 'Zaanse Schans Windmills & Countryside Day Trip',
            excerpt: 'Visit the historic windmills and green wooden houses.',
            originalPrice: 65,
            discountPrice: 58,
            rating: 4.6,
            bookings: 8153,
            duration: '3.5 hrs',
            tags: ['Best deal', '-10%'],
            isFeatured: true
        },
        {
            slug: 'kinderdijk-boat-tour',
            image: 'https://placehold.co/400x240/64748b/ffffff?text=Kinderdijk+Boats',
            title: 'Kinderdijk Windmills Boat Tour & Museum',
            excerpt: 'See 19 magnificent, authentic windmills built in the 18th century.',
            originalPrice: 45,
            discountPrice: 40,
            rating: 4.9,
            bookings: 3568,
            duration: '2 hrs',
            tags: ['New', 'Online only deal'],
            isFeatured: true
        },
        {
            slug: 'cube-houses-rotterdam',
            image: 'https://placehold.co/400x240/facc15/000000?text=Cube+Houses',
            title: 'Rotterdam Architecture Tour: Cube Houses & Markthal',
            excerpt: 'Explore the modern architectural wonders of Rotterdam.',
            originalPrice: 30,
            discountPrice: 30,
            rating: 4.7,
            bookings: 5179,
            duration: '4 hrs',
            tags: ['Best for Kids'],
            isFeatured: true
        },
        {
            slug: 'keukenhof-tulips',
            image: 'https://placehold.co/400x240/f43f5e/ffffff?text=Tulips',
            title: 'Keukenhof Tulip Gardens & Flower Fields Experience',
            excerpt: 'The most beautiful spring garden in the world.',
            originalPrice: 70,
            discountPrice: 60,
            rating: 4.5,
            bookings: 2200,
            duration: '5 hrs',
            tags: ['Seasonal', '-15%'],
            isFeatured: true
        },
        {
            slug: 'rijksmuseum-skip-the-line',
            image: 'https://placehold.co/400x240/ef4444/ffffff?text=Rijksmuseum',
            title: 'Rijksmuseum Skip-the-Line Entry Ticket',
            excerpt: 'Masterpieces by Rembrandt and Vermeer.',
            originalPrice: 22,
            discountPrice: 22,
            rating: 4.7,
            bookings: 18000,
            duration: 'Flexible',
            tags: ['Staff favourite'],
            isFeatured: false // Example of non-featured tour included for data variety
        },
    ];

    const fetchTours = async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800)); 
      try {
        // Use mocked data
        let featured = mockTours.filter((t: Tour) => t.isFeatured === true);
        if (featured.length === 0) featured = mockTours.slice(0, 6);
        
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
      } catch (error: any) {
        // This won't happen with mock data, but kept for robustness
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
    // In a production environment, this would call the fetch logic again.
    // Here, we just reload the mock data.
    window.location.reload(); 
  };

  const duplicatedTours = tours.length > 0 ? [...tours, ...tours] : [];

  // Enhanced loading skeleton
  if (isLoading) {
    return (
      <section className="bg-gradient-to-b from-white to-gray-50 py-24">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-12">
            <div className="space-y-4">
              <div className="h-12 w-[420px] bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-6 w-[360px] bg-gray-200 rounded-lg animate-pulse" />
            </div>
            <div className="h-14 w-48 bg-gray-200 rounded-full animate-pulse" />
          </div>

          <div className="flex gap-6 overflow-hidden py-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 px-3">
                <div className="w-[360px] bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="h-56 bg-gray-200 animate-pulse" />
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
                      <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4" />
                    </div>
                  </div>
                </div>
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
      <section className="bg-gradient-to-b from-white to-gray-50 py-24">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center bg-white rounded-3xl shadow-lg p-12 border border-gray-100">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Tours</h2>
            <p className="text-gray-600 mb-8 text-lg">We couldn't load featured tours right now.</p>
            <button 
              onClick={retryFetch} 
              className="px-8 py-4 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Retry Loading
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (tours.length === 0) {
    return (
      <section className="bg-gradient-to-b from-white to-gray-50 py-24">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <div className="bg-white rounded-3xl shadow-lg p-12 border border-gray-100">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Tours</h2>
            <p className="text-gray-600 text-lg">No featured tours available right now.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-b from-white to-gray-50 py-24">
        <div className="container mx-auto px-4 md:px-8">
          {/* Header section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
                Canal Cruises Perfect For You
              </h2>
              <p className="mt-4 text-xl text-gray-600 leading-relaxed">
                Discover top-rated experiences in Amsterdam — handpicked by local experts for unforgettable memories.
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Replaced Link with standard <a> tag */}
              <a
                href="/tours"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white text-lg font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transform transition-all duration-300 border-2 border-transparent hover:border-white/20"
                aria-label="See all tours"
              >
                <span>See all tours</span>
                <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </div>
          </div>

          {/* Cards carousel */}
          <div className="relative w-full overflow-hidden group py-8">
            {/* Enhanced gradient masks */}
            <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-gray-50 via-gray-50/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-gray-50 via-gray-50/80 to-transparent z-10 pointer-events-none" />

            <div className="flex gap-8 animate-marquee group-hover:[animation-play-state:paused]">
              {duplicatedTours.map((tour, idx) => (
                // Use a standard div key since we mocked the Tour type
                <div key={`${tour.slug || 'mock-tour'}-${idx}`} className="flex-shrink-0 px-2">
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
        /* Load Inter font from Google Fonts (standard practice in Next.js/React projects) */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .font-sans { font-family: 'Inter', sans-serif; }

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
        }

        /* Enhanced shadow utilities */
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }

        /* Smooth performance optimizations */
        .animate-marquee { 
          backface-visibility: hidden;
          perspective: 1000px;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .animate-marquee { animation-duration: 32s; }
        }
      `}</style>
    </>
  );
}

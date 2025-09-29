'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, AlertCircle, Star, Users, ChevronLeft, ChevronRight } from 'lucide-react';

// --- TYPES & INTERFACES ---
interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
  image?: string;
}

// --- IMAGE MAPPING ---
const getInterestImage = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  const imageMap: { [key: string]: string } = {
    'fun': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
    'family': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop',
    'sightseeing': 'https://images.unsplash.com/photo-1555881698-6bfe5f815071?w=600&h=400&fit=crop',
    'historical': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop',
    'bus': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=400&fit=crop',
    'water': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop',
    'nightlife': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
    'cultural': 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&h=400&fit=crop',
    'adventure': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
    'luxury': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    'food': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    'beach': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
  };

  for (const [key, url] of Object.entries(imageMap)) {
    if (lowerName.includes(key)) return url;
  }

  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop';
};

// --- SUB-COMPONENTS ---

const InterestCard = ({ interest }: { interest: Interest }) => {
  const linkUrl = interest.type === 'attraction' ? `/attraction/${interest.slug}` : `/interests/${interest.slug}`;
  const imageUrl = interest.image || getInterestImage(interest.name);

  return (
    <Link
      href={linkUrl}
      className="group relative block overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex-shrink-0"
      style={{ width: '320px', height: '380px' }}
    >
      {/* Image */}
      <div className="relative w-full h-full overflow-hidden">
        <Image
          src={imageUrl}
          alt={interest.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="320px"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />

        {/* Border Effect */}
        <div className="absolute inset-0 border-4 border-transparent group-hover:border-cyan-400 transition-all duration-300 rounded-2xl" />
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg transform transition-all duration-300 group-hover:bg-white">
          <h3 className="text-lg font-bold text-slate-900 mb-1 uppercase tracking-wide">
            {interest.name}
          </h3>
          <p className="text-sm text-slate-700 font-medium">
            {interest.products} products
          </p>
        </div>
      </div>

      {/* Featured Badge */}
      {interest.featured && (
        <div className="absolute top-4 right-4 z-20 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
          Featured
        </div>
      )}
    </Link>
  );
};

const ScrollableRow = ({ 
  interests, 
  rowIndex 
}: { 
  interests: Interest[]; 
  rowIndex: number;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        scrollElement.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [interests]);

  // Auto-scroll functionality
  useEffect(() => {
    if (isHovered) return;

    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const scrollInterval = setInterval(() => {
      if (scrollElement.scrollLeft >= scrollElement.scrollWidth - scrollElement.clientWidth - 10) {
        scrollElement.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollElement.scrollBy({ left: 1, behavior: 'auto' });
      }
    }, 30);

    return () => clearInterval(scrollInterval);
  }, [isHovered]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 340; // Card width + gap
      const newScrollLeft = direction === 'left' 
        ? scrollRef.current.scrollLeft - scrollAmount
        : scrollRef.current.scrollLeft + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white text-slate-800 p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm border border-slate-200"
          aria-label="Scroll left"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white text-slate-800 p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm border border-slate-200"
          aria-label="Scroll right"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth px-4 py-2"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {interests.map((interest) => (
          <div 
            key={`${rowIndex}-${interest._id}`} 
            style={{ scrollSnapAlign: 'start' }}
          >
            <InterestCard interest={interest} />
          </div>
        ))}
      </div>

      {/* Gradient Masks */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none z-10" />
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-8">
    {[0, 1].map((rowIndex) => (
      <div key={rowIndex} className="flex gap-5 overflow-hidden px-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 rounded-2xl bg-slate-200 animate-pulse"
            style={{ width: '320px', height: '380px' }}
          >
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-white/90 rounded-xl p-4">
                <div className="h-6 bg-slate-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const InfoState = ({ 
  icon, 
  title, 
  message, 
  children 
}: { 
  icon: React.ReactNode; 
  title: string; 
  message: string; 
  children?: React.ReactNode;
}) => (
  <div className="text-center py-16">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 text-slate-500 rounded-full mb-4">
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-600 max-w-md mx-auto mb-6">{message}</p>
    {children}
  </div>
);

// --- MAIN COMPONENT ---

export default function PopularInterests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/interests');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          setInterests(data.data);
        } else {
          throw new Error(data.error || 'Invalid response format from API');
        }
      } catch (err: any) {
        console.error('Error fetching interests:', err);
        setError(err.message || 'Failed to load content from the server.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Split interests into two rows
  const midPoint = Math.ceil(interests.length / 2);
  const firstRow = interests.slice(0, midPoint);
  const secondRow = interests.slice(midPoint);

  const renderContent = () => {
    if (loading) return <LoadingSkeleton />;
    
    if (error) {
      return (
        <InfoState 
          icon={<AlertCircle size={32} />} 
          title="Error Loading Content" 
          message={error}
        />
      );
    }
    
    if (interests.length === 0) {
      return (
        <InfoState 
          icon={<Star size={32} />} 
          title="No Experiences Found" 
          message="We're busy crafting new adventures. Please check back soon for exciting new options!"
        >
          <Link 
            href="/tours" 
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
          >
            Browse All Tours <ArrowRight className="w-4 h-4" />
          </Link>
        </InfoState>
      );
    }

    return (
      <div className="space-y-8">
        <ScrollableRow interests={firstRow} rowIndex={0} />
        {secondRow.length > 0 && <ScrollableRow interests={secondRow} rowIndex={1} />}
      </div>
    );
  };

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 py-20 sm:py-28 overflow-hidden">
      <div className="container mx-auto px-4 max-w-[1400px]">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Find the Right Interest <br className="hidden sm:inline" />for You
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
            Explore curated experiences and discover the best of Egypt tailored to your unique tastes.
          </p>
        </div>

        {/* Content */}
        {renderContent()}

        {/* CTA Section */}
        {!loading && !error && interests.length > 0 && (
          <div className="mt-20">
            <div className="max-w-4xl mx-auto p-8 sm:p-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100 shadow-xl">
              <div className="text-center">
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
                  Need a Custom Itinerary?
                </h3>
                <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                  Our local travel experts are here to craft your dream Egyptian adventure with personalized recommendations.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link 
                    href="/tours" 
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    View All Experiences <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link 
                    href="/contact" 
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-blue-300 text-blue-700 font-bold rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-300"
                  >
                    Contact an Expert <Users className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
        }

        /* Hide scrollbar but keep functionality */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Smooth scroll behavior */
        .scroll-smooth {
          scroll-behavior: smooth;
        }
      `}</style>
    </section>
  );
}
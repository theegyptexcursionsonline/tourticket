// components/HeroSection.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, MapPin, Clock, Compass, Tag, FileText, X } from "lucide-react";
import Image from "next/image";
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import { motion, AnimatePresence } from 'framer-motion';
import 'instantsearch.css/themes/satellite.css';

// --- Types and Constants ---
interface HeroSettings {
  backgroundImages: {
    desktop: string;
    mobile?: string;
    alt: string;
    isActive: boolean;
  }[];
  currentActiveImage: string;
  title: {
    main: string;
    highlight: string;
  };
  searchSuggestions: string[];
  trustIndicators: {
    travelers: string;
    rating: string;
    ratingText: string;
    isVisible: boolean;
  };
  overlaySettings: {
    opacity: number;
    gradientType: 'dark' | 'light' | 'custom';
    customGradient?: string;
  };
  animationSettings: {
    slideshowSpeed: number;
    fadeSpeed: number;
    enableAutoplay: boolean;
  };
  metaTitle?: string;
  metaDescription?: string;
}

// Algolia Configuration
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const INDEX_CATEGORIES = 'categories';
const INDEX_BLOGS = 'blogs';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Default fallback settings
const DEFAULT_SETTINGS: HeroSettings = {
  backgroundImages: [
    { desktop: '/hero2.png', alt: 'Pyramids of Giza at sunrise', isActive: true },
    { desktop: '/hero1.jpg', alt: 'Felucca on the Nile at sunset', isActive: false },
    { desktop: '/hero3.png', alt: 'Luxor temple columns at golden hour', isActive: false }
  ],
  currentActiveImage: '/hero2.png',
  title: {
    main: 'Explore Egypt\'s ',
    highlight: 'Pyramids & Nile',
  },
  searchSuggestions: [
    "Where are you going?", "Find your next adventure", "Discover hidden gems",
    "Book unique experiences", "Explore new destinations", "Create lasting memories",
  ],
  trustIndicators: {
    travelers: '2M+ travelers',
    rating: '4.9/5 rating',
    ratingText: '★★★★★',
    isVisible: true,
  },
  overlaySettings: {
    opacity: 0.6,
    gradientType: 'dark',
  },
  animationSettings: {
    slideshowSpeed: 6,
    fadeSpeed: 900,
    enableAutoplay: true
  }
};

// --- Algolia Search Components ---
function CustomSearchBox({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(searchQuery);
  }, [searchQuery, refine]);

  return null;
}

function TourHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 py-2 bg-blue-50/90 border-b border-blue-100/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
            Tours ({hits.length})
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any) => (
        <a
          key={hit.objectID}
          href={`/tours/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-4 py-3 hover:bg-blue-50/50 transition-colors border-b border-gray-100/50 last:border-0 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              {(hit.image || hit.images?.[0] || hit.primaryImage) ? (
                <img
                  src={hit.image || hit.images?.[0] || hit.primaryImage}
                  alt={hit.title || 'Tour'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-sm truncate">
                {hit.title || 'Untitled Tour'}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                {hit.location && <span>{hit.location}</span>}
                {hit.duration && (
                  <>
                    <span className="text-gray-300">•</span>
                    <Clock className="w-3 h-3" />
                    <span>{hit.duration} days</span>
                  </>
                )}
                {(hit.price || hit.discountPrice) && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="font-medium text-blue-600">
                      ${hit.discountPrice || hit.price}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function DestinationHits({ onHitClick, limit = 3 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 py-2 bg-emerald-50/90 border-b border-emerald-100/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
            Destinations ({hits.length})
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any) => (
        <a
          key={hit.objectID}
          href={`/destinations/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-4 py-3 hover:bg-emerald-50/50 transition-colors border-b border-gray-100/50 last:border-0 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center flex-shrink-0 border border-emerald-200">
              <Compass className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-sm truncate">
                {hit.name || 'Untitled Destination'}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                {hit.country && <span>{hit.country}</span>}
                {hit.tourCount && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>{hit.tourCount} tours</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function CategoryHits({ onHitClick, limit = 3 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 py-2 bg-purple-50/90 border-b border-purple-100/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider">
            Categories ({hits.length})
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any) => (
        <a
          key={hit.objectID}
          href={`/categories/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-4 py-3 hover:bg-purple-50/50 transition-colors border-b border-gray-100/50 last:border-0 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center flex-shrink-0 border border-purple-200">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-sm truncate">
                {hit.name || 'Untitled Category'}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                {hit.tourCount && <span>{hit.tourCount} tours</span>}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// --- Helper Hooks ---
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < breakpoint);
    if (typeof window !== "undefined") {
      checkIsMobile();
      window.addEventListener("resize", checkIsMobile);
      return () => window.removeEventListener("resize", checkIsMobile);
    }
  }, [breakpoint]);
  
  return isMobile;
};

const useHeroSettings = () => {
  const [settings, setSettings] = useState<HeroSettings>(DEFAULT_SETTINGS);
  // NOTE: we keep isLoading for internal use, but default it to false so UI doesn't block
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      // If you want a visual indicator while loading, you can set isLoading(true) here
      try {
        const response = await fetch('/api/hero-settings');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSettings(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to load hero settings:', error);
        // Use default settings on error
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch in background; UI is shown immediately without spinner
    fetchSettings();
  }, []);

  return { settings, isLoading };
};

const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (texts.length === 0) return;
    const timer = setInterval(() => 
      setCurrentIndex((prev) => (prev + 1) % texts.length), 
      interval
    );
    return () => clearInterval(timer);
  }, [texts.length, interval]);
  
  return texts[currentIndex] || texts[0] || "Search...";
};

// --- Reusable Components ---
const HeroSearchBar = ({ suggestion }: { suggestion: string }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const handleCloseDropdown = () => {
    setIsExpanded(false);
  };

  return (
    <div className="mt-8 lg:mt-10 w-full flex justify-center md:justify-start" ref={containerRef}>
      <div className="relative w-full max-w-sm md:max-w-xl">
        {/* Search Input */}
        <div className="relative bg-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white hover:border-blue-200">
          <Search className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 md:h-7 md:w-7 text-red-500 flex-shrink-0 pointer-events-none" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder={suggestion}
            className="w-full pl-14 md:pl-16 pr-12 py-4 text-sm md:text-base text-slate-700 placeholder-slate-500 font-semibold rounded-full outline-none bg-transparent"
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsExpanded(false);
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Dropdown Results - Using absolute positioning with z-index */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden max-h-[400px] z-[9999]"
            >
              <div className="overflow-y-auto max-h-[400px]">
                {searchQuery ? (
                  <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                    <CustomSearchBox searchQuery={searchQuery} onSearchChange={setSearchQuery} />

                    {/* Tours Index */}
                    <Index indexName={INDEX_TOURS}>
                      <Configure hitsPerPage={5} />
                      <TourHits onHitClick={handleCloseDropdown} limit={5} />
                    </Index>

                    {/* Destinations Index */}
                    <Index indexName={INDEX_DESTINATIONS}>
                      <Configure hitsPerPage={3} />
                      <DestinationHits onHitClick={handleCloseDropdown} limit={3} />
                    </Index>

                    {/* Categories Index */}
                    <Index indexName={INDEX_CATEGORIES}>
                      <Configure hitsPerPage={3} />
                      <CategoryHits onHitClick={handleCloseDropdown} limit={3} />
                    </Index>
                  </InstantSearch>
                ) : (
                  // Trending Searches - shown when no search query
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Compass className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Popular Searches
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Pyramids of Giza', 'Nile Cruise', 'Luxor Temple', 'Desert Safari', 'Cairo Tours', 'Red Sea Diving'].map((trend) => (
                        <button
                          key={trend}
                          onClick={() => {
                            setSearchQuery(trend);
                          }}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-300 hover:text-blue-700 hover:shadow-md transition-all duration-200"
                        >
                          {trend}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const BackgroundSlideshow = ({ 
  slides = [], 
  delay = 6000, 
  fadeMs = 900,
  autoplay = true 
}: { 
  slides?: Array<{src: string, alt: string, caption?: string}>, 
  delay?: number, 
  fadeMs?: number,
  autoplay?: boolean 
}) => {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Preload images
    slides.forEach(s => {
      const img = new window.Image();
      img.src = s.src;
    });
  }, [slides]);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    
    const next = () => setIndex((i) => (i + 1) % slides.length);
    timeoutRef.current = window.setTimeout(next, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [index, slides.length, delay, autoplay]);

  if (slides.length === 0) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-800">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {slides.map((s, i) => {
        const visible = i === index;
        return (
          <div
            key={`${s.src}-${i}`}
            aria-hidden={!visible}
            className="absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out"
            style={{
              opacity: visible ? 1 : 0,
              transitionDuration: `${fadeMs}ms`,
              transform: visible ? 'scale(1)' : 'scale(1.02)',
            }}
          >
            {/* Using native img to avoid Next Image layout shifting in fullscreen hero */}
            <img src={s.src} alt={s.alt} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
};

// --- Main HeroSection Component ---
export default function HeroSection() {
  const { settings } = useHeroSettings();

  // Create slides from settings
  const slides = settings.backgroundImages.map(img => ({
    src: img.desktop,
    alt: img.alt,
    caption: img.alt
  }));

  // Use settings for sliding text
  const currentSuggestion = useSlidingText(settings.searchSuggestions, 3000);

  // NOTE: no early return with spinner — UI renders immediately
  return (
    <>
      <section className="relative h-screen min-h-[600px] max-h-[900px] w-full flex items-center justify-center text-white overflow-visible font-sans">
        <BackgroundSlideshow
          slides={slides}
          delay={settings.animationSettings.slideshowSpeed * 1000}
          fadeMs={settings.animationSettings.fadeSpeed}
          autoplay={settings.animationSettings.enableAutoplay}
        />

        {/* Overlay with settings */}
        <div
          className="absolute inset-0 z-1"
          style={{
            background: settings.overlaySettings.gradientType === 'custom'
              ? settings.overlaySettings.customGradient
              : settings.overlaySettings.gradientType === 'dark'
                ? `linear-gradient(to br, rgba(0,0,0,${settings.overlaySettings.opacity}), rgba(0,0,0,${settings.overlaySettings.opacity * 0.7}))`
                : `linear-gradient(to br, rgba(255,255,255,${settings.overlaySettings.opacity}), rgba(255,255,255,${settings.overlaySettings.opacity * 0.7}))`
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center h-full text-center md:items-start md:text-left">
          <div className="max-w-xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-tight tracking-wide text-shadow-lg">
              {settings.title.main}
              {settings.title.highlight && (
                <>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    {settings.title.highlight}
                  </span>
                </>
              )}
            </h1>
            <p className="mt-4 text-base sm:text-lg md:text-xl text-shadow font-light max-w-md mx-auto md:mx-0">
              Unforgettable excursions — from sunrise at the pyramids to sailing the Nile.
            </p>

            <HeroSearchBar
              suggestion={currentSuggestion}
            />

            {/* Trust Indicators */}
            {settings.trustIndicators.isVisible && (
              <div className="mt-6 flex items-center justify-center md:justify-start gap-6 text-white/80 text-sm">
                <span>{settings.trustIndicators.travelers}</span>
                <span>{settings.trustIndicators.ratingText}</span>
                <span>{settings.trustIndicators.rating}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-from-top { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes text-slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-slide-from-top { animation: slide-from-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .animate-text-slide-in { animation: text-slide-in 0.5s ease-out forwards; }

        .text-shadow { text-shadow: 1px 1px 4px rgb(0 0 0 / 0.5); }
        .text-shadow-lg { text-shadow: 2px 2px 8px rgb(0 0 0 / 0.6); }
        .font-sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }

        img { backface-visibility: hidden; -webkit-backface-visibility: hidden; }

        @media (prefers-reduced-motion: reduce) {
          .animate-text-slide-in { animation: none; }
        }
      `}</style>
    </>
  );
}
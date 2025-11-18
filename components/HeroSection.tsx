// components/HeroSection.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, MapPin, Clock, Compass, Tag, FileText, X, Sparkles, ChevronUp, Bot, Loader2, ArrowLeft, Send, ChevronLeft, ChevronRight, DollarSign, Star } from "lucide-react";
import Image from "next/image";
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
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
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Default fallback settings
const DEFAULT_SETTINGS: HeroSettings = {
  backgroundImages: [
    { desktop: '/hero2.jpg', alt: 'Pyramids of Giza at sunrise', isActive: true },
    { desktop: '/hero1.jpg', alt: 'Felucca on the Nile at sunset', isActive: false },
    { desktop: '/hero3.jpg', alt: 'Luxor temple columns at golden hour', isActive: false }
  ],
  currentActiveImage: '/hero2.jpg',
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
  const sliderRef = useRef<HTMLDivElement>(null);

  if (limitedHits.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 260;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Transform hits to tour objects
  const tours = limitedHits.map((hit: any) => ({
    slug: hit.slug || hit.objectID,
    title: hit.title || 'Untitled Tour',
    image: hit.image || hit.images?.[0] || hit.primaryImage,
    location: hit.location,
    duration: hit.duration,
    rating: hit.rating,
    reviews: hit.reviews,
    price: hit.discountPrice || hit.price,
    isFeatured: hit.isFeatured,
    discountPrice: hit.discountPrice,
    originalPrice: hit.price,
  }));

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Tours
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <div className="relative w-full">
          {tours.length > 1 && (
            <>
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all hover:scale-110"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all hover:scale-110"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          <div
            ref={sliderRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
          >
            {tours.map((tour, idx) => (
              <a
                key={limitedHits[idx].objectID}
                href={`/${tour.slug}`}
                onClick={onHitClick}
                target="_blank"
                rel="noopener noreferrer"
                className="group block flex-shrink-0 w-[260px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                {tour.image && (
                  <div className="relative h-36 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
                    <img
                      src={tour.image}
                      alt={tour.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {tour.isFeatured && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-md">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        Featured
                      </div>
                    )}
                    {tour.originalPrice && tour.discountPrice && tour.discountPrice < tour.originalPrice && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                        -{Math.round(((tour.originalPrice - tour.discountPrice) / tour.originalPrice) * 100)}%
                      </div>
                    )}
                    {tour.duration && (
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {tour.duration}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                    {tour.title}
                  </h3>
                  {tour.location && (
                    <div className="flex items-center gap-1 text-gray-500 text-[11px] mb-2">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      <span className="line-clamp-1">{tour.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      {tour.rating && (
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-[11px] font-medium">{tour.rating}</span>
                          {tour.reviews && <span className="text-[10px] text-gray-400">({tour.reviews})</span>}
                        </div>
                      )}
                    </div>
                    {tour.price && (
                      <div className="flex items-center gap-1">
                        {tour.originalPrice && tour.discountPrice && tour.discountPrice < tour.originalPrice ? (
                          <>
                            <span className="text-gray-400 text-[10px] line-through">${tour.originalPrice}</span>
                            <span className="text-blue-600 font-bold text-base">${tour.discountPrice}</span>
                          </>
                        ) : (
                          <span className="text-blue-600 font-bold text-base">${tour.price}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DestinationHits({ onHitClick, limit = 3 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Compass className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Destinations
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <a
          key={hit.objectID}
          href={`/destinations/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-emerald-500/5 hover:via-teal-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:via-teal-500/5 group-hover:to-cyan-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <Compass className="w-6 md:w-7 h-6 md:h-7 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-emerald-600 transition-colors duration-300">
                {hit.name || 'Untitled Destination'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.country && (
                  <span className="bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium">{hit.country}</span>
                )}
                {hit.tourCount && (
                  <span className="bg-emerald-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-emerald-700">
                    {hit.tourCount} tours
                  </span>
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
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-purple-500/5 via-fuchsia-500/5 to-pink-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Tag className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Categories
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <a
          key={hit.objectID}
          href={`/categories/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-purple-500/5 hover:via-fuchsia-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-fuchsia-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:via-fuchsia-500/5 group-hover:to-pink-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <Tag className="w-6 md:w-7 h-6 md:h-7 text-purple-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-purple-600 transition-colors duration-300">
                {hit.name || 'Untitled Category'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.tourCount && (
                  <span className="bg-purple-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-purple-700">
                    {hit.tourCount} tours
                  </span>
                )}
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

const useHeroSettings = (initialSettings?: HeroSettings | null) => {
  const [settings, setSettings] = useState<HeroSettings>(initialSettings || DEFAULT_SETTINGS);
  // NOTE: we keep isLoading for internal use, but default it to false so UI doesn't block
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only fetch if data wasn't provided via props
    if (initialSettings) return;

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
  }, [initialSettings]);

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

// --- AI Chat Components ---
const TourCard = ({ tour }: { tour: any }) => (
  <motion.a
    href={`/tours/${tour.slug}`}
    target="_blank"
    rel="noopener noreferrer"
    className="group block flex-shrink-0 w-[240px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300"
    whileHover={{ y: -4 }}
  >
    {tour.image && (
      <div className="relative h-32 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {tour.duration && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-medium">
            {tour.duration}
          </div>
        )}
      </div>
    )}
    <div className="p-2.5">
      <h3 className="font-semibold text-xs mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {tour.title}
      </h3>
      {tour.location && (
        <div className="flex items-center gap-1 text-gray-500 text-[10px] mb-1.5">
          <MapPin className="w-2.5 h-2.5" />
          <span className="line-clamp-1">{tour.location}</span>
        </div>
      )}
      {tour.rating && (
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] font-medium">{tour.rating}</span>
          {tour.reviews && <span className="text-[10px] text-gray-400">({tour.reviews})</span>}
        </div>
      )}
      {tour.price && (
        <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
          <DollarSign className="w-3 h-3" />
          <span>{tour.price}</span>
        </div>
      )}
    </div>
  </motion.a>
);

const TourSlider = ({ tours }: { tours: any[] }) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 260;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full">
      {tours.length > 1 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      <div
        ref={sliderRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
      >
        {tours.map((tour, idx) => (
          <TourCard key={idx} tour={tour} />
        ))}
      </div>
    </div>
  );
};

// --- Reusable Components ---
const HeroSearchBar = ({ suggestion }: { suggestion: string }) => {
  const [query, setQuery] = useState(''); // Unified input for both search and chat
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // AI SDK Chat Setup
  const {
    messages,
    sendMessage,
    status,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `https://${ALGOLIA_APP_ID}.algolia.net/agent-studio/1/agents/${AGENT_ID}/completions?stream=true&compatibilityMode=ai-sdk-5`,
      headers: {
        'x-algolia-application-id': ALGOLIA_APP_ID,
        'x-algolia-api-key': ALGOLIA_SEARCH_KEY,
      },
    }),
  });
  const isGenerating = status === 'submitted' || status === 'streaming';

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

  useEffect(() => {
    if (isExpanded && containerRef.current) {
      const timeout = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [isExpanded]);

  const handleCloseDropdown = () => {
    setIsExpanded(false);
    setChatMode(false);
  };

  const handleOpenAIChat = () => {
    setIsExpanded(true);
    setChatMode(true);
    if (query) {
      setTimeout(() => sendMessage({ text: query }), 300);
      setQuery('');
    }
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const handleBackToSearch = () => {
    setChatMode(false);
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (chatMode) {
      sendMessage({ text: query });
      setQuery('');
    } else {
      setIsExpanded(true);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (!chatContainerRef.current) return;
    setTimeout(() => {
      chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
    }, 100);
  }, [messages, isGenerating]);

  // State for detected content - stored per message ID
  const [detectedToursByMessage, setDetectedToursByMessage] = useState<Record<string, any[]>>({});
  const [detectedDestinationsByMessage, setDetectedDestinationsByMessage] = useState<Record<string, any[]>>({});

  // Parse tour information from text and fetch from Algolia
  const detectAndFetchTours = useCallback(async (text: string) => {
    try {
      const tourPatterns = [
        /(?:^|\n)\s*(?:\d+\.\s*)?(?:Cairo:|Luxor:|Aswan:|Alexandria:|Hurghada:|Sharm El Sheikh:)?\s*([^($\n—]+?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        /(?:^|\n)\s*(?:\d+\.\s*)?([A-Z][^($\n—]+?Tour[^($\n—]*?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        /\*\*([^*]+?)\*\*\s+(?:\(\$|—\s*\$)(\d+)\)?/g,
        /(?:^|\n)\s*(?:\d+\.\s*)?([^—\n]{15,}?)\s+—\s*\$(\d+)/gm,
      ];

      const potentialTours = new Map<string, number>();

      for (const pattern of tourPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const title = match[1].trim().replace(/^(Cairo:|Luxor:|Aswan:|Alexandria:|Hurghada:|Sharm El Sheikh:)\s*/i, '');
            const price = match[2] ? parseInt(match[2]) : 0;
            if (title.length > 10) {
              potentialTours.set(title, price);
            }
          }
        }
      }

      if (potentialTours.size > 0) {
        const toursArray = Array.from(potentialTours.entries()).slice(0, 4);
        const searchPromises = toursArray.map(async ([tourTitle]) => {
          try {
            let response = await searchClient.search([{
              indexName: INDEX_TOURS,
              params: {
                query: tourTitle,
                hitsPerPage: 1,
              }
            }]);
            let firstResult = response.results[0] as any;

            if (!firstResult?.hits?.length) {
              const keywords = tourTitle.split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ');
              response = await searchClient.search([{
                indexName: INDEX_TOURS,
                params: {
                  query: keywords,
                  hitsPerPage: 1,
                }
              }]);
              firstResult = response.results[0] as any;
            }

            return firstResult?.hits?.[0];
          } catch (error) {
            console.error('Error searching for tour:', tourTitle, error);
            return null;
          }
        });

        const tours = (await Promise.all(searchPromises)).filter(Boolean);
        if (tours.length > 0) {
          const uniqueTours = tours.reduce((acc: any[], tour: any) => {
            const tourId = tour.slug || tour.objectID;
            if (!acc.find(t => (t.slug || t.objectID) === tourId)) {
              acc.push(tour);
            }
            return acc;
          }, []);

          return uniqueTours.map((tour: any) => ({
            slug: tour.slug || tour.objectID,
            title: tour.title || 'Untitled Tour',
            image: tour.image || tour.images?.[0] || tour.primaryImage,
            location: tour.location,
            duration: tour.duration,
            rating: tour.rating,
            reviews: tour.reviews,
            price: tour.discountPrice || tour.price,
            discountPrice: tour.discountPrice,
            originalPrice: tour.price,
            isFeatured: tour.isFeatured,
          }));
        }
      }
    } catch (error) {
      console.error('Error detecting tours:', error);
    }
    return [];
  }, []);

  // Render tool outputs (tours) - enhanced version
  const renderToolOutput = useCallback((obj: any) => {
    if (Array.isArray(obj)) {
      const tours = obj.filter(item => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} />;
    }
    if (obj.title && obj.slug) return <TourSlider tours={[obj]} />;
    if (obj.hits && Array.isArray(obj.hits)) {
      const tours = obj.hits.filter((item: any) => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} />;
    }
    return (
      <pre className="bg-gray-900 text-gray-100 p-2 rounded-lg text-[10px] overflow-x-auto">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  }, []);

  // Detect tours in messages
  useEffect(() => {
    if (isGenerating) return;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role === 'user') {
      return;
    }

    if (lastMessage.role === 'assistant') {
      const messageId = lastMessage.id;
      if (detectedToursByMessage[messageId]) {
        return;
      }

      const textParts = lastMessage.parts?.filter((p: any) => p.type === 'text') || [];
      const fullText = textParts.map((p: any) => p.text).join(' ');

      const hasTourPattern = /\$\d+/i.test(fullText) ||
                            (/tour/i.test(fullText) && /\(\$\d+\)/i.test(fullText));

      if (hasTourPattern) {
        detectAndFetchTours(fullText).then(tours => {
          if (tours.length > 0) {
            setDetectedToursByMessage(prev => ({
              ...prev,
              [messageId]: tours
            }));
          }
        });
      }
    }
  }, [messages, isGenerating, detectAndFetchTours, detectedToursByMessage]);

  // Render message content - enhanced version
  const renderContent = useCallback((parts: any[], messageId?: string) => {
    return parts.map((p: any, idx: number) => {
      if (p.type === 'tool-result') {
        try {
          const obj = JSON.parse(p.text);
          return <div key={idx} className="my-2">{renderToolOutput(obj)}</div>;
        } catch {
          return <pre key={idx} className="text-[10px]">{p.text}</pre>;
        }
      }
      if (p.type === 'text') {
        return (
          <div key={idx} className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-sm sm:text-[15px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {p.text}
            </ReactMarkdown>
          </div>
        );
      }
      return null;
    }).concat(
      // Add detected tours after the message content
      messageId && detectedToursByMessage[messageId] ? (
        <div key={`tours-${messageId}`} className="my-3">
          <TourSlider tours={detectedToursByMessage[messageId]} />
        </div>
      ) : null
    ).filter(Boolean);
  }, [renderToolOutput, detectedToursByMessage]);

  return (
    <div className="mt-8 lg:mt-10 w-full flex justify-center md:justify-start" ref={containerRef}>
      <div className="relative w-full max-w-sm md:max-w-xl">
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="relative group"
        >
          {/* Main Search/Chat Input Box - Unified */}
          <form onSubmit={handleSubmit}>
            <div
              className={`relative bg-white/95 backdrop-blur-xl rounded-full transition-all duration-300 ${
                isExpanded
                  ? 'shadow-2xl shadow-blue-500/25 border-2 border-blue-400/50'
                  : 'shadow-xl hover:shadow-2xl border-2 border-blue-300/30 hover:border-blue-400/50'
              }`}
            >
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsExpanded(true)}
                  placeholder={chatMode ? "Ask AI anything about Egypt tours..." : suggestion}
                  className="w-full pl-14 md:pl-16 pr-12 md:pr-16 py-4 text-sm md:text-base text-gray-900 placeholder-gray-400 font-medium bg-transparent outline-none rounded-full relative z-10"
                  style={{ cursor: 'text' }}
                  disabled={chatMode && isGenerating}
                />

              {/* Left Icon with Animation */}
              <div className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 z-10">
                <motion.div
                  className="relative"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isExpanded
                      ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30'
                      : 'bg-gradient-to-br from-blue-400 to-purple-400 shadow-md'
                  }`}>
                    <Search className={`w-4 h-4 transition-colors duration-300 text-white`} />
                  </div>
                  <motion.div
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.7, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
              </div>

              {/* Right Side Elements with Animation */}
              <div className="absolute right-4 md:right-5 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-10">
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setIsExpanded(false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                ) : isExpanded ? (
                  <motion.div
                    initial={{ rotate: 180, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <ChevronUp className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setIsExpanded(true);
                      handleOpenAIChat();
                    }}
                    animate={{
                      rotate: [0, 15, -15, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md cursor-pointer hover:shadow-lg hover:from-blue-500 hover:to-purple-600 transition-all"
                    aria-label="Open AI Assistant"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </form>
        </motion.div>

        {/* Dropdown Results - Using absolute positioning with z-index */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-full mt-3 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden z-[9999]"
              style={{ maxHeight: '65vh' }}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100/50 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {chatMode && (
                      <button
                        onClick={handleBackToSearch}
                        className="mr-1 p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    {chatMode ? (
                      <>
                        <Bot className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          AI Travel Assistant
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          {query ? 'Search Results' : 'Popular Searches'}
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsExpanded(false);
                      setChatMode(false);
                      setQuery('');
                    }}
                    className="text-gray-400 hover:text-gray-700 transition-all duration-200 p-2 rounded-full hover:bg-white/80 hover:shadow-md group"
                  >
                    <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
              </div>

              {/* Results Area */}
              <div ref={chatContainerRef} className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(65vh - 120px)' }}>
                {chatMode ? (
                  /* Chat Interface */
                  <div className="p-4 space-y-3">
                    {messages.length === 0 && (
                      <div className="bg-white p-4 rounded-xl border border-blue-100">
                        <div className="flex items-start gap-2.5 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Bot className="text-white" size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm mb-1">
                              Hi! I'm your AI Egypt Travel Assistant
                            </p>
                            <p className="text-gray-500 text-xs leading-relaxed">
                              Ask me anything — I'll help you find tours, trips, prices, destinations & more.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["Find me the best Nile Cruise under $300", "Plan a 7-day Egypt itinerary", "Top tours near Cairo?"].map((s) => (
                            <button
                              key={s}
                              onClick={() => sendMessage({ text: s })}
                              className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border border-blue-100 rounded-lg text-xs font-medium text-gray-700 transition-all"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm sm:text-[15px] ${
                            m.role === 'user'
                              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm'
                              : 'bg-white text-gray-800 border shadow-sm'
                          }`}
                        >
                          {renderContent(m.parts, m.id)}
                        </div>
                      </div>
                    ))}

                    {isGenerating && (
                      <div className="flex items-center gap-2 text-gray-500 bg-white px-4 py-2.5 rounded-lg border">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    )}
                  </div>
                ) : query ? (
                  <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                    <CustomSearchBox searchQuery={query} onSearchChange={setQuery} />

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
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Trending Egypt Tours
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Pyramids of Giza', 'Nile Cruise', 'Luxor Temple', 'Desert Safari', 'Cairo Tours', 'Red Sea Diving'].map((trend) => (
                        <button
                          key={trend}
                          onClick={() => {
                            setQuery(trend);
                            setIsExpanded(true);
                            setChatMode(false);
                          }}
                          className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full text-xs font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 hover:text-blue-700 hover:shadow-md transition-all duration-200 hover:scale-105"
                        >
                          {trend}
                        </button>
                      ))}
                    </div>

                    {/* AI Assistant CTA */}
                    <div className="mt-6 pt-6 border-t border-gray-200/50">
                      <button
                        onClick={handleOpenAIChat}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                      >
                        <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        <span className="text-sm font-semibold">Ask AI Travel Assistant</span>
                      </button>
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
        const isPriority = i === 0; // First image gets priority loading
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
            {/* Using Next.js Image for automatic optimization, WebP/AVIF conversion, and blur placeholder */}
            <Image
              src={s.src}
              alt={s.alt}
              fill
              priority={isPriority}
              quality={85}
              sizes="100vw"
              loading={isPriority ? 'eager' : 'lazy'}
              className="object-cover"
              style={{
                objectFit: 'cover',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
};

// --- Main HeroSection Component ---
interface HeroSectionProps {
  initialSettings?: HeroSettings | null;
}

export default function HeroSection({ initialSettings }: HeroSectionProps = {}) {
  const { settings } = useHeroSettings(initialSettings);

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

        /* Slow pulse animation */
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.2;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #d1d5db, #9ca3af);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #9ca3af, #6b7280);
        }

        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-slide-from-top { animation: slide-from-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .animate-text-slide-in { animation: text-slide-in 0.5s ease-out forwards; }

        .text-shadow { text-shadow: 1px 1px 4px rgb(0 0 0 / 0.5); }
        .text-shadow-lg { text-shadow: 2px 2px 8px rgb(0 0 0 / 0.6); }
        .font-sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }

        img { backface-visibility: hidden; -webkit-backface-visibility: hidden; }

        /* Hide default Algolia styling */
        .ais-InstantSearch {
          font-family: inherit;
        }

        .ais-SearchBox {
          display: none;
        }

        .ais-Hits-list {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .ais-Hits-item {
          margin: 0;
          padding: 0;
          border: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-text-slide-in { animation: none; }
          .animate-pulse-slow { animation: none; }
        }
      `}</style>
    </>
  );
}
'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
    ArrowRight, Star, Tag, Clock, Users, ChevronLeft, ChevronRight,
    Check, ShoppingCart, Award, MapPin, CheckCircle2,
    Calendar, Shield, Heart, MessageCircle,
    Sun, DollarSign, Languages, Phone,
    Search, Plus, Minus, ChevronUp, X, Sparkles, Compass
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import { Destination, Tour, Category, CartItem, Review } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import BookingSidebar from '@/components/BookingSidebar';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import { motion, AnimatePresence } from 'framer-motion';
import 'instantsearch.css/themes/satellite.css';

interface DestinationPageClientProps {
  destination: Destination;
  destinationTours: Tour[];
  allCategories: Category[];
  reviews?: Review[];
  relatedDestinations?: Destination[];
}

// Algolia Configuration
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const INDEX_CATEGORIES = 'categories';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// --- Hero Helper Hooks ---
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

const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (texts.length === 0) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const timer = setInterval(() =>
      setCurrentIndex((prev) => (prev + 1) % texts.length),
      interval
    );
    intervalRef.current = timer;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [texts.length, interval]);

  return texts[currentIndex] || texts[0] || "Search...";
};

// Custom SearchBox component
function CustomSearchBox({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(searchQuery);
  }, [searchQuery, refine]);

  return null;
}

// Custom Hits component for Tours
function TourHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <MapPin className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
            Tours ({hits.length})
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any) => (
        <a
          key={hit.objectID}
          href={`/tours/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-5 py-3.5 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all duration-200 border-b border-gray-100/50 last:border-0 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              {(hit.image || hit.images?.[0] || hit.primaryImage) ? (
                <img
                  src={hit.image || hit.images?.[0] || hit.primaryImage}
                  alt={hit.title || 'Tour'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-blue-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                {hit.title || 'Untitled Tour'}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                {hit.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {hit.location}
                  </span>
                )}
                {hit.duration && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {hit.duration} days
                    </span>
                  </>
                )}
                {(hit.price || hit.discountPrice) && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="font-bold text-blue-600">
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

// --- Hero Search Bar ---
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
    <div className="mt-4 sm:mt-6 lg:mt-8 w-full flex justify-center md:justify-start px-2 sm:px-4 md:px-0" ref={containerRef}>
      <div className="relative w-full max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-xl">
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="relative group"
        >
          {/* Main Search Box - Fully Rounded Capsule */}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                placeholder={suggestion}
                className="w-full pl-14 md:pl-16 pr-12 md:pr-16 py-3 md:py-4 text-sm md:text-base text-gray-900 placeholder-gray-400 font-medium bg-transparent outline-none rounded-full relative z-10"
                style={{ cursor: 'text' }}
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
                {searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
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
                  <motion.div
                    animate={{
                      rotate: [0, 15, -15, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md"
                  >
                    <Star className="w-4 h-4 text-white fill-current" />
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dropdown Results */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
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
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {searchQuery ? 'Search Results' : 'Popular Searches'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-gray-700 transition-all duration-200 p-2 rounded-full hover:bg-white/80 hover:shadow-md group"
                  >
                    <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
              </div>

              {/* Results Area */}
              <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(65vh - 120px)' }}>
                {searchQuery ? (
                  <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                    <CustomSearchBox searchQuery={searchQuery} onSearchChange={setSearchQuery} />

                    {/* Tours Index */}
                    <Index indexName={INDEX_TOURS}>
                      <Configure hitsPerPage={5} />
                      <TourHits onHitClick={handleCloseDropdown} limit={5} />
                    </Index>
                  </InstantSearch>
                ) : (
                  // Trending Searches - shown when no search query
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-4 h-4 text-blue-500 fill-current" />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Trending Tours
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Pyramids of Giza', 'Nile Cruise', 'Luxor Temple', 'Desert Safari', 'Cairo Tours', 'Red Sea Diving'].map((trend) => (
                        <button
                          key={trend}
                          onClick={() => {
                            setSearchQuery(trend);
                          }}
                          className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full text-xs font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 hover:text-blue-700 hover:shadow-md transition-all duration-200 hover:scale-105"
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
  slides?: Array<{src: string, alt: string}>, 
  delay?: number, 
  fadeMs?: number,
  autoplay?: boolean 
}) => {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
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
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-800" />
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
            <img src={s.src} alt={s.alt} className="w-full h-full object-cover" />
          </div>
        );
      })}
    </div>
  );
};

const DestinationHeroSection = ({ destination, tourCount }: { destination: Destination, tourCount: number }) => {
  const slides = destination.image
    ? [{ src: destination.image, alt: destination.name }]
    : [{ src: '/hero2.png', alt: destination.name }];

  const searchSuggestions = [
    `Explore ${destination.name}`,
    `Things to do in ${destination.name}`,
    `Best tours in ${destination.name}`,
  ];

  const currentSuggestion = useSlidingText(searchSuggestions, 3000);

  return (
    <section className="relative w-full min-h-[500px] h-[70vh] sm:h-[75vh] md:h-[80vh] lg:h-screen max-h-[900px]">
      {/* Background */}
      <BackgroundSlideshow slides={slides} delay={6000} fadeMs={900} autoplay={true} />

      {/* Content */}
      <div className="relative z-20 h-full flex items-center justify-center text-white px-4 sm:px-6 lg:px-8 pt-20 md:pt-0">
        <div className="w-full max-w-7xl mx-auto text-center md:text-left pt-20 md:pt-0">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold uppercase leading-tight tracking-wide mb-3 sm:mb-4">
            DISCOVER
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {destination.name}
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 max-w-2xl mx-auto md:mx-0 px-4 sm:px-0">
            {destination.description}
          </p>

          <HeroSearchBar
            suggestion={currentSuggestion}
          />

          <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-white/90 text-xs sm:text-sm px-4 sm:px-0">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <Tag size={14} className="sm:w-4 sm:h-4" />
              <span className="font-semibold">{tourCount}+ Tours</span>
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <Star size={14} className="sm:w-4 sm:h-4 fill-current text-yellow-400" />
              <span className="font-semibold">4.8/5 Rating</span>
            </span>
            <span className="font-semibold">50K+ Travelers</span>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Card Components ---
const Top10Card = ({ tour, index }: { tour: Tour, index: number }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded) return;
    addToCart(tour as CartItem);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <a href={`/tour/${tour.slug}`} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 p-3 sm:p-4 bg-white hover:bg-slate-50 transition-colors duration-200 group rounded-lg border border-transparent hover:border-slate-200 hover:shadow-lg">
      <span className="hidden sm:block text-3xl md:text-4xl font-extrabold text-slate-200 group-hover:text-red-500 transition-colors duration-200">{index + 1}.</span>
      <div className="relative w-full sm:w-20 md:w-24 h-32 sm:h-20 md:h-24 flex-shrink-0 rounded-md overflow-hidden">
        <Image src={tour.image} alt={tour.title} fill className="object-cover" />
        <span className="sm:hidden absolute top-2 left-2 bg-red-500 text-white font-bold text-lg px-3 py-1 rounded-full">{index + 1}</span>
      </div>
      <div className="flex-1 w-full">
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors duration-200 line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-slate-500">
          <Clock size={14} />
          <span>{tour.duration}</span>
          <Star size={14} className="ml-2 text-yellow-500 fill-current" />
          <span>{tour.rating}</span>
        </div>
        <div className="mt-2 text-sm flex items-center gap-2">
          {tour.originalPrice && <span className="text-slate-500 line-through text-xs sm:text-sm">{formatPrice(tour.originalPrice)}</span>}
          <span className="text-red-600 font-bold text-lg sm:text-xl">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
      <div className="flex sm:flex-col items-center gap-2 ml-auto sm:ml-0">
        <button  
          onClick={handleAddToCart}
          disabled={isAdded}
          aria-label={isAdded ? "Added to cart" : "Add to cart"}
          className={`p-2 sm:p-2.5 rounded-full text-white transition-all duration-300 ease-in-out ${
            isAdded 
              ? 'bg-green-500 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAdded ? <Check size={16} className="sm:w-[18px] sm:h-[18px]" /> : <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" />}
        </button>
        <ArrowRight className="text-slate-400 group-hover:text-red-500 transition-colors duration-200 w-5 h-5" />
      </div>
    </a>
  );
};

const InterestCard = ({ category, tourCount }: { category: Category, tourCount: number }) => (
  <a href={`/categories/${category.slug}`} className="flex flex-col items-center p-4 sm:p-6 bg-white shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-lg">
    <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{category.icon}</div>
    <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase text-center">{category.name}</h3>
    <p className="text-xs sm:text-sm text-slate-500">{tourCount} tours</p>
  </a>
);

const CombiDealCard = ({ tour }: { tour: Tour }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded) return;
    addToCart(tour as CartItem);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <a href={`/tour/${tour.slug}`} className="w-72 sm:w-80 flex-shrink-0 bg-white shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-lg group">
      <div className="relative">
        <Image src={tour.image} alt={tour.title} width={320} height={180} className="w-full h-36 sm:h-40 object-cover" />
        <button  
          onClick={handleAddToCart}
          disabled={isAdded}
          aria-label={isAdded ? "Added to cart" : "Add to cart"}
          className={`absolute bottom-3 right-3 sm:bottom-4 sm:right-4 p-2 sm:p-2.5 rounded-full text-white transition-all duration-300 ease-in-out transform group-hover:scale-110 ${
            isAdded 
              ? 'bg-green-500 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAdded ? <Check size={16} className="sm:w-[18px] sm:h-[18px]" /> : <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" />}
        </button>
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 my-2">
          <span className="flex items-center gap-1">
            <Clock size={14} />{tour.duration}
          </span>
          <span className="flex items-center gap-1">
            <Star size={14} fill="currentColor" className="text-yellow-500" />{tour.rating}
          </span>
          <span>{tour.bookings} bookings</span>
        </div>
        <div className="flex items-end justify-end mt-3 sm:mt-4">
          {tour.originalPrice && <span className="text-slate-500 line-through mr-2 text-sm">{formatPrice(tour.originalPrice)}</span>}
          <span className="text-lg sm:text-xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
    </a>
  );
};

// --- Stats Banner ---
const StatsSection = ({ destinationTours }: { destinationTours: Tour[] }) => {
  const stats = [
    { value: `${destinationTours.length}+`, label: 'Tours Available', icon: <Calendar /> },
    { value: '50K+', label: 'Happy Travelers', icon: <Users /> },
    { value: '4.8/5', label: 'Average Rating', icon: <Star /> },
    { value: '24/7', label: 'Customer Support', icon: <Shield /> }
  ];

  return (
    <section className="bg-slate-900 py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-2 sm:mb-3 text-red-500">
                {React.cloneElement(stat.icon, { size: 24, className: 'sm:w-8 sm:h-8' })}
              </div>
              <div className="text-2xl sm:text-4xl font-extrabold text-white mb-1 sm:mb-2">{stat.value}</div>
              <div className="text-sm sm:text-base text-slate-300">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Travel Tips Component ---
const TravelTipsSection = ({ destination }: { destination: Destination }) => {
  const tips = [
    {
      icon: <Sun className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Best Time to Visit",
      content: destination.bestTimeToVisit || "Year-round destination with pleasant weather"
    },
    {
      icon: <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Currency",
      content: destination.currency || "Local currency accepted"
    },
    {
      icon: <Languages className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Languages",
      content: "English widely spoken"
    },
    {
      icon: <Phone className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: "Emergency",
      content: "Local emergency services"
    }
  ];

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 py-12 sm:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 sm:mb-4">Travel Tips & Essential Info</h2>
          <p className="text-base sm:text-lg text-slate-600">Everything you need to know before you go</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {tips.map((tip, index) => (
            <div key={index} className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3 sm:mb-4">
                {tip.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-sm sm:text-base">{tip.title}</h3>
              <p className="text-slate-600 text-xs sm:text-sm">{tip.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- ABOUT US SECTION ---
const AboutUsSection = ({ destination }: { destination: Destination }) => {
  return (
    <section className="bg-white py-12 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
          <div className="col-span-1">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 sm:mb-4">
              Your Local Guide In {destination.name}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mb-4 sm:mb-6">
              {destination.longDescription || `Discover the best of ${destination.name} with our expert local guides. We'll show you hidden gems, share fascinating stories, and create unforgettable memories that will last a lifetime.`}
            </p>
            <a href="/about" className="inline-flex items-center gap-2 text-red-600 font-bold hover:text-red-700 transition-colors text-sm sm:text-base">
              <span>Learn more about us</span>
              <ArrowRight size={18} className="sm:w-5 sm:h-5" />
            </a>
          </div>
          <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-slate-50 p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-3 sm:mb-4" />
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">Expert Local Guides</h3>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                Our experienced local guides know all the hidden gems and stories of {destination.name}.
              </p>
            </div>
            <div className="bg-slate-50 p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Star className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-3 sm:mb-4" />
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">Quality Experiences</h3>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                We offer you the best experiences in {destination.name}, handpicked by our experts.
              </p>
            </div>
            <div className="bg-slate-50 p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-3 sm:mb-4" />
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">Safe & Reliable</h3>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                Your safety is our priority. All tours are carefully vetted and insured.
              </p>
            </div>
            <div className="bg-slate-50 p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-3 sm:mb-4" />
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">Best Price Guarantee</h3>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                Find a lower price? We'll match it. Enjoy the best deals for {destination.name}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- FAQ SECTION ---
const FaqItem = ({ item }: { item: { question: string; answer: string } }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 py-4 sm:py-6 group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left hover:text-red-600 transition-colors"
        aria-expanded={isOpen}
      >
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors pr-4">
          {item.question}
        </h3>
        {isOpen ? (
          <Minus className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 transition-transform duration-300 flex-shrink-0" />
        ) : (
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 transition-transform duration-300 flex-shrink-0" />
        )}
      </button>
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 pt-3 sm:pt-4' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-slate-600 text-sm sm:text-base">{item.answer}</p>
        </div>
      </div>
    </div>
  );
};

const FAQSection = ({ destinationName }: { destinationName: string }) => {
  const faqData = [
    {
      question: `What is the best time to visit ${destinationName}?`,
      answer: `The best time to visit ${destinationName} is during the cooler months from October to April, when temperatures are pleasant for sightseeing and outdoor activities. The weather is ideal for exploring attractions and participating in tours.`
    },
    {
      question: `How many days should I spend in ${destinationName}?`,
      answer: `We recommend spending at least 3-5 days to experience the main attractions comfortably. However, a week or more allows for a more relaxed pace and exploration of hidden gems, local neighborhoods, and day trips to nearby areas.`
    },
    {
      question: `Is ${destinationName} safe for tourists?`,
      answer: `Yes, ${destinationName} is generally safe for tourists. As with any destination, exercise normal precautions like being aware of your surroundings, keeping valuables secure, and following local guidance. Our tours prioritize your safety with professional guides.`
    },
    {
      question: `What should I pack for ${destinationName}?`,
      answer: `Pack comfortable walking shoes, light breathable clothing for daytime, a light jacket for evenings or air-conditioned spaces, sunscreen, sunglasses, a hat, and any necessary medications. Don't forget your camera to capture the amazing sights!`
    },
    {
      question: `Do I need a guide for tours in ${destinationName}?`,
      answer: `While not mandatory, having a local guide significantly enhances your experience. Guides provide insider knowledge, historical context, help navigate crowds efficiently, and ensure you don't miss important details about the attractions.`
    },
    {
      question: `Are there any dress codes I should be aware of?`,
      answer: `For religious sites and certain attractions, modest clothing is required (covering shoulders and knees). It's best to carry a light scarf or shawl. Most restaurants and hotels have no specific dress code, but smart casual is appreciated.`
    },
    {
      question: `Can I book tours last minute?`,
      answer: `While we recommend booking in advance for popular tours, many experiences can be booked last minute subject to availability. However, skip-the-line tours and special experiences often sell out, so early booking is advisable.`
    },
    {
      question: `What is your cancellation policy?`,
      answer: `Most tours offer free cancellation up to 24 hours before the start time for a full refund. Some special events may have different policies. Please check the specific tour details for exact cancellation terms.`
    },
    {
      question: `Are meals included in the tours?`,
      answer: `It varies by tour. Some tours include meals or snacks, while others don't. Each tour description clearly states what's included. Food tours naturally include multiple tastings as part of the experience.`
    },
    {
      question: `How do I get to the meeting points?`,
      answer: `All tour confirmations include detailed meeting point information with maps and directions. Most meeting points are at central, easy-to-reach locations with good public transport access. Our team is available 24/7 if you need assistance.`
    }
  ];

  return (
    <section className="bg-white py-12 sm:py-20 font-sans">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-600">
            Everything you need to know about visiting {destinationName}
          </p>
        </div>
        <div className="space-y-2 sm:space-y-4">
          {faqData.map((item, index) => (
            <FaqItem key={index} item={item} />
          ))}
        </div>
        <div className="text-center mt-8 sm:mt-12">
          <a
            href="/faqs"
            className="inline-flex justify-center items-center h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-bold text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 ease-in-out rounded-full"
            role="button"
            aria-label="View all FAQs"
          >
            VIEW ALL FAQs
          </a>
        </div>
      </div>
    </section>
  );
};

// --- Reviews Component ---
const ReviewsSection = ({ reviews, destinationName }: { reviews: Review[], destinationName: string }) => {
  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="bg-slate-50 py-12 sm:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 sm:mb-4">
            What Travelers Say About {destinationName}
          </h2>
          <div className="flex items-center justify-center gap-2 text-yellow-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 sm:w-6 sm:h-6 fill-current" />
            ))}
            <span className="ml-2 text-slate-600 font-bold text-sm sm:text-base">4.8/5 from 1,000+ reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {reviews.slice(0, 6).map((review) => (
            <div key={review._id} className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 sm:w-4 sm:h-4 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-slate-300'}`}
                  />
                ))}
              </div>
              {review.title && <h4 className="font-bold text-slate-900 mb-2 text-sm sm:text-base">{review.title}</h4>}
              <p className="text-slate-700 mb-3 sm:mb-4 line-clamp-4 text-sm sm:text-base">{review.comment}</p>
              <div className="flex items-center gap-3 pt-3 sm:pt-4 border-t border-slate-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm sm:text-base">
                  {review.userName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm sm:text-base">{review.userName}</p>
                  {review.verified && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Verified traveler
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <a
            href="#reviews"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            Read All Reviews
            <MessageCircle size={18} className="sm:w-5 sm:h-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

// --- Related Destinations ---
const RelatedDestinationsSection = ({ destinations }: { destinations: Destination[] }) => {
  if (!destinations || destinations.length === 0) return null;

  return (
    <section className="bg-white py-12 sm:py-20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 sm:mb-4">
            Explore More Destinations
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Discover other amazing places you might love
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {destinations.slice(0, 4).map((dest) => (
            <a 
              key={dest._id} 
              href={`/destinations/${dest.slug}`}
              className="group block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="relative h-40 sm:h-48">
                <Image
                  src={dest.image || '/placeholder.jpg'}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{dest.name}</h3>
                  <p className="text-white/90 text-xs sm:text-sm flex items-center gap-1">
                    <MapPin size={14} />
                    {dest.tourCount || 0} tours available
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Newsletter CTA ---
const NewsletterSection = ({ destinationName }: { destinationName: string }) => {
  return (
    <section className="bg-gradient-to-r from-red-600 to-red-700 py-12 sm:py-20">
      <div className="container mx-auto px-4 max-w-4xl text-center text-white">
        <h2 className="text-2xl sm:text-4xl font-extrabold mb-3 sm:mb-4">
          Get Exclusive {destinationName} Travel Deals
        </h2>
        <p className="text-base sm:text-xl mb-6 sm:mb-8 opacity-90">
          Subscribe to our newsletter and receive special offers, travel tips, and insider guides
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-xl mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-full text-slate-900 outline-none text-sm sm:text-base"
          />
          <button className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-red-600 font-bold rounded-full hover:bg-slate-100 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base whitespace-nowrap">
            Subscribe Now
          </button>
        </div>

        <p className="mt-3 sm:mt-4 text-xs sm:text-sm opacity-75">
          Join 50,000+ travelers getting exclusive deals. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
};

// --- MAIN COMPONENT ---
export default function DestinationPageClient({
  destination,
  destinationTours,
  allCategories,
  reviews = [],
  relatedDestinations = []
}: DestinationPageClientProps) {
  const [selectedTour] = useState<Tour | null>(null);
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const combiScrollContainer = useRef<HTMLDivElement | null>(null);

  const scroll = (container: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (container.current) {
      const scrollAmount = direction === 'left' ? -344 : 344;
      container.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  const top10Tours = destinationTours.slice(0, 10);
  const featuredTours = destinationTours.filter(tour => tour.isFeatured).slice(0, 5);
  const destinationCategories = allCategories.map(category => ({
    ...category,
    tourCount: destinationTours.filter(tour => 
      typeof tour.category === 'object' ? tour.category._id === category._id : tour.category === category._id
    ).length
  })).filter(category => category.tourCount > 0);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        
        <DestinationHeroSection destination={destination} tourCount={destinationTours.length} />

        <StatsSection destinationTours={destinationTours} />
        
        <section className="bg-slate-50 py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2 text-sm sm:text-base">Best Time to Visit</h3>
                <p className="text-slate-600 text-xs sm:text-base">{destination.bestTimeToVisit || 'Year-round'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2 text-sm sm:text-base">Currency</h3>
                <p className="text-slate-600 text-xs sm:text-base">{destination.currency || 'EUR'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2 text-sm sm:text-base">Time Zone</h3>
                <p className="text-slate-600 text-xs sm:text-base">{destination.timezone || 'Central European Time'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2 text-sm sm:text-base">Available Tours</h3>
                <p className="text-slate-600 text-xs sm:text-base">{destinationTours.length} experiences</p>
              </div>
            </div>
          </div>
        </section>
        
        {featuredTours.length > 0 && (
          <section className="py-12 sm:py-20 bg-white overflow-hidden">
            <div className="container mx-auto">
                <div className="px-4 mb-6 sm:mb-10">
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">Best Deals in {destination.name}</h2>
                    <p className="text-base sm:text-lg text-slate-600 mt-2">Handpicked experiences at unbeatable prices</p>
                </div>
                <div className="relative">
                    <div ref={combiScrollContainer} className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scroll-smooth px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {featuredTours.map(tour => <CombiDealCard key={tour._id} tour={tour} />)}
                    </div>
                    <button 
                        onClick={() => scroll(combiScrollContainer, 'left')} 
                        aria-label="Scroll left"
                        className="hidden sm:block absolute top-1/2 -translate-y-1/2 left-0 z-10 bg-white/80 p-2 sm:p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 backdrop-blur-sm ml-2"
                    >
                        <ChevronLeft size={20} className="sm:w-6 sm:h-6 text-slate-700"/>
                    </button>
                    <button 
                        onClick={() => scroll(combiScrollContainer, 'right')} 
                        aria-label="Scroll right"
                        className="hidden sm:block absolute top-1/2 -translate-y-1/2 right-0 z-10 bg-white/80 p-2 sm:p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 backdrop-blur-sm mr-2"
                    >
                        <ChevronRight size={20} className="sm:w-6 sm:h-6 text-slate-700"/>
                    </button>
                </div>
            </div>
          </section>
        )}
        
        {top10Tours.length > 0 && (
          <section className="py-12 sm:py-20 bg-slate-50">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 text-center mb-3 sm:mb-4">
                TOP 10 TOURS IN {destination.name.toUpperCase()}
              </h2>
              <p className="text-center text-base sm:text-lg text-slate-600 mb-8 sm:mb-12">
                Our best-selling tours and experiences curated by local experts
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 max-w-6xl mx-auto">
                {top10Tours.map((tour, index) => (
                  <Top10Card key={tour._id} tour={tour} index={index} />
                ))}
              </div>
            </div>
          </section>
        )}

        {destinationCategories.length > 0 && (
          <section className="bg-white py-12 sm:py-20">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-4 sm:mb-6">
                Discover {destination.name} by Interest
              </h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 sm:mb-12">
                Find the perfect experience for you, whether you're interested in culture, adventure, or food.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {destinationCategories.map((category) => (
                  <InterestCard key={category._id} category={category} tourCount={category.tourCount} />
                ))}
              </div>
            </div>
          </section>
        )}

        <AboutUsSection destination={destination} />

        {destination.highlights && destination.highlights.length > 0 && (
          <section className="bg-slate-50 py-12 sm:py-20">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 text-center mb-6 sm:mb-10">Why Visit {destination.name}?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                {destination.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-3 sm:gap-4">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mt-1 flex-shrink-0" />
                    <p className="text-base sm:text-lg text-slate-600">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <TravelTipsSection destination={destination} />

        <ReviewsSection reviews={reviews} destinationName={destination.name} />

        <FAQSection destinationName={destination.name} />

        <RelatedDestinationsSection destinations={relatedDestinations} />

        <NewsletterSection destinationName={destination.name} />
        
      </main>
      <Footer />

      {/* AI Search Widget */}
      <AISearchWidget />

      {selectedTour && (
        <BookingSidebar
          isOpen={isBookingSidebarOpen}
          onClose={() => setBookingSidebarOpen(false)}
          tour={selectedTour as any}
        />
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-from-top {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }

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

        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-slide-from-top { animation: slide-from-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .animate-text-slide-in { animation: text-slide-in 0.5s ease-out forwards; }

        .text-shadow { text-shadow: 1px 1px 4px rgb(0 0 0 / 0.5); }
        .text-shadow-lg { text-shadow: 2px 2px 8px rgb(0 0 0 / 0.6); }

        img {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
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

        [style*="scrollbarWidth"]::-webkit-scrollbar {
          display: none;
        }

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
          .animate-text-slide-in,
          .animate-fade-in,
          .animate-slide-from-top,
          .animate-pulse-slow {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
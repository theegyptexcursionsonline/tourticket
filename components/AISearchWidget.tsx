'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Search, ChevronUp, MapPin, Clock, AlertCircle, Compass, Tag, FileText, MessageCircle } from 'lucide-react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import 'instantsearch.css/themes/satellite.css';

// --- Algolia Config ---
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const INDEX_CATEGORIES = 'categories';
const INDEX_BLOGS = 'blogs';

// Create search client outside component to avoid recreating on every render
const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Custom SearchBox component
function CustomSearchBox({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(searchQuery);
  }, [searchQuery, refine]);

  return null;
}

// Custom Hits components for each index type
function TourHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

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
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/tours/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-blue-500/5 hover:via-indigo-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:via-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            {/* Tour Image */}
            <div className="w-14 md:w-20 h-14 md:h-20 rounded-xl md:rounded-2xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              {(hit.image || hit.images?.[0] || hit.primaryImage) ? (
                <img
                  src={hit.image || hit.images?.[0] || hit.primaryImage}
                  alt={hit.title || 'Tour'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200"><svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
                  <MapPin className="w-8 h-8 text-blue-600" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 line-clamp-2 md:truncate group-hover:text-blue-600 transition-colors duration-300">
                {hit.title || 'Untitled Tour'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.location && (
                  <span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg">
                    <MapPin className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} />
                    <span className="font-medium">{hit.location}</span>
                  </span>
                )}
                {hit.duration && (
                  <span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg">
                    <Clock className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} />
                    <span className="font-medium">{hit.duration} days</span>
                  </span>
                )}
                {(hit.price || hit.discountPrice) && (
                  <span className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-bold text-blue-600 text-[10px] md:text-xs">
                    ${hit.discountPrice || hit.price}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

function DestinationHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
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
        <motion.a
          key={hit.objectID}
          href={`/destinations/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
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
        </motion.a>
      ))}
    </div>
  );
}

function CategoryHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
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
        <motion.a
          key={hit.objectID}
          href={`/categories/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
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
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5">
                {hit.tourCount && (
                  <span className="bg-purple-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-purple-700">
                    {hit.tourCount} tours
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

function BlogHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <FileText className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Blog Posts
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/blog/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-amber-500/5 hover:via-orange-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-orange-500/0 to-red-500/0 group-hover:from-amber-500/5 group-hover:via-orange-500/5 group-hover:to-red-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <FileText className="w-6 md:w-7 h-6 md:h-7 text-amber-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-amber-600 transition-colors duration-300">
                {hit.title || 'Untitled Blog Post'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.category && (
                  <span className="bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium">{hit.category}</span>
                )}
                {hit.readTime && (
                  <span className="bg-amber-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-amber-700">
                    {hit.readTime} min read
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

export default function AISearchWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [algoliaError, setAlgoliaError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Scroll detection - show widget after scrolling past hero section
  useEffect(() => {
    const handleScroll = () => {
      // Show widget after scrolling more than 80vh (roughly past the hero section)
      const scrollThreshold = window.innerHeight * 0.8;
      setIsVisible(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll);
    // Check initial scroll position
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(true);
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Click outside to close - FIXED
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is on the backdrop or outside the search container
      const searchContainer = target.closest('.ai-search-container');
      const isInputClick = target.closest('.ai-search-input');
      const isResultsClick = target.closest('.motion-div-results');

      // Close if clicking outside the container, but not on the input or results
      if (isExpanded && !searchContainer && !isInputClick && !isResultsClick) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      // Use timeout to avoid immediate closing when opening
      const timeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded]);

  // Mock recently viewed items
  useEffect(() => {
    setRecentlyViewed([
      { id: 1, title: 'Pyramids of Giza Tour', type: 'Historical', price: 45, duration: '8 hours' },
      { id: 2, title: 'Nile River Cruise', type: 'Cruise', price: 120, duration: '3 days' },
      { id: 3, title: 'Cairo City Tour', type: 'City Tour', price: 35, duration: '6 hours' },
    ]);
  }, []);

  const handleCloseSearch = () => {
    setIsExpanded(false);
    setSearchQuery('');
  };

  const handleAskAI = () => {
    // Dispatch custom event to open AI agent with the search query
    const event = new CustomEvent('openAIAgent', { 
      detail: { query: searchQuery } 
    });
    window.dispatchEvent(event);
    setIsExpanded(false);
  };

  // Don't render anything if not visible
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop Blur Overlay - Outside container for proper click handling */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="fixed inset-0 z-[9999] cursor-pointer"
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(0, 0, 0, 0.15)',
              pointerEvents: 'auto'
            }}
          />
        )}
      </AnimatePresence>

      {/* Container for both search bar and results - ensures perfect alignment */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex fixed bottom-4 md:bottom-8 left-0 right-0 z-[10000] justify-center px-3 md:px-6 pointer-events-none"
      >
        <div className="w-full max-w-3xl pointer-events-auto">
          <div className="ai-search-container relative">

            {/* Expanded State - Results Panel Above Search Bar */}
            <AnimatePresence>
              {isExpanded && (
                <>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.94 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-full mb-2 md:mb-4 left-0 right-0 rounded-2xl md:rounded-[28px] overflow-hidden shadow-2xl"
                    style={{
                      maxHeight: '60vh',
                      background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.92))',
                      backdropFilter: 'blur(40px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.3) inset'
                    }}
                  >
                    {/* Search Results Content */}
                    <div className="flex flex-col h-full">
                      {/* Header */}
                      <div className="px-4 md:px-7 py-3 md:py-5 border-b border-white/20 backdrop-blur-xl"
                        style={{
                          background: 'linear-gradient(to right, rgba(59, 130, 246, 0.03), rgba(139, 92, 246, 0.03))'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 md:gap-3">
                            <motion.div
                              animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 5, -5, 0]
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4 text-blue-500" strokeWidth={2.5} />
                            </motion.div>
                            <span className="text-xs md:text-sm font-semibold text-gray-800 tracking-tight">
                              {searchQuery ? 'Search Results' : 'Recent Activity'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2">
                            {searchQuery && (
                              <motion.button
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                onClick={handleAskAI}
                                className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-2xl text-xs font-semibold text-white transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg group"
                                style={{
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                  boxShadow: '0 4px 12px -2px rgba(59, 130, 246, 0.4)'
                                }}
                              >
                                <MessageCircle className="w-3.5 md:w-4 h-3.5 md:h-4 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                                <span className="hidden md:inline">Ask AI Agent</span>
                                <span className="md:hidden">Ask AI</span>
                              </motion.button>
                            )}
                            <button
                              onClick={() => setIsExpanded(false)}
                              className="text-gray-400 hover:text-gray-700 transition-all duration-200 p-2 md:p-2.5 rounded-2xl hover:bg-white/60 hover:shadow-sm group backdrop-blur-sm"
                            >
                              <X className="w-4 md:w-4.5 h-4 md:h-4.5 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Results Area */}
                      <div className="flex-1 overflow-y-auto apple-scrollbar">
                        {algoliaError ? (
                          <div className="p-16 text-center">
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.3 }}
                              className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-gradient-to-br from-red-50 to-red-100 mb-5 shadow-lg shadow-red-500/10"
                            >
                              <AlertCircle className="w-10 h-10 text-red-500" strokeWidth={2.5} />
                            </motion.div>
                            <p className="text-sm font-semibold text-red-600 mb-2">Search Error</p>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">{algoliaError}</p>
                          </div>
                        ) : searchQuery ? (
                          <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                            <CustomSearchBox
                              searchQuery={searchQuery}
                              onSearchChange={setSearchQuery}
                            />

                            {/* Tours Index */}
                            <Index indexName={INDEX_TOURS}>
                              <Configure hitsPerPage={5} />
                              <TourHits onHitClick={handleCloseSearch} limit={5} />
                            </Index>

                            {/* Destinations Index */}
                            <Index indexName={INDEX_DESTINATIONS}>
                              <Configure hitsPerPage={5} />
                              <DestinationHits onHitClick={handleCloseSearch} limit={5} />
                            </Index>

                            {/* Categories Index */}
                            <Index indexName={INDEX_CATEGORIES}>
                              <Configure hitsPerPage={5} />
                              <CategoryHits onHitClick={handleCloseSearch} limit={5} />
                            </Index>

                            {/* Blogs Index */}
                            <Index indexName={INDEX_BLOGS}>
                              <Configure hitsPerPage={5} />
                              <BlogHits onHitClick={handleCloseSearch} limit={5} />
                            </Index>
                          </InstantSearch>
                        ) : (
                          // Recently Viewed Section
                          <div>
                            {recentlyViewed.length > 0 ? (
                              recentlyViewed.map((item, index) => (
                                <motion.a
                                  key={item.id}
                                  href="#"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05, duration: 0.3 }}
                                  className="block px-6 py-4 hover:bg-gradient-to-r hover:from-orange-500/5 hover:via-amber-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 group relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-amber-500/0 to-yellow-500/0 group-hover:from-orange-500/5 group-hover:via-amber-500/5 group-hover:to-yellow-500/5 transition-all duration-500" />
                                  <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
                                      <Clock className="w-7 h-7 text-orange-600" strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900 text-[15px] leading-snug mb-1.5 group-hover:text-orange-600 transition-colors duration-300">{item.title}</div>
                                      <div className="text-xs text-gray-500 flex items-center gap-2.5 flex-wrap">
                                        <span className="bg-gray-50/80 backdrop-blur-sm px-2.5 py-1 rounded-lg font-medium">{item.type}</span>
                                        <span className="bg-gray-50/80 backdrop-blur-sm px-2.5 py-1 rounded-lg font-medium">{item.duration}</span>
                                        <span className="bg-gradient-to-r from-orange-50 to-amber-50 px-2.5 py-1 rounded-lg font-bold text-orange-600">${item.price}</span>
                                      </div>
                                    </div>
                                  </div>
                                </motion.a>
                              ))
                            ) : (
                              <div className="p-16 text-center">
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                  className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-gradient-to-br from-gray-50 to-gray-100 mb-5 shadow-lg shadow-gray-500/5"
                                >
                                  <Clock className="w-10 h-10 text-gray-400" strokeWidth={2.5} />
                                </motion.div>
                                <p className="text-sm font-medium text-gray-600">No recent searches</p>
                                <p className="text-xs text-gray-400 mt-1">Start exploring to see your history</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ask AI Button - Shows when there's a search query */}
                      {searchQuery && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="border-t border-white/20 px-3 md:px-7 py-3 md:py-5 backdrop-blur-xl"
                          style={{
                            background: 'linear-gradient(to right, rgba(99, 102, 241, 0.03), rgba(168, 85, 247, 0.03))'
                          }}
                        >
                          <button
                            onClick={handleAskAI}
                            className="w-full group relative overflow-hidden rounded-xl md:rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                            style={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              boxShadow: '0 8px 24px -6px rgba(102, 126, 234, 0.4)'
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 group-hover:translate-x-full transition-transform duration-1000" />
                            <div className="relative px-4 md:px-6 py-3 md:py-4 flex items-center justify-center gap-2 md:gap-3">
                              <div className="w-8 md:w-10 h-8 md:h-10 rounded-lg md:rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <MessageCircle className="w-4 md:w-5 h-4 md:h-5 text-white" strokeWidth={2.5} />
                              </div>
                              <div className="flex-1 text-left">
                                <div className="text-white font-bold text-xs md:text-sm tracking-tight line-clamp-1">Ask AI about "{searchQuery}"</div>
                                <div className="text-white/70 text-[10px] md:text-xs font-medium mt-0.5 hidden sm:block">Get personalized recommendations</div>
                              </div>
                              <motion.div
                                animate={{ x: [0, 5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="hidden sm:block"
                              >
                                <Sparkles className="w-4 md:w-5 h-4 md:h-5 text-white/90" strokeWidth={2.5} />
                              </motion.div>
                            </div>
                          </button>
                        </motion.div>
                      )}

                      {/* Trending Section */}
                      {!searchQuery && (
                        <div className="border-t border-white/20 px-3 md:px-7 py-3 md:py-5 backdrop-blur-xl"
                          style={{
                            background: 'linear-gradient(to right, rgba(99, 102, 241, 0.03), rgba(168, 85, 247, 0.03))'
                          }}
                        >
                          <div className="flex items-center gap-2 md:gap-2.5 mb-3 md:mb-4">
                            <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                              <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-xs md:text-sm font-semibold text-gray-800 tracking-tight">
                              Trending Searches
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 md:gap-2.5">
                            {['Pyramids', 'Nile Cruise', 'Desert Safari', 'Luxor', 'Tours under $100'].map((trend, index) => (
                              <motion.button
                                key={trend}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05, duration: 0.2 }}
                                onClick={() => {
                                  setSearchQuery(trend);
                                  const input = document.querySelector('.ai-search-input') as HTMLInputElement;
                                  if (input) {
                                    input.value = trend;
                                    input.focus();
                                  }
                                }}
                                className="px-2.5 md:px-4 py-1.5 md:py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-semibold text-gray-700 hover:text-blue-700 transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                                style={{
                                  background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))',
                                  backdropFilter: 'blur(20px)',
                                  WebkitBackdropFilter: 'blur(20px)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(to bottom, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05))';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))';
                                }}
                              >
                                {trend}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Search Bar with Enhanced Apple-like Glassmorphism */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative group"
            >
              {/* Main Search Box - Premium Glassmorphism Capsule */}
              <div
                className={`relative rounded-full transition-all duration-500 ${
                  isExpanded
                    ? 'shadow-2xl'
                    : 'shadow-xl hover:shadow-2xl'
                }`}
                style={{
                  background: isExpanded 
                    ? 'linear-gradient(to bottom, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.95))'
                    : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.92))',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  border: isExpanded 
                    ? '2px solid rgba(59, 130, 246, 0.3)'
                    : '1.5px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: isExpanded
                    ? '0 20px 60px -15px rgba(59, 130, 246, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.3) inset, 0 1px 0 0 rgba(255, 255, 255, 0.6) inset'
                    : '0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 1px 0 0 rgba(255, 255, 255, 0.5) inset'
                }}
              >
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsExpanded(true)}
                    placeholder="Search tours, destinations & more..."
                    className="ai-search-input w-full pl-12 md:pl-16 pr-14 md:pr-36 py-3.5 md:py-5 text-sm md:text-[15px] font-medium text-gray-900 placeholder-gray-400 bg-transparent outline-none cursor-text relative z-10 rounded-full tracking-tight"
                    style={{ cursor: 'text' }}
                  />
                  
                  {/* Left Icon with Premium Animation */}
                  <div className="absolute left-3 md:left-5 top-1/2 transform -translate-y-1/2 z-10">
                    <motion.div
                      className="relative"
                      animate={{
                        scale: [1, 1.08, 1],
                        rotate: [0, 2, -2, 0]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        times: [0, 0.5, 1]
                      }}
                    >
                      <div
                        className={`w-8 md:w-10 h-8 md:h-10 rounded-xl md:rounded-[14px] flex items-center justify-center transition-all duration-500 shadow-lg`}
                        style={{
                          background: isExpanded
                            ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                            : 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                          boxShadow: isExpanded
                            ? '0 8px 16px -4px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.3) inset'
                            : '0 4px 12px -2px rgba(96, 165, 250, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                        }}
                      >
                        <Search className="w-4 md:w-5 h-4 md:h-5 text-white" strokeWidth={2.5} />
                      </div>
                      <motion.div
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 md:w-3 h-2.5 md:h-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-md"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [1, 0.7, 1]
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        style={{
                          boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)'
                        }}
                      />
                    </motion.div>
                  </div>

                  {/* Right Side Elements with Premium Design */}
                  <div className="absolute right-3 md:right-5 top-1/2 transform -translate-y-1/2 flex items-center gap-2 md:gap-3 z-10">
                    {isExpanded ? (
                      <motion.div
                        initial={{ rotate: 180, opacity: 0, scale: 0.5 }}
                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-1.5 md:gap-2.5"
                      >
                        <div
                          className="hidden sm:flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl shadow-sm"
                          style={{
                            background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.05))',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(59, 130, 246, 0.15)',
                            boxShadow: '0 2px 8px -2px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.4) inset'
                          }}
                        >
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-500/50"
                          />
                          <span className="text-[10px] md:text-[11px] font-bold text-blue-700 uppercase tracking-wide">Live</span>
                        </div>
                        <div
                          className="w-8 md:w-10 h-8 md:h-10 rounded-xl md:rounded-[14px] flex items-center justify-center shadow-lg"
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.3) inset'
                          }}
                        >
                          <ChevronUp className="w-4 md:w-5 h-4 md:h-5 text-white" strokeWidth={2.5} />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        animate={{
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-8 md:w-10 h-8 md:h-10 rounded-xl md:rounded-[14px] flex items-center justify-center shadow-md"
                        style={{
                          background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                          boxShadow: '0 4px 12px -2px rgba(96, 165, 250, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                        }}
                      >
                        <Sparkles className="w-4 md:w-5 h-4 md:h-5 text-white" strokeWidth={2.5} />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Attribution with Glassmorphism */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.9 }}
                transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mt-2 md:mt-4 text-center hidden md:block"
              >
                <div
                  className="inline-flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-gray-600 px-3 md:px-5 py-2 md:py-3 rounded-2xl md:rounded-[18px] shadow-lg"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.4) inset'
                  }}
                >
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-500" strokeWidth={2.5} />
                    <span className="font-semibold">Powered by AI</span>
                  </div>
                  <span className="text-gray-300 hidden sm:inline">•</span>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="font-medium">Press</span>
                    <kbd
                      className="px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(243, 244, 246, 0.9))',
                        border: '1px solid rgba(209, 213, 219, 0.5)',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                      }}
                    >
                      ESC
                    </kbd>
                    <span className="font-medium">to close</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Custom Styles */}
      <style jsx global>{`
        /* Hide default Algolia styling */
        .ais-InstantSearch {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;
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

        /* Apple-like Scrollbar */
        .apple-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .apple-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          margin: 8px 0;
        }
        
        .apple-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(156, 163, 175, 0.4), rgba(107, 114, 128, 0.4));
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        
        .apple-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(107, 114, 128, 0.6), rgba(75, 85, 99, 0.6));
          background-clip: padding-box;
        }

        /* Ensure text cursor on hover */
        .ai-search-input {
          cursor: text !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .ai-search-input::placeholder {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Enhanced kbd styling */
        kbd {
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Premium focus styles */
        .ai-search-input:focus {
          outline: none;
        }

        /* Smooth font rendering */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </>
  );
}
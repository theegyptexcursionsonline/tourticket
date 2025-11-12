'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Search, ChevronUp, MapPin, Clock, AlertCircle, Compass, Tag, FileText } from 'lucide-react';
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
            {/* Tour Image */}
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

function DestinationHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Compass className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
            Destinations ({hits.length})
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any) => (
        <a
          key={hit.objectID}
          href={`/destinations/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-5 py-3.5 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent transition-all duration-200 border-b border-gray-100/50 last:border-0 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center flex-shrink-0 border-2 border-emerald-100 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              <Compass className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate group-hover:text-emerald-600 transition-colors">
                {hit.name || 'Untitled Destination'}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
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

function CategoryHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-5 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
            <Tag className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
            Categories ({hits.length})
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any) => (
        <a
          key={hit.objectID}
          href={`/categories/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-5 py-3.5 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent transition-all duration-200 border-b border-gray-100/50 last:border-0 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center flex-shrink-0 border-2 border-purple-100 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              <Tag className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate group-hover:text-purple-600 transition-colors">
                {hit.name || 'Untitled Category'}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                {hit.tourCount && <span>{hit.tourCount} tours</span>}
              </div>
            </div>
          </div>
        </a>
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
      <div className="px-5 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
            <FileText className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
            Blog Posts ({hits.length})
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any) => (
        <a
          key={hit.objectID}
          href={`/blog/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-5 py-3.5 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-transparent transition-all duration-200 border-b border-gray-100/50 last:border-0 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center flex-shrink-0 border-2 border-amber-100 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate group-hover:text-amber-600 transition-colors">
                {hit.title || 'Untitled Blog Post'}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                {hit.category && <span>{hit.category}</span>}
                {hit.readTime && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>{hit.readTime} min read</span>
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
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.ai-search-container')) {
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

  // Don't render anything if not visible
  if (!isVisible) return null;

  return (
    <>
      {/* Container for both search bar and results - ensures perfect alignment */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="hidden md:flex fixed bottom-6 left-0 right-0 z-30 justify-center px-4"
      >
        <div className="w-full max-w-3xl">
        <div className="ai-search-container relative">
          
          {/* Expanded State - Results Panel Above Search Bar */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="absolute bottom-full mb-3 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden"
                style={{ maxHeight: '65vh' }}
              >
                {/* Search Results Content */}
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-100/50 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          {searchQuery ? 'Search Results' : 'Recently Viewed'}
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
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {algoliaError ? (
                      <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                          <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <p className="text-sm font-semibold text-red-600 mb-1">Search Error</p>
                        <p className="text-xs text-gray-500">{algoliaError}</p>
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
                          recentlyViewed.map((item) => (
                            <a
                              key={item.id}
                              href="#"
                              className="block px-5 py-3.5 hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-transparent transition-all duration-200 border-b border-gray-100/50 group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center flex-shrink-0 border-2 border-orange-100 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                                  <Clock className="w-6 h-6 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">{item.title}</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                    <span>{item.type}</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{item.duration}</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="font-bold text-orange-600">${item.price}</span>
                                  </div>
                                </div>
                              </div>
                            </a>
                          ))
                        ) : (
                          <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                              <Clock className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-500">No recent searches</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Trending Section */}
                  {!searchQuery && (
                    <div className="border-t border-gray-100/50 px-6 py-4 bg-gradient-to-br from-gray-50/50 via-blue-50/30 to-purple-50/30 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Trending Egypt Tours
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['Pyramids', 'Nile Cruise', 'Desert Safari', 'Luxor', 'Tours under $100'].map((trend) => (
                          <button
                            key={trend}
                            onClick={() => {
                              setSearchQuery(trend);
                              const input = document.querySelector('.ai-search-input') as HTMLInputElement;
                              if (input) {
                                input.value = trend;
                                input.focus();
                              }
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

          {/* Search Bar with Enhanced Capsule Design */}
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
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
                  placeholder="Search tours, destinations, categories & blogs..."
                  className="ai-search-input w-full pl-14 pr-32 py-4 text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent outline-none cursor-text relative z-10 rounded-full"
                  style={{ cursor: 'text' }}
                />
                
                {/* Left Icon with Animation */}
                <div className="absolute left-5 top-1/2 transform -translate-y-1/2 z-10">
                  <motion.div
                    className="relative"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isExpanded
                        ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30'
                        : 'bg-gradient-to-br from-blue-400 to-purple-400 shadow-md'
                    }`}>
                      <Search className={`w-4 h-4 transition-colors duration-300 ${isExpanded ? 'text-white' : 'text-white'}`} />
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
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2 flex items-center gap-2.5 z-10">
                  {isExpanded ? (
                    <motion.div
                      initial={{ rotate: 180, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      className="flex items-center gap-2"
                    >
                      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-full">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Active</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
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
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Attribution with Fade Animation */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mt-3 text-center"
            >
              <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span className="font-medium">Powered by AI</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <span>Press</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold border border-gray-200">ESC</kbd>
                  <span>to close</span>
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

        /* Ensure text cursor on hover */
        .ai-search-input {
          cursor: text !important;
        }
        
        .ai-search-widget:hover .ai-search-input {
          cursor: text !important;
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

        /* Enhanced kbd styling */
        kbd {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
      `}</style>
    </>
  );
}
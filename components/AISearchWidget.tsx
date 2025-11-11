'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Search, ChevronUp, MapPin, Clock, DollarSign } from 'lucide-react';

// --- Algolia Config ---
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

// --- CDN URLs ---
const ALGOLIA_CSS_URL = 'https://cdn.jsdelivr.net/npm/instantsearch.css@8.0.0/themes/satellite.css';
const ALGOLIA_SEARCH_CLIENT_URL = 'https://cdn.jsdelivr.net/npm/algoliasearch@4.20.0/dist/algoliasearch-lite.umd.js';
const REACT_INSTANTSEARCH_URL = 'https://cdn.jsdelivr.net/npm/react-instantsearch@7.0.0/dist/umd/index.production.min.js';

declare global {
  interface Window {
    algoliasearch: any;
    ReactInstantSearch: any;
  }
}

export default function AISearchWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAlgoliaReady, setIsAlgoliaReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  // Load Algolia scripts
  useEffect(() => {
    if (isAlgoliaReady) return;

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = ALGOLIA_CSS_URL;
    document.head.appendChild(cssLink);

    const searchClientScript = document.createElement('script');
    searchClientScript.src = ALGOLIA_SEARCH_CLIENT_URL;
    searchClientScript.async = true;
    searchClientScript.onload = () => {
      const instantSearchScript = document.createElement('script');
      instantSearchScript.src = REACT_INSTANTSEARCH_URL;
      instantSearchScript.async = true;
      instantSearchScript.onload = () => {
        if (window.algoliasearch && window.ReactInstantSearch) {
          setIsAlgoliaReady(true);
        }
      };
      document.body.appendChild(instantSearchScript);
    };
    document.body.appendChild(searchClientScript);

    return () => {
      document.head.removeChild(cssLink);
    };
  }, [isAlgoliaReady]);

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

  const algoliaSearchClient = useMemo(() => {
    if (!isAlgoliaReady || !window.algoliasearch) return null;
    return window.algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  }, [isAlgoliaReady]);

  const { InstantSearch, SearchBox, Hits } = useMemo(() => {
    if (!isAlgoliaReady || !window.ReactInstantSearch) {
      return { InstantSearch: null, SearchBox: null, Hits: null };
    }
    return window.ReactInstantSearch;
  }, [isAlgoliaReady]);

  // Mock recently viewed items
  useEffect(() => {
    setRecentlyViewed([
      { id: 1, title: 'Pyramids of Giza Tour', type: 'Historical', price: 45, duration: '8 hours' },
      { id: 2, title: 'Nile River Cruise', type: 'Cruise', price: 120, duration: '3 days' },
      { id: 3, title: 'Cairo City Tour', type: 'City Tour', price: 35, duration: '6 hours' },
    ]);
  }, []);

  const HitItem = ({ hit }: any) => {
    return (
      <a 
        href={`/tours/${hit.slug}`}
        className="block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm truncate">{hit.title}</div>
            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
              {hit.location && <span>{hit.location}</span>}
              {hit.duration && (
                <>
                  <span className="text-gray-300">•</span>
                  <Clock className="w-3 h-3" />
                  <span>{hit.duration}</span>
                </>
              )}
              {hit.price && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="font-medium">${hit.price}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </a>
    );
  };

  return (
    <>
      {/* Container for both search bar and results - ensures perfect alignment */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-3xl px-4 pb-4">
        <div className="ai-search-container relative">
          
          {/* Expanded State - Results Panel Above Search Bar */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden backdrop-blur-xl"
                style={{ maxHeight: '60vh' }}
              >
                {/* Search Results Content */}
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                        {searchQuery ? 'Search Results' : 'Recently Viewed'}
                      </span>
                      <button
                        onClick={() => setIsExpanded(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-white hover:shadow-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Results Area */}
                  <div className="flex-1 overflow-y-auto">
                    {isAlgoliaReady && algoliaSearchClient && InstantSearch && SearchBox && Hits ? (
                      searchQuery ? (
                        <InstantSearch searchClient={algoliaSearchClient} indexName={INDEX_NAME}>
                          <div className="hidden">
                            <SearchBox defaultRefinement={searchQuery} />
                          </div>
                          <Hits hitComponent={HitItem} />
                        </InstantSearch>
                      ) : (
                        // Recently Viewed Section
                        <div>
                          {recentlyViewed.length > 0 ? (
                            recentlyViewed.map((item) => (
                              <a
                                key={item.id}
                                href="#"
                                className="block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-5 h-5 text-orange-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 text-sm">{item.title}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                      <span>{item.type}</span>
                                      <span className="text-gray-300">•</span>
                                      <span>{item.duration}</span>
                                      <span className="text-gray-300">•</span>
                                      <span className="font-medium">${item.price}</span>
                                    </div>
                                  </div>
                                </div>
                              </a>
                            ))
                          ) : (
                            <div className="p-8 text-center">
                              <p className="text-sm text-gray-500">No recent searches</p>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-32">
                        <div className="text-gray-400 text-sm">Loading...</div>
                      </div>
                    )}
                  </div>

                  {/* Trending Section */}
                  {!searchQuery && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50">
                      <div className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">Trending Egypt Tours</div>
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
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
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

          {/* Search Bar with Enhanced Effects */}
          <motion.div
            whileHover={{ y: -2, scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative group"
          >
            {/* Animated Gradient Border Effect (when expanded) */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-lg opacity-75 blur-sm animate-gradient-xy"
              />
            )}
            
            {/* Main Search Box */}
            <div
              className={`relative bg-white rounded-lg transition-all duration-300 ${
                isExpanded 
                  ? 'shadow-2xl shadow-blue-500/20 border-2 border-blue-400' 
                  : 'shadow-xl hover:shadow-2xl border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Inner glow effect */}
              {isExpanded && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-blue-50/50 rounded-lg animate-pulse-slow" />
              )}
              
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsExpanded(true)}
                  placeholder="Ask me about Egypt tours (e.g., tours under $100, Pyramids, Nile cruise)"
                  className="ai-search-input w-full px-12 py-3.5 text-sm text-gray-900 placeholder-gray-500 bg-transparent outline-none cursor-text relative z-10"
                  style={{ cursor: 'text' }}
                />
                
                {/* Left Icon with Animation */}
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <motion.div 
                    className="relative"
                    animate={isExpanded ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Search className={`w-4 h-4 transition-colors duration-300 ${isExpanded ? 'text-blue-600' : 'text-gray-400'}`} />
                    <motion.div 
                      className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.8, 1]
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
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-10">
                  {isExpanded ? (
                    <motion.div
                      initial={{ rotate: 180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronUp className="w-4 h-4 text-blue-600" />
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:block text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded border border-gray-200 shadow-sm">
                        Ctrl+K
                      </span>
                      <motion.div
                        animate={{ 
                          rotate: [0, 10, -10, 0],
                        }}
                        transition={{ 
                          duration: 3, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Sparkles className="w-4 h-4 text-blue-500" />
                      </motion.div>
                    </div>
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
              transition={{ delay: 0.1 }}
              className="mt-2 text-center"
            >
              <span className="text-xs text-gray-400 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm">
                Powered by AI • Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] border border-gray-200">ESC</kbd> to close
              </span>
            </motion.div>
          )}
        </div>
      </div>

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
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f9fafb;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* Ensure text cursor on hover */
        .ai-search-input {
          cursor: text !important;
        }
        
        .ai-search-widget:hover .ai-search-input {
          cursor: text !important;
        }

        /* Animated gradient background */
        @keyframes gradient-xy {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 3s ease infinite;
        }

        /* Slow pulse animation */
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.3;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        /* Enhanced kbd styling */
        kbd {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
      `}</style>
    </>
  );
}
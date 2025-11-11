'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Minimize2 } from 'lucide-react';

// --- Algolia Config ---
// We will load algoliasearch and react-instantsearch from CDNs
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

// --- CDN URLs ---
const ALGOLIA_CSS_URL = 'https://cdn.jsdelivr.net/npm/instantsearch.css@8.0.0/themes/satellite.css';
const ALGOLIA_SEARCH_CLIENT_URL = 'https://cdn.jsdelivr.net/npm/algoliasearch@4.20.0/dist/algoliasearch-lite.umd.js';
const REACT_INSTANTSEARCH_URL = 'https://cdn.jsdelivr.net/npm/react-instantsearch@7.0.0/dist/umd/index.production.min.js';

// --- Type definitions for window properties ---
declare global {
  interface Window {
    algoliasearch: any;
    ReactInstantSearch: any;
  }
}

export default function AISearchWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAlgoliaReady, setIsAlgoliaReady] = useState(false);

  // --- Dynamically load Algolia scripts and CSS ---
  useEffect(() => {
    if (isAlgoliaReady) return;

    // 1. Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = ALGOLIA_CSS_URL;
    document.head.appendChild(cssLink);

    // 2. Load AlgoliaSearch client
    const searchClientScript = document.createElement('script');
    searchClientScript.src = ALGOLIA_SEARCH_CLIENT_URL;
    searchClientScript.async = true;
    searchClientScript.onload = () => {
      
      // 3. Load React InstantSearch *after* Algolia client
      const instantSearchScript = document.createElement('script');
      instantSearchScript.src = REACT_INSTANTSEARCH_URL;
      instantSearchScript.async = true;
      instantSearchScript.onload = () => {
        // All scripts are loaded
        if (window.algoliasearch && window.ReactInstantSearch) {
          setIsAlgoliaReady(true);
        }
      };
      document.body.appendChild(instantSearchScript);
    };
    document.body.appendChild(searchClientScript);

    // Cleanup function
    return () => {
      document.head.removeChild(cssLink);
      // Note: Scripts are harder to remove cleanly, but for this widget's lifecycle,
      // it's generally fine to leave them.
    };
  }, [isAlgoliaReady]); // Only run once

  // Keyboard shortcut handler (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(true);
      }
      // ESC to minimize
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const handleSearchBarClick = () => {
    setIsExpanded(true);
  };

  const handleMinimize = () => {
    setIsExpanded(false);
  };

  // --- Memoize Algolia client and components ---
  // We can only initialize them *after* scripts are loaded
  const algoliaSearchClient = useMemo(() => {
    if (!isAlgoliaReady || !window.algoliasearch) return null;
    return window.algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  }, [isAlgoliaReady]);

  const { InstantSearch, Chat } = useMemo(() => {
    if (!isAlgoliaReady || !window.ReactInstantSearch) {
      return { InstantSearch: null, Chat: null };
    }
    return window.ReactInstantSearch;
  }, [isAlgoliaReady]);


  return (
    <>
      {/* =================================================== */}
      {/* Expanded State - Chat Popup                         */}
      {/* =================================================== */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            // Positioned relative to the bottom of the viewport
            // 1.25rem (pb-5) + 50px (bar height) + 0.5rem (gap) = ~78px
            className="fixed bottom-[80px] w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-[9999]"
            style={{ height: '550px' }}
          >
            {/* Compact Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" strokeWidth={2} />
                <h3 className="text-gray-800 font-semibold text-sm">AI Assistant</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleMinimize}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Minimize"
                >
                  <Minimize2 className="w-4 h-4 text-gray-600" />
                </button>
                {/* Close button now also just minimizes */}
                <button
                  onClick={handleMinimize}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Chat Content (from AIAgentWidget) */}
            <div className="flex-1 overflow-hidden">
              {/* --- Conditional Render --- */}
              {isAlgoliaReady && algoliaSearchClient && InstantSearch && Chat ? (
                <InstantSearch searchClient={algoliaSearchClient} indexName={INDEX_NAME}>
                  <Chat
                    agentId={AGENT_ID}
                    classNames={{
                      root: 'h-full ai-agent-chat',
                    }}
                    placeholder="Ask me anything..."
                  />
                </InstantSearch>
              ) : (
                // --- Loading State ---
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 text-sm">Loading AI Assistant...</p>
                </div>
              )}
            </div>

            {/* Styling (from AIAgentWidget) */}
            <style jsx global>{`
              .ai-agent-chat {
                font-family: inherit !important;
                height: 100%;
                display: flex;
                flex-direction: column;
              }
              .ai-agent-chat .ais-Chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                font-size: 0.875rem;
              }
              .ai-agent-chat .ais-Chat-message {
                margin-bottom: 0.75rem;
              }
              .ai-agent-chat .ais-Chat-message--user {
                background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
                color: white !important;
                border-radius: 0.75rem 0.75rem 0.25rem 0.75rem !important;
                padding: 0.625rem 0.875rem !important;
                font-size: 0.875rem;
              }
              .ai-agent-chat .ais-Chat-message--assistant {
                background: #f1f5f9 !important;
                color: #1e293b !important;
                border-radius: 0.75rem 0.75rem 0.75rem 0.25rem !important;
                padding: 0.625rem 0.875rem !important;
                font-size: 0.875rem;
              }
              .ai-agent-chat .ais-Chat-inputWrapper {
                border: 1px solid #e2e8f0 !important;
                border-radius: 0.5rem !important;
                margin: 0.75rem;
                padding: 0.25rem !important;
              }
              .ai-agent-chat .ais-Chat-input {
                font-size: 0.875rem !important;
                padding: 0.5rem 0.75rem !important;
              }
              .ai-agent-chat .ais-Chat-button {
                background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
                color: white !important;
                border-radius: 0.5rem !important;
                padding: 0.5rem 0.875rem !important;
                font-size: 0.75rem !important;
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================== */}
      {/* Minimized State - Persistent Bar                    */}
      {/* =================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-[9998] flex justify-center">
        <div className="px-4 pb-5 w-full max-w-2xl">
          <motion.div
            key="minimized"
            whileHover={{ y: isExpanded ? 0 : -2 }} // Only hover when minimized
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={`bg-white rounded-lg shadow-lg hover:shadow-xl border border-gray-200 cursor-pointer group transition-all duration-200 ease-in-out ${
              isExpanded ? 'opacity-70' : 'opacity-100' // Fade out slightly when expanded
            }`}
            onClick={!isExpanded ? handleSearchBarClick : undefined}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              {/* AI Icon */}
              <div className="p-2 bg-blue-50 rounded-full border border-blue-200">
                <Sparkles className="w-5 h-5 text-blue-600" strokeWidth={2} />
              </div>

              {/* Search Prompt */}
              <div className="flex-1">
                <p className="text-gray-500 text-sm">
                  Ask me anything...
                </p>
              </div>

              {/* Keyboard shortcut hint */}
              <div className="hidden sm:block bg-gray-100 border border-gray-200 rounded-md px-2 py-0.5">
                <span className="text-xs text-gray-500 font-medium">Ctrl + K</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
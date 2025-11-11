'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Minimize2, X } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the AI Chat component
const SimpleAlgoliaChat = dynamic(() => import('./search/SimpleAlgoliaChat'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="ml-3 text-slate-600">Loading AI Assistant...</p>
    </div>
  ),
});

export default function AISearchWidget() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Keyboard shortcut handler (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(true);
      }
      // ESC to minimize
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const handleSearchBarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Search bar clicked, expanding...');
    setIsExpanded(true);
  };

  const handleMinimize = () => {
    console.log('Minimizing...');
    setIsExpanded(false);
  };

  // Debug log
  console.log('AISearchWidget render - isExpanded:', isExpanded);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998]">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          /* Expanded State - Full Chat Window */
          <motion.div
            key="expanded"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white shadow-2xl border-t-2 border-blue-500 mx-3 mb-3 sm:mx-4 sm:mb-4 rounded-2xl overflow-hidden flex flex-col"
            style={{ height: 'calc(80vh - 1rem)', maxWidth: '1200px', marginLeft: 'auto', marginRight: 'auto' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full border border-white/40">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-base">AI Travel Assistant</h3>
                  <p className="text-white/70 text-[10px] sm:text-xs">Search Egypt tours with AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={handleMinimize}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Minimize"
                >
                  <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden bg-slate-50">
              <SimpleAlgoliaChat />
            </div>
          </motion.div>
        ) : (
          /* Minimized State - Bottom Search Bar */
          <motion.div
            key="minimized"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-3 pb-3 sm:px-4 sm:pb-4"
          >
            <div className="max-w-4xl mx-auto">
              <motion.div
                whileHover={{ y: -3, scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full shadow-[0_8px_32px_rgba(59,130,246,0.4)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.5)] cursor-pointer group overflow-hidden"
                onClick={handleSearchBarClick}
              >
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"></div>

                <div className="relative flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 pointer-events-none">
                  {/* AI Icon */}
                  <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm p-2 sm:p-2.5 rounded-full border border-white/40 group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
                  </div>

                  {/* Search Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-xs sm:text-sm font-medium tracking-wide truncate">
                      Ask AI about Egypt tours
                    </p>
                    <p className="hidden sm:block text-white/60 text-[10px] sm:text-xs mt-0.5">
                      Try: "Find luxury Nile cruises" or "Day trips from Cairo"
                    </p>
                  </div>

                  {/* Arrow Icon */}
                  <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm p-2 rounded-full group-hover:bg-white/20 transition-all duration-300">
                    <ArrowRight className="w-4 h-4 sm:w-4 sm:h-4 text-white group-hover:translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
                  </div>
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"></div>
              </motion.div>

              {/* Helper text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mt-1.5 text-[10px] sm:text-xs text-slate-500/80 font-medium tracking-wide"
              >
                Powered by AI • Click to start searching • Press Ctrl+K
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

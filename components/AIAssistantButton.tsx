'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import SearchModal from './SearchModel';

export default function AIAssistantButton() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  return (
    <>
      {/* AI Assistant Button - Fixed on Bottom Left */}
      <div className="fixed bottom-5 left-5 z-50">
        <motion.button
          onClick={handleOpenSearch}
          className="group relative w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-2xl transition-shadow"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Open AI Assistant"
        >
          <Sparkles size={28} className="animate-pulse" />

          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            AI Travel Assistant
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-800"></div>
          </div>

          {/* Animated Ring */}
          <div className="absolute inset-0 rounded-full bg-red-500 opacity-75 animate-ping"></div>
        </motion.button>

        {/* Mini Label (optional) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-bold px-2 py-1 rounded-full shadow-md"
        >
          AI
        </motion.div>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <SearchModal
            onClose={handleCloseSearch}
            onSearch={(term) => {
              console.log('Search term:', term);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

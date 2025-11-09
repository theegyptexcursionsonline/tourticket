'use client';

import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import dynamic from 'next/dynamic';

// Dynamically import AI Chat
const AlgoliaChat = dynamic(() => import('@/components/search/AlgoliaChat'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      <p className="ml-3 text-slate-600">Loading AI Assistant...</p>
    </div>
  ),
});

const SearchModal: FC<{ onClose: () => void; onSearch: (term: string) => void; }> = ({ onClose, onSearch }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showAIChat, setShowAIChat] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Example queries for users to try
    const exampleQueries = [
        {
            icon: '👨‍👩‍👧‍👦',
            title: 'Family Tours',
            query: 'Find family-friendly tours in Cairo under $100 per person',
            category: 'Budget'
        },
        {
            icon: '🌅',
            title: 'Sunset Cruises',
            query: 'Show me romantic sunset cruises with dinner on the Nile',
            category: 'Romantic'
        },
        {
            icon: '⛰️',
            title: 'Adventure Activities',
            query: 'What adventure activities and tours are available in Luxor?',
            category: 'Adventure'
        },
        {
            icon: '🏛️',
            title: 'Historical Tours',
            query: 'Best historical and cultural tours to visit pyramids and museums',
            category: 'Cultural'
        },
        {
            icon: '🏖️',
            title: 'Beach & Relaxation',
            query: 'Find beach tours and spa experiences in Hurghada',
            category: 'Relaxation'
        },
        {
            icon: '🌟',
            title: 'Luxury Experiences',
            query: 'Premium luxury tours with private guides and transfers',
            category: 'Luxury'
        }
    ];

    // Handle query selection
    const handleQuerySelect = (query: string) => {
        setSearchQuery(query);
        setShowAIChat(true);
    };

    // Show AI chat when user starts typing
    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            setShowAIChat(true);
        } else {
            setShowAIChat(false);
        }
    }, [searchQuery]);

    // Handle search form submission
    const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        if (searchQuery.trim()) {
            setShowAIChat(true);
        }
    }, [searchQuery]);

    // Handle escape key and prevent body scroll
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);

    // Handle clicks outside modal
    useOnClickOutside(modalRef, onClose);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-lg flex items-start justify-center p-4 sm:p-6 lg:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-modal-title"
        >
            <motion.div
                ref={modalRef}
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="relative w-full max-w-5xl bg-white shadow-2xl rounded-lg p-6 sm:p-8 mt-16 max-h-[80vh] overflow-y-auto"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100 z-10"
                    aria-label="Close search"
                >
                    <X size={28} />
                </button>

                <div id="search-modal-title" className="sr-only">Search Tours</div>

                {/* AI-Powered Search Interface */}
                {!showAIChat ? (
                    <>
                        {/* Hero Section */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-4">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">
                                AI-Powered Tour Search
                            </h2>
                            <p className="text-slate-600 text-lg">
                                Ask me anything about Egypt tours in natural language
                            </p>
                        </div>

                        {/* Search Input */}
                        <form onSubmit={handleSearchSubmit} className="mb-8">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Ask me anything... e.g., 'Find romantic sunset cruises in Cairo'"
                                    autoFocus
                                    className="w-full text-lg pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                                />
                            </div>
                        </form>

                        {/* Example Query Cards */}
                        <div className="space-y-4">
                            <h3 className="text-slate-700 font-bold text-lg mb-4 flex items-center gap-2">
                                <span className="text-2xl">💡</span>
                                Try these example searches
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {exampleQueries.map((example, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => handleQuerySelect(example.query)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="group relative bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-xl p-5 text-left transition-all hover:border-red-500 hover:shadow-lg"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="text-4xl">{example.icon}</div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold text-slate-800 text-lg group-hover:text-red-600 transition-colors">
                                                        {example.title}
                                                    </h4>
                                                    <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-600 rounded-full">
                                                        {example.category}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 text-sm leading-relaxed">
                                                    {example.query}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-red-600 text-sm font-medium">Click to search →</span>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    // AI Chat Interface
                    <div>
                        <AlgoliaChat initialQuery={searchQuery} />
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default SearchModal;
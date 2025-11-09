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
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl flex items-start justify-center p-4 sm:p-6 lg:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-modal-title"
        >
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <motion.div
                ref={modalRef}
                initial={{ y: -50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="relative w-full max-w-5xl bg-white shadow-2xl rounded-3xl p-6 sm:p-10 mt-8 max-h-[85vh] overflow-y-auto"
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-3 rounded-full text-slate-400 hover:text-slate-600 bg-slate-100/80 hover:bg-slate-200 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 z-10 group"
                    aria-label="Close search"
                >
                    <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <div id="search-modal-title" className="sr-only">Search Tours</div>

                {/* AI-Powered Search Interface */}
                {!showAIChat ? (
                    <>
                        {/* Enhanced Hero Section with Animations */}
                        <div className="text-center mb-10">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="inline-flex items-center justify-center mb-5"
                            >
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                                    <div className="relative w-20 h-20 bg-gradient-to-br from-red-500 via-red-600 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                                        <Sparkles className="w-10 h-10 text-white animate-pulse" strokeWidth={2.5} />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-800 via-red-600 to-orange-600 bg-clip-text text-transparent mb-3"
                            >
                                AI-Powered Tour Search
                            </motion.h2>

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="text-slate-600 text-lg max-w-2xl mx-auto"
                            >
                                Discover your perfect Egypt adventure using natural language.
                                Just ask, and let AI find the best tours for you.
                            </motion.p>
                        </div>

                        {/* Enhanced Search Input with Glow Effect */}
                        <motion.form
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                            onSubmit={handleSearchSubmit}
                            className="mb-10"
                        >
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl opacity-0 group-focus-within:opacity-20 blur-lg transition duration-300"></div>
                                <div className="relative">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Ask me anything... e.g., 'Find romantic sunset cruises in Cairo under $150'"
                                        autoFocus
                                        className="w-full text-lg pl-16 pr-6 py-5 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-red-500 focus:bg-white focus:shadow-xl transition-all placeholder:text-slate-400"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5 text-slate-400" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.form>

                        {/* Enhanced Example Query Cards */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            className="space-y-5"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-slate-800 font-bold text-xl flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <span className="text-2xl">💡</span>
                                    </div>
                                    Popular Searches
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span>AI Ready</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {exampleQueries.map((example, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => handleQuerySelect(example.query)}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                                        whileHover={{ scale: 1.03, y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="group relative bg-gradient-to-br from-white via-white to-slate-50/50 border-2 border-slate-200/60 rounded-2xl p-6 text-left transition-all hover:border-red-400 hover:shadow-2xl overflow-hidden"
                                    >
                                        {/* Hover Gradient Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-red-50/0 via-red-50/0 to-orange-50/0 group-hover:from-red-50/50 group-hover:via-orange-50/30 group-hover:to-red-50/50 transition-all duration-500"></div>

                                        <div className="relative flex items-start gap-4">
                                            <div className="text-5xl transform group-hover:scale-110 transition-transform duration-300">
                                                {example.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-bold text-slate-800 text-lg group-hover:text-red-600 transition-colors">
                                                        {example.title}
                                                    </h4>
                                                    <span className="text-xs font-semibold px-2.5 py-1 bg-gradient-to-r from-red-100 to-orange-100 text-red-700 rounded-full whitespace-nowrap">
                                                        {example.category}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                                                    {example.query}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Animated Arrow */}
                                        <div className="relative mt-3 flex items-center justify-end">
                                            <span className="text-red-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 flex items-center gap-1">
                                                Ask AI
                                                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </span>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Additional Features Section */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.8 }}
                            className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-blue-900 text-sm mb-1">Natural Language</h4>
                                        <p className="text-blue-700 text-xs">Ask questions like you would to a friend</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Search className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-purple-900 text-sm mb-1">Smart Results</h4>
                                        <p className="text-purple-700 text-xs">AI-powered recommendations tailored to you</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-green-900 text-sm mb-1">Real-time Data</h4>
                                        <p className="text-green-700 text-xs">Live pricing and availability updates</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                ) : (
                    // AI Chat Interface with transition
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <AlgoliaChat initialQuery={searchQuery} />
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default SearchModal;
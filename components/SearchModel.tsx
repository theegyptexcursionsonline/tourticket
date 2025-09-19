'use client';

import React, { useState, useEffect, useRef, useCallback, FC } from 'react';
import { Search, X, Clock, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Tour } from '@/types';
import { useRecentSearches, usePopularSearches } from '@/hooks/useSearch';
import useOnClickOutside from '@/hooks/useOnClickOutside';

const TourResultSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
        <div className="w-full h-40 bg-slate-200"></div>
        <div className="p-4">
            <div className="h-5 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
            <div className="flex items-center">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            </div>
        </div>
    </div>
);

const TourResultCard: FC<{ tour: Tour }> = ({ tour }) => (
    <a 
        href={`/tour/${tour.slug}`} 
        className="group block bg-white rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-xl"
    >
        <div className="aspect-w-16 aspect-h-9 w-full h-40 overflow-hidden relative">
            <Image 
                src={tour.image || '/placeholder-image.png'} 
                alt={tour.title || 'Tour Image'}
                fill 
                sizes="(max-width: 768px) 50vw, 33vw" 
                className="object-cover transition-transform duration-300 group-hover:scale-110" 
            />
        </div>
        <div className="p-4">
            <h4 className="font-bold text-gray-900 group-hover:text-red-500 truncate text-lg mb-1">
                {tour.title || 'Untitled Tour'}
            </h4>
            <p className="text-sm text-gray-500 mb-2">
                {tour.destination?.name || 'Unknown Destination'}
            </p>
            {tour.rating ? (
                <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-400 mr-1" />
                    <span className="text-gray-800 font-bold">{tour.rating.toFixed(1)}</span>
                    {tour.reviews && (
                        <span className="text-gray-500 text-sm ml-2">
                            ({Array.isArray(tour.reviews) ? tour.reviews.length : 0} reviews)
                        </span>
                    )}
                </div>
            ) : (
                <div className="text-sm text-gray-500">No reviews yet</div>
            )}
            {tour.discountPrice && (
                <div className="mt-2">
                    <span className="text-lg font-bold text-red-600">
                        ${tour.discountPrice}
                    </span>
                </div>
            )}
        </div>
    </a>
);

const SearchSuggestion: FC<{ 
    term: string; 
    icon: React.ElementType; 
    onSelect: (term: string) => void; 
    onRemove?: (term: string) => void; 
}> = React.memo(({ term, icon: Icon, onSelect, onRemove }) => (
    <div className="group relative">
        <button 
            onClick={() => onSelect(term)} 
            className="flex items-center gap-3 pl-4 pr-5 py-2 bg-slate-100 text-slate-700 rounded-full transition-all hover:bg-slate-200 hover:shadow-md group-hover:pr-10"
        >
            <Icon className="h-5 w-5 text-slate-500 group-hover:text-red-500 transition-colors" />
            <span className="font-medium">{term}</span>
        </button>
        {onRemove && (
            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    onRemove(term); 
                }} 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-300" 
                aria-label={`Remove ${term}`}
            >
                <X size={14} />
            </button>
        )}
    </div>
));

SearchSuggestion.displayName = 'SearchSuggestion';

const SearchModal: FC<{ onClose: () => void; onSearch: (term: string) => void; }> = ({ onClose, onSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Tour[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const popularSearches = usePopularSearches();
    const { recentSearches, addSearchTerm, removeSearchTerm } = useRecentSearches();
    const modalRef = useRef<HTMLDivElement>(null);

    // Debounced search effect
    useEffect(() => {
        const fetchSearch = async () => {
            if (searchTerm.trim().length > 2) {
                setLoading(true);
                setError(null);
                
                try {
                    const res = await fetch(`/api/search/live?q=${encodeURIComponent(searchTerm.trim())}`);
                    const data = await res.json();
                    
                    if (data.success) {
                        setSearchResults(data.data || []);
                    } else {
                        setSearchResults([]);
                        setError(data.message || 'Search failed');
                    }
                } catch (err) {
                    console.error('Search error:', err);
                    setSearchResults([]);
                    setError('Failed to search. Please try again.');
                } finally {
                    setLoading(false);
                }
            } else {
                setSearchResults([]);
                setError(null);
            }
        };

        const debounceTimer = setTimeout(() => {
            fetchSearch();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    // Handle search form submission
    const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmedTerm = searchTerm.trim();
        
        if (trimmedTerm) {
            addSearchTerm(trimmedTerm);
            window.location.href = `/search?q=${encodeURIComponent(trimmedTerm)}`;
            onSearch(trimmedTerm);
            setSearchTerm('');
            onClose();
        }
    }, [searchTerm, onSearch, onClose, addSearchTerm]);

    // Handle popular search selection
    const handlePopularSearch = useCallback((term: string) => {
        addSearchTerm(term);
        window.location.href = `/search?q=${encodeURIComponent(term)}`;
        onSearch(term);
        onClose();
    }, [onSearch, onClose, addSearchTerm]);

    // Handle recent search selection
    const handleRecentSearch = useCallback((term: string) => {
        // Don't add to recent searches since it's already there
        window.location.href = `/search?q=${encodeURIComponent(term)}`;
        onSearch(term);
        onClose();
    }, [onSearch, onClose]);

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
                
                <form onSubmit={handleSearchSubmit} className="mb-8">
                    <div className="relative">
                        <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400" />
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            placeholder="What are you looking for?" 
                            autoFocus 
                            className="w-full text-xl sm:text-2xl pl-10 pr-6 py-4 bg-transparent border-b-2 border-slate-200 focus:outline-none focus:border-red-500 transition-colors" 
                        />
                    </div>
                </form>

                {/* Loading State */}
                {loading && (
                    <div className="mb-8">
                        <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">
                            Searching...
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <TourResultSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Search Results */}
                {!loading && !error && searchResults.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">
                            Tours ({searchResults.length} found)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {searchResults.map((tour) => (
                                <TourResultCard key={tour._id || tour.slug} tour={tour} />
                            ))}
                        </div>
                    </div>
                )}

                {/* No Results */}
                {!loading && !error && searchTerm.length > 2 && searchResults.length === 0 && (
                    <div className="text-center py-8 text-slate-500 mb-8">
                        <div className="mb-4">
                            <Search className="mx-auto h-16 w-16 text-slate-300" />
                        </div>
                        <p className="text-lg font-medium mb-2">No tours found for "{searchTerm}"</p>
                        <p className="text-sm">Try searching for destinations like "Dubai", "Cairo", or activities like "Museum", "Cruise"</p>
                    </div>
                )}

                {/* Suggestions */}
                <div className="space-y-8">
                    {/* Popular Searches */}
                    <div>
                        <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">
                            Most popular
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {popularSearches.map((item) => (
                                <SearchSuggestion 
                                    key={item} 
                                    term={item} 
                                    icon={Zap} 
                                    onSelect={handlePopularSearch} 
                                />
                            ))}
                        </div>
                    </div>

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                        <div>
                            <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">
                                Your recent searches
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {recentSearches.map((item) => (
                                    <SearchSuggestion 
                                        key={item} 
                                        term={item} 
                                        icon={Clock} 
                                        onSelect={handleRecentSearch} 
                                        onRemove={removeSearchTerm} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SearchModal;
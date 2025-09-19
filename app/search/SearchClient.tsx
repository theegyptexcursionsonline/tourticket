'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, Star, Clock, ChevronDown, X, ShoppingCart, Loader2, MapPin, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Tour, SearchFilters, Destination, Category, CartItem } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/contexts/WishlistContext';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 12;

// --- Tour Card Component ---
const TourCard = ({ tour }: { tour: Tour }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();

  const tourIsWishlisted = isWishlisted(tour._id!);

  const getTagColor = (tag: string) => {
    if (tag.includes('%')) return 'bg-red-600 text-white';
    if (tag === 'Staff favourite') return 'bg-blue-600 text-white';
    if (tag === 'Online only deal') return 'bg-emerald-600 text-white';
    if (tag === 'Best deal') return 'bg-purple-600 text-white';
    return 'bg-gray-200 text-gray-800';
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create proper CartItem from Tour
    const cartItem: CartItem = {
      ...tour,
      uniqueId: `${tour._id}-quick-add-${Date.now()}`,
      quantity: 1,
      childQuantity: 0,
      infantQuantity: 0,
      selectedDate: new Date().toISOString(),
      selectedTime: 'Anytime',
      selectedAddOns: {},
      totalPrice: tour.discountPrice,
    };

    addToCart(cartItem);
    toast.success('Added to cart!');
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (tourIsWishlisted) {
      removeFromWishlist(tour._id!);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist(tour);
      toast.success('Added to wishlist!');
    }
  };

  // Get destination name safely
  const destinationName = typeof tour.destination === 'object' ? tour.destination?.name : '';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col group">
      <div className="relative">
        <Link href={`/tour/${tour.slug}`}>
          <Image
            src={tour.image}
            alt={tour.title}
            width={400}
            height={250}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        
        {/* Tags */}
        {tour.tags && tour.tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {tour.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className={`text-xs font-bold px-2 py-1 rounded ${getTagColor(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={handleWishlistToggle}
            className={`p-2 rounded-full transition-all duration-200 ${
              tourIsWishlisted
                ? 'bg-red-600 text-white'
                : 'bg-white/90 text-slate-600 hover:bg-white hover:text-red-600'
            }`}
            aria-label={tourIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={16} fill={tourIsWishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full hover:bg-white transition-all duration-200 hover:scale-110"
          aria-label="Add to cart"
        >
          <ShoppingCart size={16} className="text-red-600" />
        </button>
      </div>
      
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2 flex-grow">
          <Link href={`/tour/${tour.slug}`} className="hover:text-red-600 transition-colors">
            {tour.title}
          </Link>
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{tour.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-500 fill-current" />
            <span>{tour.rating}</span>
          </div>
          {destinationName && (
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span className="truncate">{destinationName}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-auto pt-2">
          <div>
            {tour.originalPrice && (
              <span className="text-slate-500 line-through text-sm mr-2">
                {formatPrice(tour.originalPrice)}
              </span>
            )}
            <span className="text-xl font-bold text-red-600">
              {formatPrice(tour.discountPrice)}
            </span>
          </div>
          <Link 
            href={`/tour/${tour.slug}`} 
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

// --- Main Search Client Component ---
export default function SearchClient() {
  const searchParams = useSearchParams();
  const { formatPrice } = useSettings();
  
  const [filteredResults, setFilteredResults] = useState<Tour[]>([]);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [error, setError] = useState<string | null>(null);

  // Initialize search query from URL params
  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
    
    // Set initial filters from URL params
    const destination = searchParams.get('destination');
    const category = searchParams.get('category');
    
    if (destination || category) {
      setFilters({
        ...(destination && { destination }),
        ...(category && { category })
      });
    }
  }, [searchParams]);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/search/filters');
        const data = await response.json();
        
        if (data.success) {
          setAllDestinations(data.destinations);
          setAllCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        
        if (searchQuery) params.append('q', searchQuery);
        if (filters.destination) params.append('destination', filters.destination);
        if (filters.category) params.append('category', filters.category);
        if (filters.priceRange) params.append('priceMin', filters.priceRange[0].toString());
        if (filters.priceRange) params.append('priceMax', filters.priceRange[1].toString());
        if (filters.rating) params.append('rating', filters.rating.toString());
        
        params.append('page', currentPage.toString());
        params.append('limit', ITEMS_PER_PAGE.toString());

        const response = await fetch(`/api/search/tours?${params}`);
        const data = await response.json();
        
        if (data.success) {
          setFilteredResults(data.tours);
          setTotalResults(data.total);
        } else {
          setError(data.error || 'Failed to search tours');
        }
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to search tours. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchQuery, filters, currentPage]);

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    
    // Update URL
    const url = new URL(window.location.href);
    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    } else {
      url.searchParams.delete('q');
    }
    window.history.pushState({}, '', url.toString());
  };

  const clearFilter = (filterKey: keyof SearchFilters) => {
    setFilters(prev => ({ ...prev, [filterKey]: undefined }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
    
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.searchParams.delete('destination');
    url.searchParams.delete('category');
    window.history.pushState({}, '', url.toString());
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-slate-700 mb-2">Search Error</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Search Bar and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tours, destinations, activities..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
          </div>
          <button 
            type="submit" 
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Search
          </button>
          <button 
            type="button" 
            onClick={() => setShowFilters(!showFilters)} 
            className={`flex items-center gap-2 border px-4 py-3 rounded-lg transition-colors font-medium ${
              showFilters 
                ? 'border-red-200 bg-red-50 text-red-700' 
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Filter size={20} />
            Filters
            <ChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} size={16} />
          </button>
        </form>
        
        {/* Active Filters */}
        {Object.values(filters).some(Boolean) && (
          <div className="flex flex-wrap gap-2 mt-4 items-center">
            {filters.destination && (
              <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                <span>{allDestinations.find(d => d._id === filters.destination)?.name}</span>
                <button onClick={() => clearFilter('destination')} className="hover:bg-red-200 rounded-full p-0.5">
                  <X size={14} />
                </button>
              </div>
            )}
            {filters.category && (
              <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                <span>{allCategories.find(c => c._id === filters.category)?.name}</span>
                <button onClick={() => clearFilter('category')} className="hover:bg-blue-200 rounded-full p-0.5">
                  <X size={14} />
                </button>
              </div>
            )}
            {filters.priceRange && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <span>{formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}</span>
                <button onClick={() => clearFilter('priceRange')} className="hover:bg-green-200 rounded-full p-0.5">
                  <X size={14} />
                </button>
              </div>
            )}
            {filters.rating && (
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                <span>{filters.rating}+ stars</span>
                <button onClick={() => clearFilter('rating')} className="hover:bg-yellow-200 rounded-full p-0.5">
                  <X size={14} />
                </button>
              </div>
            )}
            <button 
              onClick={clearAllFilters} 
              className="text-red-600 hover:text-red-700 text-sm font-medium underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="border-t pt-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Destination
                </label>
                <select 
                  value={filters.destination || ''} 
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, destination: e.target.value || undefined }));
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All Destinations</option>
                  {allDestinations.map(dest => (
                    <option key={dest._id} value={dest._id}>{dest.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <select 
                  value={filters.category || ''} 
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, category: e.target.value || undefined }));
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All Categories</option>
                  {allCategories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price Range
                </label>
                <select 
                  value={filters.priceRange ? `${filters.priceRange[0]}-${filters.priceRange[1]}` : ''} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [min, max] = value.split('-').map(Number);
                      setFilters(prev => ({ ...prev, priceRange: [min, max] }));
                    } else {
                      setFilters(prev => ({ ...prev, priceRange: undefined }));
                    }
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Any Price</option>
                  <option value="0-25">€0 - €25</option>
                  <option value="25-50">€25 - €50</option>
                  <option value="50-100">€50 - €100</option>
                  <option value="100-500">€100 - €500</option>
                  <option value="500-9999">€500+</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Minimum Rating
                </label>
                <select 
                  value={filters.rating || ''} 
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, rating: e.target.value ? Number(e.target.value) : undefined }));
                    setCurrentPage(1);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Any Rating</option>
                  <option value="3">3+ stars</option>
                  <option value="4">4+ stars</option>
                  <option value="4.5">4.5+ stars</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {searchQuery ? `Search results for "${searchQuery}"` : 'All Tours'}
          </h2>
          <p className="text-slate-600">
            {totalResults} tour{totalResults !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md h-[380px] animate-pulse">
              <div className="w-full h-48 bg-slate-200 rounded-t-lg"></div>
              <div className="p-4 space-y-3">
                <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                <div className="h-4 w-full bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {filteredResults.map(tour => (
                <TourCard key={tour._id} tour={tour} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No tours found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery 
                  ? `No results for "${searchQuery}". Try adjusting your search or filters.`
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={clearAllFilters} 
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                disabled={currentPage === 1} 
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                const isCurrent = currentPage === pageNum;
                const showPage = (pageNum === 1) || (pageNum === totalPages) || 
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                
                if (!showPage) {
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={i} className="px-2 text-slate-400">...</span>;
                  }
                  return null;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isCurrent 
                        ? 'bg-red-600 text-white' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                disabled={currentPage === totalPages} 
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
// app/search/SearchClient.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, Star, Clock, ChevronDown, X, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { tours, searchTours } from '@/lib/data/tours';
import { destinations } from '@/lib/data/destinations';
import { categories } from '@/lib/categories';
import { Tour, SearchFilters } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';

const ITEMS_PER_PAGE = 12;

const TourCard = ({ tour }: { tour: Tour }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();

  const getTagColor = (tag: string) => {
    if (tag.includes('%')) return 'bg-red-600 text-white';
    if (tag === 'Staff favourite') return 'bg-blue-600 text-white';
    if (tag === 'Online only deal') return 'bg-emerald-600 text-white';
    if (tag === 'New') return 'bg-purple-600 text-white';
    if (tag === 'Best for Kids') return 'bg-yellow-500 text-black';
    return 'bg-gray-200 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <Image
          src={tour.image}
          alt={tour.title}
          width={400}
          height={250}
          className="w-full h-48 object-cover"
        />
        {tour.tags && tour.tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {tour.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className={`text-xs font-bold px-2 py-1 rounded ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            addToCart(tour);
          }}
          className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full hover:bg-white transition-colors hover:scale-110"
        >
          <ShoppingCart size={16} className="text-red-600" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{tour.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-500 fill-current" />
            <span>{tour.rating}</span>
          </div>
          {tour.bookings && (
            <div className="flex items-center gap-1">
              <span>{tour.bookings.toLocaleString()} booked</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
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
          <a
            href={`/tour/${tour.slug}`}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            View Details
          </a>
        </div>
      </div>
    </div>
  );
};

export default function SearchClient() {
  const searchParams = useSearchParams();
  const [searchResults, setSearchResults] = useState<Tour[]>([]);
  const [filteredResults, setFilteredResults] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);
    if (query) {
      performSearch(query);
    } else {
      setSearchResults(tours);
      setFilteredResults(tours);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const performSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const results = query ? searchTours(query) : tours;
      setSearchResults(results);
      setFilteredResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...searchResults];

    if (filters.destination) {
      filtered = filtered.filter(tour => tour.destinationId === filters.destination);
    }

    if (filters.category) {
      filtered = filtered.filter(tour => tour.categoryIds.includes(filters.category!));
    }

    if (filters.priceRange) {
      filtered = filtered.filter(tour =>
        tour.discountPrice >= filters.priceRange![0] &&
        tour.discountPrice <= filters.priceRange![1]
      );
    }

    if (filters.rating) {
      filtered = filtered.filter(tour => (tour.rating || 0) >= filters.rating!);
    }

    setFilteredResults(filtered);
    setCurrentPage(1);
  }, [searchResults, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set('q', searchQuery);
    window.history.pushState({}, '', url);
    performSearch(searchQuery);
  };

  const clearFilter = (filterKey: keyof SearchFilters) => {
    setFilters(prev => ({ ...prev, [filterKey]: undefined }));
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  return (
    <>
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tours, destinations, activities..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            type="submit"
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 border border-slate-200 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Filter size={20} />
            Filters
            <ChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} size={16} />
          </button>
        </form>

        {/* Active Filters */}
        {Object.values(filters).some(filter => filter !== undefined) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {filters.destination && (
              <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                <span>{destinations.find(d => d.id === filters.destination)?.name}</span>
                <button onClick={() => clearFilter('destination')}>
                  <X size={14} />
                </button>
              </div>
            )}
            {filters.category && (
              <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <span>{categories.find(c => c.id === filters.category)?.name}</span>
                <button onClick={() => clearFilter('category')}>
                  <X size={14} />
                </button>
              </div>
            )}
            {filters.priceRange && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <span>€{filters.priceRange[0]} - €{filters.priceRange[1]}</span>
                <button onClick={() => clearFilter('priceRange')}>
                  <X size={14} />
                </button>
              </div>
            )}
            {filters.rating && (
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                <span>{filters.rating}+ stars</span>
                <button onClick={() => clearFilter('rating')}>
                  <X size={14} />
                </button>
              </div>
            )}
            <button
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t pt-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Destination Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
                <select
                  value={filters.destination || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, destination: e.target.value || undefined }))}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Destinations</option>
                  {destinations.map(dest => (
                    <option key={dest.id} value={dest.id}>{dest.name}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Price Range</label>
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
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Any Price</option>
                  <option value="0-25">€0 - €25</option>
                  <option value="25-50">€25 - €50</option>
                  <option value="50-100">€50 - €100</option>
                  <option value="100-999">€100+</option>
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Rating</label>
                <select
                  value={filters.rating || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ stars</option>
                  <option value="4.5">4.5+ stars</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            {searchQuery ? `Search results for "${searchQuery}"` : 'All Tours'}
          </h1>
          <p className="text-slate-600">
            {filteredResults.length} tour{filteredResults.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && (
        <>
          {paginatedResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {paginatedResults.map(tour => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No tours found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery
                  ? `No results found for "${searchQuery}". Try adjusting your search or filters.`
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
                <a
                  href="/destinations/amsterdam"
                  className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Browse Amsterdam
                </a>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                const isCurrentPage = currentPage === pageNum;
                const showPage = pageNum === 1 || pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                if (!showPage) {
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={i} className="px-2">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg ${
                      isCurrentPage
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

// app/search/SearchClient.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, Star, Clock, ChevronDown, X, ShoppingCart, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Tour, SearchFilters, Destination, Category } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';

const ITEMS_PER_PAGE = 12;

// --- Tour Card Component ---
const TourCard = ({ tour }: { tour: Tour }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();

  const getTagColor = (tag: string) => {
    if (tag.includes('%')) return 'bg-red-600 text-white';
    if (tag === 'Staff favourite') return 'bg-blue-600 text-white';
    if (tag === 'Online only deal') return 'bg-emerald-600 text-white';
    return 'bg-gray-200 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      <div className="relative">
        <Link href={`/tour/${tour.slug}`}>
          <Image
            src={tour.image}
            alt={tour.title}
            width={400}
            height={250}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
          />
        </Link>
        {tour.tags && tour.tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {tour.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className={`text-xs font-bold px-2 py-1 rounded ${getTagColor(tag)}`}>
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
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
          <div className="flex items-center gap-1"><Clock size={14} /><span>{tour.duration}</span></div>
          <div className="flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-current" /><span>{tour.rating}</span></div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div>
            {tour.originalPrice && (
              <span className="text-slate-500 line-through text-sm mr-2">{formatPrice(tour.originalPrice)}</span>
            )}
            <span className="text-xl font-bold text-red-600">{formatPrice(tour.discountPrice)}</span>
          </div>
          <Link href={`/tour/${tour.slug}`} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
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
  
  // State for all data
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // State for UI and filtering
  const [filteredResults, setFilteredResults] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  // Fetch all necessary data on initial load
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [toursRes, destRes, catRes] = await Promise.all([
          fetch('/api/admin/tours'),
          fetch('/api/admin/tours/destinations'),
          fetch('/api/categories'),
        ]);

        const toursData = await toursRes.json();
        const destData = await destRes.json();
        const catData = await catRes.json();

        if (toursData.success) setAllTours(toursData.data);
        if (destData.success) setAllDestinations(destData.data);
        if (catData.success) setAllCategories(catData.data);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);
  
  // Effect to apply search and filters whenever data or filters change
  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearchQuery(query);

    let results = [...allTours];

    // 1. Apply search query first
    if (query) {
      results = results.filter(tour =>
        tour.title.toLowerCase().includes(query.toLowerCase()) ||
        tour.description.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // 2. Apply filters
    if (filters.destination) {
      results = results.filter(tour => tour.destination?._id === filters.destination);
    }
    if (filters.category) {
      results = results.filter(tour => tour.categories?.some(cat => cat._id === filters.category));
    }
    if (filters.priceRange) {
      results = results.filter(tour =>
        tour.discountPrice >= filters.priceRange![0] &&
        tour.discountPrice <= filters.priceRange![1]
      );
    }
    if (filters.rating) {
      results = results.filter(tour => (tour.rating || 0) >= filters.rating!);
    }
    
    setFilteredResults(results);
    setCurrentPage(1); // Reset to first page on new filter/search
  }, [searchParams, allTours, filters]);


  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set('q', searchQuery);
    window.history.pushState({}, '', url.toString());
    // The useEffect hook will re-run and apply the search
  };

  const clearFilter = (filterKey: keyof SearchFilters) => {
    setFilters(prev => ({ ...prev, [filterKey]: undefined }));
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery('');
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    window.history.pushState({}, '', url.toString());
  };

  return (
    <>
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
          <button type="submit" className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">Search</button>
          <button type="button" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 border border-slate-200 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter size={20} />Filters<ChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} size={16} />
          </button>
        </form>
        
        {Object.values(filters).some(Boolean) && (
          <div className="flex flex-wrap gap-2 mt-4 items-center">
            {filters.destination && (<div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm"><span>{allDestinations.find(d => d._id === filters.destination)?.name}</span><button onClick={() => clearFilter('destination')}><X size={14} /></button></div>)}
            {filters.category && (<div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"><span>{allCategories.find(c => c._id === filters.category)?.name}</span><button onClick={() => clearFilter('category')}><X size={14} /></button></div>)}
            {filters.priceRange && (<div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"><span>€{filters.priceRange[0]} - €{filters.priceRange[1]}</span><button onClick={() => clearFilter('priceRange')}><X size={14} /></button></div>)}
            {filters.rating && (<div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm"><span>{filters.rating}+ stars</span><button onClick={() => clearFilter('rating')}><X size={14} /></button></div>)}
            <button onClick={clearAllFilters} className="text-red-600 hover:text-red-700 text-sm font-medium">Clear all filters</button>
          </div>
        )}

        {showFilters && (
          <div className="border-t pt-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Destination</label><select value={filters.destination || ''} onChange={(e) => setFilters(prev => ({ ...prev, destination: e.target.value || undefined }))} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"><option value="">All Destinations</option>{allDestinations.map(dest => (<option key={dest._id} value={dest._id}>{dest.name}</option>))}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Category</label><select value={filters.category || ''} onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"><option value="">All Categories</option>{allCategories.map(cat => (<option key={cat._id} value={cat._id}>{cat.name}</option>))}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Price Range</label><select value={filters.priceRange ? `${filters.priceRange[0]}-${filters.priceRange[1]}` : ''} onChange={(e) => { const v = e.target.value; v ? setFilters(p => ({ ...p, priceRange: v.split('-').map(Number) as [number, number] })) : setFilters(p => ({ ...p, priceRange: undefined })); }} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"><option value="">Any Price</option><option value="0-25">€0 - €25</option><option value="25-50">€25 - €50</option><option value="50-100">€50 - €100</option><option value="100-9999">€100+</option></select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Minimum Rating</label><select value={filters.rating || ''} onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value ? Number(e.target.value) : undefined }))} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"><option value="">Any Rating</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option></select></div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-slate-900">{searchQuery ? `Search results for "${searchQuery}"` : 'All Tours'}</h1><p className="text-slate-600">{filteredResults.length} tour{filteredResults.length !== 1 ? 's' : ''} found</p></div></div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8 animate-pulse">
            {[...Array(8)].map((_, i) => (<div key={i} className="bg-white rounded-lg shadow-md h-[380px]"><div className="w-full h-48 bg-slate-200"></div><div className="p-4"><div className="h-6 w-3/4 bg-slate-200 rounded mb-4"></div><div className="h-4 w-1/2 bg-slate-200 rounded"></div></div></div>))}
        </div>
      ) : (
        <>
          {paginatedResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {paginatedResults.map(tour => (<TourCard key={tour._id} tour={tour} />))}
            </div>
          ) : (
            <div className="text-center py-12"><div className="text-6xl mb-4">🔍</div><h3 className="text-xl font-semibold text-slate-700 mb-2">No tours found</h3><p className="text-slate-500 mb-4">{searchQuery ? `No results for "${searchQuery}". Try adjusting your search or filters.` : 'Try adjusting your filters to see more results.'}</p><div className="flex gap-4 justify-center"><button onClick={clearAllFilters} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">Clear Filters</button></div></div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-white border text-slate-700 hover:bg-slate-50 disabled:opacity-50">Previous</button>
                {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    const isCurrent = currentPage === pageNum;
                    const showPage = (pageNum === 1) || (pageNum === totalPages) || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                    if (!showPage) {
                        if (pageNum === currentPage - 2 || pageNum === currentPage + 2) return <span key={i} className="px-2">...</span>;
                        return null;
                    }
                    return (<button key={i} onClick={() => setCurrentPage(pageNum)} className={`px-4 py-2 rounded-lg ${isCurrent ? 'bg-red-600 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'}`}>{pageNum}</button>);
                })}
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-lg bg-white border text-slate-700 hover:bg-slate-50 disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
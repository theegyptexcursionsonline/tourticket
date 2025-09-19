// app/search/SearchClient.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tour as TourType, Category, Destination } from '@/types';
import TourCard from '@/components/user/TourCard';
import { Star, Clock, ListFilter, Search as SearchIcon, X, SlidersHorizontal, Loader2 } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface SearchClientProps {
  initialTours: TourType[];
  categories: Category[];
  destinations: Destination[];
}

const durationOptions = [
    { label: 'Up to 2 hours', value: '0-2' },
    { label: '2 to 4 hours', value: '2-4' },
    { label: '4 to 6 hours', value: '4-6' },
    { label: '6+ hours', value: '6-24' },
];

const ratingOptions = [
    { value: 5, label: '5 Stars' },
    { value: 4, label: '4 Stars & up' },
    { value: 3, label: '3 Stars & up' },
];


const SearchClient: React.FC<SearchClientProps> = ({ initialTours, categories, destinations }) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // States for filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
    const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
    const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
    const [sortBy, setSortBy] = useState('relevance');

    // States for component logic
    const [tours, setTours] = useState<TourType[]>(initialTours);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

    // Debounce search input to reduce API calls
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Set initial filters from URL on component mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setSearchQuery(params.get('q') || '');
        setSelectedCategories(params.get('categories')?.split(',') || []);
        setSelectedDestinations(params.get('destinations')?.split(',') || []);
        const minPrice = params.get('minPrice');
        const maxPrice = params.get('maxPrice');
        if (minPrice && maxPrice) {
            setPriceRange([Number(minPrice), Number(maxPrice)]);
        }
        setSelectedDurations(params.get('durations')?.split(',') || []);
        const ratings = params.get('ratings')?.split(',').map(Number).filter(Boolean);
        setSelectedRatings(ratings || []);
        setSortBy(params.get('sortBy') || 'relevance');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Main effect to fetch tours when any filter changes
    useEffect(() => {
        const fetchTours = async () => {
            setIsLoading(true);
            const params = new URLSearchParams();

            if (debouncedQuery) params.set('q', debouncedQuery);
            if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
            if (selectedDestinations.length > 0) params.set('destinations', selectedDestinations.join(','));
            if (priceRange[0] > 0 || priceRange[1] < 500) {
                 params.set('minPrice', String(priceRange[0]));
                 params.set('maxPrice', String(priceRange[1]));
            }
            if (selectedDurations.length > 0) params.set('durations', selectedDurations.join(','));
            if (selectedRatings.length > 0) params.set('ratings', selectedRatings.join(','));
            if (sortBy) params.set('sortBy', sortBy);

            // Update URL immediately for better UX
            const newUrl = `${pathname}?${params.toString()}`;
            router.replace(newUrl, { scroll: false });

            try {
                const response = await fetch(`/api/search/tours?${params.toString()}`);
                if (!response.ok) throw new Error('Failed to fetch tours');
                const data = await response.json();
                setTours(data);
            } catch (error) {
                console.error(error);
                setTours([]); // Clear tours on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchTours();
    }, [
        debouncedQuery,
        selectedCategories,
        selectedDestinations,
        priceRange,
        selectedDurations,
        selectedRatings,
        sortBy,
        pathname,
        router
    ]);

    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any[]>>, value: any) => {
        setter((prev: any[]) =>
            prev.includes(value)
                ? prev.filter((item: any) => item !== value)
                : [...prev, value]
        );
    };
    
    const clearAllFilters = useCallback(() => {
        setSearchQuery('');
        setSelectedCategories([]);
        setSelectedDestinations([]);
        setPriceRange([0, 500]);
        setSelectedDurations([]);
        setSelectedRatings([]);
        setSortBy('relevance');
        router.replace(pathname, { scroll: false });
    }, [pathname, router]);

    const FilterSidebar = () => (
        <aside className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Filters</h2>
                <button onClick={clearAllFilters} className="text-sm text-red-600 hover:underline">Clear all</button>
            </div>
            <div className="space-y-6">
                {/* Categories */}
                <div>
                    <h3 className="font-semibold mb-2">Categories</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {categories.map(category => (
                            <label key={category._id} className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={selectedCategories.includes(category._id)} onChange={() => handleFilterChange(setSelectedCategories, category._id)} className="rounded text-red-600 focus:ring-red-500" />
                                <span className="text-sm text-slate-600">{category.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                 {/* Destinations */}
                 <div>
                    <h3 className="font-semibold mb-2">Destinations</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {destinations.map(dest => (
                            <label key={dest._id} className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={selectedDestinations.includes(dest._id)} onChange={() => handleFilterChange(setSelectedDestinations, dest._id)} className="rounded text-red-600 focus:ring-red-500" />
                                <span className="text-sm text-slate-600">{dest.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                 {/* Price Range */}
                 <div>
                    <h3 className="font-semibold mb-2">Price Range</h3>
                    <input type="range" min="0" max="500" value={priceRange[1]} onChange={e => setPriceRange([0, Number(e.target.value)])} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                    <div className="flex justify-between text-sm text-slate-500 mt-1">
                        <span>$0</span>
                        <span>${priceRange[1]}</span>
                    </div>
                </div>
                {/* Duration */}
                <div>
                    <h3 className="font-semibold mb-2">Duration</h3>
                    <div className="space-y-2">
                        {durationOptions.map(opt => (
                            <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={selectedDurations.includes(opt.value)} onChange={() => handleFilterChange(setSelectedDurations, opt.value)} className="rounded text-red-600 focus:ring-red-500" />
                                <span className="text-sm text-slate-600">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {/* Rating */}
                <div>
                    <h3 className="font-semibold mb-2">Rating</h3>
                    <div className="space-y-2">
                         {ratingOptions.map(opt => (
                            <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={selectedRatings.includes(opt.value)} onChange={() => handleFilterChange(setSelectedRatings, opt.value)} className="rounded text-red-600 focus:ring-red-500" />
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < opt.value ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} />)}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
    
    const TourGrid = () => {
        if (isLoading) {
            return (
                <div className="md:col-span-2 xl:col-span-3 flex flex-col justify-center items-center text-center py-24">
                    <Loader2 className="h-12 w-12 animate-spin text-red-600" />
                    <p className="mt-4 text-slate-500">Finding adventures...</p>
                </div>
            );
        }

        if (tours.length === 0) {
            return (
                <div className="md:col-span-2 xl:col-span-3 text-center py-24 flex flex-col items-center">
                    <h3 className="text-2xl font-bold text-slate-800">No tours found</h3>
                    <p className="text-slate-500 mt-2 max-w-sm">We couldn't find any tours matching your criteria. Try adjusting or clearing your filters.</p>
                    <button onClick={clearAllFilters} className="mt-6 px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-sm transition-colors">
                        Clear Filters
                    </button>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {tours.map(tour => <TourCard key={tour._id} tour={tour} />)}
            </div>
        );
    };

    return (
        <>
            <Header />
            <div className="bg-slate-50 border-b border-slate-200">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-4xl font-extrabold text-slate-900">Find Your Next Adventure</h1>
                    <div className="relative mt-4 max-w-2xl">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by tour name, e.g., 'Eiffel Tower'"
                            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm"
                        />
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:hidden mb-4">
                         <button onClick={() => setMobileFiltersOpen(!isMobileFiltersOpen)} className="flex items-center justify-center w-full px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm">
                            <SlidersHorizontal className="w-5 h-5 mr-2 text-slate-600" />
                             <span>{isMobileFiltersOpen ? 'Hide' : 'Show'} Filters</span>
                        </button>
                        {isMobileFiltersOpen && <FilterSidebar />}
                    </div>
                    <div className="hidden lg:block">
                        <FilterSidebar />
                    </div>

                    <div className="lg:col-span-3">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-4 border-b border-slate-200">
                            <p className="text-sm text-slate-600 mb-2 sm:mb-0">
                                {isLoading ? 'Searching...' : `Showing ${tours.length} result(s)`}
                            </p>
                            <div className="flex items-center gap-2">
                                <label htmlFor="sort" className="text-sm font-medium text-slate-700">Sort by:</label>
                                <select id="sort" value={sortBy} onChange={e => setSortBy(e.target.value)} className="border-slate-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm">
                                    <option value="relevance">Relevance</option>
                                    <option value="rating">Rating</option>
                                    <option value="price-asc">Price: Low to High</option>
                                    <option value="price-desc">Price: High to Low</option>
                                </select>
                            </div>
                        </div>
                        
                        <TourGrid />
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
};

export default SearchClient;
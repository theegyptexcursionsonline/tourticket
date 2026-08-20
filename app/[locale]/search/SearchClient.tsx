'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Tour as TourType, Category, Destination } from '@/types';
import TourCard from '@/components/user/TourCard';
import { Star, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

interface SearchClientProps {
  initialTours: TourType[];
  categories: Category[];
  destinations: Destination[];
}

const normalizeArrayParam = (val: string | null | undefined) => {
  if (!val) return [];
  return val
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const parseNumberArray = (val: string | null | undefined) => {
  if (!val) return [];
  return val
    .split(',')
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n));
};

// Skeleton Loader Component
const TourCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="w-full h-48 bg-slate-200"></div>
    <div className="p-4">
      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-8 bg-slate-200 rounded-full w-1/4"></div>
      </div>
    </div>
  </div>
);

const SearchClient: React.FC<SearchClientProps> = ({ initialTours = [], categories = [], destinations = [] }) => {
  const t = useTranslations('searchPage');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const durationOptions = [
    { label: t('duration.upTo2Hours'), value: '0-2' },
    { label: t('duration.from2To4Hours'), value: '2-4' },
    { label: t('duration.from4To6Hours'), value: '4-6' },
    { label: t('duration.moreThan6Hours'), value: '6-24' },
  ];
  const ratingOptions = [
    { value: 5, label: t('ratings.fiveStars') },
    { value: 4, label: t('ratings.fourStarsAndUp') },
    { value: 3, label: t('ratings.threeStarsAndUp') },
  ];

  // Filters & UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState('relevance');

  // component logic state
  const [tours, setTours] = useState<TourType[]>(initialTours || []);
  const [isLoading, setIsLoading] = useState(true); // Always start with loading true
  // "The search failed" and "this catalogue has nothing to show" are different
  // answers. Collapsing them is how a 500 from the duration filter looked, for
  // as long as it existed, like a catalogue with no matching tours.
  const [loadFailed, setLoadFailed] = useState(false);
  // Bumped by the retry control so the fetch effect runs again.
  const [retryToken, setRetryToken] = useState(0);
  const [isMobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const isFirstMount = useRef(true);

  // The URL is read through a string, never through the object next/navigation
  // hands back. That object is a new instance on every navigation, and this
  // page rewrites its own URL — depending on the object made the two effects
  // below trigger each other without end.
  const searchParamsKey = searchParams?.toString() ?? '';
  const searchParamsKeyRef = useRef(searchParamsKey);
  // The router is reached through a ref too. Nothing about navigation belongs
  // in the dependency list of an effect that navigates.
  const routerRef = useRef(router);
  useEffect(() => {
    searchParamsKeyRef.current = searchParamsKey;
    routerRef.current = router;
  }, [router, searchParamsKey]);

  // parse initial filters from URL on mount
  useEffect(() => {
    const q = searchParams?.get('q') ?? '';
    const cats = normalizeArrayParam(searchParams?.get('categories'));
    const dests = normalizeArrayParam(searchParams?.get('destinations'));
    const minPrice = searchParams?.get('minPrice');
    const maxPrice = searchParams?.get('maxPrice');
    const durations = normalizeArrayParam(searchParams?.get('durations'));
    const ratings = parseNumberArray(searchParams?.get('ratings'));
    const sort = searchParams?.get('sortBy') ?? 'relevance';

    // normalizeArrayParam builds a fresh array each call, so setting state
    // unconditionally would hand the fetch effect new dependency identities for
    // filters that never changed. Only replace a value when its content moved.
    const sameList = (a: readonly (string | number)[], b: readonly (string | number)[]) =>
      a.length === b.length && a.every((item, index) => item === b[index]);

    setSearchQuery((previous) => (previous === q ? previous : q));
    setSelectedCategories((previous) => (sameList(previous, cats) ? previous : cats));
    setSelectedDestinations((previous) => (sameList(previous, dests) ? previous : dests));
    if (minPrice && maxPrice) {
      const min = Number(minPrice);
      const max = Number(maxPrice);
      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        setPriceRange((previous) => (previous[0] === min && previous[1] === max ? previous : [min, max]));
      }
    }
    setSelectedDurations((previous) => (sameList(previous, durations) ? previous : durations));
    setSelectedRatings((previous) => (sameList(previous, ratings) ? previous : ratings));
    setSortBy((previous) => (previous === sort ? previous : sort));
  }, [searchParamsKey]);

  // Debounce input for text search
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
  };
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, value: T) => {
    setter((previous) => previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]);
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

  // Serialised filter state. The fetch effect keys off these strings rather
  // than the arrays themselves, so a re-render that rebuilds an equal array
  // cannot start another request.
  const categoriesKey = selectedCategories.join(',');
  const destinationsKey = selectedDestinations.join(',');
  const durationsKey = selectedDurations.join(',');
  const ratingsKey = selectedRatings.join(',');
  const priceKey = `${priceRange[0]}-${priceRange[1]}`;

  // Fetch tours whenever filters change
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchTours = async () => {
      // On first mount with no params, fetch ALL published tours
      if (isFirstMount.current && searchParams.toString() === '') {
          setIsLoading(true);
          isFirstMount.current = false;
          try {
            const res = await fetch('/api/search/tours', { signal: controller.signal });
            if (!res.ok) throw new Error(`Failed to fetch tours (${res.status})`);
            const data = await res.json();
            setTours(Array.isArray(data) ? data : []);
            setLoadFailed(false);
          } catch (error: unknown) {
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
              console.error('Initial tours fetch error:', error);
              setLoadFailed(true);
            }
          } finally {
            setIsLoading(false);
          }
          return;
      }
      
      setIsLoading(true);

      const params = new URLSearchParams();

      const [minPrice, maxPrice] = priceKey.split('-').map(Number);
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (categoriesKey) params.set('categories', categoriesKey);
      if (destinationsKey) params.set('destinations', destinationsKey);
      if (minPrice > 0 || maxPrice < 500) {
        params.set('minPrice', String(minPrice));
        params.set('maxPrice', String(maxPrice));
      }
      if (durationsKey) params.set('durations', durationsKey);
      if (ratingsKey) params.set('ratings', ratingsKey);
      params.set('sortBy', sortBy);

      const newQuery = params.toString();
      // Only rewrite the URL when it would actually change. Replacing it with
      // an identical value still produces a fresh navigation, which is how this
      // effect used to re-enter itself and abort its own request every pass.
      if (newQuery !== searchParamsKeyRef.current) {
        routerRef.current.replace(`${pathname}?${newQuery}`, { scroll: false });
      }

      try {
        // Use MongoDB search directly for better performance and complete results
        // This shows ALL published tours (not limited by Algolia's caps)
        const res = await fetch(`/api/search/tours?${newQuery}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to fetch tours (${res.status})`);
        const data = await res.json();
        setTours(Array.isArray(data) ? data : []);
        setLoadFailed(false);
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Search fetch error:', error);
          setLoadFailed(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTours();

    return () => {
      controller.abort();
    };
    // `searchParamsKey` is deliberately absent: this effect writes the URL, so
    // depending on it would make every write schedule another run.
  }, [
    debouncedQuery,
    categoriesKey,
    destinationsKey,
    priceKey,
    durationsKey,
    ratingsKey,
    sortBy,
    pathname,
    retryToken,
  ]);

  // --- Render ---
  return (
    <>
      <Header startSolid />
      <div className="h-16 md:h-20 lg:h-20" aria-hidden="true" />

      {/* Hero / Search Section */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
            {t('title')}
          </h1>

          {/* Search Input */}
          <div className="relative max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm"
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div className="lg:hidden mb-4">
              <button onClick={() => setMobileFiltersOpen(!isMobileFiltersOpen)} className="flex items-center justify-center w-full px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm">
                <SlidersHorizontal className="w-5 h-5 mr-2 text-slate-600" />
                <span>{isMobileFiltersOpen ? t('hideFilters') : t('showFilters')}</span>
              </button>
              {isMobileFiltersOpen && <div className="mt-3"><FilterSidebar /></div>}
            </div>
            <div className="hidden lg:block"><FilterSidebar /></div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 pb-4 border-b border-slate-200">
              <p className="text-sm text-slate-600 mb-2 sm:mb-0">
                {isLoading ? t('searching') : t('showingResults', { count: tours.length })}
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm font-medium text-slate-700">{t('sortBy')}</label>
                <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border-slate-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm">
                  <option value="relevance">{t('sortOptions.relevance')}</option>
                  <option value="rating">{t('sortOptions.rating')}</option>
                  <option value="price-asc">{t('sortOptions.priceLowToHigh')}</option>
                  <option value="price-desc">{t('sortOptions.priceHighToLow')}</option>
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
  
  function FilterSidebar() {
      return (
        <aside className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 sticky top-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">{t('filters')}</h2>
            <button onClick={clearAllFilters} className="text-sm text-red-600 hover:underline">{t('clearAll')}</button>
          </div>
          <div className="space-y-6">
            {/* Categories */}
            <div>
              <h3 className="font-semibold mb-2">{t('categories')}</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories.map((category) => (
                  <label key={category._id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(String(category._id))}
                      onChange={() => handleFilterChange(setSelectedCategories, String(category._id))}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-600">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Destinations */}
            <div>
              <h3 className="font-semibold mb-2">{t('destinations')}</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {destinations.map((dest) => (
                  <label key={dest._id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDestinations.includes(String(dest._id))}
                      onChange={() => handleFilterChange(setSelectedDestinations, String(dest._id))}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-600">{dest.name}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Price Range */}
            <div>
              <h3 className="font-semibold mb-2">{t('priceRange')}</h3>
              <input
                type="range"
                min={0}
                max={500}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([0, Number(e.target.value)])}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-slate-500 mt-1">
                <span>$0</span>
                <span>${priceRange[1]}{priceRange[1] === 500 && '+'}</span>
              </div>
            </div>
            {/* Duration */}
            <div>
              <h3 className="font-semibold mb-2">{t('duration.title')}</h3>
              <div className="space-y-2">
                {durationOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDurations.includes(opt.value)}
                      onChange={() => handleFilterChange(setSelectedDurations, opt.value)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-600">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Rating */}
            <div>
              <h3 className="font-semibold mb-2">{t('rating')}</h3>
              <div className="space-y-2">
                {ratingOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRatings.includes(opt.value)}
                      onChange={() => handleFilterChange(setSelectedRatings, opt.value)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <div className="flex items-center" aria-label={opt.label}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < opt.value ? 'text-yellow-400' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>
      );
  }
  
  function TourGrid() {
    if (isLoading) {
      // Show skeleton loaders while loading (12 skeletons for better UX)
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <TourCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (loadFailed) {
      return (
        <div className="py-24 text-center" role="alert">
          <SearchIcon className="h-16 w-16 text-slate-300 mb-4 mx-auto" aria-hidden="true" />
          <h3 className="text-2xl font-bold text-slate-800">{t('searchFailedTitle')}</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">{t('searchFailedDescription')}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-sm"
            >
              {t('searchRetry')}
            </button>
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-5 py-2.5 border border-slate-300 text-slate-800 font-semibold rounded-lg hover:bg-slate-50"
            >
              {t('clearFilters')}
            </button>
          </div>
        </div>
      );
    }

    if (!tours || tours.length === 0) {
      return (
        <div className="py-24 text-center">
          <SearchIcon className="h-16 w-16 text-slate-300 mb-4 mx-auto" />
          <h3 className="text-2xl font-bold text-slate-800">{t('noToursFoundTitle')}</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">{t('noToursFoundDescription')}</p>
          <button onClick={clearAllFilters} className="mt-6 px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-sm">
            {t('clearFilters')}
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tours.map((tour, index) => (
          <TourCard key={String(tour._id ?? tour.id ?? tour.slug ?? index)} tour={tour} />
        ))}
      </div>
    );
  }
};

export default SearchClient;

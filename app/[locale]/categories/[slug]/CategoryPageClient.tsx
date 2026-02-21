'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Star, Clock, ShoppingCart, Search, MapPin, Users, Award, TrendingUp, CheckCircle2, Tag } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import RelatedInterests from '@/components/RelatedInterests';
import { Tour, Category } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import BookingSidebar from '@/components/BookingSidebar';
import { useLocale } from 'next-intl';

type CategoryPageCopy = {
  searchToursPlaceholder: string;
  allDurations: string;
  halfDay: string;
  fullDay: string;
  multiDay: string;
  allPrices: string;
  under50: string;
  price50to100: string;
  price100to200: string;
  price200Plus: string;
  recommended: string;
  priceLowToHigh: string;
  priceHighToLow: string;
  highestRated: string;
  duration: string;
  toursAvailable: string;
  averageRating: string;
  happyCustomers: string;
  expertGuides: string;
  aboutCategory: (name: string) => string;
  highlights: string;
  features: string;
  essentialInformation: string;
  essentialInfoItems: string[];
  discover: string;
  tourCount: (count: number) => string;
  ratingStat: string;
  travelersStat: string;
  addToCartAria: string;
  viewDetails: string;
  availableTours: string;
  noToursMatchFilters: string;
  adjustSearchFilters: string;
  clearAllFilters: string;
  noToursFound: string;
  noToursInCategory: (name: string) => string;
  exploreAllTours: string;
  exploreRelatedCategories: string;
  discoverMoreExperiences: string;
};

const CATEGORY_PAGE_COPY: Record<'en' | 'ar', CategoryPageCopy> = {
  en: {
    searchToursPlaceholder: 'Search tours...',
    allDurations: 'All Durations',
    halfDay: 'Half Day',
    fullDay: 'Full Day',
    multiDay: 'Multi-Day',
    allPrices: 'All Prices',
    under50: 'Under $50',
    price50to100: '$50 - $100',
    price100to200: '$100 - $200',
    price200Plus: '$200+',
    recommended: 'Recommended',
    priceLowToHigh: 'Price: Low to High',
    priceHighToLow: 'Price: High to Low',
    highestRated: 'Highest Rated',
    duration: 'Duration',
    toursAvailable: 'Tours Available',
    averageRating: 'Average Rating',
    happyCustomers: 'Happy Customers',
    expertGuides: 'Expert Guides',
    aboutCategory: (name: string) => `About ${name}`,
    highlights: 'Highlights',
    features: 'Features',
    essentialInformation: 'Essential Information',
    essentialInfoItems: [
      'All tours include professional English-speaking guides',
      'Pickup and drop-off from your hotel in Cairo or Giza',
      'Small group sizes for a more personalized experience',
      'Flexible cancellation policy - cancel up to 24 hours before for a full refund',
    ],
    discover: 'DISCOVER',
    tourCount: (count: number) => `${count}+ Tours`,
    ratingStat: '4.8/5 Rating',
    travelersStat: '50K+ Travelers',
    addToCartAria: 'Add to cart',
    viewDetails: 'View Details',
    availableTours: 'Available Tours',
    noToursMatchFilters: 'No Tours Match Your Filters',
    adjustSearchFilters: 'Try adjusting your search or filter criteria.',
    clearAllFilters: 'Clear All Filters',
    noToursFound: 'No Tours Found',
    noToursInCategory: (name: string) =>
      `There are currently no tours available in the "${name}" category.`,
    exploreAllTours: 'Explore All Tours',
    exploreRelatedCategories: 'Explore Related Categories',
    discoverMoreExperiences: 'Discover more amazing experiences',
  },
  ar: {
    searchToursPlaceholder: 'ابحث عن الجولات...',
    allDurations: 'كل المدد',
    halfDay: 'نصف يوم',
    fullDay: 'يوم كامل',
    multiDay: 'عدة أيام',
    allPrices: 'كل الأسعار',
    under50: 'أقل من 50$',
    price50to100: '50$ - 100$',
    price100to200: '100$ - 200$',
    price200Plus: '200$+',
    recommended: 'موصى به',
    priceLowToHigh: 'السعر: من الأقل إلى الأعلى',
    priceHighToLow: 'السعر: من الأعلى إلى الأقل',
    highestRated: 'الأعلى تقييماً',
    duration: 'المدة',
    toursAvailable: 'جولات متاحة',
    averageRating: 'متوسط التقييم',
    happyCustomers: 'عملاء سعداء',
    expertGuides: 'مرشدون خبراء',
    aboutCategory: (name: string) => `حول ${name}`,
    highlights: 'أبرز النقاط',
    features: 'المزايا',
    essentialInformation: 'معلومات أساسية',
    essentialInfoItems: [
      'تشمل جميع الجولات مرشدين محترفين يتحدثون الإنجليزية',
      'خدمة الاستلام والتوصيل من فندقك في القاهرة أو الجيزة',
      'مجموعات صغيرة لتجربة أكثر تخصيصًا',
      'سياسة إلغاء مرنة - يمكنك الإلغاء حتى 24 ساعة قبل الموعد لاسترداد كامل المبلغ',
    ],
    discover: 'اكتشف',
    tourCount: (count: number) => `${count}+ جولة`,
    ratingStat: 'تقييم 4.8/5',
    travelersStat: '+50 ألف مسافر',
    addToCartAria: 'أضف إلى السلة',
    viewDetails: 'عرض التفاصيل',
    availableTours: 'الجولات المتاحة',
    noToursMatchFilters: 'لا توجد جولات تطابق الفلاتر',
    adjustSearchFilters: 'جرّب تعديل البحث أو الفلاتر.',
    clearAllFilters: 'مسح جميع الفلاتر',
    noToursFound: 'لم يتم العثور على جولات',
    noToursInCategory: (name: string) => `لا توجد جولات متاحة حاليًا ضمن فئة "${name}".`,
    exploreAllTours: 'استكشف جميع الجولات',
    exploreRelatedCategories: 'استكشف فئات مشابهة',
    discoverMoreExperiences: 'اكتشف المزيد من التجارب الرائعة',
  },
};

// --- SearchAndFilter Component ---
const SearchAndFilter = ({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  selectedDuration,
  setSelectedDuration,
  priceRange,
  setPriceRange,
  copy,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  selectedDuration: string;
  setSelectedDuration: (duration: string) => void;
  priceRange: string;
  setPriceRange: (range: string) => void;
  copy: CategoryPageCopy;
}) => (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder={copy.searchToursPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      {/* Duration Filter */}
      <select
        value={selectedDuration}
        onChange={(e) => setSelectedDuration(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
      >
        <option value="">{copy.allDurations}</option>
        <option value="half-day">{copy.halfDay}</option>
        <option value="full-day">{copy.fullDay}</option>
        <option value="multi-day">{copy.multiDay}</option>
      </select>

      {/* Price Range Filter */}
      <select
        value={priceRange}
        onChange={(e) => setPriceRange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
      >
        <option value="">{copy.allPrices}</option>
        <option value="0-50">{copy.under50}</option>
        <option value="50-100">{copy.price50to100}</option>
        <option value="100-200">{copy.price100to200}</option>
        <option value="200+">{copy.price200Plus}</option>
      </select>

      {/* Sort Dropdown */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
      >
        <option value="recommended">{copy.recommended}</option>
        <option value="price_low">{copy.priceLowToHigh}</option>
        <option value="price_high">{copy.priceHighToLow}</option>
        <option value="rating">{copy.highestRated}</option>
        <option value="duration">{copy.duration}</option>
      </select>
    </div>
  </div>
);

// --- StatsSection Component ---
const StatsSection = ({
  category,
  tours,
  copy,
}: {
  category: Category;
  tours: Tour[];
  copy: CategoryPageCopy;
}) => {
  const totalTours = tours?.length || 0;

  // Calculate average rating from tours
  let averageRating = '4.9';
  if (tours && tours.length > 0) {
    const toursWithRatings = tours.filter(t => t.rating);
    if (toursWithRatings.length > 0) {
      const sum = toursWithRatings.reduce((acc, t) => acc + (t.rating || 0), 0);
      averageRating = (sum / toursWithRatings.length).toFixed(1);
    }
  }

  // Calculate happy customers from bookings or use default
  let happyCustomers = '10K+';
  if (tours && tours.length > 0) {
    const totalBookings = tours.reduce((acc, t) => acc + ((t as any).bookings || 0), 0);
    if (totalBookings > 0) {
      if (totalBookings >= 1000) {
        happyCustomers = `${Math.floor(totalBookings / 1000)}K+`;
      } else {
        happyCustomers = `${totalBookings}+`;
      }
    }
  }

  const stats = [
    { icon: MapPin, label: copy.toursAvailable, value: totalTours.toString(), color: 'text-blue-600' },
    { icon: Star, label: copy.averageRating, value: averageRating, color: 'text-yellow-600' },
    { icon: Users, label: copy.happyCustomers, value: happyCustomers, color: 'text-green-600' },
    { icon: Award, label: copy.expertGuides, value: '50+', color: 'text-purple-600' },
  ];

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center p-6 bg-gray-50 rounded-lg hover:shadow-md transition-shadow">
                <Icon className={`${stat.color} mx-auto mb-3`} size={40} />
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// --- AboutSection Component ---
const AboutSection = ({ category, copy }: { category: Category; copy: CategoryPageCopy }) => {
  const highlights = (category as any).highlights || [];
  const features = (category as any).features || [];
  const longDescription = (category as any).longDescription || category.description;

  if (!longDescription && highlights.length === 0 && features.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{copy.aboutCategory(category.name)}</h2>

          {longDescription && (
            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-gray-700 leading-relaxed">{longDescription}</p>
            </div>
          )}

          {highlights.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{copy.highlights}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {highlights.map((highlight: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-700">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {features.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{copy.features}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <TrendingUp className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{copy.essentialInformation}</h3>
            <ul className="space-y-2 text-gray-700">
              {copy.essentialInfoItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Hero Section Component ---
const CategoryHeroSection = ({
  category,
  tourCount,
  copy,
}: {
  category: Category;
  tourCount: number;
  copy: CategoryPageCopy;
}) => {
  const heroImage = (category as any).heroImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80&fm=jpg';

  return (
    <section className="relative w-full h-[70vh] sm:h-[75vh] md:h-[80vh] lg:h-screen max-h-[900px]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={heroImage}
          alt={category.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-20 h-full flex items-center justify-center text-white px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto text-center md:text-left pt-20 md:pt-0">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold uppercase leading-tight tracking-wide mb-3 sm:mb-4">
            {copy.discover}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-300">
              {category.name}
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 max-w-2xl mx-auto md:mx-0 px-4 sm:px-0">
            {category.description}
          </p>

          <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-white/90 text-xs sm:text-sm px-4 sm:px-0">
            <span className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <Tag size={14} className="sm:w-4 sm:h-4" />
              <span className="font-semibold">{copy.tourCount(tourCount)}</span>
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <Star size={14} className="sm:w-4 sm:h-4 fill-current text-yellow-400" />
              <span className="font-semibold">{copy.ratingStat}</span>
            </span>
            <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full font-semibold">{copy.travelersStat}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Tour Card Component ---
const TourCard = ({
  tour,
  onAddToCartClick,
  copy,
}: {
  tour: Tour;
  onAddToCartClick: (tour: Tour) => void;
  copy: CategoryPageCopy;
}) => {
  const { formatPrice } = useSettings();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col group">
      <div className="relative">
        <Link href={`/${tour.slug}`}>
          <Image
            src={tour.image}
            alt={tour.title}
            width={400}
            height={250}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
          />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            onAddToCartClick(tour);
          }}
          className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full hover:bg-white transition-colors hover:scale-110"
          aria-label={copy.addToCartAria}
        >
          <ShoppingCart size={16} className="text-red-600" />
        </button>
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2 flex-grow">
          <Link href={`/${tour.slug}`} className="hover:text-red-600 transition-colors">
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
          <Link href={`/${tour.slug}`} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            {copy.viewDetails}
          </Link>
        </div>
      </div>
    </div>
  );
};


export default function CategoryPageClient({ category, categoryTours }: { category: Category; categoryTours: Tour[] }) {
    const locale = useLocale();
    const copy = locale.startsWith('ar') ? CATEGORY_PAGE_COPY.ar : CATEGORY_PAGE_COPY.en;
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recommended');
    const [selectedDuration, setSelectedDuration] = useState('');
    const [priceRange, setPriceRange] = useState('');

    const handleTourSelect = (tour: Tour) => {
        setSelectedTour(tour);
        setBookingSidebarOpen(true);
    };

    const closeSidebar = () => {
        setBookingSidebarOpen(false);
        setTimeout(() => setSelectedTour(null), 300);
    };

    // Filter and sort tours
    const filteredAndSortedTours = React.useMemo(() => {
        let filtered = [...categoryTours];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(tour =>
                tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tour.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Duration filter
        if (selectedDuration) {
            filtered = filtered.filter(tour => {
                const duration = tour.duration?.toLowerCase() || '';
                if (selectedDuration === 'half-day') return duration.includes('half') || duration.includes('4') || duration.includes('5');
                if (selectedDuration === 'full-day') return duration.includes('full') || duration.includes('8') || duration.includes('day') && !duration.includes('days');
                if (selectedDuration === 'multi-day') return duration.includes('days') || duration.includes('2 day') || duration.includes('3 day');
                return true;
            });
        }

        // Price range filter
        if (priceRange) {
            filtered = filtered.filter(tour => {
                const price = tour.discountPrice || tour.originalPrice || 0;
                if (priceRange === '0-50') return price < 50;
                if (priceRange === '50-100') return price >= 50 && price < 100;
                if (priceRange === '100-200') return price >= 100 && price < 200;
                if (priceRange === '200+') return price >= 200;
                return true;
            });
        }

        // Sort
        switch (sortBy) {
            case 'price_low':
                filtered.sort((a, b) => (a.discountPrice || a.originalPrice || 0) - (b.discountPrice || b.originalPrice || 0));
                break;
            case 'price_high':
                filtered.sort((a, b) => (b.discountPrice || b.originalPrice || 0) - (a.discountPrice || a.originalPrice || 0));
                break;
            case 'rating':
                filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'duration':
                filtered.sort((a, b) => {
                    const getDurationHours = (dur: string) => {
                        const match = dur?.match(/(\d+)/);
                        return match ? parseInt(match[1]) : 0;
                    };
                    return getDurationHours(a.duration || '') - getDurationHours(b.duration || '');
                });
                break;
            default:
                // Keep recommended order
                break;
        }

        return filtered;
    }, [categoryTours, searchQuery, sortBy, selectedDuration, priceRange]);

    return (
        <>
            <Header />

            {/* Hero Section */}
            <CategoryHeroSection category={category} tourCount={categoryTours.length} copy={copy} />

            <main className="min-h-screen bg-slate-50">
                {/* Stats Section */}
                <StatsSection category={category} tours={categoryTours} copy={copy} />

                {/* About Section */}
                <AboutSection category={category} copy={copy} />

                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Search and Filter */}
                        {categoryTours.length > 0 && (
                            <div className="mt-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">{copy.availableTours}</h2>
                                <SearchAndFilter
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                    selectedDuration={selectedDuration}
                                    setSelectedDuration={setSelectedDuration}
                                    priceRange={priceRange}
                                    setPriceRange={setPriceRange}
                                    copy={copy}
                                />
                            </div>
                        )}

                        {/* Tours Grid */}
                        {filteredAndSortedTours.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                {filteredAndSortedTours.map(tour => (
                                  <TourCard key={tour._id} tour={tour} onAddToCartClick={handleTourSelect} copy={copy} />
                                ))}
                            </div>
                        ) : categoryTours.length > 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">{copy.noToursMatchFilters}</h3>
                                <p className="text-slate-500 mb-4">{copy.adjustSearchFilters}</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedDuration('');
                                        setPriceRange('');
                                        setSortBy('recommended');
                                    }}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    {copy.clearAllFilters}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">😢</div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">{copy.noToursFound}</h3>
                                <p className="text-slate-500 mb-4">{copy.noToursInCategory(category.name)}</p>
                                <div className="flex gap-4 justify-center">
                                    <Link href="/search" className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                                        {copy.exploreAllTours}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Categories Section */}
                <div className="py-12 bg-white">
                    <RelatedInterests
                        currentSlug={category.slug}
                        title={copy.exploreRelatedCategories}
                        subtitle={copy.discoverMoreExperiences}
                        limit={8}
                    />
                </div>
            </main>

            <Footer />

            {/* AI Search Widget */}
            <AISearchWidget />

            <BookingSidebar
                isOpen={isBookingSidebarOpen}
                onClose={closeSidebar}
                tour={selectedTour}
            />
        </>
    );
}

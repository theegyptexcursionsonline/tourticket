'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { MapPin, Search, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { IDestination } from '@/lib/models/Destination';
import { useLocale } from 'next-intl';
import { contentPath } from '@/lib/content/contentUrl';
import { askHostedAISearch } from '@/lib/hostedAISearch';

interface DestinationWithCount extends IDestination {
    tourCount: number;
}

interface DestinationsClientPageProps {
  destinations: DestinationWithCount[];
}

type DestinationsCopy = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  clearSearchAria: string;
  openAiAssistantAria: string;
  foundResults: (count: number) => string;
  noDestinationsForQuery: (query: string) => string;
  clearSearch: string;
  noDestinationsAvailable: string;
  toursAvailable: (count: number) => string;
};

const DESTINATIONS_COPY: Record<'en' | 'ar', DestinationsCopy> = {
  en: {
    title: 'Explore Our Destinations',
    subtitle:
      'From ancient wonders to modern marvels, find your next adventure in one of our handpicked locations.',
    searchPlaceholder: 'Search destinations...',
    clearSearchAria: 'Clear search',
    openAiAssistantAria: 'Open AI Assistant',
    foundResults: (count: number) =>
      `Found ${count} ${count === 1 ? 'destination' : 'destinations'}`,
    noDestinationsForQuery: (query: string) =>
      `No destinations found matching "${query}"`,
    clearSearch: 'Clear Search',
    noDestinationsAvailable: 'No destinations are currently available. Please check back later.',
    toursAvailable: (count: number) => `${count} tours available`,
  },
  ar: {
    title: 'استكشف وجهاتنا',
    subtitle:
      'من العجائب التاريخية إلى المعالم الحديثة، اعثر على مغامرتك القادمة في واحدة من الوجهات المختارة بعناية.',
    searchPlaceholder: 'ابحث في الوجهات...',
    clearSearchAria: 'مسح البحث',
    openAiAssistantAria: 'فتح مساعد الذكاء الاصطناعي',
    foundResults: (count: number) =>
      `تم العثور على ${count} ${count === 1 ? 'وجهة' : 'وجهات'}`,
    noDestinationsForQuery: (query: string) =>
      `لا توجد وجهات مطابقة لـ "${query}"`,
    clearSearch: 'مسح البحث',
    noDestinationsAvailable: 'لا توجد وجهات متاحة حاليًا. يرجى المحاولة لاحقًا.',
    toursAvailable: (count: number) => `${count} جولات متاحة`,
  },
};

const DestinationCard = ({
  destination,
  copy,
}: {
  destination: DestinationWithCount;
  copy: DestinationsCopy;
}) => (
  <Link href={contentPath('destination', destination.slug, destination.urlType, null, destination.parentPage?.slug)} className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
    <div className="relative h-48">
      <Image
        src={destination.image || '/hero2.jpg'}
        alt={`Image of ${destination.name}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
       <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
    </div>
    <div className="p-4">
      <h3 className="text-xl font-bold text-slate-800 group-hover:text-red-600 transition-colors">{destination.name}</h3>
      <div className="flex items-center text-sm text-slate-500 mt-1">
        <MapPin size={14} className="mr-1.5" />
        <span>{copy.toursAvailable(destination.tourCount || 0)}</span>
      </div>
    </div>
  </Link>
);


export default function DestinationsClientPage({ destinations }: DestinationsClientPageProps) {
  const locale = useLocale();
  const copy = locale.startsWith('ar') ? DESTINATIONS_COPY.ar : DESTINATIONS_COPY.en;
  const [query, setQuery] = useState('');
  const router = useRouter();

  // Filter destinations based on search query
  const filteredDestinations = useMemo(() => {
    if (!query.trim()) return destinations;

    const searchText = query.toLowerCase();
    return destinations.filter(dest =>
      dest.name.toLowerCase().includes(searchText) ||
      dest.country?.toLowerCase().includes(searchText) ||
      dest.description?.toLowerCase().includes(searchText)
    );
  }, [destinations, query]);

  // The AI button hands the typed question to the one hosted AI trip search.
  // This page's own chat called a retired agent and answered with an empty bubble.
  const handleOpenAI = () => {
    askHostedAISearch({ query, locale }, (href) => router.push(href));
    setQuery('');
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">{copy.title}</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          {copy.subtitle}
        </p>

        {/* Search Input */}
        <div className="mt-8 max-w-2xl mx-auto">
          <form onSubmit={(e) => e.preventDefault()}>
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="relative group"
            >
              <div className="relative bg-white/95 backdrop-blur-xl rounded-full shadow-xl hover:shadow-2xl border-2 border-blue-300/30 hover:border-blue-400/50 transition-all duration-300">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="w-full pl-14 md:pl-16 pr-24 md:pr-28 py-4 text-sm md:text-base text-gray-900 placeholder:text-gray-400/70 placeholder:font-normal font-medium bg-transparent outline-none rounded-full relative z-10"
                  />

                {/* Left Icon */}
                <div className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 z-10">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-md">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Right Side Elements */}
                <div className="absolute right-4 md:right-5 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-10">
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label={copy.clearSearchAria}
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  <motion.button
                    type="button"
                    onClick={handleOpenAI}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 flex items-center justify-center shadow-md hover:shadow-lg cursor-pointer transition-all"
                    aria-label={copy.openAiAssistantAria}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </form>

          {/* Search Results Count */}
          {query && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-slate-600"
            >
              {copy.foundResults(filteredDestinations.length)}
            </motion.p>
          )}
        </div>
      </div>

      {filteredDestinations.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          {filteredDestinations.map((dest, index) => (
            <motion.div
              key={String(dest._id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <DestinationCard destination={dest} copy={copy} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          {query ? (
            <>
              <p className="text-slate-500 mb-4">
                {copy.noDestinationsForQuery(query)}
              </p>
              <button
                onClick={() => setQuery('')}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
              >
                {copy.clearSearch}
              </button>
            </>
          ) : (
            <p className="text-slate-500">{copy.noDestinationsAvailable}</p>
          )}
        </motion.div>
      )}

    </div>
  );
}

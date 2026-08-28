// components/FeaturedToursServer.tsx
'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Star, ShoppingCart, Clock, Users, ImageIcon, Tag } from 'lucide-react';
import Image from 'next/image';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { isRTL } from '@/i18n/config';
import { tourContentPath } from '@/lib/content/contentUrl';

const BookingSidebar = dynamic(() => import('@/components/BookingSidebar'), { ssr: false });

interface FeaturedToursServerProps {
  tours: Tour[];
}

const toSafeString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

// Safe Image Component
const SafeImage = ({
  src,
  alt,
  className
}: {
  src: unknown;
  alt: string;
  className?: string;
}) => {
  const t = useTranslations('featured');
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const normalizedSrc = toSafeString(src).trim();

  if (!normalizedSrc || imageError) {
    return (
      <div
        data-testid="featured-tour-media"
        className="relative flex h-40 w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 sm:h-48 md:h-56"
        role="img"
        aria-label={t('noImageAvailable')}
      >
        <ImageIcon size={48} className="text-gray-400 mb-3" />
        <span className="text-gray-500 text-sm font-medium">{t('imageUnavailable')}</span>
      </div>
    );
  }

  return (
    <div
      data-testid="featured-tour-media"
      className="relative h-40 w-full overflow-hidden sm:h-48 md:h-56"
    >
      {isLoading && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-t-2xl"
          aria-hidden
        />
      )}
      <Image
        src={normalizedSrc}
        alt={alt}
        fill
        sizes="(max-width: 639px) 260px, (max-width: 767px) 280px, (max-width: 1023px) 320px, 340px"
        className={`h-full w-full object-cover ${className || ''}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        priority={false}
      />
    </div>
  );
};

// Helper functions
const formatBookings = (num?: number) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
  if (num >= 1000) return `${Math.floor(num / 1000)}k`;
  return num.toString();
};

const getTagColor = (tag: string) => {
  if (tag.includes('%')) return 'bg-red-500 text-white';
  if (tag === 'Staff favourite') return 'bg-slate-900 text-white';
  if (tag === 'Online only deal') return 'bg-red-600 text-white';
  if (tag === 'New') return 'bg-red-600 text-white';
  if (tag === 'Best for Kids') return 'bg-white text-slate-900';
  return 'bg-white/95 text-gray-800';
};

// Tour Card Component - NO SHADOWS
const TourCard = ({ tour, onAddToCartClick }: { tour: Tour; onAddToCartClick: (tour: Tour) => void }) => {
  const { formatPrice } = useSettings();
  const t = useTranslations('featured');

  return (
    <Link
      href={tour.slug ? tourContentPath(tour) : '#'}
      data-testid="featured-tour-card"
      className="block w-[260px] sm:w-[280px] md:w-[320px] lg:w-[340px] bg-white rounded-2xl overflow-hidden border border-gray-200 transform transition-all duration-300 hover:-translate-y-1 group focus:outline-none"
      style={{ boxShadow: 'none' }}
      aria-label={t('openTour', { title: tour.title || t('untitledTour') })}
    >
      <div className="relative">
        <SafeImage
          src={tour.image}
          alt={tour.title || t('untitledTour')}
          className="transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Keep provider and rating in one bounded row so they cannot collide
            on the narrowest cards. */}
        <div
          data-testid="featured-tour-badge-row"
          className="absolute inset-x-4 top-4 z-20 flex items-start justify-between gap-2"
        >
          <span
            className="min-w-0 truncate whitespace-nowrap rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-xs"
            style={{ boxShadow: 'none' }}
            title="Egypt Excursions Online"
          >
            Egypt Excursions Online
          </span>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-white/95 px-2.5 py-1.5 backdrop-blur-sm sm:gap-2 sm:px-3 sm:py-2" style={{ boxShadow: 'none' }}>
            <Star size={16} className="fill-red-600 text-red-600" />
            <span className="text-xs font-bold text-gray-800 sm:text-sm">
              {tour.rating ? tour.rating.toFixed(1) : '0.0'}
            </span>
          </div>
        </div>

        {/* Tags */}
        {tour.tags && tour.tags.length > 0 && (
          <div className="absolute top-14 left-4 flex flex-wrap gap-2 z-20">
            {tour.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full backdrop-blur-sm ${getTagColor(tag)}`}
                style={{ boxShadow: 'none' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Special Offer Badge */}
        {tour.specialOffer && (
          <div className={`absolute ${tour.tags && tour.tags.length > 0 ? 'top-[5.5rem]' : 'top-14'} left-4 z-20`}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm" style={{ boxShadow: 'none' }}>
              <Tag size={11} />
              <span className="truncate max-w-[160px]">{tour.specialOffer.badgeText}</span>
            </span>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute left-4 bottom-4 z-20">
          <div className="rounded-full border-2 border-white/20 bg-red-600 px-3 py-2 text-sm font-black text-white sm:text-base" style={{ boxShadow: 'none' }}>
            <span className="text-xs font-medium">From </span>{formatPrice(tour.pricingSummary?.fromPrice ?? tour.discountPrice ?? tour.originalPrice ?? 0)}
            {tour.originalPrice && tour.discountPrice && tour.originalPrice > tour.discountPrice && (
              <span className="ml-2 text-xs font-medium line-through text-red-100">
                {formatPrice(tour.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCartClick(tour);
          }}
          className="absolute bottom-4 right-4 z-30 bg-white text-red-600 p-3 rounded-full border-2 border-red-100 transition-all duration-300 transform hover:scale-110 hover:bg-red-600 hover:text-white hover:border-red-600 focus:outline-none"
          style={{ boxShadow: 'none' }}
          aria-label={t('addToCartAria', { title: tour.title || t('untitledTour') })}
          title={t('addToCartTitle')}
        >
          <ShoppingCart size={18} className="transition-transform duration-300 group-hover:scale-110" />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 md:p-6 bg-white">
        <div className="mb-3">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 leading-tight mb-2 line-clamp-2 group-hover:text-red-600 transition-colors duration-300">
            {tour.title || t('untitledTour')}
          </h3>

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
            {tour.description || t('defaultDescription')}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 mb-3 text-xs sm:text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-gray-400" />
            <span className="font-medium">{tour.duration || t('durationNotSpecified')}</span>
          </div>
          {(tour.bookings || 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-gray-400" />
              <span className="font-medium">{formatBookings(tour.bookings)} {t('booked')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-left">
            <div className="text-xs text-gray-500 mb-0.5">{t('startingFrom')}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl md:text-2xl font-black text-gray-900">
                <span className="text-xs font-medium">From </span>{formatPrice(tour.pricingSummary?.fromPrice ?? tour.discountPrice ?? tour.originalPrice ?? 0)}
              </span>
              {tour.originalPrice && tour.discountPrice && tour.originalPrice > tour.discountPrice && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(tour.originalPrice)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs text-gray-500 hidden sm:inline">{t('view')}</span>
            <ArrowRight size={14} className="text-red-600 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function FeaturedToursServer({ tours }: FeaturedToursServerProps) {
  const t = useTranslations('featured');
  const locale = useLocale();
  const rtl = isRTL(locale);
  const SeeAllArrow = rtl ? ArrowLeft : ArrowRight;
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  // Keep the first client render identical to SSR. The media query updates
  // immediately after hydration; reading window in the state initializer made
  // desktop clients render a different card count from the server.
  const [isMobileViewport, setIsMobileViewport] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobileViewport(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const handleAddToCartClick = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };

  const closeSidebar = () => {
    setBookingSidebarOpen(false);
    setTimeout(() => setSelectedTour(null), 300);
  };

  // Validate and prepare tours
  const validatedTours = tours.map((tour: Tour) => ({
    ...tour,
    image: toSafeString(tour.image),
    title: toSafeString(tour.title) || t('untitledTour'),
    slug: toSafeString(tour.slug),
    originalPrice: typeof tour.originalPrice === 'number' ? tour.originalPrice : undefined,
    discountPrice: typeof tour.discountPrice === 'number' ? tour.discountPrice : tour.originalPrice || 0,
    rating: typeof tour.rating === 'number' ? tour.rating : 0,
    bookings: typeof tour.bookings === 'number' ? tour.bookings : 0,
    duration: toSafeString(tour.duration) || t('durationNotSpecified'),
    tags: Array.isArray(tour.tags) ? tour.tags : [],
  }));

  const displayedTours = isMobileViewport ? validatedTours.slice(0, 8) : validatedTours;

  if (tours.length === 0) {
    return null;
  }

  return (
    <>
      <section className="featured-tours-section bg-slate-50 py-8 sm:py-12 md:py-16 lg:py-20">
        {/* Header with container */}
        <div className="container mx-auto px-4 md:px-8 mb-8 sm:mb-10 md:mb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                {t('title')}
              </h2>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                {t('subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <Link
                href="/tours"
                className="inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200 sm:px-6 sm:py-3 sm:text-base md:w-auto md:px-8 md:py-4"
                style={{ boxShadow: 'none' }}
                aria-label={t('seeAllAria')}
              >
                <span>{t('seeAll')}</span>
                <SeeAllArrow size={18} className="transition-transform duration-300 flex-shrink-0" />
              </Link>
            </div>
          </div>
        </div>

        {/* Native horizontal scrolling keeps every tour available without a
            continuously animating, duplicated card tree. */}
        <div
          data-testid="featured-tours-scroll"
          className="scrollbar-hide w-full overflow-x-auto overscroll-x-contain py-4 sm:py-6"
          dir={rtl ? 'rtl' : 'ltr'}
          aria-label={t('title')}
        >
          <div className="flex w-max snap-x snap-proximity gap-3 px-4 sm:gap-4 md:gap-6 md:px-8">
            {displayedTours.map((tour, idx) => (
              <div key={`${tour._id || tour.slug}-${idx}`} className="flex-shrink-0 snap-start px-1 sm:px-2">
                <TourCard tour={tour} onAddToCartClick={handleAddToCartClick} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Sidebar */}
      {selectedTour && (
        <BookingSidebar
          isOpen={isBookingSidebarOpen}
          onClose={closeSidebar}
          tour={selectedTour as React.ComponentProps<typeof BookingSidebar>['tour']}
        />
      )}

      {/* Styles - NO SHADOWS */}
      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* NO SHADOWS - Remove all shadows from featured tours section */
        .featured-tours-section,
        .featured-tours-section *,
        .featured-tours-section *::before,
        .featured-tours-section *::after {
          box-shadow: none !important;
        }

        .featured-tours-section a,
        .featured-tours-section button,
        .featured-tours-section div,
        .featured-tours-section span {
          box-shadow: none !important;
        }

        /* Hide scrollbar but allow scrolling */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

      `}</style>
    </>
  );
}

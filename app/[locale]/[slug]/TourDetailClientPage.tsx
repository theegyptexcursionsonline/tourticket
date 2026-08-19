'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  Star, Clock, Users, MapPin, Calendar, Heart, Share2, ArrowLeft,
  Check, X, Camera, Shield, ChevronDown, ChevronUp, MessageCircle,
  Phone, Mail, ShoppingCart, Info, CheckCircle,
  Umbrella, Bus, Utensils, Mountain, Languages,
  CreditCard, Navigation, Backpack,
  Sun, Snowflake, Eye, Accessibility,
  Smartphone, Headphones, ChevronLeft,
  ChevronRight, ZoomIn
} from 'lucide-react';

// Components
import BookingSidebar from '@/components/BookingSidebar';
import StickyBookButton from '@/components/StickyBookButton';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewForm from '@/components/reviews/ReviewForm';
import ReviewsStructuredData from '@/components/ReviewsStructuredData';
import ElfsightWidget from '@/components/ElfsightWidget';
import InteractiveItineraryMap from '@/components/tours/InteractiveItineraryMap';
import TourPriceDisplay from '@/components/pricing/TourPriceDisplay';
import ContentBreadcrumbs from '@/components/navigation/ContentBreadcrumbs';
import { sanitizeRichHtml } from '@/lib/security/sanitizeHtml';

// Hooks and contexts
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/contexts/WishlistContext';
import { ITour } from '@/lib/models/Tour';
import toast from 'react-hot-toast';
import { toDateOnlyString } from '@/utils/date';
import type { CartItem, Review as ReviewData, Tour as WishlistTour } from '@/types';
import { CANCELLATION_POLICY_SUMMARY } from '@/lib/bookings/cancellationPolicy';
import { formatExperienceDescription } from '@/lib/content/experienceDescription';
import { imageMetadataFor } from '@/lib/content/imageMetadata';
import { contentPath } from '@/lib/content/contentUrl';
import { buildContentBreadcrumbs } from '@/lib/content/breadcrumbs';
import {
  itineraryDirectionsUrl,
  itineraryEmbedMapUrl,
  itineraryMapStops,
  itineraryStaticMapUrl,
} from '@/lib/tours/itineraryMap';
import { meetingPointEmbedUrl, meetingPointMapUrl } from '@/lib/tours/meetingPointMap';
import { effectiveTourPrice } from '@/lib/pricing/effectivePrice';
import { provableRating, ratingLabel, reviewCountLabel } from '@/lib/tours/ratingDisplay';
import { requestHostedAISearch } from '@/lib/hostedAISearch';

// Enhanced interfaces for additional tour data
interface ItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  includes?: string[];
  icon?: string;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface TabNavigationProps {
  activeTab: string;
  tabs: TabItem[];
  scrollToSection: (id: string) => void;
  isHeaderVisible: boolean;
}

interface FAQ {
  question: string;
  answer: string;
}

type Review = ReviewData;

interface TourEnhancement {
  itinerary?: ItineraryItem[];
  whatToBring?: string[];
  whatToWear?: string[];
  physicalRequirements?: string;
  accessibilityInfo?: string[];
  groupSize?: { min: number; max: number };
  transportationDetails?: string;
  mealInfo?: string;
  weatherPolicy?: string;
  photoPolicy?: string;
  tipPolicy?: string;
  healthSafety?: string[];
  culturalInfo?: string[];
  seasonalVariations?: string;
  localCustoms?: string[];
  notSuitableFor?: string[];
  needToKnow?: string[];
}

const inferItineraryIcon = (item: ItineraryItem): string => {
  const content = [item.title, item.description, item.location]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matches = (...keywords: string[]) => keywords.some((keyword) => content.includes(keyword));

  if (matches('pickup', 'pick up', 'hotel', 'transfer', 'drop off', 'dropoff', 'return to hotel', 'back to hotel')) {
    return 'transport';
  }

  if (matches('boat', 'cruise', 'yacht', 'sail', 'sailing', 'aboard', 'on board', 'jetty', 'harbor', 'harbour', 'marina')) {
    return 'boat';
  }

  if (matches('snorkel', 'snorkeling', 'snorkelling', 'reef', 'coral', 'dive', 'diving', 'freediv', 'swim', 'swimming')) {
    return 'water';
  }

  if (matches('island', 'beach', 'bay', 'lagoon', 'sandbank', 'sand bar', 'relax', 'sunbathe', 'sunbath')) {
    return 'beach';
  }

  if (matches('lunch', 'dinner', 'breakfast', 'meal', 'buffet', 'bbq', 'barbecue', 'drinks', 'tea', 'coffee')) {
    return 'food';
  }

  if (matches('photo', 'photos', 'photography', 'sunset', 'viewpoint', 'panorama', 'scenic')) {
    return 'camera';
  }

  if (matches('museum', 'temple', 'pyramid', 'monument', 'tomb', 'mosque', 'church', 'fort', 'citadel', 'valley')) {
    return 'monument';
  }

  if (matches('shop', 'shopping', 'market', 'bazaar', 'souvenir')) {
    return 'shopping';
  }

  if (matches('briefing', 'instruction', 'instructions', 'safety', 'introduction', 'orientation', 'check-in', 'check in')) {
    return 'info';
  }

  if (matches('walk', 'explore', 'visit', 'discover', 'experience', 'stop', 'activity')) {
    return 'activity';
  }

  return 'location';
};

const cleanList = (values?: string[]) =>
  Array.isArray(values) ? values.map((value) => value?.trim()).filter(Boolean) as string[] : [];

const cleanText = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

// Only the tour's own content reaches the page. An empty field hides its
// section — the editor states that contract, and generic filler here would
// publish policies and promises the operator never agreed to.
const extractEnhancementData = (tour: ITour): TourEnhancement => {
  return {
    itinerary: tour.itinerary && tour.itinerary.length > 0 ? tour.itinerary.map(item => ({
      ...item,
      icon: item.icon && item.icon !== 'location' ? item.icon : inferItineraryIcon(item)
    })) : [],

    whatToBring: cleanList(tour.whatToBring),
    whatToWear: cleanList(tour.whatToWear),
    physicalRequirements: cleanText(tour.physicalRequirements),
    accessibilityInfo: cleanList(tour.accessibilityInfo),
    groupSize: (tour.maxGroupSize || tour.groupSize)
      ? { min: tour.groupSize?.min || 1, max: tour.maxGroupSize || tour.groupSize?.max || 20 }
      : undefined,
    transportationDetails: cleanText(tour.transportationDetails),
    mealInfo: cleanText(tour.mealInfo),
    weatherPolicy: cleanText(tour.weatherPolicy),
    photoPolicy: cleanText(tour.photoPolicy),
    tipPolicy: cleanText(tour.tipPolicy),
    healthSafety: cleanList(tour.healthSafety),
    culturalInfo: cleanList(tour.culturalInfo),
    seasonalVariations: cleanText(tour.seasonalVariations),
    localCustoms: cleanList(tour.localCustoms),
    notSuitableFor: cleanList(tour.notSuitableFor),
    needToKnow: cleanList(tour.needToKnow),
  };
};

const getDisplayTags = (tags?: string[]) => {
  if (!Array.isArray(tags)) return [];

  return Array.from(
    new Set(
      tags
        .map((tag) => tag?.trim())
        .filter(Boolean)
    )
  ).slice(0, 2);
};

// Enhanced Lightbox Component
const Lightbox = ({ images, selectedIndex, onClose }: { images: string[], selectedIndex: number, onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  const nextImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, onClose, prevImage]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-50"
        aria-label="Close lightbox"
      >
        <X size={32} />
      </button>

      <div className="relative w-full h-full max-w-5xl max-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Tour image ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </AnimatePresence>
      </div>

      <button
        onClick={prevImage}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Previous image"
      >
        <ChevronLeft size={28} />
      </button>

      <button
        onClick={nextImage}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Next image"
      >
        <ChevronRight size={28} />
      </button>
       
       <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full"
        onClick={(e) => e.stopPropagation()}
       >
        {currentIndex + 1} / {images.length}
      </div>
    </motion.div>
  );
};

// useScrollDirection hook
function useScrollDirection() {
  const [isVisible, setIsVisible] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? window.pageYOffset : 0;
    const updateScroll = () => {
      const currentScrollY = window.pageYOffset;
      setIsVisible(lastScrollY > currentScrollY || currentScrollY < 100);
      setScrollY(currentScrollY);
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);
  return { scrollY, isVisible };
}

const TabNavigation = ({ activeTab, tabs, scrollToSection, isHeaderVisible }: TabNavigationProps) => {
  const stickyTop = isHeaderVisible ? 'top-16 md:top-20' : 'top-0';
  const navRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const container = navRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 8);
    setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 8);
  };

  const scrollBy = (delta: number) => {
    const container = navRef.current;
    if (!container) return;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = navRef.current;
    if (!container || !activeTab) return;

    const selector = `a[data-tab-id="${activeTab}"]`;
    let activeEl = container.querySelector(selector) as HTMLElement | null;

    if (!activeEl) {
      const fallback = container.querySelector(`a[href="#${activeTab}"]`) as HTMLElement | null;
      if (!fallback) return;
      activeEl = fallback;
    }

    const elRect = activeEl.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    const elLeft = elRect.left - contRect.left + container.scrollLeft;
    const elRight = elLeft + elRect.width;
    const visibleLeft = container.scrollLeft;
    const visibleRight = container.scrollLeft + container.clientWidth;

    if (elLeft < visibleLeft + 12) {
      container.scrollTo({ left: Math.max(0, elLeft - 12), behavior: 'smooth' });
    }
    else if (elRight > visibleRight - 12) {
      const delta = elRight - visibleRight + 12;
      container.scrollTo({ left: container.scrollLeft + delta, behavior: 'smooth' });
    }

    setTimeout(updateScrollButtons, 250);
    updateScrollButtons();
  }, [activeTab]);

  useEffect(() => {
    const container = navRef.current;
    if (!container) return;
    updateScrollButtons();
    const onScroll = () => updateScrollButtons();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, []);

  return (
    <div
      className={`sticky ${stickyTop} z-20 -mx-4 sm:mx-0 transition-all duration-300
        bg-white/30 backdrop-blur-md border-b border-white/20 shadow-lg rounded-xl`}
    >
      <div className="container mx-auto px-2 sm:px-4">
        <div className="relative">
          <button
            aria-hidden={!canScrollLeft}
            aria-label="Scroll tabs left"
            onClick={() => scrollBy(-160)}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white shadow-sm transition-opacity ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={navRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-2 scroll-smooth"
            role="tablist"
            aria-label="Tour sections"
          >
            {tabs.map((tab) => (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                data-tab-id={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(tab.id);
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-red-600'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </a>
            ))}
          </div>

          <button
            aria-hidden={!canScrollRight}
            aria-label="Scroll tabs right"
            onClick={() => scrollBy(160)}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white shadow-sm transition-opacity ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            type="button"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ItineraryIcon = ({ iconType, className = "w-5 h-5" }: { iconType?: string, className?: string }) => {
  const icons: { [key: string]: JSX.Element } = {
    location: <MapPin className={className} />,
    transport: <Bus className={className} />,
    boat: <Navigation className={className} />,
    water: <Navigation className={className} />,
    beach: <Sun className={className} />,
    monument: <Mountain className={className} />,
    camera: <Camera className={className} />,
    food: <Utensils className={className} />,
    time: <Clock className={className} />,
    info: <Info className={className} />,
    activity: <Users className={className} />,
    shopping: <ShoppingCart className={className} />,
  };
  
  return icons[iconType || 'location'] || icons.location;
};

const ItinerarySection = ({ itinerary, tourLocation, sectionRef }: { itinerary: ItineraryItem[], tourLocation?: string, sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  // The map only exists when the editor typed explicit step locations —
  // guessing from the tour title placed markers on random keyword matches.
  const stops = itineraryMapStops(itinerary);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const staticMapUrl = itineraryStaticMapUrl(stops, apiKey, tourLocation);
  const showMap = stops.length > 0;
  const openMapsUrl = itineraryDirectionsUrl(stops, tourLocation);
  const [activeItineraryIndex, setActiveItineraryIndex] = useState(0);
  const selectItineraryStage = useCallback((index: number) => {
    setActiveItineraryIndex(index);
  }, []);

  return (
    <div ref={sectionRef} id="itinerary" className="space-y-6 scroll-mt-40">
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Clock size={24} className="text-red-600" />
        Detailed Itinerary
      </h3>

      {/* Split Layout: Itinerary Items + Map (map only with explicit locations) */}
      <div className={`grid grid-cols-1 ${showMap ? 'lg:grid-cols-2' : ''} items-start gap-6`}>
        {/* Left: Itinerary Timeline */}
        <div className="relative order-2 min-w-0 lg:order-1">
          {/* Dotted line connector */}
          <div className="absolute left-[18px] top-[18px] bottom-[18px] w-0.5 border-l-2 border-dashed border-slate-300"></div>

          {/* Keep the complete timeline in the document scroll. A nested
              scrollbar hides later stops and prevents the map from staying
              alongside the itinerary until the final stop. */}
          <div className="pr-1 sm:pr-2">
            {itinerary.map((item, index) => (
              <div key={index} className="relative flex items-start gap-4 pb-6 last:pb-0">
                {/* Timeline connection point */}
                <div className="flex-shrink-0 relative z-10">
                  {/* Outer ring */}
                  <div className={`absolute inset-0 rounded-full ${
                    index === 0 ? 'bg-green-100 animate-pulse' :
                    index === itinerary.length - 1 ? 'bg-red-100' :
                    'bg-blue-100'
                  }`} style={{ transform: 'scale(1.12)' }}></div>

                  {/* Icon circle */}
                  <div className={`relative w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                    index === 0 ? 'bg-green-600' :
                    index === itinerary.length - 1 ? 'bg-red-600' :
                    'bg-blue-600'
                  } text-white`}>
                    <ItineraryIcon iconType={item.icon} className="w-4 h-4" />
                  </div>

                  {/* Connecting dots */}
                  {index < itinerary.length - 1 && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col gap-1 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    </div>
                  )}
                </div>

                {/* Content card */}
                <button
                  type="button"
                  data-itinerary-stage={index + 1}
                  aria-pressed={activeItineraryIndex === index}
                  onMouseEnter={() => selectItineraryStage(index)}
                  onFocus={() => selectItineraryStage(index)}
                  onClick={() => selectItineraryStage(index)}
                  className={`flex-1 bg-white p-4 rounded-xl border text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${
                    activeItineraryIndex === index
                      ? 'border-red-300 ring-2 ring-red-100 shadow-lg'
                      : 'border-slate-200 hover:border-red-200 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        index === 0 ? 'bg-green-50 text-green-700' :
                        index === itinerary.length - 1 ? 'bg-red-50 text-red-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {item.time}
                      </span>
                      {item.duration && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                          {item.duration}
                        </span>
                      )}
                    </div>
                    {item.location && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
                        <MapPin size={12} />
                        <span className="hidden md:inline">{item.location}</span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2 text-base">{item.title}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed mb-3">{item.description}</p>
                  {item.includes && item.includes.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 mt-3">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Includes:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.includes.map((include, i) => (
                          <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                            <Check size={12} />
                            {include}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: every itinerary lifecycle stage gets a numbered interactive
            marker. Generic stages are interpolated and disclosed as
            approximate; editor-entered landmarks stay exact. */}
        {showMap && (
          <div className="relative order-1 w-full lg:order-2 lg:sticky lg:top-24 lg:self-start">
            <InteractiveItineraryMap
              itinerary={itinerary}
              tourLocation={tourLocation}
              apiKey={apiKey}
              fallbackMapUrl={staticMapUrl}
              fallbackEmbedUrl={stops[0] ? itineraryEmbedMapUrl(stops[0], apiKey, tourLocation) : null}
              openMapsUrl={openMapsUrl}
              activeIndex={activeItineraryIndex}
              onSelect={selectItineraryStage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const PracticalInfoSection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const hasBring = (enhancement.whatToBring?.length ?? 0) > 0;
  const hasWear = (enhancement.whatToWear?.length ?? 0) > 0;
  const hasContent = hasBring || hasWear || Boolean(enhancement.physicalRequirements)
    || (enhancement.notSuitableFor?.length ?? 0) > 0 || (enhancement.needToKnow?.length ?? 0) > 0
    || Boolean(enhancement.groupSize);

  if (!hasContent) return null;

  return (
  <div ref={sectionRef} id="practical" className="space-y-8 scroll-mt-40">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Backpack size={24} className="text-blue-600" />
      Practical Information
    </h3>
    {(hasBring || hasWear) && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {hasBring && (
      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Backpack size={20} className="text-blue-600" />
          What to Bring
        </h4>
        <ul className="space-y-2">
          {enhancement.whatToBring?.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      )}

      {hasWear && (
      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sun size={20} className="text-yellow-600" />
          What to Wear
        </h4>
        <ul className="space-y-2">
          {enhancement.whatToWear?.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      )}
    </div>
    )}

    {enhancement.physicalRequirements && (
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Mountain size={20} />
          Physical Requirements
        </h4>
        <p className="text-blue-800 text-sm leading-relaxed">{enhancement.physicalRequirements}</p>
      </div>
    )}

    {(enhancement.notSuitableFor?.length || enhancement.needToKnow?.length) ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {enhancement.notSuitableFor && enhancement.notSuitableFor.length > 0 && (
          <div className="bg-rose-50 p-6 rounded-xl border border-rose-200">
            <h4 className="font-bold text-rose-900 mb-4">Not suitable for</h4>
            <ul className="space-y-2">
              {enhancement.notSuitableFor.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-rose-800">
                  <X size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {enhancement.needToKnow && enhancement.needToKnow.length > 0 && (
          <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
            <h4 className="font-bold text-amber-900 mb-4">Need to know</h4>
            <ul className="space-y-2">
              {enhancement.needToKnow.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-amber-900">
                  <Info size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ) : null}

    {enhancement.groupSize && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-white border border-slate-200 rounded-lg">
          <Users size={24} className="text-slate-600 mx-auto mb-2" />
          <div className="font-bold text-lg text-slate-800">
            {enhancement.groupSize.min}-{enhancement.groupSize.max}
          </div>
          <div className="text-sm text-slate-500">Participants</div>
        </div>
        <div className="text-center p-4 bg-white border border-slate-200 rounded-lg">
          <Languages size={24} className="text-slate-600 mx-auto mb-2" />
          <div className="font-bold text-lg text-slate-800">Multi</div>
          <div className="text-sm text-slate-500">Languages</div>
        </div>
        <div className="text-center p-4 bg-white border border-slate-200 rounded-lg">
          <Shield size={24} className="text-slate-600 mx-auto mb-2" />
          <div className="font-bold text-lg text-slate-800">Safe</div>
          <div className="text-sm text-slate-500">& Secure</div>
        </div>
      </div>
    )}
  </div>
  );
};

const AccessibilitySection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const hasAccess = (enhancement.accessibilityInfo?.length ?? 0) > 0;
  const hasSafety = (enhancement.healthSafety?.length ?? 0) > 0;
  if (!hasAccess && !hasSafety && !enhancement.transportationDetails) return null;

  return (
  <div ref={sectionRef} id="accessibility" className="space-y-6 scroll-mt-40">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Accessibility size={24} className="text-purple-600" />
      Accessibility & Special Requirements
    </h3>

    {(hasAccess || hasSafety) && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {hasAccess && (
      <div className="bg-purple-50 p-6 rounded-xl">
        <h4 className="font-bold text-purple-900 mb-4">Accessibility Information</h4>
        <ul className="space-y-3">
          {enhancement.accessibilityInfo?.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-purple-800">
              <Info size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      )}

      {hasSafety && (
      <div className="bg-green-50 p-6 rounded-xl">
        <h4 className="font-bold text-green-900 mb-4">Health & Safety Measures</h4>
        <ul className="space-y-3">
          {enhancement.healthSafety?.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-green-800">
              <Shield size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      )}
    </div>
    )}

    {enhancement.transportationDetails && (
      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Bus size={20} className="text-blue-600" />
          Transportation Details
        </h4>
        <p className="text-slate-700 text-sm leading-relaxed">{enhancement.transportationDetails}</p>
      </div>
    )}
  </div>
  );
};

const PoliciesSection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const policies = [
    { key: 'weather', value: enhancement.weatherPolicy, title: 'Weather Policy', icon: Umbrella,
      wrap: 'bg-sky-50', head: 'text-sky-900', tint: 'text-sky-600', body: 'text-sky-800' },
    { key: 'photo', value: enhancement.photoPolicy, title: 'Photography Policy', icon: Camera,
      wrap: 'bg-pink-50', head: 'text-pink-900', tint: 'text-pink-600', body: 'text-pink-800' },
    { key: 'tip', value: enhancement.tipPolicy, title: 'Gratuity Policy', icon: CreditCard,
      wrap: 'bg-yellow-50', head: 'text-yellow-900', tint: 'text-yellow-600', body: 'text-yellow-800' },
    { key: 'meal', value: enhancement.mealInfo, title: 'Meal Information', icon: Utensils,
      wrap: 'bg-orange-50', head: 'text-orange-900', tint: 'text-orange-600', body: 'text-orange-800' },
  ].filter((policy) => Boolean(policy.value));

  if (policies.length === 0) return null;

  return (
  <div ref={sectionRef} id="policies" className="space-y-6 scroll-mt-40">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Shield size={24} className="text-red-600" />
      Policies
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {policies.map(({ key, value, title, icon: Icon, wrap, head, tint, body }) => (
        <div key={key} className={`${wrap} p-6 rounded-xl`}>
          <h4 className={`font-bold ${head} mb-3 flex items-center gap-2`}>
            <Icon size={20} className={tint} />
            {title}
          </h4>
          <p className={`${body} text-sm leading-relaxed`}>{value}</p>
        </div>
      ))}
    </div>
  </div>
  );
};

const CulturalSection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const hasHighlights = (enhancement.culturalInfo?.length ?? 0) > 0;
  const hasCustoms = (enhancement.localCustoms?.length ?? 0) > 0;
  if (!hasHighlights && !hasCustoms && !enhancement.seasonalVariations) return null;

  return (
  <div ref={sectionRef} id="cultural" className="space-y-6 scroll-mt-40">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Heart size={24} className="text-teal-600" />
      Cultural Information
    </h3>
    {(hasHighlights || hasCustoms) && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {hasHighlights && (
      <div className="bg-indigo-50 p-6 rounded-xl">
        <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Eye size={20} className="text-indigo-600" />
          Cultural Highlights
        </h4>
        <ul className="space-y-2">
          {enhancement.culturalInfo?.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-indigo-800">
              <Star size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      )}

      {hasCustoms && (
      <div className="bg-teal-50 p-6 rounded-xl">
        <h4 className="font-bold text-teal-900 mb-4 flex items-center gap-2">
          <Heart size={20} className="text-teal-600" />
          Local Customs & Etiquette
        </h4>
        <ul className="space-y-2">
          {enhancement.localCustoms?.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-teal-800">
              <Info size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      )}
    </div>
    )}

    {enhancement.seasonalVariations && (
      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Snowflake size={20} className="text-slate-600" />
          Seasonal Variations
        </h4>
        <p className="text-slate-700 text-sm leading-relaxed">{enhancement.seasonalVariations}</p>
      </div>
    )}
  </div>
  );
};

const EnhancedFAQ = ({ faqs, sectionRef }: { faqs: FAQ[], sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqsToShow = (faqs || []).filter((faq) => faq?.question?.trim() && faq?.answer?.trim());

  // No invented Q&A: the old fallback answered refund, reschedule-fee and
  // child-pricing questions on the operator's behalf.
  if (faqsToShow.length === 0) return null;

  return (
    <div ref={sectionRef} id="faq" className="space-y-4 scroll-mt-40">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <MessageCircle size={24} className="text-orange-600" />
        Frequently Asked Questions
      </h3>
      {faqsToShow.map((faq, index) => (
        <div key={index} className="border border-slate-200 rounded-lg">
          <button
            onClick={() => setOpenFaq(openFaq === index ? null : index)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-800 pr-4">{faq.question}</span>
            {openFaq === index ? (
              <ChevronUp size={20} className="text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronDown size={20} className="text-slate-500 flex-shrink-0" />
            )}
          </button>
          {openFaq === index && (
            <div className="px-4 pb-4 border-t border-slate-100">
              <p className="text-slate-600 text-sm leading-relaxed mt-3">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ReviewsSection = ({ tour, reviews, onReviewSubmitted, sectionRef, onBookNow }: {
  tour: ITour,
  reviews: Review[],
  onReviewSubmitted: (review: Review) => void,
  sectionRef: React.RefObject<HTMLDivElement | null>,
  onBookNow: () => void,
}) => {
  const [currentReviews, setCurrentReviews] = useState<Review[]>(reviews);

  const handleReviewUpdated = (updatedReview: Review) => {
    setCurrentReviews(prevReviews => 
      prevReviews.map(review => 
        review._id === updatedReview._id ? updatedReview : review
      )
    );
  };

  const handleReviewDeleted = (reviewId: string) => {
    setCurrentReviews(prevReviews => 
      prevReviews.filter(review => review._id !== reviewId)
    );
  };

  const handleNewReview = (newReview: Review) => {
    setCurrentReviews(prevReviews => [newReview, ...prevReviews]);
    onReviewSubmitted(newReview);
  };

  // Only real reviews produce an average. Falling back to the admin-set
  // tour.rating here is what printed "4.8 (0 reviews)" above the empty
  // review list.
  const averageRating = currentReviews.length > 0
    ? (currentReviews.reduce((acc, review) => acc + review.rating, 0) / currentReviews.length).toFixed(1)
    : null;

  return (
    <div ref={sectionRef} id="reviews" className="space-y-6 scroll-mt-40">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Reviews</h2>
        {averageRating && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star size={18} className="text-yellow-500 fill-current" />
              <span className="font-bold text-lg">{averageRating}</span>
            </div>
            <span className="text-slate-500">({reviewCountLabel(currentReviews)})</span>
          </div>
        )}
      </div>

      <ReviewsStructuredData />
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <ReviewList
          reviews={currentReviews}
          onReviewUpdated={handleReviewUpdated}
          onReviewDeleted={handleReviewDeleted}
        />

        <div className="border-t border-slate-200 p-6">
          <ReviewForm
            tourId={String(tour._id)}
            onReviewSubmitted={handleNewReview}
            onBookNow={onBookNow}
          />
        </div>
        
        <div className="container mx-auto px-4 my-8">
          <ElfsightWidget />
        </div>
      </div>
    </div>
  );
};

const ExperienceDescription = ({ html }: { html: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-8 w-full">
      <div className="relative">
        <div
          className={`prose prose-slate text-[16px] leading-7 text-slate-600 transition-[max-height] duration-300 md:text-[17px] md:leading-8 [&_p]:mb-5 [&_p:last-child]:mb-0 ${isExpanded ? 'max-h-[80rem]' : 'max-h-72 overflow-hidden'}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {!isExpanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Show less' : 'Read full description'}
      </button>
    </div>
  );
};

const OverviewSection = ({ tour, sectionRef }: { tour: ITour, sectionRef: React.RefObject<HTMLDivElement | null> }) => (
  <div ref={sectionRef} id="overview" className="space-y-8 scroll-mt-40">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-600">The experience</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">About this experience</h2>
      </div>
      <ExperienceDescription html={formatExperienceDescription(sanitizeRichHtml(tour.longDescription || tour.description))} />
      <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-7 md:grid-cols-2 md:gap-5">
        {tour.includes && tour.includes.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
            <h3 className="mb-4 flex items-center gap-2.5 text-lg font-semibold text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50"><CheckCircle size={18} className="text-emerald-600" /></span>
              What&apos;s included
            </h3>
            <ul className="space-y-3">
              {tour.includes.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-600">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <span className="text-sm leading-6">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tour.highlights && tour.highlights.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
            <h3 className="mb-4 flex items-center gap-2.5 text-lg font-semibold text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50"><Star size={18} className="fill-current text-amber-500" /></span>
              Highlights
            </h3>
            <ul className="space-y-3">
              {tour.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-600">
                  <Star size={16} className="mt-0.5 flex-shrink-0 fill-current text-amber-500" />
                  <span className="text-sm leading-6">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
        <Calendar className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="font-semibold text-slate-900">Cancellation & refunds</h3>
        <p className="text-sm text-slate-600">{CANCELLATION_POLICY_SUMMARY}</p>
      </div>
      <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
        <Users className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="font-semibold text-slate-900">Group Friendly</h3>
        <p className="text-sm text-slate-600">Perfect for all group sizes</p>
      </div>
      <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
        <Smartphone className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="font-semibold text-slate-900">Mobile Ticket</h3>
        <p className="text-sm text-slate-600">Show on your smartphone</p>
      </div>
    </div>
  </div>
);

// Main interface
interface TourPageClientProps {
  tour: ITour;
  relatedTours: ITour[];
  initialReviews?: Review[];
  // Server-prefetched stop-sale state keyed by YYYY-MM-DD, piped into
  // BookingSidebar so the calendar has accurate state on first paint.
  initialStopSaleDates?: Record<
    string,
    { status: 'full' | 'partial'; stoppedOptionIds: string[]; reasons: Record<string, string> }
  >;
}

// Main TourPageClient component
export default function TourPageClient({ tour, relatedTours, initialReviews = [], initialStopSaleDates }: TourPageClientProps) {
  const breadcrumbs = buildContentBreadcrumbs({
    currentTitle: tour.title,
    breadcrumbLabel: tour.breadcrumbLabel,
    parentPage: tour.parentPage,
    rootLabel: 'Tours',
    rootHref: '/search',
  });
  const { formatPrice } = useSettings();
  const tourBasePricing = effectiveTourPrice(tour);
  const { addToCart } = useCart();
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  
  const [reviews, setReviews] = useState<Review[]>(initialReviews);

  const tourIsWishlisted = isWishlisted(String(tour._id));

  const handleReviewSubmitted = (newReview: Review) => {
    setReviews(prevReviews => [newReview, ...prevReviews]);
    toast.success('Review submitted successfully!');
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tourIsWishlisted) {
      removeFromWishlist(String(tour._id));
      toast.success('Removed from wishlist');
    } else {
      addToWishlist(tour as unknown as WishlistTour);
      toast.success('Added to wishlist!');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: tour.title,
      text: `Check out this amazing tour: ${tour.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error: unknown) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Tour link copied to clipboard!');
      } catch {
        toast.error('Could not copy link.');
      }
    }
  };

  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { isVisible: isHeaderVisible } = useScrollDirection();

  const overviewRef = useRef<HTMLDivElement>(null);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const practicalRef = useRef<HTMLDivElement>(null);
  const accessibilityRef = useRef<HTMLDivElement>(null);
  const policiesRef = useRef<HTMLDivElement>(null);
  const culturalRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const meetingMapHref = meetingPointMapUrl(tour.meetingPoint);
  const meetingMapEmbed = meetingPointEmbedUrl(tour.meetingPoint);

  const inViewOptions = { amount: 0.1 as const };
  const isOverviewInView = useInView(overviewRef, inViewOptions);
  const isItineraryInView = useInView(itineraryRef, inViewOptions);
  const isPracticalInView = useInView(practicalRef, inViewOptions);
  const isAccessibilityInView = useInView(accessibilityRef, inViewOptions);
  const isPoliciesInView = useInView(policiesRef, inViewOptions);
  const isCulturalInView = useInView(culturalRef, inViewOptions);
  const isReviewsInView = useInView(reviewsRef, inViewOptions);
  const isFaqInView = useInView(faqRef, inViewOptions);

  useEffect(() => {
    const visibleTab = isFaqInView ? 'faq'
      : isReviewsInView ? 'reviews'
      : isCulturalInView ? 'cultural'
      : isPoliciesInView ? 'policies'
      : isAccessibilityInView ? 'accessibility'
      : isPracticalInView ? 'practical'
      : isItineraryInView ? 'itinerary'
      : isOverviewInView ? 'overview'
      : null;
    if (visibleTab) queueMicrotask(() => setActiveTab(visibleTab));
  }, [
    isOverviewInView, isItineraryInView, isPracticalInView, isAccessibilityInView,
    isPoliciesInView, isCulturalInView, isReviewsInView, isFaqInView
  ]);

  const scrollToSection = (id: string) => {
    let ref;
    switch (id) {
      case 'overview': ref = overviewRef; break;
      case 'itinerary': ref = itineraryRef; break;
      case 'practical': ref = practicalRef; break;
      case 'accessibility': ref = accessibilityRef; break;
      case 'policies': ref = policiesRef; break;
      case 'cultural': ref = culturalRef; break;
      case 'reviews': ref = reviewsRef; break;
      case 'faq': ref = faqRef; break;
    }

    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const enhancement = extractEnhancementData(tour);

  const tourImages = [tour.image, ...(tour.images || [])].filter(Boolean);
  const selectedImageSeo = imageMetadataFor(
    tourImages[selectedImageIndex],
    tour.imageMetadata,
    `${tour.title} image ${selectedImageIndex + 1}`
  );

  // A tab must not jump to a section that renders nothing, so each one is
  // gated on the same content its section requires.
  const hasAny = (...values: Array<string[] | string | object | undefined>) =>
    values.some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye, show: true },
    { id: 'itinerary', label: 'Itinerary', icon: Clock, show: (enhancement.itinerary?.length ?? 0) > 0 },
    { id: 'practical', label: 'What to Know', icon: Backpack,
      show: hasAny(enhancement.whatToBring, enhancement.whatToWear, enhancement.physicalRequirements,
        enhancement.notSuitableFor, enhancement.needToKnow, enhancement.groupSize) },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility,
      show: hasAny(enhancement.accessibilityInfo, enhancement.healthSafety, enhancement.transportationDetails) },
    { id: 'policies', label: 'Policies', icon: Shield,
      show: hasAny(enhancement.weatherPolicy, enhancement.photoPolicy, enhancement.tipPolicy, enhancement.mealInfo) },
    { id: 'cultural', label: 'Cultural Info', icon: Heart,
      show: hasAny(enhancement.culturalInfo, enhancement.localCustoms, enhancement.seasonalVariations) },
    { id: 'reviews', label: 'Reviews', icon: Star, show: true },
    { id: 'faq', label: 'FAQ', icon: MessageCircle,
      show: (tour.faq || []).some((faq) => faq?.question?.trim() && faq?.answer?.trim()) }
  ].filter((tab) => tab.show);

  const handleQuickAdd = async () => {
    if (isAdding) return;
    setIsAdding(true);
    setLiveMessage('Adding tour to cart');

    try {
      const quickAddCartItem: CartItem = {
        ...(tour as unknown as WishlistTour),
        uniqueId: `${tour._id}-quick-add-${Date.now()}`,
        quantity: 1,
        childQuantity: 0,
        infantQuantity: 0,
        selectedDate: toDateOnlyString(new Date()),
        selectedTime: 'Anytime',
        selectedAddOns: {},
        totalPrice: tourBasePricing.price,
      };
      addToCart(quickAddCartItem);
      setAdded(true);
      setLiveMessage('Added to cart');

      setTimeout(() => {
        setAdded(false);
      }, 2500);
    } catch (err: unknown) {
      console.error('Add to cart failed:', err);
      setLiveMessage('Failed to add to cart. Please try again.');
      setTimeout(() => {
        setLiveMessage('');
      }, 2500);
    } finally {
      setIsAdding(false);
    }
  };

  const openBookingSidebar = () => {
    setBookingSidebarOpen(true);
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {isLightboxOpen && (
          <Lightbox
            images={tourImages}
            selectedIndex={selectedImageIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

<main className="bg-white pt-16 md:pt-20">
        <div className="bg-slate-50/50 py-3 border-b border-slate-200/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 text-xs">
                <ContentBreadcrumbs items={breadcrumbs} />
              </div>
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 text-red-600 font-semibold text-sm hover:underline transition-colors whitespace-nowrap"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back to all tours</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-4">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="relative">
                {/* Tags section removed */}

                <div 
                  className="relative rounded-xl overflow-hidden shadow-lg mb-6 group cursor-pointer"
                  onClick={() => openLightbox(selectedImageIndex)}
                >
                  <Image
                    src={tourImages[selectedImageIndex]}
                    alt={selectedImageSeo.alt}
                    title={selectedImageSeo.title}
                    width={1200}
                    height={700}
                    className="w-full h-[420px] md:h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="text-white w-16 h-16" />
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={handleWishlistToggle}
                      className={`p-3 rounded-full backdrop-blur-sm transition-colors shadow-sm ${
                        tourIsWishlisted
                          ? 'bg-red-600 text-white'
                          : 'bg-white/80 text-slate-600 hover:bg-white hover:text-red-600'
                      }`}
                      aria-pressed={tourIsWishlisted}
                      aria-label={tourIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart size={20} fill={tourIsWishlisted ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-slate-600 hover:bg-white hover:text-slate-800 transition-colors shadow-sm"
                      aria-label="Share"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {tourImages.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tourImages.map((image, index) => {
                      const imageSeo = imageMetadataFor(image, tour.imageMetadata, `${tour.title} image ${index + 1}`);
                      return (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all transform ${
                            selectedImageIndex === index
                                ? 'border-red-600 scale-105 shadow'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}
                        aria-label={`View image ${index + 1}`}
                      >
                        <Image
                          src={image}
                          alt={imageSeo.alt}
                          title={imageSeo.title}
                          width={80}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1 pr-6">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-3">
                      {tour.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
                      {provableRating(tour.rating, reviews) && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star size={16} className="text-yellow-500 fill-current" />
                            <span className="font-semibold text-slate-800">{tour.rating}</span>
                          </div>
                          <span className="text-slate-500">({reviews?.length} reviews)</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{tour.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={16} />
                        <span>{typeof tour.destination === 'string' ? tour.destination : (tour.destination as unknown as { name?: string })?.name || 'Destination'}</span>
                      </div>
                    </div>
                  </div>

                  <TourPriceDisplay tour={tour} formatPrice={formatPrice} />
                </div>
              </div>

              <TabNavigation
                activeTab={activeTab}
                tabs={tabs}
                scrollToSection={scrollToSection}
                isHeaderVisible={isHeaderVisible}
              />

              <OverviewSection tour={tour} sectionRef={overviewRef} />
              
              {enhancement.itinerary && enhancement.itinerary.length > 0 && (
                <ItinerarySection itinerary={enhancement.itinerary} tourLocation={tour.location} sectionRef={itineraryRef} />
              )}
              
              <PracticalInfoSection enhancement={enhancement} sectionRef={practicalRef} />
              <AccessibilitySection enhancement={enhancement} sectionRef={accessibilityRef} />
              <PoliciesSection enhancement={enhancement} sectionRef={policiesRef} />
              <CulturalSection enhancement={enhancement} sectionRef={culturalRef} />
              
              <ReviewsSection 
                tour={tour} 
                reviews={reviews} 
                onReviewSubmitted={handleReviewSubmitted} 
                sectionRef={reviewsRef} 
                onBookNow={openBookingSidebar}
              />
              
              <EnhancedFAQ faqs={tour.faq || []} sectionRef={faqRef} />

              {tour.meetingPoint && meetingMapHref && meetingMapEmbed && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Meeting point</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <MapPin className="text-red-600 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-semibold text-slate-800">{tour.meetingPoint}</p>
                        <p className="text-sm text-slate-600 mt-1">Check-in 15 minutes before departure time</p>
                        <a
                          href={meetingMapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:underline text-sm font-medium mt-2 inline-flex items-center gap-1"
                        >
                          <Navigation size={14} />
                          Open in Google Maps
                        </a>
                      </div>
                    </div>

                    {/* Embedded Map */}
                    <div className="relative w-full h-[300px] rounded-lg overflow-hidden shadow-md border border-slate-200">
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Map of ${tour.meetingPoint}`}
                        src={meetingMapEmbed}
                      ></iframe>
                    </div>
                  </div>
                </div>
              )}

              {relatedTours.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">You might also like</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedTours.map((relatedTour) => (
                      <Link key={String(relatedTour._id)} href={contentPath('tour', relatedTour.slug, relatedTour.urlType, (relatedTour.destination as { slug?: string } | undefined)?.slug)} className="group">
                        <div className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative">
                            <Image
                              src={relatedTour.image}
                              alt={relatedTour.title}
                              width={300}
                              height={200}
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {getDisplayTags(relatedTour.tags).length > 0 && (
                              <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                {getDisplayTags(relatedTour.tags).map((tag, index) => (
                                  <span
                                    key={`${String(relatedTour._id)}-${index}-${tag}`}
                                    className={`px-2 py-1 text-xs font-bold rounded ${
                                      tag.includes('%') ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                                    }`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-bold text-sm text-slate-800 mb-1 line-clamp-2">{relatedTour.title}</h3>
                            <div className="flex items-center gap-1 mb-1 text-xs text-slate-500">
                              <Clock size={12} />
                              <span>{relatedTour.duration}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Star size={12} className="text-yellow-500 fill-current" />
                                <span className="text-xs font-bold">{relatedTour.rating}</span>
                              </div>
                              <span className="font-bold text-red-600">{formatPrice(relatedTour.discountPrice)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
                  <div className="mb-6">
                    <TourPriceDisplay
                      tour={tour}
                      formatPrice={formatPrice}
                      align="center"
                      priceClassName="text-4xl font-extrabold text-red-600"
                    />
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Clock size={20} className="text-red-500" />
                      <span>Duration: {tour.duration}</span>
                    </div>
                    {ratingLabel(tour.rating, reviews) && (
                      <div className="flex items-center gap-3 text-slate-600">
                        <Star size={20} className="text-yellow-500" />
                        <span>Rating: {ratingLabel(tour.rating, reviews)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-slate-600">
                      <Users size={20} className="text-blue-500" />
                      <span>Available daily</span>
                    </div>
                    {enhancement.groupSize && (
                      <div className="flex items-center gap-3 text-slate-600">
                        <Users size={20} className="text-green-500" />
                        <span>Group size: {enhancement.groupSize.min}-{enhancement.groupSize.max} people</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      data-testid="open-booking-drawer"
                      onClick={openBookingSidebar}
                      className="shimmer-effect w-full bg-red-600 text-white font-bold py-4 px-6 rounded-full hover:bg-red-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <span className="shimmer-line"></span>
                      <Calendar size={20} />
                      <span>Select Date & Time</span>
                    </button>

                    <button
                      onClick={handleQuickAdd}
                      disabled={isAdding}
                      className={`shimmer-effect w-full relative overflow-hidden py-3 px-6 rounded-full border-2 font-bold flex items-center justify-center gap-2 transition-all duration-300 focus:outline-none ${added
                          ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105'
                          : 'bg-white text-red-600 border-red-600 hover:bg-red-50'
                        }`}
                      aria-live="polite"
                      aria-disabled={isAdding}
                    >
                      <span className="shimmer-line"></span>
                      {isAdding && (
                        <svg
                          className="animate-spin -ml-1 mr-2 h-5 w-5 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          ></path>
                        </svg>
                      )}

                      {added ? (
                        <>
                          <CheckCircle size={18} />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={18} />
                          <span>Quick Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <span>Tiered refunds</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone size={16} className="text-blue-600" />
                        <span>Mobile ticket</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-purple-600" />
                        <span>Safe & secure</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Languages size={16} className="text-orange-600" />
                        <span>Multi-language</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Headphones size={20} className="text-blue-600" />
                    Need help?
                  </h3>
                  <div className="space-y-3">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        requestHostedAISearch({
                          query: `Tell me more about ${tour.title}`,
                          mode: 'ai',
                          locale: document.documentElement.lang.split('-')[0],
                        });
                      }}
                      className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors w-full text-left"
                    >
                      <MessageCircle size={18} />
                      <span>Ask AI about this tour</span>
                    </button>
                    <a href="tel:+201142255624" className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
                      <Phone size={18} />
                      <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>+20 11 42255624</span>
                    </a>
                    <a href="mailto:booking@egypt-excursionsonline.com" className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
                      <Mail size={18} />
                      <span>Email support</span>
                    </a>
                  </div>
                  <div className="mt-4 text-xs text-slate-500">
                    <p>Available 24/7 • Average response time: 5 minutes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>


      <BookingSidebar isOpen={isBookingSidebarOpen} onClose={() => setBookingSidebarOpen(false)} tour={tour as unknown as React.ComponentProps<typeof BookingSidebar>['tour']} initialStopSaleDates={initialStopSaleDates} />

      <StickyBookButton
        price={tourBasePricing.price}
        currency={'$'}
        onClick={openBookingSidebar}
        hidden={isBookingSidebarOpen}
      />

      {/* AI Magic Widget for Tour Pages */}

      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .shimmer-effect {
          position: relative;
          overflow: hidden;
        }
        .shimmer-effect .shimmer-line {
          position: absolute;
          top: 0;
          left: -150%;
          width: 75%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          animation: shimmer 2.5s infinite;
        }
        @keyframes shimmer {
          100% {
            left: 150%;
          }
        }
      `}</style>
    </>
  );
}

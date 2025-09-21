// app/tour/[slug]/TourPageClient.tsx
'use client';
// Add these lines to your existing imports
import { useWishlist } from '@/contexts/WishlistContext';
import toast from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  ArrowLeft, Clock, Star, Users, ShoppingCart, Calendar, MapPin,
  Info, CheckCircle, Heart, Share2, MessageCircle, Camera, ChevronDown,
  ChevronUp, Shield, Umbrella, Thermometer, Bus, Utensils, Mountain,
  Languages, CreditCard, Phone, Mail, AlertCircle, Car, Plane,
  Navigation, Backpack, Sun, CloudRain, Snowflake, Eye, Gift,
  Accessibility, Baby, PawPrint, Smartphone, Wifi, Headphones,
  ChevronLeft, ChevronRight, X, ZoomIn
} from 'lucide-react';

// Components
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookingSidebar from '@/components/BookingSidebar';
import StickyBookButton from '@/components/StickyBookButton';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewForm from '@/components/reviews/ReviewForm';

// Hooks and Types
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { Tour, CartItem, Review as ReviewType } from '@/types';

// Enhanced interfaces for additional tour data
interface ItineraryItem {
  time: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  includes?: string[];
}

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
}

// The Client Component receives the fetched data as props.
interface TourPageClientProps {
  tour: Tour;
  relatedTours: Tour[];
  initialReviews: ReviewType[];
}

// Extract enhancement data from the actual tour object with GENERIC fallbacks
const extractEnhancementData = (tour: Tour): TourEnhancement => {
  return {
    itinerary: tour.itinerary || [],
    whatToBring: tour.whatToBring || [
      "Camera for photos",
      "Comfortable walking shoes",
      "Valid ID or passport",
      "Weather-appropriate clothing",
      "Water bottle"
    ],
    whatToWear: tour.whatToWear || [
      "Comfortable walking shoes",
      "Weather-appropriate clothing", 
      "Modest attire for religious sites",
      "Layers for varying temperatures"
    ],
    physicalRequirements: tour.physicalRequirements || "Moderate walking required. Tour involves stairs and uneven surfaces. Please inform us of any mobility concerns.",
    accessibilityInfo: tour.accessibilityInfo || [
      "Limited wheelchair accessibility - please contact us in advance",
      "Audio guides available for hearing impaired visitors",
      "Service animals are welcome",
      "Please inform us of any special requirements when booking"
    ],
    groupSize: tour.groupSize || { min: 1, max: 20 },
    transportationDetails: tour.transportationDetails || "Meeting point instructions will be provided upon booking confirmation.",
    mealInfo: tour.mealInfo || "No meals included unless specified. Local restaurant recommendations available from your guide.",
    weatherPolicy: tour.weatherPolicy || "Tours operate rain or shine. In case of severe weather, tours may be rescheduled or refunded.",
    photoPolicy: tour.photoPolicy || "Photography is encouraged. Please respect photography restrictions at certain venues and other guests' privacy.",
    tipPolicy: tour.tipPolicy || "Gratuities are not included but are appreciated for exceptional service.",
    healthSafety: tour.healthSafety || [
      "Enhanced safety protocols in place",
      "Hand sanitizer available",
      "First aid trained guides",
      "Emergency procedures established",
      "Local health guidelines followed"
    ],
    culturalInfo: tour.culturalInfo || [
      "Learn about local history and culture",
      "Discover architectural highlights", 
      "Understand local traditions and customs",
      "Experience authentic local atmosphere",
      "Professional guide commentary"
    ],
    seasonalVariations: tour.seasonalVariations || "Tour experience may vary by season. Check specific seasonal considerations when booking.",
    localCustoms: tour.localCustoms || [
      "Arrive at meeting point 15 minutes early",
      "Respect local customs and dress codes",
      "Follow guide instructions at all times",
      "Be respectful of other tour participants",
      "Ask questions - guides love sharing knowledge!"
    ]
  };
};

// -----------------------------------------------------------------------------
// Lightbox Component
// -----------------------------------------------------------------------------
const Lightbox = ({ images, selectedIndex, onClose }: { images: string[], selectedIndex: number, onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-50"
        aria-label="Close lightbox"
      >
        <X size={32} />
      </button>

      {/* Main Image Display */}
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

      {/* Previous Button */}
      <button
        onClick={prevImage}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Previous image"
      >
        <ChevronLeft size={28} />
      </button>

      {/* Next Button */}
      <button
        onClick={nextImage}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Next image"
      >
        <ChevronRight size={28} />
      </button>
       {/* Image Counter */}
       <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full"
        onClick={(e) => e.stopPropagation()}
       >
        {currentIndex + 1} / {images.length}
      </div>
    </motion.div>
  );
};

// -----------------------------------------------------------------------------
// useScrollDirection hook
// -----------------------------------------------------------------------------
function useScrollDirection() {
  const [isVisible, setIsVisible] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? window.pageYOffset : 0;
    const updateScroll = () => {
      const currentScrollY = window.pageYOffset;
      // Header is visible if scrolling up or near the top
      setIsVisible(lastScrollY > currentScrollY || currentScrollY < 100);
      setScrollY(currentScrollY);
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);
  return { scrollY, isVisible };
}

const TabNavigation = ({ activeTab, tabs, scrollToSection, isHeaderVisible }: any) => {
  const stickyTop = isHeaderVisible ? 'top-16 md:top-20' : 'top-0';
  const navRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Update arrow visibility based on scroll position
  const updateScrollButtons = () => {
    const container = navRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 8);
    setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 8);
  };

  // Scroll container by delta (positive = right, negative = left)
  const scrollBy = (delta: number) => {
    const container = navRef.current;
    if (!container) return;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Ensure active tab is fully visible; called when activeTab changes
  useEffect(() => {
    const container = navRef.current;
    if (!container || !activeTab) return;

   const selector = `a[data-tab-id="${activeTab}"]`;
let activeEl = container.querySelector(selector) as HTMLElement | null;

if (!activeEl) {
  // try fallback selector (href)
  const fallback = container.querySelector(`a[href="#${activeTab}"]`) as HTMLElement | null;
  if (!fallback) return;
  activeEl = fallback;
}

    // element bounding rects relative to container
    const elRect = activeEl.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    const elLeft = elRect.left - contRect.left + container.scrollLeft;
    const elRight = elLeft + elRect.width;
    const visibleLeft = container.scrollLeft;
    const visibleRight = container.scrollLeft + container.clientWidth;

    // If element is left of visible area, scroll so it becomes visible (with small padding)
    if (elLeft < visibleLeft + 12) {
      container.scrollTo({ left: Math.max(0, elLeft - 12), behavior: 'smooth' });
    }
    // If element is right of visible area, scroll so it becomes visible
    else if (elRight > visibleRight - 12) {
      const delta = elRight - visibleRight + 12;
      container.scrollTo({ left: container.scrollLeft + delta, behavior: 'smooth' });
    }

    // update arrows after scrolling
    // small timeout to allow smooth scroll to update values (also runs immediately)
    setTimeout(updateScrollButtons, 250);
    updateScrollButtons();
  }, [activeTab]);

  // Add scroll listener to toggle arrow states
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
    bg-white/30 backdrop-blur-md border-b border-white/20 shadow-lg`}
>
      <div className="container mx-auto px-2 sm:px-4">
        <div className="relative">
          {/* Left arrow button */}
          <button
            aria-hidden={!canScrollLeft}
            aria-label="Scroll tabs left"
            onClick={() => scrollBy(-160)}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white shadow-sm transition-opacity ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Scrollable tab strip */}
          <div
            ref={navRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-2 scroll-smooth"
            role="tablist"
            aria-label="Tour sections"
          >
            {tabs.map((tab: any) => (
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

          {/* Right arrow button */}
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


const ItineraryIcon = ({ iconType, className = "w-5 h-5" }: { iconType: string, className?: string }) => {
  const icons: { [key: string]: JSX.Element } = {
    location: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    ),
    camera: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 15.2c-2.07 0-3.75-1.68-3.75-3.75S9.93 7.7 12 7.7s3.75 1.68 3.75 3.75S14.07 15.2 12 15.2zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"/>
      </svg>
    ),
    food: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.20-1.10-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
      </svg>
    ),
    monument: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm6 0h-2v7h2v-7zm.5 9H5v2h14v-2zm-6.5-9V8.5c0-.83-.67-1.5-1.5-1.5S9.5 7.67 9.5 8.5V10h3zm2.5 0V8.5C14.5 6.57 12.93 5 11 5S7.5 6.57 7.5 8.5V10H5v2h14v-2h-2.5z"/>
      </svg>
    ),
    transport: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    ),
    activity: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63c-.34-1.02-1.31-1.73-2.39-1.73-.85 0-1.66.5-2.02 1.33L14 11.6V22h2zm-7.5-.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-7.5l1.5-3.6L15.5 8H13l-1.8 2.4L7 7v4.5h2v5H3V2h18v3.5L12.5 14z"/>
      </svg>
    ),
    time: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
      </svg>
    ),
    info: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    ),
    shopping: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    )
  };
  
  return icons[iconType] || icons.location;
};


const ItinerarySection = ({ itinerary, sectionRef }: { itinerary: ItineraryItem[], sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="itinerary" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Clock size={24} className="text-red-600" />
      Detailed Itinerary
    </h3>
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
      {itinerary.map((item, index) => (
        <div key={index} className="relative flex items-start gap-4 pb-8">
          <div className="flex-shrink-0 w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm relative z-10">
<ItineraryIcon iconType={item.icon || 'location'} /></div>
          <div className="flex-1 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  {item.time}
                </span>
                {item.duration && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {item.duration}
                  </span>
                )}
              </div>
              {item.location && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={14} />
                  {item.location}
                </div>
              )}
            </div>
            <h4 className="font-bold text-slate-800 mb-2">{item.title}</h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-3">{item.description}</p>
            {item.includes && item.includes.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Includes:</p>
                <div className="flex flex-wrap gap-2">
                  {item.includes.map((include, i) => (
                    <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                      {include}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PracticalInfoSection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="practical" className="space-y-8 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Backpack size={24} className="text-blue-600" />
      Practical Information
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* What to Bring */}
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

      {/* What to Wear */}
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
    </div>

    {/* Physical Requirements */}
    {enhancement.physicalRequirements && (
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Mountain size={20} />
          Physical Requirements
        </h4>
        <p className="text-blue-800 text-sm leading-relaxed">{enhancement.physicalRequirements}</p>
      </div>
    )}

    {/* Group Size */}
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

const AccessibilitySection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="accessibility" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Accessibility size={24} className="text-purple-600" />
      Accessibility & Special Requirements
    </h3>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Accessibility Info */}
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

      {/* Health & Safety */}
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
    </div>

    {/* Transportation Details */}
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

const PoliciesSection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="policies" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Shield size={24} className="text-red-600" />
      Policies
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Weather Policy */}
      <div className="bg-sky-50 p-6 rounded-xl">
        <h4 className="font-bold text-sky-900 mb-3 flex items-center gap-2">
          <Umbrella size={20} className="text-sky-600" />
          Weather Policy
        </h4>
        <p className="text-sky-800 text-sm leading-relaxed">{enhancement.weatherPolicy}</p>
      </div>

      {/* Photo Policy */}
      <div className="bg-pink-50 p-6 rounded-xl">
        <h4 className="font-bold text-pink-900 mb-3 flex items-center gap-2">
          <Camera size={20} className="text-pink-600" />
          Photography Policy
        </h4>
        <p className="text-pink-800 text-sm leading-relaxed">{enhancement.photoPolicy}</p>
      </div>

      {/* Tip Policy */}
      <div className="bg-yellow-50 p-6 rounded-xl">
        <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
          <CreditCard size={20} className="text-yellow-600" />
          Gratuity Policy
        </h4>
        <p className="text-yellow-800 text-sm leading-relaxed">{enhancement.tipPolicy}</p>
      </div>

      {/* Meal Info */}
      <div className="bg-orange-50 p-6 rounded-xl">
        <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
          <Utensils size={20} className="text-orange-600" />
          Meal Information
        </h4>
        <p className="text-orange-800 text-sm leading-relaxed">{enhancement.mealInfo}</p>
      </div>
    </div>
  </div>
);

const CulturalSection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="cultural" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Heart size={24} className="text-teal-600" />
      Cultural Information
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Cultural Information */}
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

      {/* Local Customs */}
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
    </div>

    {/* Seasonal Information */}
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

// Enhanced FAQ Component - Updated to accept faqs as props
const EnhancedFAQ = ({ faqs, sectionRef }: { faqs: any[], sectionRef: React.RefObject<HTMLDivElement> }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Use provided faqs or fallback to default ones
  const faqsToShow = faqs && faqs.length > 0 ? faqs : [
    {
      question: "What happens if I'm late for the departure?",
      answer: "Please arrive 15 minutes before departure. Late arrivals cannot be accommodated due to strict departure schedules. No refunds are provided for missed departures due to tardiness."
    },
    {
      question: "Can dietary restrictions be accommodated?",
      answer: "Yes! We offer vegetarian pizza options and can accommodate most dietary restrictions with advance notice. Please inform us at least 24 hours before your tour."
    },
    {
      question: "Is this tour suitable for children?",
      answer: "Absolutely! Children 4-13 receive discounted pricing, and children 0-3 travel free. The tour is family-friendly with indoor facilities and safety measures in place."
    },
    {
      question: "What if the weather is bad?",
      answer: "Our boats are climate-controlled with glass roofs, so tours operate in most weather conditions. Only severe weather will result in cancellation with full refund."
    },
    {
      question: "Can I bring my own food or drinks?",
      answer: "Outside food and beverages are not permitted as meals and drinks are included in your tour. Special dietary needs can be accommodated with advance notice."
    },
    {
      question: "Is the boat wheelchair accessible?",
      answer: "Limited wheelchair accessibility is available. Please contact us in advance to discuss specific needs and ensure we can accommodate your requirements."
    },
    {
      question: "Can I reschedule my booking?",
      answer: "Yes, bookings can be rescheduled up to 8 hours before departure subject to availability. Changes within 8 hours may incur additional fees."
    },
    {
      question: "Are professional photos available?",
      answer: "Professional photography services can be arranged for an additional fee. Please inquire when booking. Personal photography is encouraged throughout the tour."
    }
  ];

  return (
    <div ref={sectionRef} id="faq" className="space-y-4 scroll-mt-24">
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

// Enhanced Reviews Section Component with integrated review management
const ReviewsSection = ({ tour, reviews, onReviewSubmitted, sectionRef }: { 
  tour: Tour, 
  reviews: ReviewType[], 
  onReviewSubmitted: (review: ReviewType) => void,
  sectionRef: React.RefObject<HTMLDivElement> 
}) => {
  const [currentReviews, setCurrentReviews] = useState<ReviewType[]>(reviews);

  const handleReviewUpdated = (updatedReview: ReviewType) => {
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

  const handleNewReview = (newReview: ReviewType) => {
    setCurrentReviews(prevReviews => [newReview, ...prevReviews]);
    onReviewSubmitted(newReview);
  };

  const averageRating = currentReviews.length > 0
    ? (currentReviews.reduce((acc, review) => acc + review.rating, 0) / currentReviews.length).toFixed(1)
    : tour.rating?.toFixed(1) || 'N/A';

  return (
    <div ref={sectionRef} id="reviews" className="space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Reviews</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star size={18} className="text-yellow-500 fill-current" />
            <span className="font-bold text-lg">{averageRating}</span>
          </div>
          <span className="text-slate-500">({currentReviews.length} reviews)</span>
        </div>
      </div>
      
      {/* Integrated Review List and Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <ReviewList 
          reviews={currentReviews} 
          onReviewUpdated={handleReviewUpdated}
          onReviewDeleted={handleReviewDeleted}
        />
        <div className="border-t border-slate-200 p-6">
          <ReviewForm tourId={tour._id!} onReviewSubmitted={handleNewReview} />
        </div>
      </div>
    </div>
  );
};

// Overview Section Component
const OverviewSection = ({ tour, sectionRef }: { tour: Tour, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="overview" className="space-y-8 scroll-mt-24">
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">About this experience</h2>
      <div
        className="prose prose-slate max-w-none mb-6"
        dangerouslySetInnerHTML={{ __html: tour.longDescription || tour.description }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tour.includes && tour.includes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">What's included</h3>
            <ul className="space-y-2">
              {tour.includes.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-600">
                  <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tour.highlights && tour.highlights.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Highlights</h3>
            <ul className="space-y-2">
              {tour.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-600">
                  <Star size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    {/* Quick Info Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-slate-50 p-5 rounded-lg text-center border border-slate-100">
        <Calendar className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="font-semibold text-slate-900">Free Cancellation</h3>
        <p className="text-sm text-slate-600">{tour.cancellationPolicy || 'Up to 24 hours in advance'}</p>
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

// -----------------------------------------------------------------------------
// TourPageClient component - Enhanced with review management
// -----------------------------------------------------------------------------
export default function TourPageClient({ tour, relatedTours, initialReviews }: TourPageClientProps) {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  
  // Enhanced review state management
  const [reviews, setReviews] = useState<ReviewType[]>(initialReviews);

  const tourIsWishlisted = isWishlisted(tour._id!);

  // Review handlers
  const handleReviewSubmitted = (newReview: ReviewType) => {
    setReviews(prevReviews => [newReview, ...prevReviews]);
    toast.success('Review submitted successfully!');
  };

  // --- Wishlist button handler ---
  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the lightbox from opening
    if (tourIsWishlisted) {
      removeFromWishlist(tour._id!);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist(tour);
      toast.success('Added to wishlist!');
    }
  };

  // --- Share button handler ---
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the lightbox from opening
    const shareData = {
      title: tour.title,
      text: `Check out this amazing tour: ${tour.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback for desktop browsers that don't support the native Share API
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Tour link copied to clipboard!');
      } catch (err) {
        toast.error('Could not copy link.');
      }
    }
  };

  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // --- STATE FOR LIGHTBOX ---
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

  const inViewOptions = { threshold: 0.1 };
  const isOverviewInView = useInView(overviewRef, inViewOptions);
  const isItineraryInView = useInView(itineraryRef, inViewOptions);
  const isPracticalInView = useInView(practicalRef, inViewOptions);
  const isAccessibilityInView = useInView(accessibilityRef, inViewOptions);
  const isPoliciesInView = useInView(policiesRef, inViewOptions);
  const isCulturalInView = useInView(culturalRef, inViewOptions);
  const isReviewsInView = useInView(reviewsRef, inViewOptions);
  const isFaqInView = useInView(faqRef, inViewOptions);

  useEffect(() => {
    if (isFaqInView) setActiveTab('faq');
    else if (isReviewsInView) setActiveTab('reviews');
    else if (isCulturalInView) setActiveTab('cultural');
    else if (isPoliciesInView) setActiveTab('policies');
    else if (isAccessibilityInView) setActiveTab('accessibility');
    else if (isPracticalInView) setActiveTab('practical');
    else if (isItineraryInView) setActiveTab('itinerary');
    else if (isOverviewInView) setActiveTab('overview');
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

  // CHANGED: Use real database data instead of mock data
  const enhancement = extractEnhancementData(tour);

  const tourImages = [tour.image, ...(tour.images || [])].filter(Boolean);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'itinerary', label: 'Itinerary', icon: Clock },
    { id: 'practical', label: 'What to Know', icon: Backpack },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'policies', label: 'Policies', icon: Shield },
    { id: 'cultural', label: 'Cultural Info', icon: Heart },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'faq', label: 'FAQ', icon: MessageCircle }
  ];

  const handleQuickAdd = async () => {
    if (isAdding) return;
    setIsAdding(true);
    setLiveMessage('Adding tour to cart');

    try {
      const quickAddCartItem = {
        ...tour,
        uniqueId: `${tour.id}-quick-add-${Date.now()}`,
        quantity: 1,
        childQuantity: 0,
        selectedDate: new Date().toISOString(),
        selectedTime: 'Anytime',
        selectedAddOns: {},
        totalPrice: tour.discountPrice,
      } as CartItem;
      addToCart(quickAddCartItem);
      setAdded(true);
      setLiveMessage('Added to cart');

      setTimeout(() => {
        setAdded(false);
      }, 2500);
    } catch (err) {
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
      <Header startSolid={true} />

      <AnimatePresence>
        {isLightboxOpen && (
          <Lightbox
            images={tourImages}
            selectedIndex={selectedImageIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      <main className="bg-white pt-20">
        <div className="bg-slate-50 py-4">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-slate-500 hover:text-red-600">
                Home
              </Link>
              <span className="text-slate-400">/</span>
              <Link href="/search" className="text-slate-500 hover:text-red-600">
                Tours
              </Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-800 font-medium">{tour.title}</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 text-red-600 font-semibold mb-6 hover:underline transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to all tours</span>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="relative">
                <div className="flex flex-wrap gap-2 mb-4">
                  {tour.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 text-xs font-semibold uppercase rounded-full tracking-wide leading-none ${tag.includes('%') || tag === 'Online only deal'
                          ? 'bg-red-600 text-white'
                          : tag === 'Staff favourite'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div 
                  className="relative rounded-xl overflow-hidden shadow-lg mb-6 group cursor-pointer"
                  onClick={() => openLightbox(selectedImageIndex)}
                >
                  <Image
                    src={tourImages[selectedImageIndex]}
                    alt={tour.title}
                    width={1200}
                    height={700}
                    className="w-full h-[420px] md:h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="text-white w-16 h-16" />
                  </div>
                 <div className="absolute top-4 right-4 flex gap-2">
  {/* Wishlist button */}
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
  {/* Share button */}
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
                    {tourImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all transform ${
                            selectedImageIndex === index
                                ? 'border-red-600 scale-105 shadow'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}
                        aria-label={`View image $<ItineraryIcon iconType={item.icon || 'location'} />`}
                      >
                        <Image
                          src={image}
                          alt={`${tour.title} $<ItineraryIcon iconType={item.icon || 'location'} />`}
                          width={80}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1 pr-6">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-3">
                      {tour.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star size={16} className="text-yellow-500 fill-current" />
                          <span className="font-semibold text-slate-800">{tour.rating}</span>
                        </div>
                        <span className="text-slate-500">({reviews.length} reviews)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{tour.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={16} />
                        <span>{tour.destination?.name || 'Amsterdam'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {tour.originalPrice && (
<p className="text-slate-500 line-through text-lg mb-1">{formatPrice(tour.originalPrice)}</p>                    )}
                  <p className="text-3xl md:text-4xl font-extrabold text-red-600 mb-1">
{formatPrice(tour.discountPrice)}</p>
                    <p className="text-sm text-slate-500">per person</p>
                  </div>
                </div>
              </div>

              {/* Tab Navigation with dynamic header visibility */}
              <TabNavigation
                activeTab={activeTab}
                tabs={tabs}
                scrollToSection={scrollToSection}
                isHeaderVisible={isHeaderVisible}
              />

              {/* All Sections - Using REAL database data */}
              <OverviewSection tour={tour} sectionRef={overviewRef} />
              
              {/* Only show itinerary if we have real data */}
              {enhancement.itinerary && enhancement.itinerary.length > 0 && (
                <ItinerarySection itinerary={enhancement.itinerary} sectionRef={itineraryRef} />
              )}
              
              <PracticalInfoSection enhancement={enhancement} sectionRef={practicalRef} />
              <AccessibilitySection enhancement={enhancement} sectionRef={accessibilityRef} />
              <PoliciesSection enhancement={enhancement} sectionRef={policiesRef} />
              <CulturalSection enhancement={enhancement} sectionRef={culturalRef} />
              
              {/* Enhanced Reviews Section with integrated review management */}
              <ReviewsSection 
                tour={tour} 
                reviews={reviews} 
                onReviewSubmitted={handleReviewSubmitted} 
                sectionRef={reviewsRef} 
              />
              
              {/* Use real FAQ data from the tour */}
              <EnhancedFAQ faqs={tour.faq || []} sectionRef={faqRef} />

              {/* Meeting Point */}
              {tour.meetingPoint && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Meeting point</h2>
                  <div className="flex items-start gap-4">
                    <MapPin className="text-red-600 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-semibold text-slate-800">{tour.meetingPoint}</p>
                      <p className="text-sm text-slate-600 mt-1">Check-in 15 minutes before departure time</p>
                      <button className="text-red-600 hover:underline text-sm font-medium mt-2">View on map</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Tours */}
              {relatedTours.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">You might also like</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedTours.map((relatedTour) => (
                      <Link key={relatedTour._id} href={`/tour/${relatedTour.slug}`} className="group">
                        <div className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative">
                            <Image
                              src={relatedTour.image}
                              alt={relatedTour.title}
                              width={300}
                              height={200}
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {relatedTour.tags?.map((tag, index) => (
                              <span
                                key={index}
                                className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded ${tag.includes('%') ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                                  }`}
                              >
                                {tag}
                              </span>
                            ))}
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
                              <span className="font-bold text-red-600">{formatPrice(tour.discountPrice)}</span>
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
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      {tour.originalPrice && (
<span className="text-slate-500 line-through text-lg">{formatPrice(tour.originalPrice)}</span>                      )}
<span className="text-4xl font-extrabold text-red-600">{formatPrice(tour.discountPrice || tour.price)}</span>                    </div>
                    <p className="text-sm text-slate-500">per person</p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Clock size={20} className="text-red-500" />
                      <span>Duration: {tour.duration}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Star size={20} className="text-yellow-500" />
                      <span>Rating: {tour.rating} ({reviews.length} reviews)</span>
                    </div>
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
                        <span>Free cancellation</span>
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

                {/* Help Section */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Headphones size={20} className="text-blue-600" />
                    Need help?
                  </h3>
                  <div className="space-y-3">
                    <button className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors w-full text-left">
                      <MessageCircle size={18} />
                      <span>Chat with us</span>
                    </button>
                    <a href="tel:+31204204000" className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
                      <Phone size={18} />
                      <span>+31 (0)20 420 4000</span>
                    </a>
                    <a href="mailto:info@egyptexcursionsonline.com" className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
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

      <Footer />

      <BookingSidebar isOpen={isBookingSidebarOpen} onClose={() => setBookingSidebarOpen(false)} tour={tour} />
      
      {/* Sticky Button */}
      <StickyBookButton
        price={tour.discountPrice}
        currency={'$'} 
        onClick={openBookingSidebar}
      />
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
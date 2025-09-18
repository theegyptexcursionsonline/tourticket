'use client';

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
  ChevronLeft, ChevronRight
} from 'lucide-react';

// Components
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookingSidebar from '@/components/BookingSidebar';
import StickyBookButton from '@/components/StickyBookButton'; // <-- ADD THIS IMPORT

// Hooks and Types
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { Tour, CartItem } from '@/types';

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
}

// -----------------------------------------------------------------------------
// NEW: useScrollDirection hook
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

// Mock enhanced data - in real app this would come from your database
const getEnhancedTourData = (tourId: string): TourEnhancement => {
  return {
    itinerary: [
      {
        time: "17:15",
        title: "Meet at Central Meeting Point",
        description: "Check-in and welcome aboard our comfortable glass-topped canal boat. Meet your friendly crew and fellow travelers.",
        duration: "15 minutes",
        location: "Prins Hendrikkade 25",
        includes: ["Welcome drink", "Life jacket fitting", "Safety briefing"]
      },
      {
        time: "17:30",
        title: "Departure & Canal Ring Tour",
        description: "Begin your journey through Amsterdam's UNESCO World Heritage canal ring. Pass by the historic merchant houses dating back to the Golden Age.",
        duration: "25 minutes",
        location: "Historic Canal District",
        includes: ["Audio commentary", "Photo opportunities"]
      },
      {
        time: "17:55",
        title: "Pizza Service Begins",
        description: "Enjoy freshly baked New York-style pizza while cruising past iconic Amsterdam landmarks including Anne Frank House and Westerkerk.",
        duration: "20 minutes",
        includes: ["NY Pizza per person", "Beverage selection"]
      },
      {
        time: "18:15",
        title: "Seven Bridges & Skinny Bridge",
        description: "Navigate through the famous Seven Bridges area and pass under the romantic Skinny Bridge (Magere Brug), perfect for photos.",
        duration: "15 minutes"
      },
      {
        time: "18:30",
        title: "Return Journey & Dessert",
        description: "Enjoy your Cookie Dough Ice Cream while taking in the final views of Amsterdam's beautiful canal houses and bridges as we return to the starting point.",
        duration: "15 minutes",
        includes: ["Cookie Dough Ice Cream", "Final photo opportunities"]
      }
    ],
    whatToBring: [
      "Camera or smartphone for photos",
      "Light jacket (boat can be breezy)",
      "Comfortable seating clothes",
      "Valid ID for alcohol service",
      "Cash for optional gratuities"
    ],
    whatToWear: [
      "Comfortable, weather-appropriate clothing",
      "Flat, non-slip shoes (boat deck can be wet)",
      "Layers - inside is heated but deck can be cool",
      "Avoid high heels or loose clothing near the water"
    ],
    physicalRequirements: "Low physical activity required. Guests must be able to board the boat independently (2-3 steps). Suitable for most fitness levels.",
    accessibilityInfo: [
      "Wheelchair accessibility is limited - please contact us in advance",
      "Restroom facilities available onboard",
      "Indoor seating available if weather is poor",
      "Visual impairments: audio commentary provided",
      "Hearing impairments: visual landmarks and written information available"
    ],
    groupSize: { min: 1, max: 40 },
    transportationDetails: "Climate-controlled glass-topped boat with panoramic windows. Indoor and outdoor seating available. Onboard restroom facilities.",
    mealInfo: "Fresh NY-style pizza (vegetarian options available), selection of beverages (Heineken beer, wine, soft drinks, water), Cookie Dough Ice Cream dessert. Dietary restrictions can be accommodated with advance notice.",
    weatherPolicy: "Tours operate in light rain (covered boat). Tours may be cancelled or rescheduled in severe weather conditions. Full refund provided for weather cancellations.",
    photoPolicy: "Photography encouraged! Professional photos available for purchase. Please respect other guests' privacy and ask before including them in photos.",
    tipPolicy: "Gratuities not included but appreciated for excellent service. Suggested 10-15% for exceptional experiences.",
    healthSafety: [
      "Enhanced cleaning protocols between tours",
      "Hand sanitizer stations available onboard",
      "First aid kit and trained crew onboard",
      "Life jackets provided and safety briefing given",
      "Emergency procedures clearly posted",
      "COVID-19 protocols as per government guidelines"
    ],
    culturalInfo: [
      "Learn about Amsterdam's Golden Age history (1600s)",
      "Discover the engineering marvel of the canal system",
      "Understand Dutch maritime heritage and trading history",
      "Appreciate the architectural styles of canal houses",
      "Experience modern Dutch hospitality and cuisine"
    ],
    seasonalVariations: "Spring/Summer: Extended daylight hours, outdoor seating popular. Fall/Winter: Cozy indoor atmosphere, shorter daylight, possible holiday decorations.",
    localCustoms: [
      "Dutch punctuality is highly valued - arrive 15 minutes early",
      "Tipping is appreciated but not mandatory in the Netherlands",
      "English is widely spoken by crew and guides",
      "Respect for the environment and waterways is important",
      "Photography of private residences should be respectful"
    ]
  };
};

// Enhanced Components
// -----------------------------------------------------------------------------
// NEW: TabNavigation receives isHeaderVisible prop
// -----------------------------------------------------------------------------
const TabNavigation = ({ activeTab, tabs, scrollToSection, isHeaderVisible }: any) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = direction === 'left'
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [tabs]);

  // Dynamic top position based on header visibility
  const stickyTop = isHeaderVisible ? 'top-16 md:top-20' : 'top-0';

  return (
    <div className={`sticky ${stickyTop} z-10 bg-white shadow-sm -mx-4 sm:mx-0 transition-all duration-300`}>
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scrollTabs('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white shadow-lg border border-slate-200 rounded-full flex items-center justify-center transition-all duration-200 ${showLeftArrow
              ? 'opacity-100 visible hover:bg-slate-50'
              : 'opacity-0 invisible'
            }`}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft size={16} className="text-slate-600" />
        </button>

        {/* Scrollable Tab Container */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide px-8"
          onScroll={checkScrollButtons}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <nav className="flex space-x-1 p-1 min-w-max">
            {tabs.map((tab: any) => (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(tab.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-red-600'
                  }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scrollTabs('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white shadow-lg border border-slate-200 rounded-full flex items-center justify-center transition-all duration-200 ${showRightArrow
              ? 'opacity-100 visible hover:bg-slate-50'
              : 'opacity-0 invisible'
            }`}
          aria-label="Scroll tabs right"
        >
          <ChevronRight size={16} className="text-slate-600" />
        </button>

        {/* Fade gradients */}
        <div className={`absolute left-8 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none transition-opacity duration-200 ${showLeftArrow ? 'opacity-100' : 'opacity-0'
          }`} />
        <div className={`absolute right-8 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none transition-opacity duration-200 ${showRightArrow ? 'opacity-100' : 'opacity-0'
          }`} />
      </div>
    </div>
  );
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
            {index + 1}
          </div>
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


// Enhanced FAQ Component
const EnhancedFAQ = ({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement> }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
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
      {faqs.map((faq, index) => (
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

// Reviews Section Component
const ReviewsSection = ({ tour, reviewsData, sectionRef }: { tour: Tour, reviewsData: any[], sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="reviews" className="space-y-6 scroll-mt-24">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-slate-800">Reviews</h2>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Star size={18} className="text-yellow-500 fill-current" />
          <span className="font-bold text-lg">{tour.rating}</span>
        </div>
        <span className="text-slate-500">({tour.bookings?.toLocaleString()} reviews)</span>
      </div>
    </div>
    <div className="space-y-4">
      {reviewsData.map((review) => (
        <div key={review.id} className="border-b border-slate-200 pb-4 last:border-b-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-800">{review.name}</span>
                {review.verified && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                    Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={`${i < review.rating ? 'text-yellow-500 fill-current' : 'text-slate-300'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-slate-500">{review.date}</span>
              </div>
            </div>
          </div>
          <h4 className="font-semibold text-slate-800 mb-1">{review.title}</h4>
          <p className="text-slate-600 text-sm mb-2">{review.text}</p>
          <button className="text-slate-500 hover:text-slate-700 text-xs">Helpful ({review.helpful})</button>
        </div>
      ))}
    </div>
    <button className="w-full mt-6 py-3 border-2 border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
      View all reviews
    </button>
  </div>
);

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
// NEW: TourPageClient component updated
// -----------------------------------------------------------------------------
export default function TourPageClient({ tour, relatedTours }: TourPageClientProps) {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Add this line to track header visibility
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


  // Get enhanced tour data
  const enhancement = getEnhancedTourData(tour.id!);

  // Mock reviews data, as there is no reviews API
  const reviewsData = [
    { id: 1, name: 'Sarah M.', rating: 5, date: '2 days ago', title: 'Amazing experience!', text: 'The tour was incredible and our guide was very knowledgeable and entertaining. Highly recommend!', verified: true, helpful: 12 },
    { id: 2, name: 'Marco P.', rating: 4, date: '1 week ago', title: 'Great experience', text: 'Perfect way to see the city. Only wish it was a bit longer.', verified: true, helpful: 8 }
  ];

  const tourImages = tour.images && tour.images.length > 0 ? tour.images : [tour.image];

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


  return (
    <>
      <Header startSolid={true} />

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

                <div className="relative rounded-xl overflow-hidden shadow-lg mb-6">
                  <Image
                    src={tourImages[selectedImageIndex]}
                    alt={tour.title}
                    width={1200}
                    height={700}
                    className="w-full h-[420px] md:h-[500px] object-cover"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => setIsWishlisted(!isWishlisted)}
                      className={`p-3 rounded-full backdrop-blur-sm transition-colors shadow-sm ${isWishlisted
                          ? 'bg-red-600 text-white'
                          : 'bg-white/80 text-slate-600 hover:bg-white hover:text-red-600'
                        }`}
                      aria-pressed={isWishlisted}
                      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-slate-600 hover:bg-white hover:text-slate-800 transition-colors shadow-sm"
                      aria-label="Share"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {tourImages.length > 1 && (
                  <div className="flex gap-2 mb-6 overflow-x-auto">
                    {tourImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all transform ${selectedImageIndex === index
                            ? 'border-red-600 scale-105 shadow'
                            : 'border-slate-200 hover:border-slate-300'
                          }`}
                        aria-label={`View image ${index + 1}`}
                      >
                        <Image
                          src={image}
                          alt={`${tour.title} ${index + 1}`}
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
                        <span className="text-slate-500">({tour.bookings?.toLocaleString()} reviews)</span>
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
                      <p className="text-slate-500 line-through text-lg mb-1">{formatPrice(tour.originalPrice)}</p>
                    )}
                    <p className="text-3xl md:text-4xl font-extrabold text-red-600 mb-1">
                      {formatPrice(tour.discountPrice)}
                    </p>
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

              {/* All Sections */}
              <OverviewSection tour={tour} sectionRef={overviewRef} />
              {enhancement.itinerary && <ItinerarySection itinerary={enhancement.itinerary} sectionRef={itineraryRef} />}
              <PracticalInfoSection enhancement={enhancement} sectionRef={practicalRef} />
              <AccessibilitySection enhancement={enhancement} sectionRef={accessibilityRef} />
              <PoliciesSection enhancement={enhancement} sectionRef={policiesRef} />
              <CulturalSection enhancement={enhancement} sectionRef={culturalRef} />
              <ReviewsSection tour={tour} reviewsData={reviewsData} sectionRef={reviewsRef} />
              <EnhancedFAQ sectionRef={faqRef} />

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
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      {tour.originalPrice && (
                        <span className="text-slate-500 line-through text-lg">{formatPrice(tour.originalPrice)}</span>
                      )}
                      <span className="text-4xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
                    </div>
                    <p className="text-sm text-slate-500">per person</p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Clock size={20} className="text-red-500" />
                      <span>Duration: {tour.duration}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Star size={20} className="text-yellow-500" />
                      <span>Rating: {tour.rating} ({tour.bookings?.toLocaleString()} reviews)</span>
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
      
      {/* ADD THE STICKY BUTTON COMPONENT HERE */}
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

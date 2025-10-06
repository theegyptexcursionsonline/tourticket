'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { 
    ArrowRight, Star, Tag, Clock, Users, ChevronLeft, ChevronRight, 
    Check, ShoppingCart, Award, MapPin, CheckCircle2, TrendingUp,
    Calendar, Plane, Info, Shield, Heart, MessageCircle, ChevronDown,
    Sun, Thermometer, DollarSign, Languages, Phone, AlertTriangle,
    Camera, Utensils, Hotel, Navigation, Search, Plus, Minus
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Destination, Tour, Category, CartItem, Review } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import BookingSidebar from '@/components/BookingSidebar';
import { useRecentSearches } from "@/hooks/useSearch";
import SearchModal from "@/components/SearchModel";

interface DestinationPageClientProps {
  destination: Destination;
  destinationTours: Tour[];
  allCategories: Category[];
  reviews?: Review[];
  relatedDestinations?: Destination[];
}

// --- Types for Hero ---
type TagItem = {
  id: string;
  name: string;
  position: React.CSSProperties;
  highlight?: boolean;
};

// --- Hero Helper Hooks ---
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < breakpoint);
    if (typeof window !== "undefined") {
      checkIsMobile();
      window.addEventListener("resize", checkIsMobile);
      return () => window.removeEventListener("resize", checkIsMobile);
    }
  }, [breakpoint]);
  
  return isMobile;
};

// --- Tag Positions ---
const TAG_POSITIONS_DESKTOP: React.CSSProperties[] = [
  { top: "15%", left: "58%" }, 
  { top: "18%", right: "12%" }, 
  { top: "38%", left: "60%" },
  { top: "28%", right: "18%" }, 
  { top: "48%", right: "22%" }, 
  { top: "58%", left: "55%" },
  { top: "42%", right: "8%" }, 
  { top: "68%", right: "15%" }, 
  { top: "75%", left: "58%" },
  { top: "22%", left: "52%" },
  { top: "52%", left: "65%" },
  { top: "82%", right: "20%" },
];

const TAG_POSITIONS_MOBILE: React.CSSProperties[] = [
  { top: "12%", left: "5%" }, 
  { top: "22%", right: "8%" }, 
  { top: "42%", left: "8%" },
  { top: "58%", right: "5%" }, 
  { top: "72%", left: "10%" },
  { top: "32%", right: "10%" },
  { top: "88%", right: "12%" },
];

const useDynamicTags = (
  allTags: string[], 
  desktopPositions: React.CSSProperties[], 
  mobilePositions: React.CSSProperties[], 
  interval = 5000
) => {
  const [displayedTags, setDisplayedTags] = useState<TagItem[]>([]);
  const isMobile = useIsMobile();
  const intervalRef = useRef<number | null>(null);

  const generateRandomTags = useCallback(() => {
    const positions = isMobile ? mobilePositions : desktopPositions;
    const tagCount = positions.length;
    const shuffledTags = [...allTags].sort(() => 0.5 - Math.random());
    const shuffledPositions = [...positions].sort(() => 0.5 - Math.random());
    const highlightIndex = Math.floor(Math.random() * tagCount);
    
    const newTags = shuffledTags.slice(0, tagCount).map((name, index) => ({
      id: `${name}-${index}-${Date.now()}`,
      name,
      position: shuffledPositions[index % positions.length],
      highlight: index === highlightIndex,
    }));
    
    setDisplayedTags(newTags);
  }, [allTags, isMobile]); // Removed position arrays from dependencies

  useEffect(() => {
    generateRandomTags();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const timer = setInterval(generateRandomTags, interval);
    intervalRef.current = timer;
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [generateRandomTags, interval]);
  
  return displayedTags;
};

const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (texts.length === 0) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const timer = setInterval(() => 
      setCurrentIndex((prev) => (prev + 1) % texts.length), 
      interval
    );
    intervalRef.current = timer;
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [texts.length, interval]);
  
  return texts[currentIndex] || texts[0] || "Search...";
};

/* FloatingTag */
const FloatingTag = ({ tag }: { tag: TagItem }) => {
  return (
    <button
      style={{
        ...tag.position,
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      }}
      onClick={() => {
        window.location.href = `/search?q=${encodeURIComponent(tag.name)}`;
      }}
      aria-label={`Search for ${tag.name}`}
      className={`absolute px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-full sm:rounded-3xl shadow-xl transition-all duration-300 ease-in-out hover:scale-110 pointer-events-auto animate-float animate-tag-fade-in whitespace-nowrap ${
        tag.highlight
          ? "bg-red-500 text-white scale-105 sm:scale-110 -rotate-2 sm:-rotate-3 hover:bg-red-600 shadow-red-500/50"
          : "bg-white/95 text-slate-800 hover:bg-white backdrop-blur-sm hover:shadow-2xl"
      }`}
    >
      {tag.name}
    </button>
  );
};

// --- Hero Search Bar ---
const HeroSearchBar = ({ onOpenModal, suggestion }: { onOpenModal: () => void; suggestion: string }) => {
  return (
    <div className="mt-6 sm:mt-8 lg:mt-10 w-full flex justify-center md:justify-start px-4 sm:px-0">
      <button 
        onClick={onOpenModal} 
        className="w-full max-w-xs sm:max-w-md md:max-w-xl bg-white text-slate-500 rounded-full flex items-center p-3 sm:p-4 text-sm md:text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out transform"
      >
        <Search className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 mx-2 md:mx-3 text-red-500 flex-shrink-0" />
        <div className="flex-1 text-left h-6 sm:h-7 overflow-hidden">
          <span key={suggestion} className="font-semibold animate-text-slide-in block text-base sm:text-lg">
            {suggestion}
          </span>
        </div>
      </button>
    </div>
  );
};

// --- Background Slideshow ---
const BackgroundSlideshow = ({ 
  slides = [], 
  delay = 6000, 
  fadeMs = 900,
  autoplay = true 
}: { 
  slides?: Array<{src: string, alt: string}>, 
  delay?: number, 
  fadeMs?: number,
  autoplay?: boolean 
}) => {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    slides.forEach(s => {
      const img = new window.Image();
      img.src = s.src;
    });
  }, [slides]);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    
    const next = () => setIndex((i) => (i + 1) % slides.length);
    timeoutRef.current = window.setTimeout(next, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [index, slides.length, delay, autoplay]);

  if (slides.length === 0) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-800">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {slides.map((s, i) => {
        const visible = i === index;
        return (
          <div
            key={`${s.src}-${i}`}
            aria-hidden={!visible}
            className="absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out"
            style={{
              opacity: visible ? 1 : 0,
              transitionDuration: `${fadeMs}ms`,
              transform: visible ? 'scale(1)' : 'scale(1.02)',
            }}
          >
            <img src={s.src} alt={s.alt} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
};

// --- HERO SECTION COMPONENT (FIXED) ---
const DestinationHeroSection = ({ destination, tourCount }: { destination: Destination, tourCount: number }) => {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { addSearchTerm } = useRecentSearches();
  const isMobile = useIsMobile();

  const slides = destination.images && destination.images.length > 0
    ? destination.images.map(img => ({ src: img, alt: `${destination.name} view` }))
    : [{ src: destination.image || '/hero2.png', alt: destination.name }];

 // Memoize destination-specific tags
const destinationTags = useMemo(() => {
  const name = destination.name.toLowerCase();
  
  // Cairo-specific tags
  if (name.includes('cairo')) {
    return [
      "PYRAMIDS", "SPHINX", "EGYPTIAN MUSEUM", "NILE CRUISE", 
      "KHAN EL-KHALILI", "CAIRO CITADEL", "ISLAMIC CAIRO", "COPTIC CAIRO",
      "SAQQARA", "MEMPHIS", "SOUND & LIGHT SHOW", "FELUCCA RIDE",
      "DESERT SAFARI", "CAMEL RIDE", "PAPYRUS MAKING", "BAZAAR SHOPPING",
      "ANCIENT TEMPLES", "PHARAOH TOMBS", "HIEROGLYPHICS", "MUMMIES"
    ];
  }
  
  // Luxor-specific tags
  if (name.includes('luxor')) {
    return [
      "VALLEY OF KINGS", "KARNAK TEMPLE", "LUXOR TEMPLE", "HOT AIR BALLOON",
      "HATSHEPSUT TEMPLE", "COLOSSI MEMNON", "NILE CRUISE", "FELUCCA RIDE",
      "TOMBS OF NOBLES", "MEDINET HABU", "RAMESSEUM", "WEST BANK TOUR",
      "EAST BANK TOUR", "SUNSET CRUISE", "ANCIENT THEBES", "PHARAOH HISTORY"
    ];
  }
  
  // Aswan-specific tags
  if (name.includes('aswan')) {
    return [
      "ABU SIMBEL", "PHILAE TEMPLE", "NUBIAN VILLAGE", "NILE CRUISE",
      "UNFINISHED OBELISK", "FELUCCA SUNSET", "HIGH DAM", "ELEPHANTINE ISLAND",
      "BOTANICAL GARDEN", "NUBIAN MUSEUM", "SUNSET VIEWS", "CAMEL MARKET",
      "KITCHENER ISLAND", "TOMBS OF NOBLES", "ST. SIMEON MONASTERY", "LAKE NASSER"
    ];
  }
  
  // Hurghada/Red Sea-specific tags
  if (name.includes('hurghada') || name.includes('red sea')) {
    return [
      "SNORKELING", "SCUBA DIVING", "CORAL REEFS", "BOAT TRIPS",
      "GIFTUN ISLAND", "DESERT SAFARI", "QUAD BIKING", "BEACH RESORT",
      "SUBMARINE TOUR", "DOLPHIN WATCHING", "PARASAILING", "WATER SPORTS",
      "BEDOUIN DINNER", "MARINA WALK", "ISLAND HOPPING", "SUNSET CRUISE"
    ];
  }
  
  // Alexandria-specific tags
  if (name.includes('alexandria')) {
    return [
      "LIBRARY OF ALEXANDRIA", "CITADEL OF QAITBAY", "CATACOMBS", "CORNICHE WALK",
      "MONTAZA PALACE", "ROMAN AMPHITHEATRE", "POMPEY PILLAR", "STANLEY BRIDGE",
      "MEDITERRANEAN SEAFOOD", "GRECO-ROMAN MUSEUM", "ROYAL JEWELRY MUSEUM", "BEACH PROMENADE",
      "HISTORICAL SITES", "COASTAL VIEWS", "ANCIENT HARBOR", "SEAFRONT CAFES"
    ];
  }
  
  // Sharm El Sheikh-specific tags
  if (name.includes('sharm')) {
    return [
      "DIVING", "SNORKELING", "RAS MOHAMMED", "BLUE HOLE",
      "NAAMA BAY", "OLD MARKET", "MOUNT SINAI", "ST. CATHERINE",
      "TIRAN ISLAND", "QUAD SAFARI", "BEACH CLUBS", "YACHT CRUISE",
      "DESERT EXCURSION", "WATER SPORTS", "COLORED CANYON", "BEDOUIN CAMP"
    ];
  }
  
  // Generic destination tags as fallback
  return [
    `${destination.name.toUpperCase()}`, "GUIDED TOURS", "LOCAL CULTURE", "HIDDEN GEMS",
    "PHOTO SPOTS", "HISTORICAL SITES", "LOCAL FOOD", "ADVENTURES",
    "FAMILY TOURS", "ROMANTIC", "BUDGET FRIENDLY", "LUXURY TOURS",
    "DAY TRIPS", "EVENING TOURS", "PRIVATE TOURS", "GROUP TOURS",
    "SKIP THE LINE", "BEST SELLERS", "WALKING TOURS", "FOOD TOURS"
  ];
}, [destination.name]);

  const dynamicTags = useDynamicTags(
    destinationTags,
    TAG_POSITIONS_DESKTOP,
    TAG_POSITIONS_MOBILE,
    5000
  );

  const searchSuggestions = [
    `Explore ${destination.name}`,
    `Things to do in ${destination.name}`,
    `Best tours in ${destination.name}`,
  ];

  const currentSuggestion = useSlidingText(searchSuggestions, 3000);

  const handleSearch = (term: string) => {
    addSearchTerm(term);
  };

  return (
    <>
      <section className="relative w-full h-screen min-h-[600px] max-h-[900px]">
        {/* Background */}
        <BackgroundSlideshow slides={slides} delay={6000} fadeMs={900} autoplay={true} />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40 z-10" />
        
        {/* Content */}
        <div className="relative z-20 h-full flex items-center justify-center text-white">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-tight tracking-wide mb-4">
              DISCOVER
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                {destination.name}
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl mb-6 max-w-2xl">
              {destination.description}
            </p>

            <HeroSearchBar
              onOpenModal={() => setIsSearchModalOpen(true)}
              suggestion={currentSuggestion}
            />

            <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/90 text-sm">
              <span className="flex items-center gap-2">
                <Tag size={16} />
                <span className="font-semibold">{tourCount}+ Tours</span>
              </span>
              <span className="flex items-center gap-2">
                <Star size={16} className="fill-current text-yellow-400" />
                <span className="font-semibold">4.8/5 Rating</span>
              </span>
              <span className="font-semibold">50K+ Travelers</span>
            </div>
          </div>
        </div>
        
        {/* Floating Tags - On Top */}
        {dynamicTags.slice(0, isMobile ? 5 : 12).map((tag) => (
          <button
            key={tag.id}
            style={tag.position}
            onClick={() => {
              window.location.href = `/search?q=${encodeURIComponent(tag.name)}`;
            }}
            className={`absolute z-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-full shadow-xl transition-all duration-300 hover:scale-110 animate-tag-fade-in whitespace-nowrap ${
              tag.highlight
                ? "bg-red-500 text-white scale-105 hover:bg-red-600"
                : "bg-white/95 text-slate-800 hover:bg-white"
            }`}
          >
            {tag.name}
          </button>
        ))}
      </section>

      {isSearchModalOpen && (
        <SearchModal
          onClose={() => setIsSearchModalOpen(false)}
          onSearch={handleSearch}
        />
      )}
    </>
  );
};

// --- Card Components ---
const Top10Card = ({ tour, index }: { tour: Tour, index: number }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded) return;
    addToCart(tour as CartItem);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <a href={`/tour/${tour.slug}`} className="flex items-center gap-6 p-4 bg-white hover:bg-slate-50 transition-colors duration-200 group rounded-lg border border-transparent hover:border-slate-200 hover:shadow-lg">
      <span className="text-4xl font-extrabold text-slate-200 group-hover:text-red-500 transition-colors duration-200">{index + 1}.</span>
      <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden">
        <Image src={tour.image} alt={tour.title} fill className="object-cover" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors duration-200 line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
          <Clock size={14} />
          <span>{tour.duration}</span>
          <Star size={14} className="ml-2 text-yellow-500 fill-current" />
          <span>{tour.rating}</span>
        </div>
        <div className="mt-2 text-sm">
          {tour.originalPrice && <span className="text-slate-500 line-through mr-2">{formatPrice(tour.originalPrice)}</span>}
          <span className="text-red-600 font-bold text-xl">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <button  
          onClick={handleAddToCart}
          disabled={isAdded}
          aria-label={isAdded ? "Added to cart" : "Add to cart"}
          className={`p-2.5 rounded-full text-white transition-all duration-300 ease-in-out ${
            isAdded 
              ? 'bg-green-500 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
        </button>
        <ArrowRight className="text-slate-400 group-hover:text-red-500 transition-colors duration-200" />
      </div>
    </a>
  );
};

const InterestCard = ({ category, tourCount }: { category: Category, tourCount: number }) => (
  <a href={`/categories/${category.slug}`} className="flex flex-col items-center p-6 bg-white shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-lg">
    <div className="text-4xl mb-4">{category.icon}</div>
    <h3 className="text-base font-bold text-slate-900 uppercase text-center">{category.name}</h3>
    <p className="text-sm text-slate-500">{tourCount} tours</p>
  </a>
);

const CombiDealCard = ({ tour }: { tour: Tour }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded) return;
    addToCart(tour as CartItem);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <a href={`/tour/${tour.slug}`} className="w-80 flex-shrink-0 bg-white shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-lg group">
      <div className="relative">
        <Image src={tour.image} alt={tour.title} width={320} height={180} className="w-full h-40 object-cover" />
        <button  
          onClick={handleAddToCart}
          disabled={isAdded}
          aria-label={isAdded ? "Added to cart" : "Add to cart"}
          className={`absolute bottom-4 right-4 p-2.5 rounded-full text-white transition-all duration-300 ease-in-out transform group-hover:scale-110 ${
            isAdded 
              ? 'bg-green-500 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
        </button>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-3 text-sm text-slate-500 my-2">
          <span className="flex items-center gap-1">
            <Clock size={14} />{tour.duration}
          </span>
          <span className="flex items-center gap-1">
            <Star size={14} fill="currentColor" className="text-yellow-500" />{tour.rating}
          </span>
          <span>{tour.bookings} bookings</span>
        </div>
        <div className="flex items-end justify-end mt-4">
          {tour.originalPrice && <span className="text-slate-500 line-through mr-2">{formatPrice(tour.originalPrice)}</span>}
          <span className="text-xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
    </a>
  );
};

// --- Stats Banner ---
const StatsSection = ({ destinationTours }: { destinationTours: Tour[] }) => {
  const stats = [
    { value: `${destinationTours.length}+`, label: 'Tours Available', icon: <Calendar /> },
    { value: '50K+', label: 'Happy Travelers', icon: <Users /> },
    { value: '4.8/5', label: 'Average Rating', icon: <Star /> },
    { value: '24/7', label: 'Customer Support', icon: <Shield /> }
  ];

  return (
    <section className="bg-slate-900 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-3 text-red-500">
                {React.cloneElement(stat.icon, { size: 32 })}
              </div>
              <div className="text-4xl font-extrabold text-white mb-2">{stat.value}</div>
              <div className="text-slate-300">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Travel Tips Component ---
const TravelTipsSection = ({ destination }: { destination: Destination }) => {
  const tips = [
    {
      icon: <Sun className="w-6 h-6" />,
      title: "Best Time to Visit",
      content: destination.bestTimeToVisit || "Year-round destination with pleasant weather"
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Currency",
      content: destination.currency || "Local currency accepted"
    },
    {
      icon: <Languages className="w-6 h-6" />,
      title: "Languages",
      content: destination.languagesSpoken?.join(', ') || "English widely spoken"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Emergency",
      content: destination.emergencyNumber || "Local emergency services"
    }
  ];

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Travel Tips & Essential Info</h2>
          <p className="text-lg text-slate-600">Everything you need to know before you go</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tips.map((tip, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                {tip.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{tip.title}</h3>
              <p className="text-slate-600 text-sm">{tip.content}</p>
            </div>
          ))}
        </div>

        {destination.visaRequirements && (
          <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-yellow-900 mb-2">Visa Requirements</h4>
                <p className="text-yellow-800">{destination.visaRequirements}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// --- ABOUT US SECTION ---
const AboutUsSection = ({ destination }: { destination: Destination }) => {
  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <div className="col-span-1 md:col-span-1 lg:col-span-1">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              Your Local Guide In {destination.name}
            </h2>
            <p className="text-lg text-slate-600 mb-6">
              {destination.longDescription || `Discover the best of ${destination.name} with our expert local guides. We'll show you hidden gems, share fascinating stories, and create unforgettable memories that will last a lifetime.`}
            </p>
            <a href="/about" className="inline-flex items-center gap-2 text-red-600 font-bold hover:text-red-700 transition-colors">
              <span>Learn more about us</span>
              <ArrowRight size={20} />
            </a>
          </div>
          <div className="col-span-1 md:col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="bg-slate-50 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Award className="w-10 h-10 text-red-600 mb-4" />
              <h3 className="font-bold text-xl text-slate-900">Expert Local Guides</h3>
              <p className="mt-2 text-slate-600">
                Our experienced local guides know all the hidden gems and stories of {destination.name}.
              </p>
            </div>
            <div className="bg-slate-50 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Star className="w-10 h-10 text-red-600 mb-4" />
              <h3 className="font-bold text-xl text-slate-900">Quality Experiences</h3>
              <p className="mt-2 text-slate-600">
                We offer you the best experiences in {destination.name}, handpicked by our experts.
              </p>
            </div>
            <div className="bg-slate-50 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Shield className="w-10 h-10 text-red-600 mb-4" />
              <h3 className="font-bold text-xl text-slate-900">Safe & Reliable</h3>
              <p className="mt-2 text-slate-600">
                Your safety is our priority. All tours are carefully vetted and insured.
              </p>
            </div>
            <div className="bg-slate-50 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Heart className="w-10 h-10 text-red-600 mb-4" />
              <h3 className="font-bold text-xl text-slate-900">Best Price Guarantee</h3>
              <p className="mt-2 text-slate-600">
                Find a lower price? We'll match it. Enjoy the best deals for {destination.name}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- FAQ SECTION ---
const FaqItem = ({ item }: { item: { question: string; answer: string } }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 py-6 group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left hover:text-red-600 transition-colors"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors pr-4">
          {item.question}
        </h3>
        {isOpen ? (
          <Minus className="w-6 h-6 text-red-500 transition-transform duration-300 flex-shrink-0" />
        ) : (
          <Plus className="w-6 h-6 text-slate-500 transition-transform duration-300 flex-shrink-0" />
        )}
      </button>
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 pt-4' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-slate-600">{item.answer}</p>
        </div>
      </div>
    </div>
  );
};

const FAQSection = ({ destinationName }: { destinationName: string }) => {
  const faqData = [
    {
      question: `What is the best time to visit ${destinationName}?`,
      answer: `The best time to visit ${destinationName} is during the cooler months from October to April, when temperatures are pleasant for sightseeing and outdoor activities. The weather is ideal for exploring attractions and participating in tours.`
    },
    {
      question: `How many days should I spend in ${destinationName}?`,
      answer: `We recommend spending at least 3-5 days to experience the main attractions comfortably. However, a week or more allows for a more relaxed pace and exploration of hidden gems, local neighborhoods, and day trips to nearby areas.`
    },
    {
      question: `Is ${destinationName} safe for tourists?`,
      answer: `Yes, ${destinationName} is generally safe for tourists. As with any destination, exercise normal precautions like being aware of your surroundings, keeping valuables secure, and following local guidance. Our tours prioritize your safety with professional guides.`
    },
    {
      question: `What should I pack for ${destinationName}?`,
      answer: `Pack comfortable walking shoes, light breathable clothing for daytime, a light jacket for evenings or air-conditioned spaces, sunscreen, sunglasses, a hat, and any necessary medications. Don't forget your camera to capture the amazing sights!`
    },
    {
      question: `Do I need a guide for tours in ${destinationName}?`,
      answer: `While not mandatory, having a local guide significantly enhances your experience. Guides provide insider knowledge, historical context, help navigate crowds efficiently, and ensure you don't miss important details about the attractions.`
    },
    {
      question: `Are there any dress codes I should be aware of?`,
      answer: `For religious sites and certain attractions, modest clothing is required (covering shoulders and knees). It's best to carry a light scarf or shawl. Most restaurants and hotels have no specific dress code, but smart casual is appreciated.`
    },
    {
      question: `Can I book tours last minute?`,
      answer: `While we recommend booking in advance for popular tours, many experiences can be booked last minute subject to availability. However, skip-the-line tours and special experiences often sell out, so early booking is advisable.`
    },
    {
      question: `What is your cancellation policy?`,
      answer: `Most tours offer free cancellation up to 24 hours before the start time for a full refund. Some special events may have different policies. Please check the specific tour details for exact cancellation terms.`
    },
    {
      question: `Are meals included in the tours?`,
      answer: `It varies by tour. Some tours include meals or snacks, while others don't. Each tour description clearly states what's included. Food tours naturally include multiple tastings as part of the experience.`
    },
    {
      question: `How do I get to the meeting points?`,
      answer: `All tour confirmations include detailed meeting point information with maps and directions. Most meeting points are at central, easy-to-reach locations with good public transport access. Our team is available 24/7 if you need assistance.`
    }
  ];

  return (
    <section className="bg-white py-20 font-sans">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Everything you need to know about visiting {destinationName}
          </p>
        </div>
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <FaqItem key={index} item={item} />
          ))}
        </div>
        <div className="text-center mt-12">
          <a
            href="/faqs"
            className="inline-flex justify-center items-center h-14 px-8 text-base font-bold text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 ease-in-out rounded-full"
            role="button"
            aria-label="View all FAQs"
          >
            VIEW ALL FAQs
          </a>
        </div>
      </div>
    </section>
  );
};

// --- Reviews Component ---
const ReviewsSection = ({ reviews, destinationName }: { reviews: Review[], destinationName: string }) => {
  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="bg-slate-50 py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
            What Travelers Say About {destinationName}
          </h2>
          <div className="flex items-center justify-center gap-2 text-yellow-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 fill-current" />
            ))}
            <span className="ml-2 text-slate-600 font-bold">4.8/5 from 1,000+ reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.slice(0, 6).map((review) => (
            <div key={review._id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-slate-300'}`}
                  />
                ))}
              </div>
              {review.title && <h4 className="font-bold text-slate-900 mb-2">{review.title}</h4>}
              <p className="text-slate-700 mb-4 line-clamp-4">{review.comment}</p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                  {review.userName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{review.userName}</p>
                  {review.verified && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Verified traveler
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a
            href="#reviews"
            className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Read All Reviews
            <MessageCircle size={20} />
          </a>
        </div>
      </div>
    </section>
  );
};

// --- Related Destinations ---
const RelatedDestinationsSection = ({ destinations }: { destinations: Destination[] }) => {
  if (!destinations || destinations.length === 0) return null;

  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
            Explore More Destinations
          </h2>
          <p className="text-lg text-slate-600">
            Discover other amazing places you might love
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.slice(0, 4).map((dest) => (
            <a 
              key={dest._id} 
              href={`/destinations/${dest.slug}`}
              className="group block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="relative h-48">
                <Image
                  src={dest.image || '/placeholder.jpg'}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-bold text-white mb-1">{dest.name}</h3>
                  <p className="text-white/90 text-sm flex items-center gap-1">
                    <MapPin size={14} />
                    {dest.tourCount || 0} tours available
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Newsletter CTA ---
const NewsletterSection = ({ destinationName }: { destinationName: string }) => {
  return (
    <section className="bg-gradient-to-r from-red-600 to-red-700 py-20">
      <div className="container mx-auto px-4 max-w-4xl text-center text-white">
        <h2 className="text-4xl font-extrabold mb-4">
          Get Exclusive {destinationName} Travel Deals
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Subscribe to our newsletter and receive special offers, travel tips, and insider guides
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-6 py-4 rounded-full text-slate-900 outline-none"
          />
          <button className="px-8 py-4 bg-white text-red-600 font-bold rounded-full hover:bg-slate-100 transition-all duration-300 shadow-lg hover:shadow-xl">
            Subscribe Now
          </button>
        </div>

        <p className="mt-4 text-sm opacity-75">
          Join 50,000+ travelers getting exclusive deals. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
};

// --- MAIN COMPONENT ---
export default function DestinationPageClient({ 
  destination, 
  destinationTours, 
  allCategories,
  reviews = [],
  relatedDestinations = []
}: DestinationPageClientProps) {
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const combiScrollContainer = useRef<HTMLDivElement>(null);

  const scroll = (container: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (container.current) {
      const scrollAmount = direction === 'left' ? -344 : 344;
      container.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleTourSelect = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };
  
  const top10Tours = destinationTours.slice(0, 10);
  const featuredTours = destinationTours.filter(tour => tour.isFeatured).slice(0, 5);
  const destinationCategories = allCategories.map(category => ({
    ...category,
    tourCount: destinationTours.filter(tour => 
      typeof tour.category === 'object' ? tour.category._id === category._id : tour.category === category._id
    ).length
  })).filter(category => category.tourCount > 0);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        
        <DestinationHeroSection destination={destination} tourCount={destinationTours.length} />

        <StatsSection destinationTours={destinationTours} />
        
        <section className="bg-slate-50 py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Best Time to Visit</h3>
                <p className="text-slate-600">{destination.bestTimeToVisit || 'Year-round'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Currency</h3>
                <p className="text-slate-600">{destination.currency || 'EUR'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Time Zone</h3>
                <p className="text-slate-600">{destination.timezone || 'Central European Time'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Available Tours</h3>
                <p className="text-slate-600">{destinationTours.length} experiences</p>
              </div>
            </div>
          </div>
        </section>
        
        {featuredTours.length > 0 && (
          <section className="py-20 bg-white overflow-hidden">
            <div className="container mx-auto">
                <div className="px-4 mb-10">
                    <h2 className="text-4xl font-extrabold text-slate-900">Best Deals in {destination.name}</h2>
                    <p className="text-lg text-slate-600 mt-2">Handpicked experiences at unbeatable prices</p>
                </div>
                <div className="relative">
                    <div ref={combiScrollContainer} className="flex gap-6 overflow-x-auto pb-4 scroll-smooth px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {featuredTours.map(tour => <CombiDealCard key={tour._id} tour={tour} />)}
                    </div>
                    <button 
                        onClick={() => scroll(combiScrollContainer, 'left')} 
                        aria-label="Scroll left"
                        className="absolute top-1/2 -translate-y-1/2 left-0 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 backdrop-blur-sm ml-2"
                    >
                        <ChevronLeft size={24} className="text-slate-700"/>
                    </button>
                    <button 
                        onClick={() => scroll(combiScrollContainer, 'right')} 
                        aria-label="Scroll right"
                        className="absolute top-1/2 -translate-y-1/2 right-0 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 backdrop-blur-sm mr-2"
                    >
                        <ChevronRight size={24} className="text-slate-700"/>
                    </button>
                </div>
            </div>
          </section>
        )}
        
        {top10Tours.length > 0 && (
          <section className="py-20 bg-slate-50">
            <div className="container mx-auto px-4">
              <h2 className="text-4xl font-extrabold text-slate-900 text-center mb-4">
                TOP 10 TOURS IN {destination.name.toUpperCase()}
              </h2>
              <p className="text-center text-lg text-slate-600 mb-12">
                Our best-selling tours and experiences curated by local experts
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {top10Tours.map((tour, index) => (
                  <Top10Card key={tour._id} tour={tour} index={index} />
                ))}
              </div>
            </div>
          </section>
        )}

        {destinationCategories.length > 0 && (
          <section className="bg-white py-20">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6">
                Discover {destination.name} by Interest
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
                Find the perfect experience for you, whether you're interested in culture, adventure, or food.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {destinationCategories.map((category) => (
                  <InterestCard key={category._id} category={category} tourCount={category.tourCount} />
                ))}
              </div>
            </div>
          </section>
        )}

        <AboutUsSection destination={destination} />

        {destination.highlights && destination.highlights.length > 0 && (
          <section className="bg-slate-50 py-20">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-4xl font-extrabold text-slate-900 text-center mb-10">Why Visit {destination.name}?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {destination.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                    <p className="text-lg text-slate-600">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <TravelTipsSection destination={destination} />

        <ReviewsSection reviews={reviews} destinationName={destination.name} />

        <FAQSection destinationName={destination.name} />

        <RelatedDestinationsSection destinations={relatedDestinations} />

        <NewsletterSection destinationName={destination.name} />
        
      </main>
      <Footer />

      <BookingSidebar 
        isOpen={isBookingSidebarOpen} 
        onClose={() => setBookingSidebarOpen(false)} 
        tour={selectedTour} 
      />

      <style jsx global>{`
        @keyframes fade-in { 
          from { opacity: 0; transform: translateY(20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        @keyframes slide-from-top { 
          from { opacity: 0; transform: translateY(-30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        @keyframes float { 
          0%, 100% { transform: translateY(0px); } 
          50% { transform: translateY(-10px); } 
        }
        
        @keyframes tag-fade-in { 
          from { opacity: 0; transform: scale(0.8); } 
          to { opacity: 1; transform: scale(1); } 
        }
        
        @keyframes text-slide-in { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }

        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-slide-from-top { animation: slide-from-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .animate-float { 
          animation: float 8s ease-in-out infinite; 
          animation-delay: calc(var(--float-delay, 0) * 1s);
        }
        .animate-tag-fade-in { animation: tag-fade-in 0.7s ease-out forwards; }
        .animate-text-slide-in { animation: text-slide-in 0.5s ease-out forwards; }

        .text-shadow { text-shadow: 1px 1px 4px rgb(0 0 0 / 0.5); }
        .text-shadow-lg { text-shadow: 2px 2px 8px rgb(0 0 0 / 0.6); }

        img { 
          backface-visibility: hidden; 
          -webkit-backface-visibility: hidden; 
        }

        [style*="scrollbarWidth"]::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 640px) {
          .animate-float {
            animation-duration: 10s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-tag-fade-in,
          .animate-text-slide-in,
          .animate-fade-in,
          .animate-slide-from-top {
            animation: none !important;
          }
        }

        .pointer-events-auto {
          pointer-events: auto !important;
        }
      `}</style>
    </>
  );
}
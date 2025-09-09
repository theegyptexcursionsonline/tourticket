"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, X, Clock, Zap } from "lucide-react";

// --- Type Definitions ---
type Tag = {
  id: string;
  name: string;
  position: React.CSSProperties;
  highlight?: boolean;
};

// --- Expanded Data for Dynamic Tags ---
const ALL_TAG_NAMES = [
  "FOOD TOURS",
  "NIGHTLIFE",
  "ART GALLERIES",
  "HISTORICAL SITES",
  "LIVE MUSIC",
  "SHOPPING",
  "BIKE RENTALS",
  "PARKS & NATURE",
  "ROOFTOP BARS",
  "ARCHITECTURE",
  "BOAT TRIPS",
  "COOKING CLASS",
  "WINE TASTING",
  "BEACH DAY",
  "HIKING TRAILS",
  "STREET ART",
  "KID FRIENDLY",
  "LUXURY EXPERIENCES",
  "ADVENTURE SPORTS",
  "PHOTOGRAPHY SPOTS",
  "LOCAL MARKETS",
  "THEATRE & SHOWS",
  "WELLNESS & SPA",
];

// Sliding search suggestions for hero
const HERO_SEARCH_SUGGESTIONS = [
  "Where are you going?",
  "Find your next adventure",
  "Discover hidden gems",
  "Book unique experiences",
  "Explore new destinations",
  "Create lasting memories",
];

// --- RESPONSIVE TAG POSITIONS ---
const TAG_POSITIONS_DESKTOP: React.CSSProperties[] = [
  { top: "25%", left: "60%" },
  { top: "20%", right: "15%" },
  { top: "45%", left: "55%" },
  { top: "35%", right: "20%" },
  { top: "50%", right: "25%" },
  { top: "55%", left: "50%" },
  { top: "45%", right: "10%" },
  { top: "65%", right: "20%" },
  { top: "70%", left: "55%" },
  { top: "80%", left: "65%" },
  { top: "15%", left: "50%" },
  { top: "85%", right: "15%" },
];

const TAG_POSITIONS_MOBILE: React.CSSProperties[] = [
  { top: "15%", left: "5%" },
  { top: "25%", right: "8%" },
  { top: "40%", left: "10%" },
  { top: "55%", right: "5%" },
  { top: "70%", left: "12%" },
  { top: "85%", right: "10%" },
  { top: "90%", left: "35%" },
];

// --- Other Data ---
const usePopularSearches = () =>
  useMemo(
    () => [
      "CANAL CRUISE",
      "MUSEUM",
      "FOOD TOUR",
    ],
    []
  );

// --- Custom Hooks ---
const useRecentSearches = (storageKey = "recentTravelSearches") => {
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  useEffect(() => {
    try {
      const storedItems = window.localStorage.getItem(storageKey);
      if (storedItems) setRecentSearches(JSON.parse(storedItems));
    } catch (error) {
      console.error("Failed to load recent searches", error);
    }
  }, [storageKey]);

  const addSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const newSearches = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
    setRecentSearches(newSearches);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(newSearches));
    } catch (error) {
      console.error("Failed to save recent searches", error);
    }
  };

  const removeSearchTerm = (term: string) => {
    const newSearches = recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase());
    setRecentSearches(newSearches);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(newSearches));
    } catch (error) {
      console.error("Failed to save recent searches", error);
    }
  };

  return { recentSearches, addSearchTerm, removeSearchTerm };
};

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

const useDynamicTags = (allTags: string[], desktopPositions: React.CSSProperties[], mobilePositions: React.CSSProperties[], interval = 5000) => {
  const [displayedTags, setDisplayedTags] = useState<Tag[]>([]);
  const isMobile = useIsMobile();
  const generateRandomTags = useCallback(() => {
    const positions = isMobile ? mobilePositions : desktopPositions;
    const tagCount = isMobile ? 5 : 9;
    const shuffledTags = [...allTags].sort(() => 0.5 - Math.random());
    const shuffledPositions = [...positions].sort(() => 0.5 - Math.random());
    const highlightIndex = Math.floor(Math.random() * tagCount);
    const newTags = shuffledTags.slice(0, tagCount).map((name, index) => ({
      id: `${name}-${index}`,
      name,
      position: shuffledPositions[index % positions.length],
      highlight: index === highlightIndex,
    }));
    setDisplayedTags(newTags);
  }, [allTags, desktopPositions, mobilePositions, isMobile]);

  useEffect(() => {
    generateRandomTags();
    const timer = setInterval(generateRandomTags, interval);
    return () => clearInterval(timer);
  }, [generateRandomTags, interval]);
  return displayedTags;
};

const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % texts.length), interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);
  return texts[currentIndex];
};

// --- Sub-components (Enhanced) ---
const FloatingTag = ({ tag }: { tag: Tag }) => (
  <button
    style={tag.position}
    onClick={() => {
      // Navigate to search with the tag as query
      window.location.href = `/search?q=${encodeURIComponent(tag.name)}`;
    }}
    className={`absolute px-4 py-2 text-xs md:text-sm font-semibold rounded-3xl shadow-lg transition-all duration-300 ease-in-out hover:scale-110 pointer-events-auto animate-float animate-tag-fade-in ${
      tag.highlight ? "bg-red-500 text-white scale-110 -rotate-3 hover:bg-red-600" : "bg-white/90 text-slate-800 hover:bg-white backdrop-blur-sm"
    }`}
  >
    {tag.name}
  </button>
);

const SearchSuggestion = ({ term, icon: Icon, onSelect, onRemove }: { term: string; icon: React.ElementType; onSelect: (term: string) => void; onRemove?: (term: string) => void }) => (
  <div className="group relative">
    <button onClick={() => onSelect(term)} className="flex w-full items-center gap-3 pl-4 pr-5 py-3 bg-slate-100 text-slate-700 rounded-3xl transition-all duration-300 ease-in-out hover:bg-slate-200 hover:shadow-md hover:text-slate-900 group-hover:pr-10">
      <Icon className="h-5 w-5 text-slate-500 group-hover:text-red-500 transition-colors" />
      <span className="font-medium text-sm sm:text-base text-left">{term}</span>
    </button>
    {onRemove && (
      <button onClick={(e) => { e.stopPropagation(); onRemove(term); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-300 hover:text-slate-800" aria-label={`Remove ${term}`}>
        <X size={14} />
      </button>
    )}
  </div>
);

const SearchModal = ({ isOpen, onClose, onSearch }: { isOpen: boolean; onClose: () => void; onSearch: (term: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const popularSearches = usePopularSearches();
  const { recentSearches, removeSearchTerm } = useRecentSearches();

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm);
      // Navigate to search page
      window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
      setSearchTerm("");
      onClose();
    }
  };

  const handlePopularSearch = (term: string) => {
    onSearch(term);
    window.location.href = `/search?q=${encodeURIComponent(term)}`;
    onClose();
  };

  const handleRecentSearch = (term: string) => {
    onSearch(term);
    window.location.href = `/search?q=${encodeURIComponent(term)}`;
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-lg animate-fade-in flex flex-col items-center justify-start p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative w-full max-w-6xl mt-16 lg:mt-24 p-6 sm:p-8 animate-slide-from-top" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors" aria-label="Close search">
          <X className="h-7 w-7" />
        </button>

        <form onSubmit={handleSearchSubmit} className="mb-8">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="What are you looking for?"
              autoFocus
              className="w-full text-2xl md:text-3xl pl-16 pr-6 py-6 border-b-2 border-slate-200 bg-transparent focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
        </form>

        <div className="space-y-12">
          <div>
            <h3 className="text-slate-500 font-bold text-sm tracking-widest uppercase mb-4">Most popular</h3>
            <div className="flex flex-wrap gap-4">
              {popularSearches.map((item) => <SearchSuggestion key={item} term={item} icon={Zap} onSelect={handlePopularSearch} />)}
            </div>
          </div>
          {recentSearches.length > 0 && (
            <div>
              <h3 className="text-slate-500 font-bold text-sm tracking-widest uppercase mb-4">Your recent searches</h3>
              <div className="flex flex-wrap gap-4">
                {recentSearches.map((item) => <SearchSuggestion key={item} term={item} icon={Clock} onSelect={handleRecentSearch} onRemove={removeSearchTerm} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HeroSearchBar = ({ onOpenModal }: { onOpenModal: () => void }) => {
  const currentSuggestion = useSlidingText(HERO_SEARCH_SUGGESTIONS, 3000);
  return (
    <div className="mt-8 lg:mt-10 w-full flex justify-center md:justify-start">
      <button onClick={onOpenModal} className="w-full max-w-sm md:max-w-xl bg-white text-slate-500 rounded-full flex items-center p-4 text-sm md:text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out transform">
        <Search className="h-6 w-6 md:h-7 md:w-7 mx-2 md:mx-3 text-red-500 flex-shrink-0" />
        <div className="flex-1 text-left h-7 overflow-hidden">
          <span key={currentSuggestion} className="font-semibold animate-text-slide-in block text-lg">{currentSuggestion}</span>
        </div>
      </button>
    </div>
  );
};

// --- Background Slideshow Component (FIXED) ---
const BackgroundSlideshow = ({ 
    // FIXED: Updated default images to remove confusion.
    images = ["/bg4.png", "/copenhagen.png", "/stockholm.png"], 
    interval = 5000, 
    fadeDuration = 1000 
}: { 
    images?: string[]; 
    interval?: number; 
    fadeDuration?: number 
}) => {
  const [index, setIndex] = useState(0);
  const count = images.length;

  // Preload images
  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, interval);
    return () => clearInterval(t);
  }, [count, interval]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {images.map((src, i) => {
        const visible = i === index;
        return (
          <div
            key={src + i}
            aria-hidden
            className="absolute inset-0 w-full h-full transition-opacity duration-[1000ms] ease-in-out transform-gpu"
            style={{
              opacity: visible ? 1 : 0,
              transitionDuration: `${fadeDuration}ms`,
              transform: visible ? "scale(1.03)" : "scale(1)",
            }}
          >
            <img src={src} alt="" className="w-full h-full object-cover will-change-transform" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
};

// --- Main Hero Component ---
export default function HeroSection() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { addSearchTerm } = useRecentSearches();
  const dynamicTags = useDynamicTags(ALL_TAG_NAMES, TAG_POSITIONS_DESKTOP, TAG_POSITIONS_MOBILE);

  const handleSearch = (term: string) => {
    addSearchTerm(term);
    console.log(`Searching for: ${term}`);
  };

  return (
    <>
      <section className="relative h-screen min-h-[650px] max-h-[900px] w-full flex items-center justify-center text-white overflow-hidden font-sans">
        {/* The component now correctly receives the new image paths */}
        <BackgroundSlideshow images={["/bg4.png", "/copenhagen.png", "/stockholm.png"]} interval={5000} fadeDuration={1000} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center h-full text-center md:items-start md:text-left">
          <div className="max-w-xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-tight tracking-wide text-shadow-lg">
              <span className="md:hidden">Your Best<br />Travel Buddy</span>
              <span className="hidden md:block">Your<br />Best<br />Travel<br />Buddy</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg md:text-xl text-shadow font-light max-w-md mx-auto md:mx-0">
              Your trip starts now. Let's find your next experience.
            </p>
            <HeroSearchBar onOpenModal={() => setIsSearchModalOpen(true)} />
          </div>
        </div>

        {/* Floating tags */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {dynamicTags.map((tag) => (
            <div key={tag.id} style={tag.position} className="pointer-events-auto">
              <FloatingTag tag={tag} />
            </div>
          ))}
        </div>
      </section>

      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSearch={handleSearch} />

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-from-top { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes tag-fade-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes text-slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-slide-from-top { animation: slide-from-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-tag-fade-in { animation: tag-fade-in 0.7s ease-out forwards; }
        .animate-text-slide-in { animation: text-slide-in 0.5s ease-out forwards; }

        .text-shadow { text-shadow: 1px 1px 4px rgb(0 0 0 / 0.5); }
        .text-shadow-lg { text-shadow: 2px 2px 8px rgb(0 0 0 / 0.6); }
        .font-sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }

        img { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </>
  );
}
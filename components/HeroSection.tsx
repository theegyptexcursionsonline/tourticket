'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search } from "lucide-react";
// The Next.js Image component is imported but not used in this file.
// It's kept here in case you plan to add it elsewhere, but it's the source of the naming conflict.
import Image from "next/image"; 
import { useRecentSearches } from "@/hooks/useSearch";
import SearchModal from "@/components/SearchModel";

// --- Types and Constants ---
type Tag = {
  id: string;
  name: string;
  position: React.CSSProperties;
  highlight?: boolean;
};

const ALL_TAG_NAMES = [
  "PYRAMID TOURS",
  "NILE CRUISES",
  "LUXOR TEMPLES",
  "SPHINX VISITS",
  "SUNSET FELUCCA",
  "ASWAN EXCURSIONS",
  "VALLEY OF THE KINGS",
  "CAMEL RIDES",
  "DESERT SAFARI",
  "RED SEA RESORTS",
  "HURGHADA DIVING",
  "ABU SIMBEL",
  "EGYPTIAN MUSEUM",
  "PHILAE TEMPLE",
  "LUXURY CRUISES",
  "CULTURAL TOURS",
  "MARKET BAZAARS",
  "NUBIAN VILLAGES",
  "ANCIENT TEMPLES",
  "HOT AIR BALLOON",
  "LOCAL CUISINE",
  "HISTORICAL SITES",
  "ADVENTURE SPORTS"
];


const HERO_SEARCH_SUGGESTIONS = [
  "Where are you going?", "Find your next adventure", "Discover hidden gems",
  "Book unique experiences", "Explore new destinations", "Create lasting memories",
];

const TAG_POSITIONS_DESKTOP: React.CSSProperties[] = [
  { top: "25%", left: "60%" }, { top: "20%", right: "15%" }, { top: "45%", left: "55%" },
  { top: "35%", right: "20%" }, { top: "50%", right: "25%" }, { top: "55%", left: "50%" },
  { top: "45%", right: "10%" }, { top: "65%", right: "20%" }, { top: "70%", left: "55%" },
  { top: "80%", left: "65%" }, { top: "15%", left: "50%" }, { top: "85%", right: "15%" },
];

const TAG_POSITIONS_MOBILE: React.CSSProperties[] = [
  { top: "15%", left: "5%" }, { top: "25%", right: "8%" }, { top: "40%", left: "10%" },
  { top: "55%", right: "5%" }, { top: "70%", left: "12%" }, { top: "85%", right: "10%" },
  { top: "90%", left: "35%" },
];

const SLIDES = [
  { src: '/hero2.png', alt: 'Pyramids of Giza at sunrise', caption: 'Pyramids of Giza' },
  { src: '/hero1.jpg', alt: 'Felucca on the Nile at sunset', caption: 'Sunset on the Nile' },
  { src: '/hero3.png', alt: 'Luxor temple columns at golden hour', caption: 'Ancient Temples' }
];

// --- Helper Hooks ---
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

// --- Reusable Components ---
const FloatingTag = ({ tag }: { tag: Tag }) => (
  <button
    style={tag.position}
    onClick={() => {
      window.location.href = `/search?q=${encodeURIComponent(tag.name)}`;
    }}
    className={`absolute px-4 py-2 text-xs md:text-sm font-semibold rounded-3xl shadow-lg transition-all duration-300 ease-in-out hover:scale-110 pointer-events-auto animate-float animate-tag-fade-in ${
      tag.highlight ? "bg-red-500 text-white scale-110 -rotate-3 hover:bg-red-600" : "bg-white/90 text-slate-800 hover:bg-white backdrop-blur-sm"
    }`}
  >
    {tag.name}
  </button>
);

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

const BackgroundSlideshow = ({ slides = SLIDES, delay = 6000, fadeMs = 900 }: { slides?: typeof SLIDES, delay?: number, fadeMs?: number }) => {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Preload images
    slides.forEach(s => {
      // **FIX:** Use `window.Image` to access the native browser Image constructor
      const img = new window.Image();
      img.src = s.src;
    });
  }, [slides]);

  useEffect(() => {
    const next = () => setIndex((i) => (i + 1) % slides.length);
    timeoutRef.current = window.setTimeout(next, delay);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [index, slides.length, delay]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {slides.map((s, i) => {
        const visible = i === index;
        return (
          <div
            key={s.src}
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

// --- Main HeroSection ---
export default function HeroSection() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { addSearchTerm } = useRecentSearches();
  const dynamicTags = useDynamicTags(ALL_TAG_NAMES, TAG_POSITIONS_DESKTOP, TAG_POSITIONS_MOBILE);

  const handleSearch = (term: string) => {
    addSearchTerm(term);
    // You can redirect or perform other actions here
    console.log(`Searching for: ${term}`);
  };

  return (
    <>
      <section className="relative h-screen min-h-[600px] max-h-[900px] w-full flex items-center justify-center text-white overflow-hidden font-sans">
        <BackgroundSlideshow slides={SLIDES} delay={6000} fadeMs={900} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center h-full text-center md:items-start md:text-left">
          <div className="max-w-xl">
           <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-tight tracking-wide text-shadow-lg">
  Explore Egypt’s Pyramids & Nile
</h1>
           <p className="mt-4 text-base sm:text-lg md:text-xl text-shadow font-light max-w-md mx-auto md:mx-0">
  Unforgettable excursions — from sunrise at the pyramids to sailing the Nile.
</p>
            <HeroSearchBar onOpenModal={() => setIsSearchModalOpen(true)} />
          </div>
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none">
          {dynamicTags.map((tag) => (
            <div key={tag.id} style={tag.position} className="pointer-events-auto">
              <FloatingTag tag={tag} />
            </div>
          ))}
        </div>
      </section>

      {isSearchModalOpen && <SearchModal onClose={() => setIsSearchModalOpen(false)} onSearch={handleSearch} />}

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

        @media (prefers-reduced-motion: reduce) {
          .animate-float { animation: none; }
        }
      `}</style>
    </>
  );
}

// components/HeroSection.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import Image from "next/image";
import { useRecentSearches } from "@/hooks/useSearch";
import AlgoliaSearchModal from "@/components/search/AlgoliaSearchModal";

// --- Types and Constants ---
interface HeroSettings {
  backgroundImages: {
    desktop: string;
    mobile?: string;
    alt: string;
    isActive: boolean;
  }[];
  currentActiveImage: string;
  title: {
    main: string;
    highlight: string;
  };
  searchSuggestions: string[];
  trustIndicators: {
    travelers: string;
    rating: string;
    ratingText: string;
    isVisible: boolean;
  };
  overlaySettings: {
    opacity: number;
    gradientType: 'dark' | 'light' | 'custom';
    customGradient?: string;
  };
  animationSettings: {
    slideshowSpeed: number;
    fadeSpeed: number;
    enableAutoplay: boolean;
  };
  metaTitle?: string;
  metaDescription?: string;
}

// Default fallback settings
const DEFAULT_SETTINGS: HeroSettings = {
  backgroundImages: [
    { desktop: '/hero2.png', alt: 'Pyramids of Giza at sunrise', isActive: true },
    { desktop: '/hero1.jpg', alt: 'Felucca on the Nile at sunset', isActive: false },
    { desktop: '/hero3.png', alt: 'Luxor temple columns at golden hour', isActive: false }
  ],
  currentActiveImage: '/hero2.png',
  title: {
    main: 'Explore Egypt\'s ',
    highlight: 'Pyramids & Nile',
  },
  searchSuggestions: [
    "Where are you going?", "Find your next adventure", "Discover hidden gems",
    "Book unique experiences", "Explore new destinations", "Create lasting memories",
  ],
  trustIndicators: {
    travelers: '2M+ travelers',
    rating: '4.9/5 rating',
    ratingText: '★★★★★',
    isVisible: true,
  },
  overlaySettings: {
    opacity: 0.6,
    gradientType: 'dark',
  },
  animationSettings: {
    slideshowSpeed: 6,
    fadeSpeed: 900,
    enableAutoplay: true
  }
};

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

const useHeroSettings = () => {
  const [settings, setSettings] = useState<HeroSettings>(DEFAULT_SETTINGS);
  // NOTE: we keep isLoading for internal use, but default it to false so UI doesn't block
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      // If you want a visual indicator while loading, you can set isLoading(true) here
      try {
        const response = await fetch('/api/hero-settings');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSettings(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to load hero settings:', error);
        // Use default settings on error
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch in background; UI is shown immediately without spinner
    fetchSettings();
  }, []);

  return { settings, isLoading };
};

const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (texts.length === 0) return;
    const timer = setInterval(() => 
      setCurrentIndex((prev) => (prev + 1) % texts.length), 
      interval
    );
    return () => clearInterval(timer);
  }, [texts.length, interval]);
  
  return texts[currentIndex] || texts[0] || "Search...";
};

// --- Reusable Components ---
const HeroSearchBar = ({ onOpenModal, suggestion }: { onOpenModal: () => void; suggestion: string }) => {
  return (
    <div className="mt-8 lg:mt-10 w-full flex justify-center md:justify-start">
      <button 
        onClick={onOpenModal} 
        className="w-full max-w-sm md:max-w-xl bg-white text-slate-500 rounded-full flex items-center p-4 text-sm md:text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out transform"
      >
        <Search className="h-6 w-6 md:h-7 md:w-7 mx-2 md:mx-3 text-red-500 flex-shrink-0" />
        <div className="flex-1 text-left h-7 overflow-hidden">
          <span key={suggestion} className="font-semibold animate-text-slide-in block text-lg">
            {suggestion}
          </span>
        </div>
      </button>
    </div>
  );
};

const BackgroundSlideshow = ({ 
  slides = [], 
  delay = 6000, 
  fadeMs = 900,
  autoplay = true 
}: { 
  slides?: Array<{src: string, alt: string, caption?: string}>, 
  delay?: number, 
  fadeMs?: number,
  autoplay?: boolean 
}) => {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Preload images
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
            {/* Using native img to avoid Next Image layout shifting in fullscreen hero */}
            <img src={s.src} alt={s.alt} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
};

// --- Main HeroSection Component ---
export default function HeroSection() {
  const { settings } = useHeroSettings();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { addSearchTerm } = useRecentSearches();

  // Create slides from settings
  const slides = settings.backgroundImages.map(img => ({
    src: img.desktop,
    alt: img.alt,
    caption: img.alt
  }));

  // Use settings for sliding text
  const currentSuggestion = useSlidingText(settings.searchSuggestions, 3000);

  const handleSearch = (term: string) => {
    addSearchTerm(term);
    console.log(`Searching for: ${term}`);
  };

  // NOTE: no early return with spinner — UI renders immediately
  return (
    <>
      <section className="relative h-screen min-h-[600px] max-h-[900px] w-full flex items-center justify-center text-white overflow-hidden font-sans">
        <BackgroundSlideshow 
          slides={slides} 
          delay={settings.animationSettings.slideshowSpeed * 1000} 
          fadeMs={settings.animationSettings.fadeSpeed}
          autoplay={settings.animationSettings.enableAutoplay}
        />

        {/* Overlay with settings */}
        <div 
          className="absolute inset-0 z-1"
          style={{
            background: settings.overlaySettings.gradientType === 'custom' 
              ? settings.overlaySettings.customGradient
              : settings.overlaySettings.gradientType === 'dark'
                ? `linear-gradient(to br, rgba(0,0,0,${settings.overlaySettings.opacity}), rgba(0,0,0,${settings.overlaySettings.opacity * 0.7}))`
                : `linear-gradient(to br, rgba(255,255,255,${settings.overlaySettings.opacity}), rgba(255,255,255,${settings.overlaySettings.opacity * 0.7}))`
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center h-full text-center md:items-start md:text-left">
          <div className="max-w-xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-tight tracking-wide text-shadow-lg">
              {settings.title.main}
              {settings.title.highlight && (
                <>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    {settings.title.highlight}
                  </span>
                </>
              )}
            </h1>
            <p className="mt-4 text-base sm:text-lg md:text-xl text-shadow font-light max-w-md mx-auto md:mx-0">
              Unforgettable excursions — from sunrise at the pyramids to sailing the Nile.
            </p>
            
            <HeroSearchBar 
              onOpenModal={() => setIsSearchModalOpen(true)} 
              suggestion={currentSuggestion}
            />

            {/* Trust Indicators */}
            {settings.trustIndicators.isVisible && (
              <div className="mt-6 flex items-center justify-center md:justify-start gap-6 text-white/80 text-sm">
                <span>{settings.trustIndicators.travelers}</span>
                <span>{settings.trustIndicators.ratingText}</span>
                <span>{settings.trustIndicators.rating}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <AlgoliaSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-from-top { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes text-slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-slide-from-top { animation: slide-from-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .animate-text-slide-in { animation: text-slide-in 0.5s ease-out forwards; }

        .text-shadow { text-shadow: 1px 1px 4px rgb(0 0 0 / 0.5); }
        .text-shadow-lg { text-shadow: 2px 2px 8px rgb(0 0 0 / 0.6); }
        .font-sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }

        img { backface-visibility: hidden; -webkit-backface-visibility: hidden; }

        @media (prefers-reduced-motion: reduce) {
          .animate-text-slide-in { animation: none; }
        }
      `}</style>
    </>
  );
}
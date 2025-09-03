'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Clock, Zap } from 'lucide-react';

// --- Type Definitions ---
type Tag = {
  id: string;
  name: string;
  position: React.CSSProperties;
  highlight?: boolean;
};

// --- Expanded Data for Dynamic Tags ---
const ALL_TAG_NAMES = [
  'FOOD TOURS', 'NIGHTLIFE', 'ART GALLERIES', 'HISTORICAL SITES', 'LIVE MUSIC', 'SHOPPING',
  'BIKE RENTALS', 'PARKS & NATURE', 'ROOFTOP BARS', 'ARCHITECTURE', 'BOAT TRIPS', 'COOKING CLASS',
  'WINE TASTING', 'BEACH DAY', 'HIKING TRAILS', 'STREET ART', 'KID FRIENDLY', 'LUXURY EXPERIENCES',
  'ADVENTURE SPORTS', 'PHOTOGRAPHY SPOTS', 'LOCAL MARKETS', 'THEATRE & SHOWS', 'WELLNESS & SPA'
];

// Sliding search suggestions for hero
const HERO_SEARCH_SUGGESTIONS = [
  'Where are you going?',
  'Find your next adventure',
  'Discover hidden gems',
  'Book unique experiences',
  'Explore new destinations',
  'Create lasting memories'
];

// --- RESPONSIVE TAG POSITIONS ---

// Desktop positions (for screens > 1024px)
const TAG_POSITIONS_DESKTOP: React.CSSProperties[] = [
  { top: '25%', left: '60%' }, { top: '20%', right: '15%' }, { top: '45%', left: '55%' },
  { top: '35%', right: '20%' }, { top: '50%', right: '25%' }, { top: '55%', left: '50%' },
  { top: '45%', right: '10%' }, { top: '65%', right: '20%' }, { top: '70%', left: '55%' },
  { top: '80%', left: '65%' }, { top: '15%', left: '50%' }, { top: '85%', right: '15%' }
];

// Mobile-friendly positions, designed to frame centered content
const TAG_POSITIONS_MOBILE: React.CSSProperties[] = [
  { top: '15%', left: '5%' },
  { top: '25%', right: '8%' },
  { top: '40%', left: '10%' },
  { top: '55%', right: '5%' },
  { top: '70%', left: '12%' },
  { top: '85%', right: '10%' },
  { top: '90%', left: '35%' },
];

// --- Other Data ---
const usePopularSearches = () => useMemo(() => [
  'LIGHT FESTIVAL', 'MUSEUM', 'MOST POPULAR SEARCH QUERY'
], []);

// --- Custom Hooks ---
const useRecentSearches = (storageKey = 'recentTravelSearches') => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    try {
      const storedItems = window.localStorage.getItem(storageKey);
      if (storedItems) setRecentSearches(JSON.parse(storedItems));
    } catch (error) { console.error("Failed to load recent searches", error); }
  }, [storageKey]);

  const addSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const newSearches = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
    setRecentSearches(newSearches);
    try { window.localStorage.setItem(storageKey, JSON.stringify(newSearches)); }
    catch (error) { console.error("Failed to save recent searches", error); }
  };
  
  const removeSearchTerm = (term: string) => {
    const newSearches = recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
    setRecentSearches(newSearches);
    try { window.localStorage.setItem(storageKey, JSON.stringify(newSearches)); }
    catch (error) { console.error("Failed to save recent searches", error); }
  };

  return { recentSearches, addSearchTerm, removeSearchTerm };
};

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    // Check on mount
    if (typeof window !== 'undefined') {
        checkIsMobile();
    }
    
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [breakpoint]);
  
  return isMobile;
};

const useDynamicTags = (allTags: string[], desktopPositions: React.CSSProperties[], mobilePositions: React.CSSProperties[], interval = 5000) => {
    const [displayedTags, setDisplayedTags] = useState<Tag[]>([]);
    const isMobile = useIsMobile();

    const generateRandomTags = useCallback(() => {
        const positions = isMobile ? mobilePositions : desktopPositions;
        // Show fewer tags on mobile to avoid clutter
        const tagCount = isMobile ? 5 : 9;
        
        const shuffledTags = [...allTags].sort(() => 0.5 - Math.random());
        const shuffledPositions = [...positions].sort(() => 0.5 - Math.random());
        // Highlight one tag randomly
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

// Custom hook for cycling through text suggestions
const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [texts.length, interval]);
  
  return texts[currentIndex];
};

// --- Sub-components ---
const FloatingTag = ({ tag }: { tag: Tag }) => (
  <button
    style={tag.position}
    className={`
      absolute px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm font-semibold rounded-full shadow-lg transition-all
      duration-300 ease-in-out hover:scale-110 pointer-events-auto animate-float animate-tag-fade-in
      ${tag.highlight
        ? 'bg-red-500 text-white scale-110 -rotate-6 hover:bg-red-600'
        : 'bg-white/90 text-slate-800 hover:bg-white backdrop-blur-sm'
      }
    `}
  >
    {tag.name}
  </button>
);

const SearchSuggestion = ({ term, icon: Icon, onSelect, onRemove }: { term: string, icon: React.ElementType, onSelect: (term: string) => void, onRemove?: (term: string) => void }) => (
    <div className="group relative">
        <button
            onClick={() => onSelect(term)}
            className="flex w-full items-center gap-3 pl-4 pr-5 py-2.5 bg-slate-100 text-slate-700 rounded-full transition-all duration-300 ease-in-out hover:bg-slate-200 hover:shadow-md hover:text-slate-900 group-hover:pr-10"
        >
            <Icon className="h-5 w-5 text-slate-500 group-hover:text-red-500 transition-colors" />
            <span className="font-medium text-sm sm:text-base text-left">{term}</span>
        </button>
        {onRemove && (
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(term); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-300 hover:text-slate-800"
                aria-label={`Remove ${term}`}
            >
                <X size={14} />
            </button>
        )}
    </div>
);

// ** MOBILE-FIRST SEARCH MODAL (BOTTOM SHEET ON MOBILE) **
const SearchModal = ({ isOpen, onClose, onSearch }: { isOpen: boolean, onClose: () => void, onSearch: (term: string) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const popularSearches = usePopularSearches();
    const { recentSearches, removeSearchTerm } = useRecentSearches();

    const handleSearchSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm);
            setSearchTerm('');
            onClose();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);
    
    useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : 'auto'; }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4" 
            onClick={onClose} 
            role="dialog" 
            aria-modal="true"
        >
            <div 
                className="w-full bg-white rounded-t-2xl shadow-2xl p-6 pt-4 max-h-[85vh] overflow-y-auto animate-slide-from-bottom
                           sm:rounded-2xl sm:w-full sm:max-w-2xl sm:max-h-[90vh] sm:animate-slide-up" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile Handle Bar */}
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden"></div>

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Search for an adventure</h2>
                    {/* --- FIX STARTS HERE --- */}
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors" aria-label="Close search">
                        {/* Use responsive className for sizing instead of invalid props */}
                        <X className="h-6 w-6 sm:h-7 sm:w-7" />
                    </button>
                    {/* --- FIX ENDS HERE --- */}
                </div>
                
                <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                        <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-slate-400 pointer-events-none" />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="What are you looking for?" autoFocus className="w-full text-base sm:text-lg pl-12 sm:pl-14 pr-6 py-3.5 sm:py-4 border-2 border-slate-200 bg-slate-50 rounded-full focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"/>
                    </div>
                </form>
                
                <div className="mt-8 space-y-8">
                    <div>
                        <h3 className="text-slate-500 font-bold text-sm tracking-wider uppercase mb-4">Most popular</h3>
                        <div className="flex flex-wrap gap-3">
                            {popularSearches.map(item => <SearchSuggestion key={item} term={item} icon={Zap} onSelect={(term) => { onSearch(term); onClose(); }} />)}
                        </div>
                    </div>
                    {recentSearches.length > 0 && (
                        <div>
                            <h3 className="text-slate-500 font-bold text-sm tracking-wider uppercase mb-4">Your recent searches</h3>
                            <div className="flex flex-wrap gap-3">
                                {recentSearches.map(item => <SearchSuggestion key={item} term={item} icon={Clock} onSelect={(term) => { onSearch(term); onClose(); }} onRemove={removeSearchTerm}/>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ** HERO SEARCH BAR WITH IMPROVED ANIMATION **
const HeroSearchBar = ({ onOpenModal }: { onOpenModal: () => void }) => {
  const currentSuggestion = useSlidingText(HERO_SEARCH_SUGGESTIONS, 3000);

  return (
    <div className="mt-8 lg:mt-10 w-full flex justify-center md:justify-start">
      <button 
        onClick={onOpenModal}
        className="w-full max-w-sm md:max-w-md bg-white text-slate-500 rounded-full flex items-center p-3 text-sm md:text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out transform"
      >
        <Search className="h-5 w-5 md:h-6 md:w-6 mx-2 md:mx-3 text-red-500 flex-shrink-0" />
        <div className="flex-1 text-left h-6 overflow-hidden">
          {/* Using key to re-trigger animation on text change */}
          <span key={currentSuggestion} className="font-semibold animate-text-slide-in block">
            {currentSuggestion}
          </span>
        </div>
      </button>
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
        // This is where you would trigger your search logic, e.g., router.push(`/search?q=${term}`)
        console.log(`Searching for: ${term}`);
    };

    return (
        <>
            <section className="relative h-screen min-h-[650px] max-h-[900px] w-full flex items-center justify-center text-white overflow-hidden font-sans">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/bg4.png" // Make sure this path is correct in your `public` folder
                        alt="Scenic travel background with mountains and a lake"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent"></div>
                </div>

                {/* ** RESPONSIVE CONTENT CONTAINER ** */}
                <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center h-full text-center md:items-start md:text-left">
                    <div className="max-w-xl">
                        {/* ** ADAPTIVE H1 FOR MOBILE/DESKTOP ** */}
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

                {/* Floating Tags */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {dynamicTags.map(tag => <FloatingTag key={tag.id} tag={tag} />)}
                </div>
            </section>
            
            <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSearch={handleSearch}/>
            
            {/* Using a separate style tag for global styles and keyframes is cleaner */}
            <style jsx global>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slide-from-bottom { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes float { 
                    0%, 100% { transform: translateY(0px); } 
                    50% { transform: translateY(-10px); } 
                }
                @keyframes tag-fade-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
                @keyframes text-slide-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
                .animate-slide-from-bottom { animation: slide-from-bottom 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
                .animate-float { animation: float 8s ease-in-out infinite; }
                .animate-tag-fade-in { animation: tag-fade-in 0.7s ease-out forwards; }
                .animate-text-slide-in { animation: text-slide-in 0.5s ease-out forwards; }

                .text-shadow { text-shadow: 1px 1px 4px rgb(0 0 0 / 0.5); }
                .text-shadow-lg { text-shadow: 2px 2px 8px rgb(0 0 0 / 0.6); }
                .font-sans { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
            `}</style>
            
            {/* It's better to add fonts in your main layout file, but this works for a self-contained component */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        </>
    );
}
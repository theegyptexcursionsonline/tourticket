'use client';

import React, { useState, useEffect, useRef, useMemo, FC } from 'react';
import { ChevronDown, Search, Globe, ShoppingCart, X, Landmark, Ticket, Star, Clock, Zap, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import the real cart hook and settings
import { useCart } from '@/contexts/CartContext';
import CurrencyLanguageSwitcher from '@/components/shared/CurrencyLanguageSwitcher';

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
    try { window.localStorage.setItem(storageKey, JSON.stringify(newSearches)); } catch (error) { console.error("Failed to save recent searches", error); }
  };
  const removeSearchTerm = (term: string) => {
    const newSearches = recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
    setRecentSearches(newSearches);
    try { window.localStorage.setItem(storageKey, JSON.stringify(newSearches)); } catch (error) { console.error("Failed to save recent searches", error); }
  };
  return { recentSearches, addSearchTerm, removeSearchTerm };
};

// --- DATA ---
const megaMenuData = {
  destinations: [
    { name: 'AMSTERDAM', country: 'Netherlands', imageUrl: '/images/amsterdam.png' },
    { name: 'BERLIN', country: 'Germany', imageUrl: '/images/berlin.png' },
    { name: 'COPENHAGEN', country: 'Denmark', imageUrl: '/images/copenhagen.png' },
    { name: 'ROTTERDAM', country: 'Netherlands', imageUrl: '/images/rotterdam.png' },
    { name: 'STOCKHOLM', country: 'Sweden', imageUrl: '/images/stockholm.png' },
    { name: 'PARIS', country: 'France', imageUrl: '/images/paris.png' },
  ],
  activities: [
    { name: 'Attractions', icon: Landmark }, { name: 'Museums', icon: Landmark },
    { name: 'Canal Cruises', icon: Ticket }, { name: 'City Passes', icon: Ticket },
    { name: 'Hop-On Hop-Off', icon: Ticket }, { name: 'Bike Tours', icon: Ticket },
    { name: 'Day Trips', icon: Star }, { name: 'Combi Tickets', icon: Star },
    { name: 'Light Festivals', icon: Star },
  ],
};

const usePopularSearches = () => useMemo(() => ['LIGHT FESTIVAL', 'MUSEUM', 'MOST POPULAR SEARCH QUERY'], []);

const SEARCH_SUGGESTIONS = [
  'Where are you going?', 'Find museums near you', 'Discover food tours', 'Book canal cruises',
  'Explore art galleries', 'City passes & tickets', 'Weekend getaways', 'Cultural experiences'
];

// --- HOOKS ---
function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

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

const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % texts.length), interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);
  return texts[currentIndex];
};

// --- SUB-COMPONENTS ---
const SearchSuggestion: FC<{ term: string; icon: React.ElementType; onSelect: (term: string) => void; onRemove?: (term: string) => void; }> = ({ term, icon: Icon, onSelect, onRemove }) => (
    <div className="group relative">
        <button onClick={() => onSelect(term)} className="flex items-center gap-3 pl-4 pr-5 py-2 bg-slate-100 text-slate-700 rounded-full transition-all hover:bg-slate-200 hover:shadow-md group-hover:pr-10">
            <Icon className="h-5 w-5 text-slate-500 group-hover:text-red-500 transition-colors" />
            <span className="font-medium">{term}</span>
        </button>
        {onRemove && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(term); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-300" aria-label={`Remove ${term}`}>
                <X size={14} />
            </button>
        )}
    </div>
);

const SearchModal: FC<{ isOpen: boolean; onClose: () => void; onSearch: (term: string) => void; }> = ({ isOpen, onClose, onSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const popularSearches = usePopularSearches();
    const { recentSearches, removeSearchTerm } = useRecentSearches();
    const modalRef = useRef<HTMLDivElement>(null);
    
    const handleSearchSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (searchTerm.trim()) { onSearch(searchTerm); setSearchTerm(''); onClose(); }
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { 
            if (e.key === 'Escape') onClose(); 
        };
        
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'auto';
        };
    }, [onClose, isOpen]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-lg flex items-start justify-center p-4 sm:p-6 lg:p-8" role="dialog" aria-modal="true">
            <div ref={modalRef} className="relative w-full max-w-5xl bg-white shadow-2xl rounded-lg p-6 sm:p-8">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100" aria-label="Close search"><X size={28} /></button>
                <form onSubmit={handleSearchSubmit} className="mb-8">
                    <div className="relative"><Search className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="What are you looking for?" autoFocus className="w-full text-xl sm:text-2xl pl-10 pr-6 py-4 bg-transparent border-b-2 border-slate-200 focus:outline-none focus:border-red-500" /></div>
                </form>
                <div className="space-y-8">
                    <div><h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">Most popular</h3><div className="flex flex-wrap gap-3">{popularSearches.map(item => <SearchSuggestion key={item} term={item} icon={Zap} onSelect={(term) => { onSearch(term); onClose(); }} />)}</div></div>
                    {recentSearches.length > 0 && (<div><h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">Your recent searches</h3><div className="flex flex-wrap gap-3">{recentSearches.map(item => <SearchSuggestion key={item} term={item} icon={Clock} onSelect={(term) => { onSearch(term); onClose(); }} onRemove={removeSearchTerm} />)}</div></div>)}
                </div>
            </div>
        </div>
    );
};

const MegaMenu: FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, onClose);
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div ref={menuRef} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="absolute top-full left-0 right-0 bg-white shadow-2xl z-20 text-black border-t">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            <div className="md:col-span-2">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Top Destinations</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {megaMenuData.destinations.map(dest => (
                                        <a href="#" key={dest.name} className="group block">
                                            <div className="aspect-square w-full rounded-lg overflow-hidden relative">
                                                <img src={dest.imageUrl} alt={dest.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                                            </div>
                                            <h4 className="mt-2 font-bold text-gray-900 group-hover:text-red-500">{dest.name}</h4>
                                            <p className="text-xs text-gray-500">{dest.country}</p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Activity Types</h3>
                                <ul className="space-y-3">
                                    {megaMenuData.activities.map(activity => (
                                        <li key={activity.name}><a href="#" className="flex items-center gap-3 text-gray-700 hover:text-red-500 group"><activity.icon size={20} className="text-gray-400 group-hover:text-red-500" /> <span className="font-semibold">{activity.name}</span></a></li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-6 flex flex-col justify-center items-center text-center">
                                <Star size={32} className="text-yellow-500 mb-2" /><h3 className="font-bold text-lg text-gray-800">Special Offers</h3>
                                <p className="text-sm text-gray-600 my-2">Save up to 20% on combi deals and city passes!</p>
                                <button className="mt-2 bg-red-500 text-white font-bold py-2 px-4 rounded-full hover:bg-red-600 text-sm">View Deals</button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const MobileMenu: FC<{ isOpen: boolean; onClose: () => void; onOpenSearch: () => void; }> = ({ isOpen, onClose, onOpenSearch }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="fixed inset-0 z-[9999] md:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/50" />
                    <motion.div
                        ref={menuRef}
                        className="absolute top-0 left-0 h-full w-full max-w-sm bg-white shadow-2xl"
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-6 border-b">
                                <img src="/EEO-logo.png" alt="Egypt Excursions Online" className="h-10 object-contain" />
                                <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <button 
                                    onClick={() => { onOpenSearch(); onClose(); }}
                                    className="w-full flex items-center gap-3 p-4 bg-slate-100 rounded-lg text-left"
                                >
                                    <Search size={20} className="text-slate-500" />
                                    <span className="text-slate-700">Search tours & tickets</span>
                                </button>
                                
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-4">Destinations</h3>
                                    <div className="space-y-2">
                                        {megaMenuData.destinations.map(dest => (
                                            <a key={dest.name} href="#" className="block py-2 text-slate-700 hover:text-red-500">
                                                {dest.name}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 mb-4">Activities</h3>
                                    <div className="space-y-2">
                                        {megaMenuData.activities.map(activity => (
                                            <a key={activity.name} href="#" className="flex items-center gap-3 py-2 text-slate-700 hover:text-red-500">
                                                <activity.icon size={16} />
                                                <span>{activity.name}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 border-t">
                                <CurrencyLanguageSwitcher variant="footer" />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const HeaderSearchBar: FC<{ onFocus: () => void; }> = ({ onFocus }) => {
    const currentSuggestion = useSlidingText(SEARCH_SUGGESTIONS, 2500);
    return (
        <div className="hidden lg:block flex-1 max-w-2xl mx-8">
            <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <button onClick={onFocus} className="w-full text-left pl-12 pr-6 py-3 text-sm bg-white border-2 border-slate-200 rounded-full shadow-sm hover:border-red-300 transition-colors">
                    <span className="text-slate-500">{currentSuggestion}</span>
                </button>
            </div>
        </div>
    );
};

// --- MAIN HEADER COMPONENT (EXPORTED) ---
export default function Header({ startSolid = false }: { startSolid?: boolean }) {
  const [isMegaMenuOpen, setMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  
  // Use the real cart context
  const { openCart, itemCount } = useCart();
  const { scrollY, isVisible } = useScrollDirection();
  const { addSearchTerm } = useRecentSearches();

  const isScrolled = scrollY > 100;
  
  // Determine if the header is transparent
  const isTransparent = !(isScrolled || isMegaMenuOpen || startSolid);
  
  const headerClasses = `fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-in-out transform ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${isTransparent ? 'bg-transparent text-white' : 'bg-white text-gray-800 shadow-lg'}`;
  const linkClasses = `transition-colors duration-200 ${isTransparent ? 'text-white hover:text-gray-200' : 'text-gray-800 hover:text-red-500'}`;

  const handleSearch = (term: string) => addSearchTerm(term);

  const handleMegaMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMegaMenuOpen(prev => !prev);
  };

  return (
    <>
      <header className={headerClasses}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 md:h-20">
                <div className="flex items-center gap-4 lg:gap-8">
                    <a href="/" className="flex items-center h-full">
                        <img src="/EEO-logo.png" alt="Egypt Excursions Online" className="h-12 md:h-14 lg:h-16 object-contain" />
                    </a>
                    <nav className="hidden md:flex items-center relative">
                        <button onClick={handleMegaMenuToggle} className={`${linkClasses} flex items-center gap-1 font-semibold group text-sm lg:text-base`}>
                            <span>EXPLORE</span>
                            <motion.div animate={{ rotate: isMegaMenuOpen ? 180 : 0 }}><ChevronDown size={20} /></motion.div>
                        </button>
                    </nav>
                </div>

                {isScrolled && <HeaderSearchBar onFocus={() => setSearchModalOpen(true)} />}
                
                <div className="flex items-center gap-3 md:gap-5">
                    <CurrencyLanguageSwitcher 
                      variant="header" 
                      headerLinkClasses={linkClasses} 
                      isTransparent={isTransparent}
                    />
                    
                    <button onClick={openCart} className="relative group p-2">
                        <ShoppingCart size={24} className={`${linkClasses} group-hover:text-red-500`} />
                        {itemCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white">{itemCount}</span>}
                    </button>
                    
                    <button onClick={() => setSearchModalOpen(true)} className={`${linkClasses} lg:hidden group p-2`} aria-label="Open search">
                        <Search size={22} className="group-hover:text-red-500" />
                    </button>
                    
                    <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2" aria-label="Open menu">
                        <Menu size={24} className={linkClasses} />
                    </button>
                </div>
            </div>
        </div>
        <MegaMenu isOpen={isMegaMenuOpen} onClose={() => setMegaMenuOpen(false)} />
      </header>
      
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        onOpenSearch={() => setSearchModalOpen(true)}
      />
      
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setSearchModalOpen(false)} onSearch={handleSearch} />
    </>
  );
}
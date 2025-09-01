'use client';

import { useState, useEffect, useRef, useMemo, FC, ReactNode } from 'react';
import { ChevronDown, Search, Globe, ShoppingCart, X, Landmark, Ticket, Star, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPE DEFINITIONS (for TypeScript) ---
interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface Destination {
  name: string;
  country: string;
  imageUrl: string;
}

// --- EXPANDED DATA MODELS ---
const currencies: Currency[] = [
    { code: 'USD', name: 'United States Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr.' },
];

const languages: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
];

const megaMenuData = {
  destinations: [
    { name: 'AMSTERDAM', country: 'Netherlands', imageUrl: 'https://images.unsplash.com/photo-1584116410243-346a1a1d4496?w=400' },
    { name: 'BERLIN', country: 'Germany', imageUrl: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400' },
    { name: 'COPENHAGEN', country: 'Denmark', imageUrl: 'https://images.unsplash.com/photo-1512470876302-9722238a3a02?w=400' },
    { name: 'ROTTERDAM', country: 'Netherlands', imageUrl: 'https://images.unsplash.com/photo-1596201732943-ae62bfdfc088?w=400' },
    { name: 'STOCKHOLM', country: 'Sweden', imageUrl: 'https://images.unsplash.com/photo-1599360889421-8f703c3a4e97?w=400' },
    { name: 'PARIS', country: 'France', imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760c0337?w=400' },
  ],
  activities: [
    { name: 'Attractions', icon: Landmark },
    { name: 'Museums', icon: Landmark },
    { name: 'Canal Cruises', icon: Ticket },
    { name: 'City Passes', icon: Ticket },
    { name: 'Hop-On Hop-Off', icon: Ticket },
    { name: 'Bike Tours', icon: Ticket },
    { name: 'Day Trips', icon: Star },
    { name: 'Combi Tickets', icon: Star },
    { name: 'Light Festivals', icon: Star },
  ],
};

// --- POPULAR SEARCHES DATA ---
const usePopularSearches = () => useMemo(() => [
    'LIGHT FESTIVAL', 'MUSEUM', 'MOST POPULAR SEARCH QUERY'
], []);

// --- CUSTOM HOOKS ---
function useOnClickOutside(ref: React.RefObject<HTMLDivElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
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

// Custom hook for persistent storage
const usePersistentState = <T,>(key: string, defaultValue: T): [T, (value: T) => void] => {
  const [state, setState] = useState<T>(defaultValue);
  
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setState(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
  }, [key]);
  
  const setValue = (value: T) => {
    try {
      setState(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };
  
  return [state, setValue];
};

/**
 * Custom hook to manage and persist recent searches in localStorage.
 */
const useRecentSearches = (storageKey = 'recentTravelSearches') => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
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
    const newSearches = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
    setRecentSearches(newSearches);
    try { 
      window.localStorage.setItem(storageKey, JSON.stringify(newSearches)); 
    } catch (error) { 
      console.error("Failed to save recent searches", error); 
    }
  };
  
  const removeSearchTerm = (term: string) => {
    const newSearches = recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
    setRecentSearches(newSearches);
    try { 
      window.localStorage.setItem(storageKey, JSON.stringify(newSearches)); 
    } catch (error) { 
      console.error("Failed to save recent searches", error); 
    }
  };

  return { recentSearches, addSearchTerm, removeSearchTerm };
};

// Custom hook for scroll direction detection
function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    let lastScrollY = window.pageYOffset;
    
    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      
      if (direction !== scrollDirection && (scrollY - lastScrollY > 10 || scrollY - lastScrollY < -10)) {
        setScrollDirection(direction);
      }
      
      setScrollY(scrollY);
      lastScrollY = scrollY > 0 ? scrollY : 0;
    };
    
    window.addEventListener('scroll', updateScrollDirection);
    return () => window.removeEventListener('scroll', updateScrollDirection);
  }, [scrollDirection]);

  return { scrollDirection, scrollY };
}

// --- REUSABLE SUB-COMPONENTS ---
interface SelectorPopoverProps<T> {
  items: T[];
  selectedItem: T;
  onSelect: (item: T) => void;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  searchKeys: (keyof T)[];
  trigger: ReactNode;
  title: string;
}

const SelectorPopover = <T,>({ items, selectedItem, onSelect, renderItem, getKey, searchKeys, trigger, title }: SelectorPopoverProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(popoverRef, () => setIsOpen(false));

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item => 
      searchKeys.some(key => 
        String(item[key]).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [items, searchTerm, searchKeys]);

  const handleSelect = (item: T) => {
    onSelect(item);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={popoverRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-100 z-50 text-gray-800"
          >
            <div className="p-3 border-b">
              <h3 className="font-bold text-center">{title}</h3>
            </div>
            <div className="p-2">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-300"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <button
                    key={getKey(item)}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left p-3 rounded-md transition-all duration-200 text-sm flex justify-between items-center ${getKey(selectedItem) === getKey(item) ? 'bg-red-50 text-red-600 font-semibold' : 'hover:bg-gray-100'}`}
                  >
                    {renderItem(item)}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">No results found.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- SEARCH COMPONENTS ---
const SearchSuggestion = ({ term, icon: Icon, onSelect, onRemove }: { term: string, icon: React.ElementType, onSelect: (term: string) => void, onRemove?: (term: string) => void }) => (
    <div className="group relative">
        <button
            onClick={() => onSelect(term)}
            className="flex items-center gap-3 pl-4 pr-5 py-2 bg-slate-100 text-slate-700 rounded-full transition-all duration-300 ease-in-out hover:bg-slate-200 hover:shadow-md hover:text-slate-900 group-hover:pr-10"
        >
            <Icon className="h-5 w-5 text-slate-500 group-hover:text-red-500 transition-colors" />
            <span className="font-medium">{term}</span>
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
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') onClose(); 
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  useEffect(() => { 
    document.body.style.overflow = isOpen ? 'hidden' : 'auto'; 
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-lg flex items-start justify-center p-4 sm:p-6 lg:p-8 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 animate-slide-up overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Search for an adventure</h2>
            <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors" aria-label="Close search"><X size={28} /></button>
        </div>
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 pointer-events-none" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="What are you looking for?" 
              autoFocus 
              className="w-full text-lg pl-14 pr-6 py-4 border-2 border-slate-200 bg-slate-50 rounded-full focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
            />
          </div>
        </form>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">Most popular</h3>
            <div className="flex flex-wrap gap-3">
              {popularSearches.map(item => <SearchSuggestion key={item} term={item} icon={Zap} onSelect={(term) => { onSearch(term); onClose(); }} />)}
            </div>
          </div>
          {recentSearches.length > 0 && (
            <div>
              <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">Your recent searches</h3>
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

const MegaMenu: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, onClose);
    
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="absolute top-full left-0 right-0 bg-white shadow-2xl z-40 text-black border-t border-gray-100"
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {/* Column 1 & 2: Destinations */}
                            <div className="md:col-span-2">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Top Destinations</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {megaMenuData.destinations.map(dest => (
                                        <a href="#" key={dest.name} className="group block">
                                            <div className="aspect-square w-full rounded-lg overflow-hidden relative">
                                                <img src={dest.imageUrl} alt={dest.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                                            </div>
                                            <h4 className="mt-2 font-bold text-gray-900 group-hover:text-red-500 transition-colors">{dest.name}</h4>
                                            <p className="text-xs text-gray-500">{dest.country}</p>
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Column 3: Activities */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Activity Types</h3>
                                <ul className="space-y-3">
                                    {megaMenuData.activities.map(activity => (
                                        <li key={activity.name}>
                                            <a href="#" className="flex items-center gap-3 text-gray-700 hover:text-red-500 transition-colors group">
                                                <activity.icon size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                                                <span className="font-semibold">{activity.name}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Column 4: Featured */}
                            <div className="bg-gray-50 rounded-lg p-6 flex flex-col justify-center items-center text-center">
                                <Star size={32} className="text-yellow-500 mb-2" />
                                <h3 className="font-bold text-lg text-gray-800">Special Offers</h3>
                                <p className="text-sm text-gray-600 my-2">Save up to 20% on combi deals and city passes!</p>
                                <button className="mt-2 bg-red-500 text-white font-bold py-2 px-4 rounded-full hover:bg-red-600 transition-colors text-sm">
                                    View Deals
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- MAIN HEADER COMPONENT ---
export default function Header() {
  const [isMegaMenuOpen, setMegaMenuOpen] = useState(false);
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  
  // Persistent currency and language selection
  const [selectedCurrency, setSelectedCurrency] = usePersistentState<Currency>('selectedCurrency', currencies[1]); // Default to EUR
  const [selectedLanguage, setSelectedLanguage] = usePersistentState<Language>('selectedLanguage', languages[0]); // Default to English
  
  const { scrollDirection, scrollY } = useScrollDirection();
  const { addSearchTerm } = useRecentSearches();
  
  // Determine if header should be styled as scrolled
  const isScrolled = scrollY > 100;
  
  // Effect for locking body scroll when mega menu is open
  useEffect(() => {
    document.body.style.overflow = isMegaMenuOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isMegaMenuOpen]);
  
  const headerClasses = `fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out ${
    isScrolled || isMegaMenuOpen ? 'bg-white text-gray-800 shadow-lg' : 'bg-transparent text-white'
  }`;
  
  const linkClasses = `hover:text-red-500 transition-colors duration-200 ${
    isScrolled || isMegaMenuOpen ? 'text-gray-800' : 'text-white'
  }`;

  const handleSearch = (term: string) => {
    addSearchTerm(term);
    console.log(`Searching for: ${term}`);
  };

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency);
  };

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
  };

  return (
    <>
      <header className={headerClasses}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Main Header Row */}
            <div className="flex items-center justify-between h-16 md:h-20">
              <div className="flex items-center gap-4 lg:gap-8">
                {/* Updated Logo to match Footer style */}
                <a href="#" className="flex items-center">
                  <div className="bg-red-500 text-white font-bold text-xl md:text-2xl lg:text-3xl px-3 py-2 transition-all duration-300">
                    <span>TRIP</span>
                    <span className="text-cyan-300">&</span>
                    <span>TICKETS</span>
                  </div>
                </a>
                <nav className="hidden md:flex items-center relative">
                  <button 
                    onClick={() => setMegaMenuOpen(!isMegaMenuOpen)} 
                    className={`${linkClasses} flex items-center gap-1 font-semibold group text-sm lg:text-base`}
                  >
                    <span>EXPLORE</span>
                    <motion.div 
                      animate={{ rotate: isMegaMenuOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={20} className="group-hover:text-red-500 transition-colors" />
                    </motion.div>
                  </button>
                </nav>
              </div>

              <div className="flex items-center gap-3 md:gap-5 font-semibold text-sm">
                <SelectorPopover<Currency>
                  title="Select Currency"
                  items={currencies}
                  selectedItem={selectedCurrency}
                  onSelect={handleCurrencySelect}
                  getKey={(c) => c.code}
                  searchKeys={['name', 'code']}
                  renderItem={(c) => (
                    <>
                      <span>{c.code} - {c.name}</span>
                      <span className="text-gray-400">{c.symbol}</span>
                    </>
                  )}
                  trigger={
                    <button className={`${linkClasses} hidden sm:inline-flex items-center gap-1.5 cursor-pointer`}>
                      <span className="font-bold">{selectedCurrency.symbol}</span>
                      <span>{selectedCurrency.code}</span>
                    </button>
                  }
                />
                
                <SelectorPopover<Language>
                  title="Select Language"
                  items={languages}
                  selectedItem={selectedLanguage}
                  onSelect={handleLanguageSelect}
                  getKey={(l) => l.code}
                  searchKeys={['name', 'nativeName']}
                  renderItem={(l) => (
                    <>
                      <span>{l.name}</span>
                      <span className="text-gray-500">{l.nativeName}</span>
                    </>
                  )}
                  trigger={
                    <button className={`${linkClasses} flex items-center gap-1.5 group cursor-pointer`}>
                      <Globe size={20} className="group-hover:text-red-500 transition-colors" />
                      <span>{selectedLanguage.code.toUpperCase()}</span>
                    </button>
                  }
                />

                <div className="relative cursor-pointer group">
                  <ShoppingCart size={24} className={`${linkClasses} group-hover:text-red-500 transition-colors`} />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white">
                    0
                  </span>
                </div>
                
                <button 
                  onClick={() => setSearchModalOpen(true)}
                  className={`${linkClasses} hover:scale-110 transition-all duration-200 group`} 
                  aria-label="Open search"
                >
                    <Search size={22} className="group-hover:text-red-500 transition-colors" />
                </button>
              </div>
            </div>
        </div>
        
        {/* Render Mega Menu directly under header */}
        <MegaMenu isOpen={isMegaMenuOpen} onClose={() => setMegaMenuOpen(false)} />
      </header>

      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setSearchModalOpen(false)} 
        onSearch={handleSearch}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
        
        @keyframes fade-in { 
          from { opacity: 0; } 
          to { opacity: 1; } 
        }
        @keyframes slide-up { 
          from { opacity: 0; transform: translateY(20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        .animate-fade-in { 
          animation: fade-in 0.3s ease-out forwards; 
        }
        .animate-slide-up { 
          animation: slide-up 0.4s ease-out forwards; 
        }
      `}</style>
    </>
  );
}
'use client';

import React, { useState, useEffect, useRef, FC } from 'react';
import { ChevronDown, Search, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CurrencyLanguageSwitcher from '@/components/shared/CurrencyLanguageSwitcher';

// Dummy implementation for hooks/context for a runnable component
const useCart = () => ({ openCart: () => alert('Opening cart!'), itemCount: 3 });

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

// Dummy MegaMenu for a self-contained Header
const MegaMenu: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, onClose);
  if(!isOpen) return null;
  return <div ref={menuRef} className="absolute top-full left-0 w-full h-auto bg-white shadow-lg text-black p-8 z-20 border-t">Full Mega Menu Content...</div>
};

// --- MAIN HEADER COMPONENT (MODIFIED) ---
export default function Header({ startSolid = false }: { startSolid?: boolean }) {
  const [isMegaMenuOpen, setMegaMenuOpen] = useState(false);
  const { openCart, itemCount } = useCart();
  const { scrollY, isVisible } = useScrollDirection();

  const isScrolled = scrollY > 100;

  // ** FIX **: Determine if the header is transparent
  const isTransparent = !(isScrolled || isMegaMenuOpen || startSolid);
  
  const headerClasses = `fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-in-out transform ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${isTransparent ? 'bg-transparent text-white' : 'bg-white text-gray-800 shadow-lg'}`;
  const linkClasses = `transition-colors duration-200 ${isTransparent ? 'text-white hover:text-gray-200' : 'text-gray-800 hover:text-red-500'}`;

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

                <div className="flex items-center gap-3 md:gap-5">
                    {/* ** FIX **: Pass the isTransparent prop to the switcher */}
                    <CurrencyLanguageSwitcher 
                      variant="header" 
                      headerLinkClasses={linkClasses} 
                      isTransparent={isTransparent}
                    />
                    
                    <button onClick={openCart} className="relative group p-2">
                        <ShoppingCart size={24} className={`${linkClasses} group-hover:text-red-500`} />
                        {itemCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 ${isTransparent ? 'border-transparent' : 'border-white'}`}>{itemCount}</span>}
                    </button>
                    <button onClick={() => alert('Search modal opens')} className={`${linkClasses} lg:hidden group p-2`} aria-label="Open search">
                        <Search size={22} className="group-hover:text-red-500" />
                    </button>
                </div>
            </div>
        </div>
        <MegaMenu isOpen={isMegaMenuOpen} onClose={() => setMegaMenuOpen(false)} />
      </header>
    </>
  );
}
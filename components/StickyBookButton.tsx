"use client";

import { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/useSettings'; // Assuming you have this hook for formatting price

interface StickyBookButtonProps {
  price: number;
  currency: string;
  onClick: () => void;
}

const StickyBookButton: React.FC<StickyBookButtonProps> = ({ price, currency, onClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { formatPrice } = useSettings();

  const handleScroll = () => {
    const scrollY = window.scrollY;
    // Adjust this value based on when you want the button to appear
    if (scrollY > 400) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-200 shadow-lg z-20 md:hidden">
      <div className="container mx-auto flex items-center justify-between">
        <div>
          <span className="font-bold text-lg text-slate-800">{formatPrice(price)}</span>
          <span className="text-sm text-slate-500"> / person</span>
        </div>
        <button
          onClick={onClick}
          className="bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-colors shadow-md"
        >
          Book now
        </button>
      </div>
    </div>
  );
};

export default StickyBookButton;
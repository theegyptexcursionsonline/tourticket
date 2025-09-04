'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, DollarSign } from 'lucide-react';

// Types
interface Currency {
  code: string;
  symbol: string;
  name: string;
}

interface Language {
  code: string;
  name: string;
  flag: string;
}

// Data
const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const LANGUAGES: Language[] = [
  { code: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'AR', name: 'العربية', flag: '🇪🇬' },
];

interface CurrencyLanguageSwitcherProps {
  variant?: 'header' | 'footer';
  className?: string;
}

export default function CurrencyLanguageSwitcher({ 
  variant = 'header',
  className = '' 
}: CurrencyLanguageSwitcherProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCIES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  const currencyRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setShowCurrencyDropdown(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency);
    setShowCurrencyDropdown(false);
  };

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    setShowLanguageDropdown(false);
  };

  const baseButtonClass = variant === 'header' 
    ? "flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-200"
    : "flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-200";

  const dropdownClass = variant === 'header'
    ? "absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 min-w-[180px]"
    : "absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 min-w-[180px]";

  const dropdownItemClass = "flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Currency Switcher */}
      <div className="relative" ref={currencyRef}>
        <button
          onClick={() => {
            setShowCurrencyDropdown(!showCurrencyDropdown);
            setShowLanguageDropdown(false);
          }}
          className={baseButtonClass}
          aria-label="Select currency"
        >
          <DollarSign size={16} />
          <span className="text-sm font-medium">
            {selectedCurrency.symbol} {selectedCurrency.code}
          </span>
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-200 ${showCurrencyDropdown ? 'rotate-180' : ''}`}
          />
        </button>

        {showCurrencyDropdown && (
          <div className={dropdownClass}>
            {CURRENCIES.map((currency) => (
              <div
                key={currency.code}
                onClick={() => handleCurrencySelect(currency)}
                className={`${dropdownItemClass} ${
                  selectedCurrency.code === currency.code ? 'bg-slate-100' : ''
                }`}
              >
                <span className="text-lg">{currency.symbol}</span>
                <div>
                  <div className="font-medium">{currency.code}</div>
                  <div className="text-xs text-slate-500">{currency.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Language Switcher */}
      <div className="relative" ref={languageRef}>
        <button
          onClick={() => {
            setShowLanguageDropdown(!showLanguageDropdown);
            setShowCurrencyDropdown(false);
          }}
          className={baseButtonClass}
          aria-label="Select language"
        >
          <Globe size={16} />
          <span className="text-sm font-medium">
            {selectedLanguage.code}
          </span>
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`}
          />
        </button>

        {showLanguageDropdown && (
          <div className={dropdownClass}>
            {LANGUAGES.map((language) => (
              <div
                key={language.code}
                onClick={() => handleLanguageSelect(language)}
                className={`${dropdownItemClass} ${
                  selectedLanguage.code === language.code ? 'bg-slate-100' : ''
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <div>
                  <div className="font-medium">{language.name}</div>
                  <div className="text-xs text-slate-500">{language.code}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
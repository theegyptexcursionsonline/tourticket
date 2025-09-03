'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { Currency, Language } from '@/types';
import { currencies, languages, conversionRates } from '@/utils/localization';

interface SettingsContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  selectedLanguage: Language;
  setSelectedLanguage: (language: Language) => void;
  formatPrice: (priceInEur: number) => string;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

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


export function SettingsProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] = usePersistentState<Currency>('selectedCurrency', currencies[1]); // Default to EUR
  const [selectedLanguage, setSelectedLanguage] = usePersistentState<Language>('selectedLanguage', languages[0]); // Default to English

  const formatPrice = (priceInEur: number) => {
    const rate = conversionRates[selectedCurrency.code] || 1;
    const convertedPrice = priceInEur * rate;
    return `${selectedCurrency.symbol}${convertedPrice.toFixed(2)}`;
  };

  return (
    <SettingsContext.Provider value={{ selectedCurrency, setSelectedCurrency, selectedLanguage, setSelectedLanguage, formatPrice }}>
      {children}
    </SettingsContext.Provider>
  );
}

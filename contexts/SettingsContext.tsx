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
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsedItem = JSON.parse(item);
        setState(parsedItem);
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    } finally {
      setIsLoaded(true);
    }
  }, [key]);
  
  const setValue = (value: T) => {
    try {
      setState(value);
      if (isLoaded) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
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
    
    // Format based on currency
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: selectedCurrency.code === 'JPY' ? 0 : 2,
      maximumFractionDigits: selectedCurrency.code === 'JPY' ? 0 : 2,
    });

    return `${selectedCurrency.symbol}${formatter.format(convertedPrice)}`;
  };

  return (
    <SettingsContext.Provider value={{ 
      selectedCurrency, 
      setSelectedCurrency, 
      selectedLanguage, 
      setSelectedLanguage, 
      formatPrice 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
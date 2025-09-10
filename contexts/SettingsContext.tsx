// contexts/SettingsContext.tsx
'use client';

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Currency, Language } from '@/types';
import { currencies, languages } from '@/utils/localization';

interface SettingsContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  selectedLanguage: Language;
  setSelectedLanguage: (language: Language) => void;
  formatPrice: (priceInEur: number) => string;
  formatNumber: (number: number) => string;
  formatDate: (date: Date | string) => string;
  exchangeRates: { [key: string]: number };
  isLoading: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Simple translation system
const translations: Record<string, Record<string, string>> = {
  en: {
    'header.explore': 'EXPLORE',
    'header.login': 'Log In',
    'header.signup': 'Sign Up',
    'currency.title': 'Select a Currency',
    'language.title': 'Select a Language',
    'cart.title': 'Your Cart',
    'cart.empty': 'Your cart is empty',
    'cart.subtotal': 'Subtotal',
    'cart.checkout': 'Proceed to Checkout',
    'tour.duration': 'Duration',
    'tour.rating': 'Rating',
    'tour.bookings': 'bookings',
    'tour.addToCart': 'Add to Cart',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'price.from': 'from',
    'price.perPerson': 'per person',
  },
  es: {
    'header.explore': 'EXPLORAR',
    'header.login': 'Iniciar Sesión',
    'header.signup': 'Registrarse',
    'currency.title': 'Seleccionar una Moneda',
    'language.title': 'Seleccionar un Idioma',
    'cart.title': 'Tu Carrito',
    'cart.empty': 'Tu carrito está vacío',
    'cart.subtotal': 'Subtotal',
    'cart.checkout': 'Proceder al Pago',
    'tour.duration': 'Duración',
    'tour.rating': 'Calificación',
    'tour.bookings': 'reservas',
    'tour.addToCart': 'Añadir al Carrito',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'price.from': 'desde',
    'price.perPerson': 'por persona',
  },
  fr: {
    'header.explore': 'EXPLORER',
    'header.login': 'Se Connecter',
    'header.signup': 'S\'inscrire',
    'currency.title': 'Sélectionner une Devise',
    'language.title': 'Sélectionner une Langue',
    'cart.title': 'Votre Panier',
    'cart.empty': 'Votre panier est vide',
    'cart.subtotal': 'Sous-total',
    'cart.checkout': 'Procéder au Paiement',
    'tour.duration': 'Durée',
    'tour.rating': 'Note',
    'tour.bookings': 'réservations',
    'tour.addToCart': 'Ajouter au Panier',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'price.from': 'à partir de',
    'price.perPerson': 'par personne',
  },
  de: {
    'header.explore': 'ERKUNDEN',
    'header.login': 'Anmelden',
    'header.signup': 'Registrieren',
    'currency.title': 'Währung Auswählen',
    'language.title': 'Sprache Auswählen',
    'cart.title': 'Ihr Warenkorb',
    'cart.empty': 'Ihr Warenkorb ist leer',
    'cart.subtotal': 'Zwischensumme',
    'cart.checkout': 'Zur Kasse',
    'tour.duration': 'Dauer',
    'tour.rating': 'Bewertung',
    'tour.bookings': 'Buchungen',
    'tour.addToCart': 'In den Warenkorb',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'price.from': 'ab',
    'price.perPerson': 'pro Person',
  },
};

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

// Exchange rate fetching function
const fetchExchangeRates = async (): Promise<{ [key: string]: number }> => {
  try {
    // Using a free API service (you can replace with your preferred service)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    if (response.ok) {
      const data = await response.json();
      return {
        EUR: 1,
        ...data.rates,
      };
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
  }
  
  // Fallback to mock rates if API fails
  return {
    EUR: 1,
    USD: 1.08,
    GBP: 0.85,
    JPY: 169.5,
    INR: 90.5,
    AUD: 1.63,
    CAD: 1.48,
    CHF: 0.97,
    CNY: 7.82,
    SEK: 11.23,
    NZD: 1.76,
    MXN: 18.15,
    SGD: 1.46,
    HKD: 8.45,
    NOK: 11.33,
    KRW: 1485.25,
    TRY: 35.15,
    RUB: 99.5,
    BRL: 5.58,
    ZAR: 20.25,
    DKK: 7.46,
  };
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] = usePersistentState<Currency>('selectedCurrency', currencies[1]); // Default to EUR
  const [selectedLanguage, setSelectedLanguage] = usePersistentState<Language>('selectedLanguage', languages[0]); // Default to English
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch exchange rates on mount and every hour
  useEffect(() => {
    const loadExchangeRates = async () => {
      setIsLoading(true);
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);
      setIsLoading(false);
    };

    loadExchangeRates();
    
    // Update rates every hour
    const interval = setInterval(loadExchangeRates, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatPrice = useCallback((priceInEur: number): string => {
    const rate = exchangeRates[selectedCurrency.code] || 1;
    const convertedPrice = priceInEur * rate;
    
    // Get locale based on currency for proper formatting
    const getLocale = (currencyCode: string): string => {
      const localeMap: { [key: string]: string } = {
        USD: 'en-US',
        EUR: 'de-DE',
        GBP: 'en-GB',
        JPY: 'ja-JP',
        INR: 'en-IN',
        AUD: 'en-AU',
        CAD: 'en-CA',
        CHF: 'de-CH',
        CNY: 'zh-CN',
        SEK: 'sv-SE',
        NZD: 'en-NZ',
        MXN: 'es-MX',
        SGD: 'en-SG',
        HKD: 'en-HK',
        NOK: 'no-NO',
        KRW: 'ko-KR',
        TRY: 'tr-TR',
        RUB: 'ru-RU',
        BRL: 'pt-BR',
        ZAR: 'en-ZA',
        DKK: 'da-DK',
      };
      return localeMap[currencyCode] || 'en-US';
    };

    try {
      const formatter = new Intl.NumberFormat(getLocale(selectedCurrency.code), {
        style: 'currency',
        currency: selectedCurrency.code,
        minimumFractionDigits: selectedCurrency.code === 'JPY' || selectedCurrency.code === 'KRW' ? 0 : 2,
        maximumFractionDigits: selectedCurrency.code === 'JPY' || selectedCurrency.code === 'KRW' ? 0 : 2,
      });

      return formatter.format(convertedPrice);
    } catch (error) {
      // Fallback formatting if Intl.NumberFormat fails
      const decimals = selectedCurrency.code === 'JPY' || selectedCurrency.code === 'KRW' ? 0 : 2;
      return `${selectedCurrency.symbol}${convertedPrice.toLocaleString('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      })}`;
    }
  }, [selectedCurrency, exchangeRates]);

  const formatNumber = useCallback((number: number): string => {
    const getLocale = (): string => {
      const localeMap: { [key: string]: string } = {
        en: 'en-US',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        it: 'it-IT',
        pt: 'pt-PT',
        nl: 'nl-NL',
        da: 'da-DK',
        sv: 'sv-SE',
        no: 'no-NO',
        fi: 'fi-FI',
        ru: 'ru-RU',
        ja: 'ja-JP',
        ko: 'ko-KR',
        zh: 'zh-CN',
        ar: 'ar-SA',
        hi: 'hi-IN',
        pl: 'pl-PL',
        tr: 'tr-TR',
        he: 'he-IL',
      };
      return localeMap[selectedLanguage.code] || 'en-US';
    };

    try {
      return new Intl.NumberFormat(getLocale()).format(number);
    } catch (error) {
      return number.toLocaleString('en-US');
    }
  }, [selectedLanguage]);

  const formatDate = useCallback((date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const getLocale = (): string => {
      const localeMap: { [key: string]: string } = {
        en: 'en-US',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        it: 'it-IT',
        pt: 'pt-PT',
        nl: 'nl-NL',
        da: 'da-DK',
        sv: 'sv-SE',
        no: 'no-NO',
        fi: 'fi-FI',
        ru: 'ru-RU',
        ja: 'ja-JP',
        ko: 'ko-KR',
        zh: 'zh-CN',
        ar: 'ar-SA',
        hi: 'hi-IN',
        pl: 'pl-PL',
        tr: 'tr-TR',
        he: 'he-IL',
      };
      return localeMap[selectedLanguage.code] || 'en-US';
    };

    try {
      return new Intl.DateTimeFormat(getLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);
    } catch (error) {
      return dateObj.toLocaleDateString('en-US');
    }
  }, [selectedLanguage]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = translations[selectedLanguage.code]?.[key] || translations['en'][key] || key;
    
    if (params) {
      return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
        return acc.replace(`{{${paramKey}}}`, String(paramValue));
      }, translation);
    }
    
    return translation;
  }, [selectedLanguage]);

  return (
    <SettingsContext.Provider value={{ 
      selectedCurrency, 
      setSelectedCurrency, 
      selectedLanguage, 
      setSelectedLanguage, 
      formatPrice,
      formatNumber,
      formatDate,
      exchangeRates,
      isLoading,
      t
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
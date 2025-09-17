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
  // Enhanced methods for booking
  formatPriceRange: (minPrice: number, maxPrice: number) => string;
  formatDiscount: (originalPrice: number, discountedPrice: number) => string;
  formatSavings: (savings: number) => string;
  getCurrencySymbol: () => string;
  convertPrice: (priceInEur: number) => number;
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
    'booking.adults': 'Adults',
    'booking.children': 'Children',
    'booking.infants': 'Infants',
    'booking.selectDate': 'Select Date',
    'booking.selectTime': 'Select Time',
    'booking.participants': 'participants',
    'booking.total': 'Total',
    'booking.save': 'Save',
    'booking.discount': 'Discount',
    'booking.addOns': 'Add-ons',
    'booking.enhance': 'Enhance Your Tour',
    'booking.review': 'Review & Book',
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
    'booking.adults': 'Adultos',
    'booking.children': 'Niños',
    'booking.infants': 'Bebés',
    'booking.selectDate': 'Seleccionar Fecha',
    'booking.selectTime': 'Seleccionar Hora',
    'booking.participants': 'participantes',
    'booking.total': 'Total',
    'booking.save': 'Ahorrar',
    'booking.discount': 'Descuento',
    'booking.addOns': 'Extras',
    'booking.enhance': 'Mejora tu Tour',
    'booking.review': 'Revisar y Reservar',
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
    'booking.adults': 'Adultes',
    'booking.children': 'Enfants',
    'booking.infants': 'Bébés',
    'booking.selectDate': 'Sélectionner la Date',
    'booking.selectTime': 'Sélectionner l\'Heure',
    'booking.participants': 'participants',
    'booking.total': 'Total',
    'booking.save': 'Économiser',
    'booking.discount': 'Remise',
    'booking.addOns': 'Extras',
    'booking.enhance': 'Améliorez Votre Tour',
    'booking.review': 'Réviser et Réserver',
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
    'booking.adults': 'Erwachsene',
    'booking.children': 'Kinder',
    'booking.infants': 'Kleinkinder',
    'booking.selectDate': 'Datum Auswählen',
    'booking.selectTime': 'Zeit Auswählen',
    'booking.participants': 'Teilnehmer',
    'booking.total': 'Gesamt',
    'booking.save': 'Sparen',
    'booking.discount': 'Rabatt',
    'booking.addOns': 'Extras',
    'booking.enhance': 'Verbessern Sie Ihre Tour',
    'booking.review': 'Überprüfen & Buchen',
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

// Enhanced exchange rate fetching function with fallback and caching
const fetchExchangeRates = async (): Promise<{ [key: string]: number }> => {
  const CACHE_KEY = 'exchangeRates';
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  
  try {
    // Check cached rates first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return rates;
      }
    }
  } catch (error) {
    console.log('Error reading cached exchange rates');
  }

  try {
    // Try multiple API sources for better reliability
    const apiSources = [
      'https://api.exchangerate-api.com/v4/latest/EUR',
      'https://api.fixer.io/latest?base=EUR',
    ];

    for (const apiUrl of apiSources) {
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          const rates = {
            EUR: 1,
            ...data.rates,
          };
          
          // Cache the successful response
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              rates,
              timestamp: Date.now(),
            }));
          } catch (error) {
            console.log('Error caching exchange rates');
          }
          
          return rates;
        }
      } catch (error) {
        console.log(`Failed to fetch from ${apiUrl}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
  }
  
  // Enhanced fallback rates (more comprehensive and recent)
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
    PLN: 4.32,
    CZK: 24.15,
    HUF: 389.25,
    RON: 4.98,
    BGN: 1.96,
    HRK: 7.53,
    ISK: 145.35,
    THB: 38.25,
    MYR: 4.85,
    PHP: 61.25,
    IDR: 16850.5,
    VND: 26450.75,
  };
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] = usePersistentState<Currency>('selectedCurrency', currencies[0]); // Default to EUR
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

  const convertPrice = useCallback((priceInEur: number): number => {
    const rate = exchangeRates[selectedCurrency.code] || 1;
    return priceInEur * rate;
  }, [exchangeRates, selectedCurrency.code]);

  const formatPrice = useCallback((priceInEur: number): string => {
    const convertedPrice = convertPrice(priceInEur);
    
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
        PLN: 'pl-PL',
        CZK: 'cs-CZ',
        HUF: 'hu-HU',
        RON: 'ro-RO',
        BGN: 'bg-BG',
        HRK: 'hr-HR',
        ISK: 'is-IS',
        THB: 'th-TH',
        MYR: 'ms-MY',
        PHP: 'en-PH',
        IDR: 'id-ID',
        VND: 'vi-VN',
      };
      return localeMap[currencyCode] || 'en-US';
    };

    try {
      const formatter = new Intl.NumberFormat(getLocale(selectedCurrency.code), {
        style: 'currency',
        currency: selectedCurrency.code,
        minimumFractionDigits: ['JPY', 'KRW', 'VND', 'IDR'].includes(selectedCurrency.code) ? 0 : 2,
        maximumFractionDigits: ['JPY', 'KRW', 'VND', 'IDR'].includes(selectedCurrency.code) ? 0 : 2,
      });

      return formatter.format(convertedPrice);
    } catch (error) {
      // Enhanced fallback formatting if Intl.NumberFormat fails
      const decimals = ['JPY', 'KRW', 'VND', 'IDR'].includes(selectedCurrency.code) ? 0 : 2;
      const formattedNumber = convertedPrice.toLocaleString('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      });
      return `${selectedCurrency.symbol}${formattedNumber}`;
    }
  }, [selectedCurrency, convertPrice]);

  // Enhanced method for formatting price ranges
  const formatPriceRange = useCallback((minPrice: number, maxPrice: number): string => {
    if (minPrice === maxPrice) {
      return formatPrice(minPrice);
    }
    return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
  }, [formatPrice]);

  // Method for formatting discount percentages
  const formatDiscount = useCallback((originalPrice: number, discountedPrice: number): string => {
    if (originalPrice <= discountedPrice) return '';
    const discountPercent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
    return `-${discountPercent}%`;
  }, []);

  // Method for formatting savings amounts
  const formatSavings = useCallback((savings: number): string => {
    return `${t('booking.save')} ${formatPrice(savings)}`;
  }, [formatPrice]);

  // Method to get currency symbol
  const getCurrencySymbol = useCallback((): string => {
    return selectedCurrency.symbol;
  }, [selectedCurrency.symbol]);

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
      t,
      // Enhanced methods
      formatPriceRange,
      formatDiscount,
      formatSavings,
      getCurrencySymbol,
      convertPrice,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
// hooks/useSettings.ts
'use client';

import { useContext } from 'react';
import { SettingsContext } from '@/contexts/SettingsContext';

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Additional utility hooks for specific formatting needs
export const usePriceFormatter = () => {
  const { formatPrice } = useSettings();
  return formatPrice;
};

export const useNumberFormatter = () => {
  const { formatNumber } = useSettings();
  return formatNumber;
};

export const useDateFormatter = () => {
  const { formatDate } = useSettings();
  return formatDate;
};

export const useTranslation = () => {
  const { t } = useSettings();
  return { t };
};

// Enhanced hooks for booking-specific formatting
export const usePriceRangeFormatter = () => {
  const { formatPriceRange } = useSettings();
  return formatPriceRange;
};

export const useDiscountFormatter = () => {
  const { formatDiscount } = useSettings();
  return formatDiscount;
};

export const useSavingsFormatter = () => {
  const { formatSavings } = useSettings();
  return formatSavings;
};

export const useCurrencySymbol = () => {
  const { getCurrencySymbol } = useSettings();
  return getCurrencySymbol;
};

export const usePriceConverter = () => {
  const { convertPrice } = useSettings();
  return convertPrice;
};

// Hook for booking-related translations
export const useBookingTranslations = () => {
  const { t } = useSettings();
  
  return {
    adults: t('booking.adults'),
    children: t('booking.children'),
    infants: t('booking.infants'),
    selectDate: t('booking.selectDate'),
    selectTime: t('booking.selectTime'),
    participants: t('booking.participants'),
    total: t('booking.total'),
    save: t('booking.save'),
    discount: t('booking.discount'),
    addOns: t('booking.addOns'),
    enhance: t('booking.enhance'),
    review: t('booking.review'),
    perPerson: t('price.perPerson'),
    from: t('price.from'),
  };
};

// Hook for common UI translations
export const useUITranslations = () => {
  const { t } = useSettings();
  
  return {
    loading: t('common.loading'),
    error: t('common.error'),
    success: t('common.success'),
    explore: t('header.explore'),
    login: t('header.login'),
    signup: t('header.signup'),
  };
};

// Custom hook for currency information
export const useCurrencyInfo = () => {
  const { selectedCurrency, exchangeRates, isLoading } = useSettings();
  
  return {
    currency: selectedCurrency,
    symbol: selectedCurrency.symbol,
    code: selectedCurrency.code,
    name: selectedCurrency.name,
    exchangeRate: exchangeRates[selectedCurrency.code] || 1,
    isExchangeRatesLoading: isLoading,
  };
};

// Custom hook for language information
export const useLanguageInfo = () => {
  const { selectedLanguage } = useSettings();
  
  return {
    language: selectedLanguage,
    code: selectedLanguage.code,
    name: selectedLanguage.name,
    nativeName: selectedLanguage.nativeName,
  };
};
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
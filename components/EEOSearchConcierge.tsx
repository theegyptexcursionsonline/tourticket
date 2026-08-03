'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { shouldRenderAISearchWidgetForHost } from '@/lib/aiSearchWidgetHosts';

const SEARCH_ORIGIN = process.env.NEXT_PUBLIC_FOXES_SEARCH_ORIGIN || 'https://search.foxestechnology.com';
const WIDGET_ID = process.env.NEXT_PUBLIC_FOXES_SEARCH_WIDGET_ID || 'wgt_6JW5umlfasNQfJywtFPs6g';
const SCRIPT_ID = 'eeo-search-concierge-script';
const HOST_ID = 'foxes-launcher-host';
// The launcher is served through the customer CDN. A release token prevents a
// previously cached widget bundle from surviving a Search UI rollout.
const LAUNCHER_RELEASE = '20260803-instant-open';

const copy: Record<string, { label: string; kicker: string; placeholder: string }> = {
  en: {
    label: 'Search Egypt tours with AI',
    kicker: 'AI trip search',
    placeholder: 'Search Egypt tours...',
  },
  ar: {
    label: 'ابحث عن رحلات مصر بالذكاء الاصطناعي',
    kicker: 'بحث ذكي للرحلات',
    placeholder: 'ابحث عن رحلات مصر...',
  },
  de: {
    label: 'Ägypten-Touren mit KI suchen',
    kicker: 'KI-Reisesuche',
    placeholder: 'Ägypten-Touren suchen...',
  },
  fr: {
    label: 'Rechercher des excursions en Égypte avec l’IA',
    kicker: 'Recherche voyage IA',
    placeholder: 'Excursions en Égypte...',
  },
  es: {
    label: 'Buscar tours por Egipto con IA',
    kicker: 'Búsqueda de viajes con IA',
    placeholder: 'Buscar tours en Egipto...',
  },
};

const HIDDEN_ROUTES = ['/admin', '/checkout', '/booking', '/payment', '/login', '/signup'];

export default function EEOSearchConcierge() {
  const pathname = usePathname() || '';
  const locale = useLocale();

  useEffect(() => {
    const normalizedPath = pathname.replace(/^\/(en|ar|de|fr|es)(?=\/|$)/, '') || '/';
    const hidden = HIDDEN_ROUTES.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`));
    const allowedHost = shouldRenderAISearchWidgetForHost(window.location.hostname);

    const removeWidget = () => {
      document.getElementById(SCRIPT_ID)?.remove();
      document.getElementById(HOST_ID)?.remove();
    };

    if (hidden || !allowedHost) {
      removeWidget();
      return removeWidget;
    }

    removeWidget();
    const localizedCopy = copy[locale] || copy.en;
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `${SEARCH_ORIGIN}/widget/foxes-launcher.js?v=${LAUNCHER_RELEASE}`;
    script.async = true;
    script.dataset.widgetId = WIDGET_ID;
    script.dataset.apiUrl = SEARCH_ORIGIN;
    script.dataset.style = 'searchbar';
    script.dataset.label = localizedCopy.label;
    script.dataset.kicker = localizedCopy.kicker;
    script.dataset.placeholder = localizedCopy.placeholder;
    script.dataset.color = '#0b5d3b';
    script.dataset.position = locale === 'ar' ? 'left' : 'right';
    script.dataset.dir = locale === 'ar' ? 'rtl' : 'ltr';
    script.dataset.locale = locale;
    script.dataset.rememberDismiss = 'false';
    document.body.appendChild(script);

    return removeWidget;
  }, [locale, pathname]);

  return null;
}

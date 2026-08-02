'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { shouldRenderAISearchWidgetForHost } from '@/lib/aiSearchWidgetHosts';

const SEARCH_ORIGIN = process.env.NEXT_PUBLIC_FOXES_SEARCH_ORIGIN || 'https://search.foxestechnology.com';
const WIDGET_ID = process.env.NEXT_PUBLIC_FOXES_SEARCH_WIDGET_ID || 'wgt_6JW5umlfasNQfJywtFPs6g';
const SCRIPT_ID = 'eeo-search-concierge-script';
const HOST_ID = 'foxes-launcher-host';

const copy: Record<string, { label: string; kicker: string }> = {
  en: { label: 'Plan your Egypt trip', kicker: 'AI trip concierge' },
  ar: { label: 'خطط لرحلتك في مصر', kicker: 'مساعد السفر الذكي' },
  de: { label: 'Ägyptenreise planen', kicker: 'KI-Reiseassistent' },
  fr: { label: 'Planifier votre voyage', kicker: 'Concierge voyage IA' },
  es: { label: 'Planifica tu viaje', kicker: 'Asistente de viaje IA' },
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
    script.src = `${SEARCH_ORIGIN}/widget/foxes-launcher.js`;
    script.async = true;
    script.dataset.widgetId = WIDGET_ID;
    script.dataset.apiUrl = SEARCH_ORIGIN;
    script.dataset.style = 'concierge';
    script.dataset.label = localizedCopy.label;
    script.dataset.kicker = localizedCopy.kicker;
    script.dataset.color = '#155eef';
    script.dataset.position = locale === 'ar' ? 'left' : 'right';
    script.dataset.rememberDismiss = 'false';
    document.body.appendChild(script);

    return removeWidget;
  }, [locale, pathname]);

  return null;
}

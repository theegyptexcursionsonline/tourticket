'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { shouldRenderAISearchWidgetForHost } from '@/lib/aiSearchWidgetHosts';
import { isOpenBlockingModal } from '@/lib/ui/modalVisibility';

const SEARCH_ORIGIN = process.env.NEXT_PUBLIC_FOXES_SEARCH_ORIGIN || 'https://search.foxestechnology.com';
const WIDGET_ID = process.env.NEXT_PUBLIC_FOXES_SEARCH_WIDGET_ID || 'wgt_6JW5umlfasNQfJywtFPs6g';
const SCRIPT_ID = 'eeo-search-concierge-script';
const HOST_ID = 'foxes-launcher-host';
const CLOSE_EVENT = 'foxes:search:close';
const DESTROY_EVENT = 'foxes:search:destroy';
const SUPPORT_WIDGET_SELECTOR = 'iframe[id^="foxesconnect-widget-"]';
// Exact primary blue sampled from the customer-facing EEO logo assets.
const EEO_BRAND_BLUE = '#4385F6';
const MOBILE_BOOKING_BAR_SELECTOR = '[data-mobile-booking-bar="true"]';
const MOBILE_ACTION_GAP_PX = 12;
// The launcher is served through the customer CDN. A release token prevents a
// previously cached widget bundle from surviving a Search UI rollout.
const LAUNCHER_RELEASE = '20260819-single-composer-v4';

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

// Offer pages are single-CTA landing surfaces — the launcher competes with
// the code panel there (client-reported on the network offer pages, 13 Aug).
// Tour pages are the destination this feature exists to drive traffic to and
// own their own booking call to action, so the launcher stops at their door
// (client-reported, 19 Aug). Tool pages already provide a full-screen planning
// interaction; the fixed launcher covers their footer on phone viewports.
const HIDDEN_ROUTES = [
  '/admin',
  '/checkout',
  '/booking',
  '/payment',
  '/login',
  '/signup',
  '/forgot',
  '/reset-password',
  '/offer',
  '/tour',
  '/tools',
];

// A tour also renders at the site root when its slug resolves there, so the
// path alone cannot identify one. The tour page declares its own type; this
// reads that declaration after render instead of guessing from the URL.
const TOUR_PAGE_SELECTOR = '[data-page-type="tour"]';

export default function EEOSearchConcierge() {
  const pathname = usePathname() || '';
  const locale = useLocale();

  useEffect(() => {
    const normalizedPath = pathname.replace(/^\/(en|ar|de|fr|es)(?=\/|$)/, '') || '/';
    const hidden = HIDDEN_ROUTES.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`));
    const allowedHost = shouldRenderAISearchWidgetForHost(window.location.hostname);

    let dialogObserver: MutationObserver | null = null;
    let syncFrame: number | null = null;

    const syncLauncherVisibility = () => {
      const host = document.getElementById(HOST_ID);
      if (!host) return;

      const launcher = host.shadowRoot?.querySelector<HTMLElement>('.launcher');

      // The hosted launcher intentionally uses a very high z-index. Keep it out
      // of the way while a first-party modal (booking, auth, lightbox, etc.) is
      // open so it cannot obscure or intercept the modal controls. Only a
      // visible aria-modal dialog counts: embedded widgets — notably Google
      // Maps InfoWindows on the itinerary map — also carry role="dialog" but
      // are not blocking overlays, and matching them kept the launcher hidden
      // for as long as a tour map had a stage card open.
      const hasOpenAppDialog = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
      ).some(isOpenBlockingModal);
      // FoxesConnect is a separate support surface, mounted by its embed script
      // outside React. Its iframe intentionally remains in the DOM while closed
      // but is removed from hit-testing with display:none. Keep Search hidden for
      // the complete support open/close transition so it cannot cover the
      // support panel's bottom navigation on phones or overlap the desktop panel.
      const hasOpenSupportWidget = Array.from(
        document.querySelectorAll<HTMLIFrameElement>(SUPPORT_WIDGET_SELECTOR),
      ).some((frame) => window.getComputedStyle(frame).display !== 'none');
      const onTourPage = Boolean(document.querySelector(TOUR_PAGE_SELECTOR));
      const suppressed = hasOpenAppDialog || hasOpenSupportWidget || onTourPage;
      if (suppressed && !host.hidden) {
        window.dispatchEvent(new CustomEvent(CLOSE_EVENT));
      }
      if (host.hidden !== suppressed) {
        host.hidden = suppressed;
      }

      if (!launcher) return;

      // The mobile booking action and the hosted search launcher are both fixed
      // to the viewport. Measure the rendered booking bar instead of assuming a
      // device or safe-area height, then keep search visibly above it. A hidden
      // desktop bar has a zero-height rect, so the launcher's own CSS can apply.
      const bookingBar = document.querySelector<HTMLElement>(MOBILE_BOOKING_BAR_SELECTOR);
      const bookingBarHeight = bookingBar?.getBoundingClientRect().height ?? 0;

      if (!suppressed && bookingBarHeight > 0) {
        launcher.style.setProperty(
          'bottom',
          `${Math.ceil(bookingBarHeight) + MOBILE_ACTION_GAP_PX}px`,
          'important',
        );
        return;
      }

      launcher.style.removeProperty('bottom');
    };

    // DOM churn arrives in bursts (map tiles, animations, list re-renders), and
    // the sync reads layout via getBoundingClientRect. Coalesce to one sync per
    // frame so a mutation storm near the itinerary map cannot thrash layout.
    const scheduleSync = () => {
      if (syncFrame !== null) return;
      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = null;
        syncLauncherVisibility();
      });
    };

    const removeWidget = () => {
      dialogObserver?.disconnect();
      if (syncFrame !== null) {
        window.cancelAnimationFrame(syncFrame);
        syncFrame = null;
      }
      // The hosted overlay owns the documentElement scroll lock. Destroy it
      // before removing its host so an SPA route transition cannot strand
      // iPhone Safari with an unscrollable root document.
      window.dispatchEvent(new CustomEvent(DESTROY_EVENT));
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
    script.dataset.color = EEO_BRAND_BLUE;
    script.dataset.position = locale === 'ar' ? 'left' : 'right';
    script.dataset.dir = locale === 'ar' ? 'rtl' : 'ltr';
    script.dataset.locale = locale;
    script.dataset.rememberDismiss = 'false';
    // The bar opens collapsed so it never covers page content on arrival; a
    // visitor's own expand or collapse choice is still remembered from then on.
    script.dataset.defaultCollapsed = 'true';
    script.dataset.collapsible = 'true';
    script.dataset.rememberCollapse = 'true';
    document.body.appendChild(script);

    dialogObserver = new MutationObserver(scheduleSync);
    // Attribute changes matter too: modals and the mobile booking bar can be
    // shown or hidden by a class/style toggle without any childList mutation,
    // which previously left the launcher in a stale hidden/overlapped state.
    dialogObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-modal', 'aria-hidden', 'open'],
    });
    window.addEventListener('resize', scheduleSync);
    syncLauncherVisibility();

    return () => {
      window.removeEventListener('resize', scheduleSync);
      removeWidget();
    };
  }, [locale, pathname]);

  return null;
}

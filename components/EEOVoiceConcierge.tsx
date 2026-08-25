'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

const VOICE_ORIGIN = process.env.NEXT_PUBLIC_FOXES_VOICE_ORIGIN || 'https://voice.foxestechnology.com';
const WIDGET_ID = process.env.NEXT_PUBLIC_FOXES_VOICE_WIDGET_ID || '694c1a7a27cc23227da2ccdb';
const SCRIPT_ID = 'eeo-voice-concierge-script';
const FRAME_ID = 'foxes-voice-widget-frame';
const MOBILE_BOOKING_BAR_SELECTOR = '[data-mobile-booking-bar="true"]';
const MOBILE_ACTION_GAP_PX = 12;

// Same funnel rules as the search launcher: single-CTA and transactional
// surfaces stay clean, and the tour page owns its booking call to action
// (client direction, 19 Aug). The voice orb also stays off checkout-adjacent
// and account screens where a floating microphone would compete with forms.
const HIDDEN_ROUTES = [
  '/admin',
  '/checkout',
  '/payment',
  '/login',
  '/signup',
  '/forgot',
  '/reset-password',
  '/offer',
  '/tour',
  '/tools',
  '/cart',
];

// A tour can render at the site root, so the path cannot identify one; the
// tour page declares its own type and the launcher reads that declaration.
const TOUR_PAGE_SELECTOR = '[data-page-type="tour"]';

export default function EEOVoiceConcierge() {
  const pathname = usePathname() || '';
  const locale = useLocale();

  useEffect(() => {
    // Ships dark: without the explicit flag the effect does nothing, so the
    // storefront can deploy ahead of the voice tenant's billing entitlement
    // without ever exposing a dead control. (NEXT_PUBLIC_* is inlined at
    // build time either way.)
    if (process.env.NEXT_PUBLIC_VOICE_LAUNCHER_ENABLED !== 'true') return;

    const normalizedPath = pathname.replace(/^\/(en|ar|de|fr|es)(?=\/|$)/, '') || '/';
    const hidden = HIDDEN_ROUTES.some(
      (route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`),
    );

    let dialogObserver: MutationObserver | null = null;
    let syncFrame: number | null = null;
    let idleHandle: number | null = null;

    const syncLauncherVisibility = () => {
      const frame = document.getElementById(FRAME_ID) as HTMLElement | null;
      if (!frame) return;

      const hasOpenAppDialog = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
      ).some((dialog) => !dialog.closest('.gm-style') && dialog.getClientRects().length > 0);
      const onTourPage = Boolean(document.querySelector(TOUR_PAGE_SELECTOR));
      const suppressed = hasOpenAppDialog || onTourPage;
      frame.style.visibility = suppressed ? 'hidden' : '';
      frame.style.pointerEvents = suppressed ? 'none' : '';

      // Keep the orb clear of the fixed mobile booking bar, same rule as the
      // search launcher on the opposite corner.
      const bookingBar = document.querySelector<HTMLElement>(MOBILE_BOOKING_BAR_SELECTOR);
      const bookingBarHeight = bookingBar?.getBoundingClientRect().height ?? 0;
      if (!suppressed && bookingBarHeight > 0) {
        frame.style.setProperty(
          'bottom',
          `${Math.ceil(bookingBarHeight) + MOBILE_ACTION_GAP_PX}px`,
          'important',
        );
      } else {
        frame.style.removeProperty('bottom');
      }
    };

    const scheduleSync = () => {
      if (syncFrame !== null) return;
      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = null;
        syncLauncherVisibility();
      });
    };

    const removeWidget = () => {
      dialogObserver?.disconnect();
      dialogObserver = null;
      if (syncFrame !== null) {
        window.cancelAnimationFrame(syncFrame);
        syncFrame = null;
      }
      if (idleHandle !== null) {
        window.clearTimeout(idleHandle);
        idleHandle = null;
      }
      document.getElementById(SCRIPT_ID)?.remove();
      document.getElementById(FRAME_ID)?.remove();
    };

    if (hidden) {
      removeWidget();
      return removeWidget;
    }

    removeWidget();

    // Only the primary entity fetch may gate first paint; the concierge loads
    // after the page has settled.
    const inject = () => {
      if (document.getElementById(SCRIPT_ID)) return;
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `${VOICE_ORIGIN}/widget.js`;
      script.async = true;
      script.dataset.foxesWidgetId = WIDGET_ID;
      // The search bar owns the trailing corner; voice takes the opposite one
      // so the two assistants never stack (mirrored under RTL).
      script.dataset.foxesPosition = locale === 'ar' ? 'bottom-right' : 'bottom-left';
      document.body.appendChild(script);

      dialogObserver = new MutationObserver(scheduleSync);
      dialogObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'aria-modal', 'aria-hidden', 'open'],
      });
      window.addEventListener('resize', scheduleSync);
      syncLauncherVisibility();
    };
    idleHandle = window.setTimeout(inject, 2500);

    return () => {
      window.removeEventListener('resize', scheduleSync);
      removeWidget();
    };
  }, [locale, pathname]);

  return null;
}

'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import QRCode from 'qrcode';
import { ArrowRight, Check, Smartphone, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import {
  mobileAppIsLive,
  mobileAppLandingUrl,
  mobileAppStores,
  type MobileAppStores,
} from '@/lib/config/mobileApp';

/**
 * "Get the app" entry in the storefront header (client ask, 10 Oct 2026: an app
 * card like the big marketplaces show). The header button opens a card with a QR
 * code to the app page, what the app does and the two stores. A store appears as
 * a link only once its listing is configured; until then it reads "coming soon".
 *
 * The card opens by itself once per visitor on desktop, a few seconds into a
 * browsing page, anchored under the header so it never covers the AI Search and
 * Voice launchers or a booking bar. It never opens by itself on phones (an
 * unprompted overlay there covers the page) or on transactional pages.
 */

export const APP_ENTRY_STORAGE_KEY = 'eeo-app-entry';
export const APP_ENTRY_AUTO_OPEN_DELAY_MS = 6000;
const AUTO_OPEN_QUIET_DAYS = 30;
const DESKTOP_QUERY = '(min-width: 1024px)';

// The same funnel rules as the search and voice launchers: transactional and
// account screens stay clean, and a tour page owns its booking call to action.
const NO_AUTO_OPEN_ROUTES = [
  '/admin', '/checkout', '/payment', '/booking', '/user', '/login', '/signup', '/forgot',
  '/reset-password', '/offer', '/tour', '/tools', '/cart', '/assistants', '/mobile-app',
  '/accept-invitation', '/redirecting',
];
const TOUR_PAGE_SELECTOR = '[data-page-type="tour"]';

type EntryEvent = 'open' | 'auto_open' | 'close' | 'store_click' | 'landing_click';

function track(action: EntryEvent, live: boolean, store?: 'ios' | 'android') {
  const layer = (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
  layer?.push({ event: 'eeo_app_entry', app_entry_action: action, app_state: live ? 'live' : 'coming_soon', ...(store ? { app_store: store } : {}) });
}

function readQuietUntil(): number {
  try {
    const raw = window.localStorage.getItem(APP_ENTRY_STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as { quietUntil?: unknown }).quietUntil : undefined;
    return typeof value === 'number' ? value : 0;
  } catch {
    return 0;
  }
}

function rememberShown(now: number) {
  try {
    window.localStorage.setItem(
      APP_ENTRY_STORAGE_KEY,
      JSON.stringify({ quietUntil: now + AUTO_OPEN_QUIET_DAYS * 24 * 60 * 60 * 1000 }),
    );
  } catch {
    // Private mode or blocked storage: the card may open again on a later visit.
  }
}

/** Someone typing (search box, form field) is never interrupted by the card. */
function isTyping(): boolean {
  const active = document.activeElement as HTMLElement | null;
  return Boolean(active && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)));
}

/** Auto-open is allowed on browsing pages only. */
export function autoOpenAllowedOnPath(pathname: string): boolean {
  const path = pathname.replace(/^\/(en|ar|de|fr|es)(?=\/|$)/, '') || '/';
  return !NO_AUTO_OPEN_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

const AppleMark = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" className="shrink-0">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const PlayMark = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="shrink-0">
    <path d="M3.18 23.67c-.38-.4-.56-.96-.56-1.68V2.01c0-.72.18-1.28.56-1.68l.1-.1L14.7 11.65v.26L3.28 23.57l-.1-.1z" fill="#4285F4" />
    <path d="M18.54 15.79l-3.84-3.84v-.26l3.84-3.84.08.05 4.56 2.59c1.3.74 1.3 1.95 0 2.69l-4.56 2.59-.08.02z" fill="#FBBC04" />
    <path d="M18.62 15.77L14.7 11.78 3.18 23.67c.43.46 1.14.51 1.96.06l13.48-7.96" fill="#EA4335" />
    <path d="M18.62 7.85L5.14.27C4.32-.18 3.61-.13 3.18.33l11.52 11.45 3.92-3.93z" fill="#34A853" />
  </svg>
);

type AppDownloadEntryProps = {
  isTransparent: boolean;
  /** Text and hover colours of the header links around the button. */
  headerLinkClasses: string;
  /** Injectable for tests; defaults to the build-time store configuration. */
  stores?: MobileAppStores;
};

export default function AppDownloadEntry({ isTransparent, headerLinkClasses, stores = mobileAppStores() }: AppDownloadEntryProps) {
  const t = useTranslations('appDownload');
  const locale = useLocale();
  const pathname = usePathname() || '/';
  const live = mobileAppIsLive(stores);
  const landingUrl = mobileAppLandingUrl(locale);

  // The card belongs to the page it was opened on, so moving to another page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  // The QR remembers the address it encodes, so a language switch redraws it for the new app page.
  const [qr, setQr] = useState<{ url: string; dataUrl: string } | null>(null);
  const qrDataUrl = qr?.url === landingUrl ? qr.dataUrl : '';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardId = useId();
  const titleId = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpenOn(null);
    rememberShown(Date.now());
    track('close', live);
    if (returnFocus) buttonRef.current?.focus();
  }, [live]);

  // Open once by itself on desktop browsing pages, never on phones or in the funnel.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function' || !window.matchMedia(DESKTOP_QUERY).matches) return;
    if (!autoOpenAllowedOnPath(pathname) || readQuietUntil() > Date.now()) return;
    const timer = window.setTimeout(() => {
      if (document.querySelector(TOUR_PAGE_SELECTOR)) return;
      const blockingDialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (blockingDialog || isTyping() || readQuietUntil() > Date.now()) return;
      rememberShown(Date.now());
      setOpenOn(pathname);
      track('auto_open', live);
    }, APP_ENTRY_AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, live]);

  // The QR code is drawn when the card first opens for the current language.
  useEffect(() => {
    if (!open || qr?.url === landingUrl) return;
    let active = true;
    QRCode.toDataURL(landingUrl, { width: 240, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } })
      .then((dataUrl) => { if (active) setQr({ url: landingUrl, dataUrl }); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [open, qr, landingUrl]);

  // Escape and a click outside close the card.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(true); };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!cardRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, close]);

  const toggle = () => {
    if (open) { close(false); return; }
    setOpenOn(pathname);
    track('open', live);
  };

  const storeTile = (store: 'ios' | 'android') => {
    const url = store === 'ios' ? stores.appStoreUrl : stores.playStoreUrl;
    const name = store === 'ios' ? 'App Store' : 'Google Play';
    const mark = store === 'ios' ? <AppleMark /> : <PlayMark />;
    if (url) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('store_click', live, store)}
          className="flex min-h-12 items-center gap-2.5 rounded-xl border border-slate-900 bg-slate-950 px-3 py-2 text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        >
          {mark}
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[11px] font-medium text-white/70">{store === 'ios' ? t('downloadOn') : t('getItOn')}</span>
            <span className="block text-sm font-bold">{name}</span>
          </span>
        </a>
      );
    }
    return (
      <div
        aria-label={t('storeComingSoon', { store: name })}
        className="flex min-h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
      >
        {mark}
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[11px] font-medium text-slate-500">{t('comingSoonOn')}</span>
          <span className="block text-sm font-bold">{name}</span>
        </span>
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        aria-label={t('buttonLabel')}
        title={t('buttonLabel')}
        data-testid="app-entry-button"
        className={`${headerLinkClasses} relative inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md p-2 text-sm font-semibold transition-all duration-300 after:absolute after:-inset-0.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current ${isTransparent ? 'bg-white/10 hover:bg-white/20 backdrop-blur-sm' : ''}`}
      >
        <Smartphone size={20} aria-hidden="true" />
        <span className="hidden lg:inline">{t('button')}</span>
      </button>

      {open && (
        <div
          ref={cardRef}
          id={cardId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          data-testid="app-entry-card"
          className="fixed inset-x-3 top-[4.5rem] z-50 rounded-2xl bg-white p-4 text-slate-900 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 sm:absolute sm:inset-x-auto sm:start-0 sm:top-full sm:mt-3 sm:w-[22rem]"
        >
          <button
            type="button"
            onClick={() => close(true)}
            aria-label={t('close')}
            className="absolute end-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <p className="pe-12 text-xs font-bold uppercase tracking-[0.14em] text-rose-600">{live ? t('eyebrowLive') : t('eyebrowSoon')}</p>
          <h2 id={titleId} className="mt-1 pe-12 text-lg font-extrabold leading-snug text-slate-900">{live ? t('titleLive') : t('titleSoon')}</h2>

          <div className="mt-3 flex items-center gap-4">
            <div className="hidden h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 sm:flex">
              {qrDataUrl
                ? <Image src={qrDataUrl} alt={t('qrAlt')} width={108} height={108} unoptimized className="h-full w-full" />
                : <span className="h-full w-full animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />}
            </div>
            <ul className="grid gap-2 text-sm text-slate-700">
              {(['benefitBookings', 'benefitUpdates', 'benefitWishlist'] as const).map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-2 hidden text-xs text-slate-500 sm:block">{live ? t('scanLive') : t('scanSoon')}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {storeTile('ios')}
            {storeTile('android')}
          </div>

          <Link
            href="/mobile-app"
            onClick={() => { track('landing_click', live); setOpenOn(null); rememberShown(Date.now()); }}
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-rose-700 hover:text-rose-800"
          >
            <span>{t('learnMore')}</span>
            <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

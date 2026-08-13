'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type OfferTour = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  image: string | null;
  duration: string | null;
  listPrice: number;
  offerPrice: number;
  saving: number;
  perTourDiscount: boolean;
  rating: number | null;
  reviewCount: number;
  isFeatured: boolean;
};

export type OfferQuote = { name: string; rating: number; text: string; tourTitle: string | null };

export type OfferView = {
  firstName: string | null;
  code: string;
  label: string;
  perTourDiscount: boolean;
  expiresAt: string | null;
  expiresNice: string | null;
  currencySymbol: string;
  siteName: string;
  logo: string;
  brandColor: string;
  heroImage: string | null;
  heroAlt: string;
  cityLabel: string | null;
  bundles: OfferTour[];
  picks: OfferTour[];
  totalCount: number;
  stats: { fromPrice: number; maxSaving: number; avgRating: number | null; reviewTotal: number };
  quotes: OfferQuote[];
  contact: { whatsapp: string | null };
};

const INK = '#150a08';
const pad = (value: number) => String(Math.max(0, value)).padStart(2, '0');
const money = (symbol: string, value: number) => `${symbol}${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    // Sync once on mount via the same listener path, then follow changes.
    const raf = requestAnimationFrame(onChange);
    query.addEventListener?.('change', onChange);
    return () => {
      cancelAnimationFrame(raf);
      query.removeEventListener?.('change', onChange);
    };
  }, []);
  return reduced;
}

function useRemaining(expiresAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!expiresAt) return null;
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

function useCopy(code: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      },
      () => { /* the code stays on screen to copy by hand */ },
    );
  };
  return [copied, copy];
}

/** Headline lines rise from behind their own masks on load. */
function SplitReveal({ lines, className = '', style }: { lines: string[]; className?: string; style?: CSSProperties }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(timer);
  }, []);
  return (
    <h1 className={className} style={style}>
      {lines.map((line, index) => (
        <span key={line + index} className="block overflow-hidden">
          <span
            className="block will-change-transform"
            style={{
              transform: reduced || shown ? 'translateY(0)' : 'translateY(110%)',
              opacity: reduced || shown ? 1 : 0,
              transition: reduced ? 'none' : 'transform 900ms cubic-bezier(0.16,1,0.3,1), opacity 700ms ease-out',
              transitionDelay: `${index * 110}ms`,
            }}
          >
            {line}
          </span>
        </span>
      ))}
    </h1>
  );
}

/** A digit that flips when it changes — the timer reads alive. */
function FlipDigit({ value }: { value: string }) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const [flipping, setFlipping] = useState(false);
  useEffect(() => {
    if (value === display) return;
    if (reduced) {
      const raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }
    const raf = requestAnimationFrame(() => setFlipping(true));
    const timer = setTimeout(() => {
      setDisplay(value);
      setFlipping(false);
    }, 130);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [value, display, reduced]);
  return (
    <span
      className="inline-block tabular-nums will-change-transform"
      style={{
        transform: flipping ? 'translateY(-38%) rotateX(52deg)' : 'translateY(0) rotateX(0deg)',
        opacity: flipping ? 0.35 : 1,
        transition: reduced ? 'none' : 'transform 130ms ease-in, opacity 130ms ease-in',
      }}
    >
      {display}
    </span>
  );
}

function FlipClock({ expiresAt }: { expiresAt: string | null }) {
  const remaining = useRemaining(expiresAt);
  if (remaining === null || remaining === 0) return null;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const units = days > 0
    ? [{ l: 'days', v: days }, { l: 'hrs', v: hours }, { l: 'min', v: minutes }, { l: 'sec', v: seconds }]
    : [{ l: 'hrs', v: hours }, { l: 'min', v: minutes }, { l: 'sec', v: seconds }];
  return (
    <div aria-live="polite" className="flex items-center gap-2">
      {units.map((unit) => (
        <span key={unit.l} className="flex w-[3.4rem] flex-col items-center rounded-2xl border border-white/15 bg-white/[0.06] py-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-sm">
          <span className="text-[1.45rem] font-extrabold leading-none [perspective:400px]">
            <FlipDigit value={pad(unit.v)} />
          </span>
          <span className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/55">{unit.l}</span>
        </span>
      ))}
    </div>
  );
}

function Rise({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setSeen(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    observer.observe(node);
    // Selling content must never stay hidden if observation never fires.
    const failSafe = setTimeout(() => setSeen(true), 1400);
    return () => { observer.disconnect(); clearTimeout(failSafe); };
  }, []);
  return (
    <div
      ref={ref}
      style={{
        transform: reduced || seen ? 'translateY(0) scale(1)' : 'translateY(22px) scale(0.985)',
        opacity: reduced || seen ? 1 : 0,
        transition: reduced ? 'none' : 'transform 760ms cubic-bezier(0.16,1,0.3,1), opacity 620ms ease-out',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`} className="text-amber-400">
      {'★'.repeat(Math.round(rating))}
      <span className="opacity-30">{'★'.repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

const TRUST_LINES = [
  'Code verified & applied at checkout',
  'Instant confirmation to your email',
  'Secure card payment by Stripe',
  'Your planner stays one message away',
] as const;

function TourCard({ tour, view, locale }: { tour: OfferTour; view: OfferView; locale: string }) {
  const percent = tour.perTourDiscount && tour.listPrice > 0 ? Math.round((tour.saving / tour.listPrice) * 100) : 0;
  return (
    <Link
      href={`/${locale}/${tour.slug}?code=${encodeURIComponent(view.code)}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/[0.07] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {tour.image ? (
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">{view.siteName}</div>
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          {tour.duration && <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-gray-900">{tour.duration}</span>}
          {tour.rating !== null && tour.reviewCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              <span aria-hidden className="text-amber-400">★</span>{tour.rating.toFixed(1)}
              <span className="font-medium text-white/75">({tour.reviewCount})</span>
            </span>
          )}
        </div>
        <span className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md" style={{ backgroundColor: view.brandColor }}>
          −{view.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[1.05rem] font-bold leading-snug text-gray-900">{tour.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-600">{tour.summary}</p>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
          <div>
            {tour.perTourDiscount ? (
              <>
                <p className="text-[11px] font-medium text-gray-500">
                  <s className="tabular-nums">{money(view.currencySymbol, tour.listPrice)}</s>
                  <span className="ml-1.5 rounded-md bg-green-50 px-1.5 py-0.5 font-bold text-green-700">−{percent}%</span>
                </p>
                <p className="text-[1.55rem] font-extrabold leading-tight tabular-nums text-gray-900">
                  {money(view.currencySymbol, tour.offerPrice)}
                  <span className="ml-1 text-xs font-semibold text-gray-500">with code</span>
                </p>
              </>
            ) : (
              <>
                {/* A fixed code applies once per cart — a per-tour "discounted
                    price" here would promise what checkout will not charge. */}
                <p className="text-[11px] font-bold text-green-700">−{view.label} at checkout</p>
                <p className="text-[1.55rem] font-extrabold leading-tight tabular-nums text-gray-900">
                  {money(view.currencySymbol, tour.listPrice)}
                </p>
              </>
            )}
          </div>
          <span
            className="mb-0.5 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full py-2.5 pl-4 pr-3 text-xs font-bold text-white shadow-sm transition-all group-hover:gap-2.5 group-hover:opacity-90"
            style={{ backgroundColor: view.brandColor }}
          >
            Book now <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function Heading({ index, kicker, title, children }: { index: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">
        <span aria-hidden className="h-px w-8 bg-gray-400" />
        {index} · {kicker}
      </p>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight text-gray-900 md:text-4xl" style={{ fontFamily: 'var(--offer-display), system-ui, sans-serif' }}>{title}</h2>
      <p className="mt-2 text-base leading-relaxed text-gray-600">{children}</p>
    </div>
  );
}

function DeskBar({ view }: { view: OfferView }) {
  const [visible, setVisible] = useState(false);
  const [copied, copy] = useCopy(view.code);
  const remaining = useRemaining(view.expiresAt);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 560);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const days = remaining === null ? 0 : Math.floor(remaining / 86_400_000);
  const hours = remaining === null ? 0 : Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = remaining === null ? 0 : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? 0 : Math.floor((remaining % 60_000) / 1000);
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 z-50 hidden justify-center transition-transform duration-300 md:flex ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-2.5 shadow-lg backdrop-blur-md" style={{ backgroundColor: `${INK}e6` }}>
        <p className="flex items-center gap-3 text-sm text-white/85">
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white" style={{ backgroundColor: view.brandColor }}>−{view.label}</span>
          <button type="button" onClick={copy} className="font-extrabold tracking-[0.12em] text-white hover:opacity-80" title="Copy code">
            {copied ? 'Copied ✓' : view.code}
          </button>
          {remaining !== null && remaining > 0 && (
            <span className="tabular-nums text-white/60">
              ends in {days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
            </span>
          )}
        </p>
        <a href="#tours" className="rounded-full bg-white px-5 py-2 text-xs font-extrabold text-gray-900 hover:bg-gray-100">
          Browse tours
        </a>
      </div>
    </div>
  );
}

/** Phone bar: slides in only after the hero's own code has scrolled past. */
function StickyBar({ view }: { view: OfferView }) {
  const remaining = useRemaining(view.expiresAt);
  const [copied, copy] = useCopy(view.code);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 460);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (remaining === 0) return null;
  const days = remaining === null ? 0 : Math.floor(remaining / 86_400_000);
  const hours = remaining === null ? 0 : Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = remaining === null ? 0 : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? 0 : Math.floor((remaining % 60_000) / 1000);
  const left = days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return (
    <div
      className={`fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 backdrop-blur-md transition-all duration-300 md:hidden ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
      style={{ backgroundColor: `${INK}f2` }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" className="min-w-0 text-left" onClick={copy}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            {copied ? 'Code copied ✓' : remaining === null ? 'Your private code · tap to copy' : `Ends in ${left}`}
          </p>
          <p className="text-base font-extrabold tracking-[0.14em] text-white">{view.code}</p>
        </button>
        <a href="#tours" className="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: view.brandColor }}>
          See tours ↓
        </a>
      </div>
    </div>
  );
}

/**
 * Exit-intent rescue: one honest reminder when the cursor leaves through the
 * top of the viewport. Once per session per code, desktop pointers only.
 */
function ExitRescue({ view }: { view: OfferView }) {
  const [open, setOpen] = useState(false);
  const [copied, copy] = useCopy(view.code);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const key = `offer-exit-shown:${view.code}`;
    if (window.sessionStorage.getItem(key)) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onOut = (event: MouseEvent) => {
      if (event.clientY > 0 || event.relatedTarget) return;
      window.sessionStorage.setItem(key, '1');
      setOpen(true);
      window.removeEventListener('mouseout', onOut);
    };
    window.addEventListener('mouseout', onOut);
    return () => window.removeEventListener('mouseout', onOut);
  }, [view.code]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const remaining = useRemaining(view.expiresAt);
  if (!open) return null;
  const days = remaining === null ? 0 : Math.floor(remaining / 86_400_000);
  const hours = remaining === null ? 0 : Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = remaining === null ? 0 : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? 0 : Math.floor((remaining % 60_000) / 1000);
  const wa = view.contact.whatsapp
    ? `https://wa.me/${view.contact.whatsapp}?text=${encodeURIComponent(`Hi! I'm looking at my private offer (code ${view.code}).`)}`
    : null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your discount is still available"
        className="relative w-full max-w-md rounded-[1.75rem] bg-white p-8 text-center shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          ×
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500">Before you go</p>
        <p className="mt-3 text-2xl font-extrabold leading-snug text-gray-900">
          {view.firstName ? `${view.firstName}, your ${view.label} is still yours.` : `Your ${view.label} is still yours.`}
        </p>
        {remaining !== null && remaining > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            It ends in{' '}
            <strong className="tabular-nums">
              {days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
            </strong>{' '}
            — after that the code stops working.
          </p>
        )}
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy discount code ${view.code}`}
          className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-4 text-left transition hover:border-gray-400"
        >
          <span className="text-xl font-extrabold tracking-[0.16em] text-gray-900">{view.code}</span>
          <span className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: copied ? '#15803d' : view.brandColor }}>
            {copied ? 'Copied ✓' : 'Copy code'}
          </span>
        </button>
        <a
          href="#tours"
          onClick={() => setOpen(false)}
          className="offer-sheen-host group relative mt-4 block w-full overflow-hidden rounded-2xl py-3.5 text-center text-[15px] font-extrabold text-white shadow-lg transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: view.brandColor }}
        >
          <span className="relative z-10">Keep browsing with {view.label} off</span>
          <span aria-hidden className="offer-sheen offer-sheen-auto pointer-events-none absolute inset-0 z-0" />
        </a>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm font-semibold text-gray-600 underline-offset-4 hover:underline">
            Not sure? Ask your planner on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

export default function OfferPageClient({ view, locale, fontClass = '' }: { view: OfferView; locale: string; fontClass?: string }) {
  const [copied, copy] = useCopy(view.code);
  const s = view.stats;
  const display = { fontFamily: 'var(--offer-display), system-ui, sans-serif', letterSpacing: '-0.035em' } as CSSProperties;
  const wa = view.contact.whatsapp
    ? `https://wa.me/${view.contact.whatsapp}?text=${encodeURIComponent(`Hi! I'm looking at my private offer (code ${view.code}).`)}`
    : null;
  const where = view.cityLabel ? ` in ${view.cityLabel}` : '';

  return (
    <main className={`min-h-screen bg-gray-50 pb-28 md:pb-0 ${fontClass}`}>
      <DeskBar view={view} />

      <section className="relative overflow-hidden lg:min-h-[92vh]" style={{ backgroundColor: INK }}>
        {view.heroImage && (
          <div aria-hidden className="absolute inset-0 z-0">
            <Image src={view.heroImage} alt={view.heroAlt} fill priority sizes="100vw" className="offer-kenburns object-cover" />
          </div>
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ background: `linear-gradient(to bottom, ${INK}c4, ${INK}2e 42%, ${INK}f2)` }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ background: `linear-gradient(to right, ${INK}b8, transparent 68%)` }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <div className="absolute -left-24 top-[-18%] h-[38rem] w-[38rem] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${view.brandColor}45, transparent 68%)` }} />
        </div>

        <div className="relative z-20 mx-auto grid max-w-6xl gap-8 px-6 pb-14 pt-8 md:pb-24 md:pt-10 lg:min-h-[92vh] lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12">
          <div className="order-1 lg:col-start-1 lg:row-start-1">
            <img src={view.logo} alt={view.siteName} className="h-11 w-auto max-w-[200px] self-start object-contain object-left drop-shadow-lg md:h-12" />
            <div className="mt-8 flex items-center gap-2.5">
              {view.firstName && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white ring-1 ring-white/25" style={{ backgroundColor: view.brandColor }}>
                  {view.firstName.charAt(0).toUpperCase()}
                </span>
              )}
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/75">
                A private offer from your personal planner{view.cityLabel ? ` · ${view.cityLabel}` : ''}
              </p>
            </div>
            <SplitReveal
              lines={view.firstName ? [`${view.firstName}, take ${view.label} off`, `every experience${where}.`] : [`Take ${view.label} off`, `every experience${where}.`]}
              className="mt-7 max-w-3xl text-[2.15rem] font-extrabold leading-[1.02] text-white drop-shadow-2xl sm:text-[2.8rem] md:text-[4.2rem] md:leading-[0.98]"
              style={display}
            />
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white drop-shadow-md md:text-xl">
              Hand-picked at live {view.siteName} prices{view.perTourDiscount
                ? <> — from {money(view.currencySymbol, s.fromPrice)} with your code, saving up to {money(view.currencySymbol, s.maxSaving)} on a single booking.</>
                : <> — your {view.label} comes off at checkout.</>}
            </p>
          </div>

          <div className="order-3 lg:col-start-1 lg:row-start-2">
            {s.avgRating !== null && s.reviewTotal > 0 && (
              <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <Stars rating={s.avgRating} />{s.avgRating.toFixed(1)} from {s.reviewTotal} traveller reviews
              </p>
            )}
            <ul className="mt-5 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-2.5 text-[0.92rem] text-white/85 sm:grid-cols-2">
              {TRUST_LINES.map((line) => (
                <li key={line} className="flex items-center gap-2.5">
                  <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: view.brandColor }}>✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="order-2 w-full max-w-md rounded-[1.75rem] border border-white/20 bg-white/[0.08] p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl md:p-7 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Your private code</p>
              <span className="rounded-full px-3 py-1 text-[11px] font-extrabold text-white" style={{ backgroundColor: view.brandColor }}>−{view.label} OFF</span>
            </div>
            <button
              type="button"
              aria-label={`Copy discount code ${view.code}`}
              onClick={copy}
              className="group mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 text-left shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span className="text-2xl font-extrabold tracking-[0.16em] text-gray-900">{view.code}</span>
              <span className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: copied ? '#15803d' : '#111827' }}>
                {copied ? 'Copied ✓' : 'Tap to copy'}
              </span>
            </button>
            {view.expiresAt && (
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Offer ends in</p>
                <FlipClock expiresAt={view.expiresAt} />
              </div>
            )}
            <p className="mt-5 border-t border-white/10 pt-4 text-[13px] leading-relaxed text-white/75">
              Valid on every tour below{view.expiresNice ? <> until <span className="font-bold text-white">{view.expiresNice}</span></> : null} — on as
              many bookings as you make. The code is re-checked and applied at checkout.
            </p>
            <a
              href="#tours"
              className="offer-sheen-host group relative mt-5 block w-full overflow-hidden rounded-2xl py-3.5 text-center text-[15px] font-extrabold text-white shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: view.brandColor }}
            >
              <span className="relative z-10">Browse {view.totalCount} experiences ↓</span>
              <span aria-hidden className="offer-sheen offer-sheen-auto pointer-events-none absolute inset-0 z-0" />
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-y-6 px-6 py-7 sm:grid-cols-3 sm:gap-x-10">
          {[
            ['1 · Pick your tours', view.perTourDiscount ? 'Every experience below already shows its price with your code applied.' : 'Every experience below is covered by your code.'],
            ['2 · Enter your code', `Type or paste ${view.code} at checkout — it is verified server-side.`],
            ['3 · Get instant confirmation', 'Voucher and pickup details arrive by email the moment you book.'],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="text-sm font-extrabold uppercase tracking-wide text-gray-900">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {view.bundles.length > 0 && (
        <section id="tours" className="mx-auto max-w-6xl scroll-mt-14 px-6 pt-16">
          <Rise>
            <Heading index="01" kicker="Save more" title="Book bundles & save more">
              Best-value picks — book several and your {view.label} applies to every one.
            </Heading>
          </Rise>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {view.bundles.map((tour, index) => (
              <Rise key={tour.id} delay={Math.min(index, 2) * 90}>
                <TourCard tour={tour} view={view} locale={locale} />
              </Rise>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 pt-16">
        <Rise>
          <Heading index="02" kicker="Hand-picked" title="Top tours recommended by your personal planner">
            Chosen for {view.firstName ?? 'you'} from {view.totalCount} live experiences{where}.
          </Heading>
        </Rise>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {view.picks.map((tour, index) => (
            <Rise key={tour.id} delay={Math.min(index, 3) * 80}>
              <TourCard tour={tour} view={view} locale={locale} />
            </Rise>
          ))}
        </div>
      </section>

      {view.quotes.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pt-16">
          <Rise>
            <Heading index="03" kicker="Traveller words" title={`Why travellers rate ${view.siteName}${s.avgRating !== null ? ` ${s.avgRating.toFixed(1)}` : ''}`}>
              {s.reviewTotal} reviews across these experiences — a few recent ones.
            </Heading>
          </Rise>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {view.quotes.map((quote, index) => (
              <Rise key={`${quote.name}-${index}`} delay={index * 90}>
                <figure className="flex h-full flex-col rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
                  <Stars rating={quote.rating} />
                  <blockquote className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-gray-700">“{quote.text}”</blockquote>
                  <figcaption className="mt-4 border-t border-gray-100 pt-3 text-sm">
                    <span className="font-bold text-gray-900">{quote.name}</span>
                    {quote.tourTitle && <span className="block text-xs text-gray-500">{quote.tourTitle}</span>}
                  </figcaption>
                </figure>
              </Rise>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <Rise>
          <div className="relative overflow-hidden rounded-[2rem] px-8 py-14 text-center md:py-16" style={{ backgroundColor: INK }}>
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(55% 70% at 50% 120%, ${view.brandColor}55, transparent 70%)` }} />
            <p className="relative text-3xl font-extrabold leading-snug text-white md:text-4xl" style={display}>
              Ready when you are{view.firstName ? `, ${view.firstName}` : ''}.
            </p>
            <p className="relative mx-auto mt-4 max-w-xl text-white/75">
              Use code{' '}
              <span className="rounded-md bg-white/15 px-2 py-0.5 font-extrabold tracking-[0.14em] text-white">{view.code}</span>{' '}
              at checkout{view.expiresNice ? ` before ${view.expiresNice}` : ''}. Questions? Your planner answers fast.
            </p>
            <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
              <a href="#tours" className="rounded-full bg-white px-7 py-3 text-sm font-extrabold text-gray-900 transition hover:bg-gray-100">
                Browse the tours ↑
              </a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full px-7 py-3 text-sm font-extrabold text-white transition hover:opacity-90" style={{ backgroundColor: '#25D366' }}>
                  WhatsApp your planner
                </a>
              )}
            </div>
          </div>
        </Rise>
        <p className="mt-8 text-center text-xs text-gray-500">
          Prices are live prices{view.perTourDiscount ? ' with your code applied' : ''}. The same discount is re-checked and applied at checkout.
        </p>
      </section>

      <StickyBar view={view} />
      <ExitRescue view={view} />
    </main>
  );
}

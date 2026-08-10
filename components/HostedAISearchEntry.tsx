'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Search, Sparkles } from 'lucide-react';
import {
  buildHostedSearchFallbackHref,
  requestHostedAISearch,
} from '@/lib/hostedAISearch';

interface HostedAISearchEntryProps {
  placeholder: string;
  initialQuery?: string;
  destinationSlug?: string;
  tone?: 'glass' | 'light';
}

const SEARCH_KICKERS: Record<string, string> = {
  en: 'AI trip search',
  de: 'KI-Reisesuche',
  ar: 'بحث ذكي للرحلات',
  fr: 'Recherche voyage IA',
  es: 'Búsqueda de viajes IA',
};

export default function HostedAISearchEntry({
  placeholder,
  initialQuery = '',
  destinationSlug,
  tone = 'glass',
}: HostedAISearchEntryProps) {
  const locale = useLocale();
  const router = useRouter();
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
  }, []);

  const openSearch = () => {
    if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);

    const request = requestHostedAISearch({
      query: initialQuery,
      mode: 'catalog',
      locale,
      destinationSlug,
    });

    // The hosted loader is async. Preserve a working first-party route if the
    // launcher never accepts this exact bounded request.
    fallbackTimerRef.current = window.setTimeout(() => {
      if (window.__foxesSearchPending !== request) return;
      window.__foxesSearchPending = null;
      router.push(buildHostedSearchFallbackHref(locale, initialQuery));
    }, 2200);
  };

  const isLight = tone === 'light';

  return (
    <div className="mt-4 flex w-full justify-center px-2 sm:mt-6 sm:px-4 md:justify-start md:px-0 lg:mt-8">
      <button
        type="button"
        onClick={openSearch}
        data-testid="hosted-ai-search-entry"
        aria-label={placeholder}
        className={`group relative flex min-h-16 w-full max-w-xl items-center gap-3 overflow-hidden rounded-full border px-3 py-2 text-start shadow-[0_18px_55px_-22px_rgba(2,8,23,0.72)] backdrop-blur-xl transition-[transform,border-color,box-shadow,background-color] duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4385F6]/35 active:translate-y-0 ${
          isLight
            ? 'border-white/75 bg-white/95 text-slate-950 hover:border-[#4385F6]/55 hover:bg-white'
            : 'border-white/30 bg-black/40 text-white hover:border-white/55 hover:bg-black/50'
        }`}
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4385F6] via-[#3479EB] to-[#1D5FD0] text-white shadow-lg shadow-[#1D5FD0]/30">
          <Search className="relative z-10 h-5 w-5" strokeWidth={2.4} />
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.48),transparent_34%)]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[10px] font-extrabold uppercase tracking-[0.16em] ${isLight ? 'text-[#1D5FD0]' : 'text-[#BBD7FF]'}`}>
            {SEARCH_KICKERS[locale] ?? SEARCH_KICKERS.en}
          </span>
          <span className={`mt-0.5 block truncate text-sm font-semibold sm:text-base ${isLight ? 'text-slate-700' : 'text-white/90'}`}>
            {placeholder}
          </span>
        </span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 group-hover:scale-105 ${
          isLight
            ? 'border-[#4385F6]/20 bg-[#4385F6]/10 text-[#1D5FD0]'
            : 'border-[#BBD7FF]/30 bg-[#4385F6]/20 text-[#E8F2FF]'
        }`}>
          <Sparkles className="h-5 w-5" strokeWidth={2.2} />
        </span>
      </button>
    </div>
  );
}

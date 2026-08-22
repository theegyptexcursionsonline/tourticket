// components/tools/ToolsChrome.tsx
// Lightweight header/footer for the /tools pages — a utility page doesn't need
// the full marketing nav, app-download banner or newsletter block.

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { localizedStorefrontPath, localizedToolPath } from '@/lib/tools/catalog';
/* eslint-disable @next/next/no-img-element */

export function ToolsHeader({
  name,
  logoUrl,
  accent,
  locale,
}: {
  name: string;
  logoUrl: string;
  accent: string;
  locale: string;
}) {
  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-3 px-4 py-3">
        <Link href={localizedStorefrontPath(locale, '/')} className="flex min-w-0 items-center gap-3">
          <img src={logoUrl} alt={name} className="h-9 w-9 rounded-lg object-cover" />
          <span className="hidden truncate font-bold leading-tight text-slate-900 sm:inline">{name}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-5">
          <span className="hidden sm:inline text-xs font-bold tracking-widest uppercase text-slate-400">
            Free travel tools
          </span>
          <Link
            href={localizedStorefrontPath(locale, '/tours')}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:px-4"
            style={{ backgroundColor: accent }}
          >
            <span className="hidden sm:inline">Browse tours</span>
            <span className="sm:hidden">Tours</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function ToolsFooter({ name, accent, locale }: { name: string; accent: string; locale: string }) {
  return (
    <footer className="border-t border-slate-100 bg-white mt-16">
      <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} {name} — free tools for planning your Egypt trip.
        </p>
        <nav aria-label="Travel tools footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm">
          <Link href={localizedStorefrontPath(locale, '/tours')} className="text-slate-500 hover:text-slate-800">Tours</Link>
          <Link href={localizedStorefrontPath(locale, '/destinations')} className="text-slate-500 hover:text-slate-800">Destinations</Link>
          <Link href={localizedStorefrontPath(locale, '/contact')} className="text-slate-500 hover:text-slate-800">Contact</Link>
          <Link href={localizedToolPath(locale)} className="font-semibold" style={{ color: accent }}>All tools</Link>
        </nav>
      </div>
    </footer>
  );
}

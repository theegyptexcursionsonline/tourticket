import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';

import ToolIcon from '@/components/tools/ToolIcon';
import { ToolsFooter, ToolsHeader } from '@/components/tools/ToolsChrome';
import { ToolsCatalogStructuredData } from '@/components/tools/ToolsStructuredData';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';
import {
  OFFICIAL_TOOLS,
  STOREFRONT_TOOL_BRAND,
  localizedToolPath,
} from '@/lib/tools/catalog';

interface ToolsIndexPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ToolsIndexPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Free Egypt Travel Tools | Egypt Excursions Online',
    description:
      'Ten free planning tools for Egypt trips, including budget, entry, timing, transfers, diving, packing and itinerary guidance.',
    alternates: metadataAlternates(locale, '/tools'),
  };
}

export default async function ToolsIndexPage({ params }: ToolsIndexPageProps) {
  const { locale } = await params;
  const { name, logoUrl, accent } = STOREFRONT_TOOL_BRAND;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <ToolsCatalogStructuredData locale={locale} />
      <ToolsHeader name={name} logoUrl={logoUrl} accent={accent} locale={locale} />

      <main className="flex-grow">
        <section aria-labelledby="tools-title" className="border-b border-slate-200 bg-white">
          <div className="container mx-auto max-w-6xl px-4 py-12 sm:py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-orange-700">
                <BadgeCheck aria-hidden="true" className="h-4 w-4" />
                10 planning tools
              </div>
              <h1 id="tools-title" className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                Free tools for a better Egypt trip
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Plan costs, entry, transport, timing and day-by-day details with one maintained collection from {name}.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Egypt travel planning tools" className="container mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <div role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {OFFICIAL_TOOLS.map((tool) => (
              <article role="listitem" key={tool.id} className="min-w-0">
                <Link
                  href={localizedToolPath(locale, tool.id)}
                  aria-label={`Open ${tool.name}`}
                  className="group flex h-full min-w-0 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 sm:p-6"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${accent}14`, color: accent }}
                  >
                    <ToolIcon name={tool.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{tool.category}</span>
                    <span className="mt-1 block text-lg font-bold leading-6 text-slate-950">{tool.name}</span>
                    <span className="mt-2 block text-sm leading-6 text-slate-600">{tool.description}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-3 h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1"
                  />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <ToolsFooter name={name} accent={accent} locale={locale} />
    </div>
  );
}

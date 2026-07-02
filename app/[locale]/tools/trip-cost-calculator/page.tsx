import React from 'react';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Calculator, Wallet, MapPin, ShieldCheck } from 'lucide-react';

import { ToolsHeader, ToolsFooter } from '@/components/tools/ToolsChrome';
import TripCostCalculator from '@/components/tools/TripCostCalculator';
import EmbedCode from '@/components/tools/EmbedCode';
import { getTripCostConfig, computeTripCost, formatUsd } from '@/lib/toolsApi';
import { getSeoAlternates } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const ACCENT = '#E05D1A';

export const metadata: Metadata = {
  title: 'Egypt Trip Cost Calculator — Free Budget Tool | Egypt Excursions Online',
  description:
    'How much does a trip to Egypt cost? Estimate your full budget — hotels, food, transport, tours and visa — by travel style, free on Egypt Excursions Online.',
  openGraph: {
    title: 'Egypt Trip Cost Calculator | Egypt Excursions Online',
    description: 'Estimate your full Egypt trip budget in seconds — hotels, food, transport, tours and visa.',
    type: 'website',
    siteName: 'Egypt Excursions Online',
  },
  alternates: getSeoAlternates('/tools/trip-cost-calculator'),
};

export default async function TripCostCalculatorPage() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || 'egypt-excursionsonline.com').split(',')[0].split(':')[0];
  // Config (pricing + the two credit links for this host) comes from the
  // central tools API; falls back to built-in defaults if it's unreachable.
  const config = await getTripCostConfig(host);
  const sample = computeTripCost(config, { days: 7, travelers: 2, style: 'comfort' });

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <ToolsHeader name="Egypt Excursions Online" logoUrl="/EEO-mark.png" accent={ACCENT} />

      <main className="flex-grow">
        <section className="bg-slate-50 border-b border-slate-100">
          <div className="container mx-auto px-4 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
              <div>
                <span
                  className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase rounded-full px-3 py-1"
                  style={{ color: ACCENT, backgroundColor: `${ACCENT}14` }}
                >
                  <Calculator className="w-3.5 h-3.5" /> Free travel tool
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mt-4 leading-tight">
                  How much does a trip to Egypt cost?
                </h1>
                <p className="text-lg text-slate-600 mt-4 max-w-xl">
                  Pick your travel style, days and group size — the calculator breaks your budget into hotels, food,
                  transport, tours and the e-visa, so you land in Egypt with no surprises.
                </p>
                <ul className="mt-6 space-y-2.5 text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Wallet className="w-4.5 h-4.5 shrink-0" style={{ color: ACCENT }} />
                    Real daily prices from local operators — updated for 2026
                  </li>
                  <li className="flex items-center gap-2.5">
                    <MapPin className="w-4.5 h-4.5 shrink-0" style={{ color: ACCENT }} />
                    Works for Cairo, Luxor, Hurghada, Sharm and the Red Sea coast
                  </li>
                  <li className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4.5 h-4.5 shrink-0" style={{ color: ACCENT }} />
                    Includes the {formatUsd(sample.visa)} Egypt e-visa most nationalities need
                  </li>
                </ul>
              </div>
              <div className="flex flex-col items-center lg:items-end">
                <TripCostCalculator config={config} accent={ACCENT} />
                {/* Credit sits RIGHT under the widget — two network domains from the API */}
                <p className="text-xs text-slate-500 mt-3 max-w-md text-center">
                  ⚡ Free tool by{' '}
                  {config.links.map((l, i) => (
                    <React.Fragment key={l.url}>
                      {i > 0 && ' · '}
                      <a
                        href={l.url}
                        className="font-semibold underline decoration-2 underline-offset-2"
                        style={{ color: ACCENT }}
                      >
                        {l.name}
                      </a>
                    </React.Fragment>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">What the estimate covers</h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              The calculator prices four everyday costs — accommodation, food and drinks, getting around, and tours or
              entrance fees — at three travel styles, then adds Egypt&apos;s single-entry e-visa. Groups of three or more
              get a small transport discount, because shared vans and taxis cost less per head.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.keys(config.styles).map((key) => {
                const r = computeTripCost(config, { days: 7, travelers: 2, style: key });
                return (
                  <div key={key} className="border border-slate-200 rounded-xl p-5">
                    <div className="text-sm font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                      {config.styles[key].label}
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">{formatUsd(r.perPerson)}</div>
                    <div className="text-xs text-slate-500 mt-1">per person · 7 days · 2 travellers</div>
                  </div>
                );
              })}
            </div>
            <p className="text-slate-700 leading-relaxed mt-6">
              Flights are excluded — they vary too much by season and departure city. Book tours and day trips ahead of
              time to lock prices in; on-the-ground rates in high season are usually higher.
            </p>
            <div className="mt-8">
              <Link
                href="/"
                className="inline-block rounded-xl px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                Browse Egypt Excursions Online tours &amp; day trips
              </Link>
            </div>

            <div className="mt-12">
              <EmbedCode
                accent={ACCENT}
                snippet={`<script src="${config.embedBase}/embed.js" data-tool="trip-cost-calculator" async></script>`}
              />
            </div>
          </div>
        </section>
      </main>

      <ToolsFooter name="Egypt Excursions Online" accent={ACCENT} />
    </div>
  );
}

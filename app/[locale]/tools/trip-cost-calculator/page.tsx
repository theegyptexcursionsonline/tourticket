import React from 'react';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { Globe, RefreshCw, MousePointerClick } from 'lucide-react';

import { ToolsHeader, ToolsFooter } from '@/components/tools/ToolsChrome';
import TripCostCalculator from '@/components/tools/TripCostCalculator';
import EmbedCode from '@/components/tools/EmbedCode';
import { getTripCostConfig } from '@/lib/toolsApi';
import { englishOnlyMetadataAlternates } from '@/lib/i18n/seoAlternates';

export const dynamic = 'force-dynamic';

const ACCENT = '#E05D1A';

const PAGE_METADATA: Metadata = {
  title: 'Egypt Trip Cost Calculator — Free Embeddable Widget | Egypt Excursions Online',
  description:
    'Estimate a full Egypt trip budget in seconds — and embed the calculator on your own website or blog with one line of code, free.',
  openGraph: {
    title: 'Egypt Trip Cost Calculator | Egypt Excursions Online',
    description: 'Free trip-budget widget — use it here or embed it on your own site with one line of code.',
    type: 'website',
    siteName: 'Egypt Excursions Online',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  await params;
  return {
    ...PAGE_METADATA,
    alternates: englishOnlyMetadataAlternates('/tools/trip-cost-calculator'),
  };
}

export default async function TripCostCalculatorPage() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || 'egypt-excursionsonline.com').split(',')[0].split(':')[0];
  const config = await getTripCostConfig(host);

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen flex flex-col">
      <ToolsHeader name="Egypt Excursions Online" logoUrl="/EEO-mark.png" accent={ACCENT} />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-extrabold text-slate-900">Egypt Trip Cost Calculator</h1>
            <p className="text-lg text-slate-600 mt-3">
              A realistic trip budget in seconds — hotels, food, transport, tours and the e-visa.
              Use it here, or add it to your own website for free.
            </p>
          </div>

          {/* the widget */}
          <div className="flex justify-center mt-10">
            <div className="flex flex-col items-center">
              <TripCostCalculator config={config} accent={ACCENT} />
              <p className="text-xs text-slate-500 mt-3 text-center">
                ⚡ Free tool by{' '}
                {config.links.map((l, i) => (
                  <React.Fragment key={l.url}>
                    {i > 0 && ' · '}
                    <a href={l.url} className="font-semibold underline decoration-2 underline-offset-2" style={{ color: ACCENT }}>
                      {l.name}
                    </a>
                  </React.Fragment>
                ))}
              </p>
            </div>
          </div>

          {/* embed it */}
          <div className="max-w-3xl mx-auto mt-14">
            <EmbedCode
              accent={ACCENT}
              snippet={`<script src="https://${host}/tools/embed.js" data-tool="trip-cost-calculator" async></script>`}
            />
          </div>

          {/* why embed it */}
          <div className="max-w-3xl mx-auto mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <Globe className="w-5 h-5 mb-2.5" style={{ color: ACCENT }} />
              <h3 className="font-bold text-slate-900 text-sm">Anyone can embed it</h3>
              <p className="text-sm text-slate-600 mt-1">
                Travel blogs, hotels, guides — one line of code, no signup, works on any website builder.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <MousePointerClick className="w-5 h-5 mb-2.5" style={{ color: ACCENT }} />
              <h3 className="font-bold text-slate-900 text-sm">Keeps readers on your page</h3>
              <p className="text-sm text-slate-600 mt-1">
                An interactive budget planner your visitors actually use — instead of leaving to search for prices.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <RefreshCw className="w-5 h-5 mb-2.5" style={{ color: ACCENT }} />
              <h3 className="font-bold text-slate-900 text-sm">Always up to date</h3>
              <p className="text-sm text-slate-600 mt-1">
                2026 prices maintained centrally — your embed updates automatically, nothing to maintain.
              </p>
            </div>
          </div>
        </div>
      </main>

      <ToolsFooter name="Egypt Excursions Online" accent={ACCENT} />
    </div>
  );
}

import React from 'react';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { Globe, MousePointerClick, ShieldCheck } from 'lucide-react';

import { ToolsHeader, ToolsFooter } from '@/components/tools/ToolsChrome';
import VisaChecker from '@/components/tools/VisaChecker';
import EmbedCode from '@/components/tools/EmbedCode';
import { getVisaConfig } from '@/lib/tools/visa';
import { getSeoAlternates } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const ACCENT = '#E05D1A';

export const metadata: Metadata = {
  title: 'Egypt Visa Checker — Do I Need a Visa for Egypt? | Egypt Excursions Online',
  description:
    'Check Egypt entry requirements by nationality in seconds — e-visa, visa on arrival or visa-free, with cost and stay length. Free, and embeddable on your own site.',
  openGraph: {
    title: 'Egypt Visa Checker | Egypt Excursions Online',
    description: 'Do you need a visa for Egypt? Free checker by nationality — use it here or embed it on your own site.',
    type: 'website',
    siteName: 'Egypt Excursions Online',
  },
  alternates: getSeoAlternates('/tools/visa-checker'),
};

export default async function VisaCheckerPage() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || 'egypt-excursionsonline.com').split(',')[0].split(':')[0];
  const config = await getVisaConfig(host);

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen flex flex-col">
      <ToolsHeader name="Egypt Excursions Online" logoUrl="/EEO-mark.png" accent={ACCENT} />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-extrabold text-slate-900">Egypt Visa Checker</h1>
            <p className="text-lg text-slate-600 mt-3">
              Do you need a visa for Egypt? Pick your nationality for current entry guidance — e-visa, visa on arrival
              or visa-free, with cost and stay length. Use it here, or add it to your own website for free.
            </p>
          </div>

          {/* the widget */}
          <div className="flex justify-center mt-10">
            <div className="flex flex-col items-center">
              <VisaChecker nationalities={config.nationalities} accent={ACCENT} />
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
              snippet={`<iframe src="${config.embedSrc}" title="Egypt Visa Checker" width="100%" height="560" style="border:0;max-width:560px" loading="lazy"></iframe>`}
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
              <h3 className="font-bold text-slate-900 text-sm">Answers a top travel question</h3>
              <p className="text-sm text-slate-600 mt-1">
                &ldquo;Do I need a visa for Egypt?&rdquo; is one of the first things every visitor searches — answer it on your page.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <ShieldCheck className="w-5 h-5 mb-2.5" style={{ color: ACCENT }} />
              <h3 className="font-bold text-slate-900 text-sm">Always current</h3>
              <p className="text-sm text-slate-600 mt-1">
                Guidance maintained centrally with a link to the official portal — your embed updates automatically.
              </p>
            </div>
          </div>
        </div>
      </main>

      <ToolsFooter name="Egypt Excursions Online" accent={ACCENT} />
    </div>
  );
}

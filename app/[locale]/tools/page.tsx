import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, StampIcon, ArrowRight } from 'lucide-react';

import { ToolsHeader, ToolsFooter } from '@/components/tools/ToolsChrome';
import { getSeoAlternates } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const ACCENT = '#E05D1A';

export const metadata: Metadata = {
  title: 'Free Travel Tools | Egypt Excursions Online',
  description: 'Free planning tools for your Egypt trip from Egypt Excursions Online — trip cost calculator, visa checker and more.',
  alternates: getSeoAlternates('/tools'),
};

const TOOLS = [
  {
    href: '/tools/trip-cost-calculator',
    Icon: Calculator,
    title: 'Egypt Trip Cost Calculator',
    desc: 'Estimate your full budget — hotels, food, transport, tours and visa.',
  },
  {
    href: '/tools/visa-checker',
    Icon: StampIcon,
    title: 'Egypt Visa Checker',
    desc: 'Do you need a visa? Entry requirements by nationality — cost, stay and steps.',
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <ToolsHeader name="Egypt Excursions Online" logoUrl="/EEO-mark.png" accent={ACCENT} />
      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Free travel tools</h1>
          <p className="text-lg text-slate-600 mb-10">Plan your Egypt trip with quick, free tools.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TOOLS.map(({ href, Icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <span className="rounded-xl p-3 shrink-0" style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}>
                    <Icon className="w-6 h-6" />
                  </span>
                  <span>
                    <span className="block text-lg font-bold text-slate-900">{title}</span>
                    <span className="block text-sm text-slate-500">{desc}</span>
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <ToolsFooter name="Egypt Excursions Online" accent={ACCENT} />
    </div>
  );
}

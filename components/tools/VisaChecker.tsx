'use client';

// components/tools/VisaChecker.tsx
// Egypt visa checker — pick a nationality, get entry guidance (requirement,
// cost, stay, steps). All logic runs locally from the shared model; the credit
// backlink + nationality list come from the central tools API (server-fetched).

import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { checkVisa, type Nationality } from '@/lib/tools/visa';

export default function VisaChecker({
  nationalities,
  accent = '#E05D1A',
}: {
  nationalities: Nationality[];
  accent?: string;
}) {
  const [slug, setSlug] = useState('');
  const result = useMemo(() => (slug ? checkVisa(slug === '__other' ? 'unlisted' : slug) : null), [slug]);

  const selectCls =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-gray-400';
  const isFree = result?.category === 'visa_free';
  const isEmbassy = result?.category === 'embassy';
  const ok = !isEmbassy;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_18px_50px_-20px_rgba(20,24,40,0.25)] overflow-hidden w-full max-w-md">
      {/* header */}
      <div className="px-6 pt-5 pb-4 text-white" style={{ backgroundColor: '#4F4D4F' }}>
        <span
          className="inline-block text-[10px] font-bold tracking-[0.12em] uppercase rounded-full px-2.5 py-1"
          style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.16)' }}
        >
          Free tool
        </span>
        <h2 className="text-lg font-bold mt-2 tracking-tight">Do I need a visa for Egypt?</h2>
        <p className="text-xs mt-1 text-white/70">Pick your nationality for current entry guidance.</p>
      </div>

      {/* input */}
      <div className="px-6 pt-5">
        <label className="block text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="nat">
          Your nationality
        </label>
        <select id="nat" className={selectCls} value={slug} onChange={(e) => setSlug(e.target.value)}>
          <option value="">Select your country…</option>
          {nationalities.map((n) => (
            <option key={n.slug} value={n.slug}>{n.name}</option>
          ))}
          <option value="__other">My country isn&apos;t listed</option>
        </select>
      </div>

      {/* result */}
      {result && (
        <div className="px-6 pt-5 pb-6">
          <div className="border border-gray-200 rounded-xl p-4">
            <span
              className="inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-1.5 rounded-full"
              style={
                ok
                  ? { color: '#1f8f5f', backgroundColor: '#e9f6f0' }
                  : { color: '#b06a12', backgroundColor: '#fdf3e3' }
              }
            >
              {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {isFree ? 'No visa required' : ok ? 'e-Visa available' : 'Check eligibility'}
            </span>

            <div className="text-xl font-extrabold text-gray-900 mt-3 tracking-tight">{result.requirement}</div>
            <div className="text-sm text-gray-600">{result.nationality} citizens</div>

            {(result.cost !== null || result.stayDays) && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 my-3 py-3 border-y border-gray-100">
                {result.cost !== null && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Cost</div>
                    <div className="text-base font-bold" style={{ color: '#4F4D4F' }}>
                      {result.cost === 0 ? 'Free' : `$${result.cost}`}
                    </div>
                  </div>
                )}
                {result.stayDays && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Stay</div>
                    <div className="text-base font-bold" style={{ color: '#4F4D4F' }}>{result.stayDays} days</div>
                  </div>
                )}
                {result.entries && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Entry</div>
                    <div className="text-[13px] font-bold pt-0.5" style={{ color: '#4F4D4F' }}>
                      {result.entries.split('(')[0].trim()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <ol className="list-decimal pl-5 space-y-1.5 mt-2 text-sm text-gray-700">
              {result.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>

            <a
              href={result.official}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm font-bold"
              style={{ color: accent }}
            >
              Official e-visa portal <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <p className="mt-3 text-xs text-gray-400 leading-relaxed">{result.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

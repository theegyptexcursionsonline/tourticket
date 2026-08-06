'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';

export interface ContentListingOption {
  id: string;
  title: string;
  slug?: string;
  image?: string;
  kind?: string;
  isPublished?: boolean;
  matchedOptionIds?: string[];
}

interface Props {
  label: string;
  hint: string;
  placeholder: string;
  optionsKind: 'tours' | 'pages';
  excludeId?: string;
  selected: ContentListingOption[];
  onChange: (next: ContentListingOption[]) => void;
}

const inputBase = 'block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700';

export default function ContentListingPicker({
  label,
  hint,
  placeholder,
  optionsKind,
  excludeId,
  selected,
  onChange,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContentListingOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!trimmed) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({ kind: optionsKind, q: trimmed });
        if (excludeId) params.set('excludeId', excludeId);
        const response = await fetch(`/api/admin/pages/options?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Failed to load listing options');
        const payload = await response.json() as { success?: boolean; data?: ContentListingOption[] };
        setResults(payload.success && Array.isArray(payload.data) ? payload.data : []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [excludeId, optionsKind, query]);

  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);

  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-indigo-500" />
        <label className="text-sm font-semibold text-slate-700">{label}</label>
      </div>
      <div className="relative">
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className={inputBase}
          placeholder={placeholder}
          aria-label={label}
        />
        {open && query.trim() ? (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {searching ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : null}
            {!searching && results.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">No matches</div> : null}
            {!searching ? results.map((option) => {
              const alreadySelected = selectedIds.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={alreadySelected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (alreadySelected) return;
                    onChange([...selected, option]);
                    setQuery('');
                    setResults([]);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-indigo-50 ${alreadySelected ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  {option.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={option.image} alt="" className="h-8 w-8 flex-shrink-0 rounded-lg object-cover" />
                  ) : <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-slate-100" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-700">{option.title}</span>
                    {optionsKind === 'tours' ? <span className="block truncate font-mono text-[10px] text-slate-400">Tour ID: {option.id}</span> : null}
                    {option.matchedOptionIds?.length ? (
                      <span className="block truncate font-mono text-[10px] font-semibold text-indigo-600">Matched Option ID: {option.matchedOptionIds.join(', ')}</span>
                    ) : null}
                  </span>
                  {option.kind ? <span className="text-[10px] uppercase tracking-wide text-slate-400">{option.kind.replace('-', ' ')}</span> : null}
                  {option.isPublished === false ? <span className="text-[10px] uppercase tracking-wide text-amber-500">draft</span> : null}
                </button>
              );
            }) : null}
          </div>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="space-y-2">
          {selected.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <span className="w-5 text-xs font-bold text-slate-400">{index + 1}.</span>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="h-8 w-8 flex-shrink-0 rounded-lg object-cover" />
              ) : <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-slate-200" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-700">{item.title}</span>
                {optionsKind === 'tours' ? <span className="block truncate font-mono text-[10px] text-slate-400">Tour ID: {item.id}</span> : null}
              </span>
              {item.kind ? <span className="text-[10px] uppercase tracking-wide text-slate-400">{item.kind.replace('-', ' ')}</span> : null}
              <button
                type="button"
                onClick={() => onChange(selected.filter((entry) => entry.id !== item.id))}
                aria-label={`Remove ${item.title}`}
                className="rounded-lg p-1 text-red-400 transition-colors hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : <p className="text-sm italic text-slate-400">Nothing selected yet</p>}
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

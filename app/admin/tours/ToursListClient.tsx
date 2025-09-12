'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Grid, List } from 'lucide-react';
import Image from 'next/image';
import { TourActions } from './TourActions';

type TourType = {
  _id: string;
  title?: string;
  name?: string;
  images?: string[];
  destination?: { name?: string } | null;
  price?: number;
  discountPrice?: number;
  duration?: string | number;
  createdAt?: string;
  published?: boolean;
  draft?: boolean;
  isFeatured?: boolean;
};

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-white/60 border border-white/30 shadow-sm ${className}`}
    >
      {children}
    </span>
  );
}

function formatPrice(p?: number) {
  if (p === undefined || p === null) return '—';
  return `€${Number(p).toFixed(2)}`;
}

function PlaceholderImg() {
  return (
    <div className="flex items-center justify-center h-20 w-28 bg-slate-100 rounded-md">
      <svg width="36" height="24" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="16" rx="2" fill="#E6E9EE" />
      </svg>
    </div>
  );
}

export function ToursListClient({ tours }: { tours: TourType[] }) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tours.slice();
    if (q) {
      list = list.filter((t) => {
        const title = (t.title || t.name || '').toLowerCase();
        const dest = (t.destination?.name || '').toLowerCase();
        return title.includes(q) || dest.includes(q);
      });
    }

    if (sortBy === 'newest')
      list.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    if (sortBy === 'price-asc')
      list.sort(
        (a, b) => Number(a.price || a.discountPrice || 0) - Number(b.price || b.discountPrice || 0)
      );
    if (sortBy === 'price-desc')
      list.sort(
        (a, b) => Number(b.price || b.discountPrice || 0) - Number(a.price || a.discountPrice || 0)
      );

    return list;
  }, [tours, query, sortBy]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tours..."
              className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md bg-white"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
            </select>

            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="px-3 py-2 border rounded-md bg-white"
            >
              <option value={6}>6 / page</option>
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('table')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${
              view === 'table' ? 'bg-slate-900 text-white' : 'bg-white'
            }`}
          >
            <List className="w-4 h-4" /> Table
          </button>
          <button
            onClick={() => setView('cards')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${
              view === 'cards' ? 'bg-slate-900 text-white' : 'bg-white'
            }`}
          >
            <Grid className="w-4 h-4" /> Cards
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'table' ? (
        <div className="bg-white border border-slate-100 rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Tour
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Destination
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr key={t._id} className="border-t last:border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-28 rounded-md overflow-hidden bg-slate-100 shrink-0">
                        {t.images && t.images[0] ? (
                          <Image
                            src={t.images[0]}
                            alt={t.title || t.name || 'tour'}
                            width={160}
                            height={96}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <PlaceholderImg />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{t.title || t.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {t.duration ? `${t.duration}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{t.destination?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {formatPrice(t.price ?? t.discountPrice)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TourActions tourId={t._id} />
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    No tours found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((t) => (
            <div
              key={t._id}
              className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <div className="relative h-44">
                {t.images && t.images[0] ? (
                  <Image
                    src={t.images[0]}
                    alt={t.title || t.name || 'tour'}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <svg
                      width="54"
                      height="36"
                      viewBox="0 0 24 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="24" height="16" rx="2" fill="#E6E9EE" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t.title || t.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{t.destination?.name || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatPrice(t.price ?? t.discountPrice)}
                    </div>
                    <div className="text-xs text-slate-500">{t.duration ? `${t.duration}` : ''}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {new Date(t.createdAt || '').toLocaleDateString()}
                  </div>
                  <TourActions tourId={t._id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-500">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-md border bg-white disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded-md border bg-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

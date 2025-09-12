// app/admin/tours/ToursListClient.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Grid, List } from 'lucide-react';
import Image from 'next/image';
import { TourActions } from './TourActions';
import Link from 'next/link'; // Import Link

type TourType = {
  _id: string;
  title?: string;
  name?: string;
  image?: string; // Add the main image property
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

// ... (Helper components like Badge, formatPrice, PlaceholderImg remain the same) ...
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
    <div className="flex items-center justify-center h-full w-full bg-slate-100 rounded-md">
      <svg className="w-1/2 h-1/2 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.51 6 17.5h12l-3.86-5.14z"/>
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
    let list = [...tours];
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
        (a, b) => (a.discountPrice || a.price || 0) - (b.discountPrice || b.price || 0)
      );
    if (sortBy === 'price-desc')
      list.sort(
        (a, b) => (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0)
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
              className="px-3 py-2 border rounded-md bg-white shadow-sm"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tour</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Destination</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr key={t._id} className="border-t last:border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-28 rounded-md overflow-hidden bg-slate-100 shrink-0">
                        {/* **FIX: Use t.image instead of t.images[0]** */}
                        {t.image ? (
                          <Image
                            src={t.image}
                            alt={t.title || t.name || 'tour'}
                            width={112}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <PlaceholderImg />
                        )}
                      </div>
                      <div>
                        <Link href={`/admin/tours/edit/${t._id}`} className="text-sm font-medium text-slate-900 hover:text-red-600 transition-colors">
                            {t.title || t.name}
                        </Link>
                        <div className="text-xs text-slate-500 mt-0.5">{t.duration}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{t.destination?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatPrice(t.discountPrice ?? t.price)}</td>
                  <td className="px-4 py-3 text-right"><TourActions tourId={t._id} /></td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No tours found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginated.map((t) => (
            <div key={t._id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="relative h-44">
                 {/* **FIX: Use t.image instead of t.images[0]** */}
                {t.image ? (
                  <Image src={t.image} alt={t.title || t.name || 'tour'} fill style={{ objectFit: 'cover' }} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full"><PlaceholderImg /></div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/admin/tours/edit/${t._id}`} className="text-sm font-semibold text-slate-900 hover:text-red-600 transition-colors">
                        {t.title || t.name}
                    </Link>
                    <div className="text-xs text-slate-500 mt-1">{t.destination?.name || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">{formatPrice(t.discountPrice ?? t.price)}</div>
                    <div className="text-xs text-slate-500">{t.duration}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div className="text-xs text-slate-500">{new Date(t.createdAt || '').toLocaleDateString()}</div>
                  <TourActions tourId={t._id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-500">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-md border bg-white disabled:opacity-50">Previous</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-md border bg-white disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
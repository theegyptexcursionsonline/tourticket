// app/admin/tours/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import withAuth from '@/components/admin/withAuth';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { PopulatedTour } from '@/types';
import { ToursListClient } from './ToursListClient';

// Stale-while-revalidate: sidebar revisits paint the last-known list
// instantly while the fresh slim list (/api/admin/tours) loads behind it.
// sessionStorage: per tab; purged by TourActions on archive and by
// clearSession on logout.
const CACHE_KEY = 'admin-tours-cache:main';

function ToursPage() {
  const { token } = useAdminAuth();
  const [tours, setTours] = useState<PopulatedTour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTours = useCallback(async () => {
    let hasCached = false;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setTours(JSON.parse(cached));
        hasCached = true;
      }
    } catch { /* ignore corrupt cache */ }
    setIsLoading(!hasCached);
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('/api/admin/tours', { headers, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch tours');
      }
      setTours(data.data || []);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.data || []));
      } catch { /* ignore storage quota */ }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchTours(), 0);
    // TourActions dispatches this after archiving a tour so the list drops
    // the row immediately instead of serving it back from cache.
    const onChanged = () => void fetchTours();
    window.addEventListener('admin-tours-changed', onChanged);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('admin-tours-changed', onChanged);
    };
  }, [fetchTours]);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Manage Tours</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, edit and manage your tours. Use search or switch views below.
          </p>
        </div>
        <Link
          href="/admin/tours/new"
          className="inline-flex items-center gap-2 bg-gradient-to-tr from-sky-600 to-indigo-600 text-white px-4 py-2 rounded-md shadow hover:opacity-95 transition"
        >
          Add New Tour
        </Link>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-full bg-slate-100 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-semibold mb-1">Error loading tours</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : tours.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p>No tours found. Create your first tour to get started.</p>
        </div>
      ) : (
        <ToursListClient tours={tours} />
      )}
    </div>
  );
}

export default withAuth(ToursPage);

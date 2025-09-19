// app/admin/tours/ToursListClient.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { 
  Search, 
  Grid, 
  List, 
  Filter,
  ArrowUpDown,
  Eye,
  Calendar,
  MapPin,
  Star,
  Euro,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import Image from 'next/image';
import { TourActions } from './TourActions';
import Link from 'next/link';

type TourType = {
  _id: string;
  title?: string;
  name?: string;
  image?: string;
  images?: string[];
  destination?: { name?: string } | null;
  category?: { name?: string } | null;
  price?: number;
  discountPrice?: number;
  duration?: string | number;
  createdAt?: string;
  published?: boolean;
  draft?: boolean;
  isFeatured?: boolean;
};

function Badge({ children, className = '', icon: Icon }: { 
  children: React.ReactNode; 
  className?: string;
  icon?: any;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
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
    <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg">
      <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.51 6 17.5h12l-3.86-5.14z"/>
      </svg>
    </div>
  );
}

export function ToursListClient({ tours }: { tours: TourType[] }) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('cards');
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
        const category = (t.category?.name || '').toLowerCase();
        return title.includes(q) || dest.includes(q) || category.includes(q);
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, sortBy]);

  return (
    <div className="space-y-8">
      {/* Enhanced Header Controls */}
      <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Search and Filter Section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1 max-w-2xl">
            {/* Enhanced Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tours, destinations, categories..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-slate-700 font-medium"
              />
            </div>

            {/* Enhanced Sort Dropdown */}
            <div className="relative sm:w-56">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <ArrowUpDown className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer text-slate-700 font-medium"
              >
                <option value="newest">📅 Newest First</option>
                <option value="price-asc">💰 Price: Low to High</option>
                <option value="price-desc">💰 Price: High to Low</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* View Toggle Buttons */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView('cards')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                view === 'cards' 
                  ? 'bg-white text-indigo-600 shadow-sm border border-indigo-200/60' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                view === 'table' 
                  ? 'bg-white text-indigo-600 shadow-sm border border-indigo-200/60' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200/60">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Eye className="h-4 w-4" />
              <span className="font-medium">{total}</span>
              <span>tour{total !== 1 ? 's' : ''} found</span>
              {query && (
                <>
                  <span>for</span>
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-semibold">"{query}"</span>
                </>
              )}
            </div>
          </div>
          
          {/* Per Page Selector */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="px-3 py-1 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'table' ? (
        // Enhanced Table View
        <div className="bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Tour</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Destination
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Category
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      Price
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((t, index) => (
                  <tr 
                    key={t._id} 
                    className={`group hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30 transition-all duration-200 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 shadow-sm group-hover:shadow-md transition-all duration-200">
                          {t.image ? (
                            <Image
                              src={t.image}
                              alt={t.title || t.name || 'tour'}
                              width={112}
                              height={64}
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <PlaceholderImg />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <Link 
                            href={`/admin/tours/edit/${t._id}`} 
                            className="block text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate group-hover:text-indigo-600"
                            title={t.title || t.name}
                          >
                            {t.title || t.name}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            <span>{t.duration}</span>
                            {t.isFeatured && (
                              <Badge 
                                className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300" 
                                icon={Star}
                              >
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">{t.destination?.name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">{t.category?.name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{formatPrice(t.discountPrice ?? t.price)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <TourActions tourId={t._id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginated.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No tours found</h3>
              <p className="text-slate-500">
                {query ? 'Try adjusting your search criteria.' : 'Create your first tour to get started.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Enhanced Cards View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginated.map((t) => (
            <div 
              key={t._id} 
              className="group bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Card Image */}
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                {t.image ? (
                  <Image 
                    src={t.image} 
                    alt={t.title || t.name || 'tour'} 
                    fill 
                    style={{ objectFit: 'cover' }} 
                    className="w-full h-full group-hover:scale-110 transition-transform duration-300" 
                  />
                ) : (
                  <div className="w-full h-full"><PlaceholderImg /></div>
                )}
                
                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {t.isFeatured && (
                    <Badge 
                      className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg" 
                      icon={Star}
                    >
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Price Overlay */}
                <div className="absolute bottom-3 right-3">
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-white/60">
                    <div className="text-lg font-bold text-slate-900">{formatPrice(t.discountPrice ?? t.price)}</div>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 space-y-4">
                {/* Title and Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link 
                      href={`/admin/tours/edit/${t._id}`} 
                      className="block text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate group-hover:text-indigo-600 mb-2"
                      title={t.title || t.name}
                    >
                      {t.title || t.name}
                    </Link>
                    
                    {/* Location and Category */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{t.destination?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{t.category?.name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <TourActions tourId={t._id} />
                  </div>
                </div>

                {/* Duration and Date */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="h-4 w-4" />
                    <span>{t.duration}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State for Cards */}
          {paginated.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">No tours found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {query ? 'Try adjusting your search criteria or browse all tours.' : 'Create your first tour to get started.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="text-sm text-slate-600 font-medium">
              Showing <span className="font-bold text-slate-900">{((page - 1) * perPage) + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * perPage, total)}</span> of{' '}
              <span className="font-bold text-slate-900">{total}</span> tours
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage((p) => Math.max(1, p - 1))} 
                disabled={page === 1} 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-slate-700 hover:text-slate-900 shadow-sm disabled:shadow-none"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        page === pageNum
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages} 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-slate-700 hover:text-slate-900 shadow-sm disabled:shadow-none"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
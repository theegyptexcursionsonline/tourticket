import React, { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchClient from './SearchClient';
import { Search, Filter } from 'lucide-react';

// Loading fallback component
const SearchFallback = () => (
  <div className="space-y-8">
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="animate-pulse space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 h-12 bg-slate-100 rounded-lg" />
          <div className="w-20 h-12 bg-slate-100 rounded-lg" />
          <div className="w-24 h-12 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-6 w-3/4 bg-slate-100 rounded" />
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md h-[380px] animate-pulse">
          <div className="w-full h-48 bg-slate-200 rounded-t-lg"></div>
          <div className="p-4 space-y-3">
            <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
            <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function SearchPage() {
  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Search size={32} className="text-red-600" />
              <h1 className="text-3xl font-bold text-slate-900">Search Tours</h1>
            </div>
            <p className="text-slate-600">
              Discover amazing tours and experiences around the world. Use filters to find exactly what you're looking for.
            </p>
          </div>

          <Suspense fallback={<SearchFallback />}>
            <SearchClient />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
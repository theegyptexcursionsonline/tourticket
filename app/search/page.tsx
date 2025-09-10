// app/search/page.tsx
import React, { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchClient from './SearchClient'; // direct import of client component

export default function SearchPage() {
  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <Suspense
            fallback={
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <div className="animate-pulse h-12 w-full bg-slate-100 rounded" />
                <div className="mt-4 space-y-2">
                  <div className="h-6 w-3/4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-6 w-1/2 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            }
          >
            <SearchClient />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

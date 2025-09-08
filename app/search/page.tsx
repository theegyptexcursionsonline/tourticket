// app/search/page.tsx
import React, { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';

// Dynamically import the client component to ensure it loads on the client side.
// dynamic() with { ssr: false } is optional here because the component is a client component,
// but using Suspense is recommended for graceful fallback while the client bundle loads.
// Alternatively you can regular-import SearchClient and wrap in <Suspense>.
const SearchClient = dynamic(() => import('./SearchClient'), { ssr: false });

export default function SearchPage() {
  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Wrap client UI in a Suspense fallback. The dynamic import above disables server rendering for the client component. */}
          <Suspense fallback={
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="animate-pulse h-12 w-full bg-slate-100 rounded" />
            </div>
          }>
            <SearchClient />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

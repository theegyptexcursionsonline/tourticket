'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Favorite Tours</h1>
            
            <div className="text-center py-12">
              <Heart size={64} className="text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-700 mb-2">No favorites yet</h2>
              <p className="text-slate-500 mb-6">Save tours you love to find them easily later!</p>
              <a
                href="/search"
                className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Discover Tours
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </ProtectedRoute>
  );
}
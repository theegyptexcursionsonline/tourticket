'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

export default function BookingsPage() {
  return (
    <ProtectedRoute>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">My Bookings</h1>
            
            <div className="text-center py-12">
              <Calendar size={64} className="text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-700 mb-2">No bookings yet</h2>
              <p className="text-slate-500 mb-6">Start exploring and book your first adventure!</p>
              <a
                href="/search"
                className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Browse Tours
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </ProtectedRoute>
  );
}
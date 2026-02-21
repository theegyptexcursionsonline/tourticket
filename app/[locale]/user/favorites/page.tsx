'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import FavoritesClientPage from './FavoritesClientPage';

// This is the main server component for the route.
// It ensures the user is authenticated and sets up the page layout.
export default function FavoritesPage() {
  return (
    <ProtectedRoute>
        {/* The client page handles all the dynamic wishlist logic */}
        <FavoritesClientPage />
    </ProtectedRoute>
  );
}

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, ShoppingCart, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import { Tour, Category, CartItem } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import BookingSidebar from '@/components/BookingSidebar';

// --- Tour Card Component ---
const TourCard = ({ tour, onAddToCartClick }: { tour: Tour; onAddToCartClick: (tour: Tour) => void; }) => {
  const { formatPrice } = useSettings();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col group">
      <div className="relative">
        <Link href={`/tour/${tour.slug}`}>
          <Image
            src={tour.image}
            alt={tour.title}
            width={400}
            height={250}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
          />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            onAddToCartClick(tour);
          }}
          className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full hover:bg-white transition-colors hover:scale-110"
          aria-label="Add to cart"
        >
          <ShoppingCart size={16} className="text-red-600" />
        </button>
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2 flex-grow">
          <Link href={`/tour/${tour.slug}`} className="hover:text-red-600 transition-colors">
            {tour.title}
          </Link>
        </h3>
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
          <div className="flex items-center gap-1"><Clock size={14} /><span>{tour.duration}</span></div>
          <div className="flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-current" /><span>{tour.rating}</span></div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div>
            {tour.originalPrice && (
              <span className="text-slate-500 line-through text-sm mr-2">{formatPrice(tour.originalPrice)}</span>
            )}
            <span className="text-xl font-bold text-red-600">{formatPrice(tour.discountPrice)}</span>
          </div>
          <Link href={`/tour/${tour.slug}`} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};


export default function CategoryPageClient({ category, categoryTours }: { category: Category; categoryTours: Tour[] }) {
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);

    const handleTourSelect = (tour: Tour) => {
        setSelectedTour(tour);
        setBookingSidebarOpen(true);
    };

    const closeSidebar = () => {
        setBookingSidebarOpen(false);
        setTimeout(() => setSelectedTour(null), 300);
    };

    return (
        <>
            <Header startSolid />
            <main className="min-h-screen bg-slate-50 pt-20">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-2">{category.name}</h1>
                            <p className="text-slate-600 max-w-2xl mx-auto">{category.description}</p>
                        </div>
                        
                        {categoryTours.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                {categoryTours.map(tour => (<TourCard key={tour._id} tour={tour} onAddToCartClick={handleTourSelect} />))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">😢</div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Tours Found</h3>
                                <p className="text-slate-500 mb-4">There are currently no tours available in the "{category.name}" category.</p>
                                <div className="flex gap-4 justify-center">
                                    <Link href="/search" className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                                        Explore All Tours
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />

            {/* AI Search Widget */}
            <AISearchWidget />

            <BookingSidebar
                isOpen={isBookingSidebarOpen}
                onClose={closeSidebar}
                tour={selectedTour}
            />
        </>
    );
}

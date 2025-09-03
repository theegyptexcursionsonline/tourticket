'use client';

import { useState } from 'react';
import { ArrowRight, Star, PlusCircle } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import BookingSidebar from './BookingSidebar';
import { Tour } from '@/types';

const featuredTours: Tour[] = [
  { id: 1, image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=1966&auto=format&fit=crop', title: '1 hour Amsterdam Canal Cruise', duration: '60 minutes', rating: 4.5, bookings: 4506416, originalPrice: 20, discountPrice: 15.50, tags: ['Online only deal', 'Staff favourite', '-25%'] },
  { id: 2, image: 'https://images.unsplash.com/photo-1512470876302-9722238a3a02?q=80&w=2072&auto=format&fit=crop', title: 'New York Pizza by LOVERS Canal Cruise', duration: '75 minutes', rating: 4.6, bookings: 21080, originalPrice: 43.50, discountPrice: 37.50, tags: ['-15%'] },
  { id: 3, image: 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?q=80&w=2070&auto=format&fit=crop', title: 'Amsterdam Evening & Night Boat Tour', duration: '60 minutes', rating: 4.5, bookings: 1256854, originalPrice: 20, discountPrice: 15.50, tags: ['Staff favourite', '-25%'] },
  { id: 4, image: 'https://images.unsplash.com/photo-1596201732943-ae62bfdfc088?q=80&w=1974&auto=format&fit=crop', title: 'Wine & Cheese Cruise in Amsterdam', duration: '90 minutes', rating: 4.9, bookings: 10245, originalPrice: 38.50, discountPrice: 35, tags: ['New', '-10%'] },
  { id: 5, image: 'https://images.unsplash.com/photo-1588803120668-5a52a41d5568?q=80&w=2070&auto=format&fit=crop', title: 'Amsterdam Dinner Cruise', duration: '2 hours', rating: 4.8, bookings: 5008, discountPrice: 89, tags: ['Staff favourite'] },
  { id: 6, image: 'https://images.unsplash.com/photo-1525875263473-b3a21358b5c1?q=80&w=1974&auto=format&fit=crop', title: 'Pancake Cruise Amsterdam', duration: '75 minutes', rating: 4.8, bookings: 11859, discountPrice: 26, tags: [] },
];

const TourCard = ({ tour, onAddToCartClick }: { tour: Tour, onAddToCartClick: (tour: Tour) => void }) => {
  const { formatPrice } = useSettings();

  const formatBookings = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'm';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toString();
  };
  
  const getTagColor = (tag: string) => {
    if (tag.includes('%')) return 'bg-red-500 text-white';
    if (tag === 'Staff favourite') return 'bg-blue-500 text-white';
    if (tag === 'Online only deal') return 'bg-green-500 text-white';
    if (tag === 'New') return 'bg-purple-500 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  return (
    <div className="flex-shrink-0 w-80 bg-white rounded-xl shadow-lg overflow-hidden snap-start transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group">
      <div className="relative">
        <img src={tour.image} alt={tour.title} className="w-full h-40 object-cover" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {tour.tags.map(tag => (
            <span key={tag} className={`px-2 py-1 text-xs font-bold rounded-md ${getTagColor(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
        <button 
          onClick={() => onAddToCartClick(tour)}
          className="absolute bottom-2 right-2 bg-slate-800 text-white p-2 rounded-full transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500 hover:scale-110"
        >
          <PlusCircle size={24} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
           <div className="flex items-center gap-2 text-sm text-gray-500">
             <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-500 fill-current" />
                <span className="font-bold">{tour.rating}</span>
             </div>
             <span>({formatBookings(tour.bookings)} bookings)</span>
           </div>
           <span className="text-sm text-gray-500">{tour.duration}</span>
        </div>
        <h3 className="mt-2 text-lg font-bold text-gray-800 h-14">{tour.title}</h3>
        <div className="mt-4 flex items-end justify-end gap-2">
            {tour.originalPrice && (
                <span className="text-gray-500 line-through">{formatPrice(tour.originalPrice)}</span>
            )}
            <span className="text-2xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
    </div>
  );
};

export default function FeaturedTours() {
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  const handleAddToCartClick = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };
  
  const closeSidebar = () => {
    setBookingSidebarOpen(false);
    setSelectedTour(null);
  }

  return (
    <>
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">Canal Cruises perfect for you</h2>
              <button className="flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors">
                  <span>SEE ALL</span>
                  <ArrowRight size={20} />
              </button>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {featuredTours.map(tour => (
                  <TourCard key={tour.id} tour={tour} onAddToCartClick={handleAddToCartClick} />
              ))}
          </div>
        </div>
      </section>
      <BookingSidebar 
        isOpen={isBookingSidebarOpen} 
        onClose={closeSidebar} 
        tour={selectedTour} 
      />
    </>
  );
}


'use client';

import React, { useState } from 'react';
import { ArrowRight, Star, ShoppingCart, Clock, Users, X } from 'lucide-react';

// --- Type Definitions (as per original structure) ---
type Tour = {
  id: number;
  image: string;
  title: string;
  duration: string;
  rating: number;
  bookings: number;
  originalPrice?: number;
  discountPrice: number;
  tags: string[];
};

// --- Mock Data & Hooks (for standalone functionality) ---
const featuredTours: Tour[] = [
  { id: 1, image: '/images2/1.png', title: '1-Hour Amsterdam Canal Cruise', duration: '60 minutes', rating: 4.5, bookings: 4506416, originalPrice: 20, discountPrice: 15.50, tags: ['Online only deal', 'Staff favourite', '-25%'] },
  { id: 2, image: '/images2/2.png', title: 'New York Pizza by LOVERS Canal Cruise', duration: '75 minutes', rating: 4.6, bookings: 21080, originalPrice: 43.50, discountPrice: 37.50, tags: ['-15%'] },
  { id: 3, image: '/images2/3.png', title: 'Amsterdam Evening & Night Boat Tour', duration: '60 minutes', rating: 4.5, bookings: 1256854, originalPrice: 20, discountPrice: 15.50, tags: ['Staff favourite', '-25%'] },
  { id: 4, image: '/images2/4.png', title: 'Wine & Cheese Cruise in Amsterdam', duration: '90 minutes', rating: 4.9, bookings: 10245, originalPrice: 38.50, discountPrice: 35, tags: ['New', '-10%'] },
  { id: 5, image: '/images2/5.png', title: 'Exclusive Amsterdam Dinner Cruise', duration: '2 hours', rating: 4.8, bookings: 5008, discountPrice: 89, tags: ['Staff favourite'] },
  { id: 6, image: '/images2/6.png', title: 'Family-Friendly Pancake Cruise', duration: '75 minutes', rating: 4.8, bookings: 11859, discountPrice: 26, tags: ['Best for Kids'] },
];

// Mock hook to provide formatting settings
const useSettings = () => ({
  formatPrice: (price: number) => `$${price.toFixed(2)}`,
});

// Mock Sidebar component for a complete experience
const BookingSidebar = ({ isOpen, onClose, tour }: { isOpen: boolean; onClose: () => void; tour: Tour | null }) => {
  if (!isOpen || !tour) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-40 transition-opacity animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Your Booking</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="flex-grow p-6 overflow-y-auto">
          <img src={tour.image} alt={tour.title} className="w-full h-48 object-cover rounded-lg mb-4" />
          <h3 className="text-xl font-bold text-gray-900">{tour.title}</h3>
          <p className="text-gray-600 mt-2">Added to your cart. Proceed to checkout to complete your booking.</p>
        </div>
        <div className="p-6 border-t bg-gray-50">
          <button className="w-full bg-red-600 text-white font-bold py-4 rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </>
  );
};


// --- Refined Tour Card Component ---
const TourCard = ({ tour, onAddToCartClick }: { tour: Tour; onAddToCartClick: (tour: Tour) => void }) => {
  const { formatPrice } = useSettings();

  const formatBookings = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k`;
    return num.toString();
  };

  const getTagColor = (tag: string) => {
    if (tag.includes('%')) return 'bg-red-500 text-white';
    if (tag === 'Staff favourite') return 'bg-blue-500 text-white';
    if (tag === 'Online only deal') return 'bg-green-600 text-white';
    if (tag === 'New') return 'bg-purple-500 text-white';
    if (tag === 'Best for Kids') return 'bg-yellow-500 text-black';
    return 'bg-gray-200 text-gray-800';
  };

  return (
    <div className="flex-shrink-0 w-[340px] bg-white rounded-2xl shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group">
      <div className="relative">
        <img src={tour.image} alt={tour.title} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {tour.tags.map(tag => (
            <span key={tag} className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${getTagColor(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
        <button 
          onClick={() => onAddToCartClick(tour)}
          className="absolute bottom-3 right-3 bg-black/50 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-300 hover:bg-red-600 hover:scale-110 hover:rotate-12"
          aria-label="Add to cart"
        >
          <ShoppingCart size={20} />
        </button>
      </div>
      <div className="p-5 flex flex-col h-[180px]">
        <h3 className="text-lg font-bold text-gray-800 leading-snug flex-grow line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-500 my-3">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-gray-400"/>
            <span>{tour.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-gray-400"/>
            <span>{formatBookings(tour.bookings)} booked</span>
          </div>
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div className="flex items-center gap-1.5 text-yellow-500">
            <Star size={18} className="fill-current" />
            <span className="font-bold text-base text-gray-700">{tour.rating.toFixed(1)}</span>
          </div>
          <div className="text-right">
             <span className="text-2xl font-extrabold text-gray-900">{formatPrice(tour.discountPrice)}</span>
            {tour.originalPrice && (
              <span className="ml-1.5 text-sm text-gray-500 line-through">{formatPrice(tour.originalPrice)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Main Component ---
export default function FeaturedTours() {
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  const handleAddToCartClick = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };
  
  const closeSidebar = () => {
    setBookingSidebarOpen(false);
    setTimeout(() => setSelectedTour(null), 300); // Delay clearing tour to allow for exit animation
  }
  
  // Duplicate tours for seamless animation
  const duplicatedTours = [...featuredTours, ...featuredTours];

  return (
    <>
      <section className="bg-gray-50 py-20 font-sans">
        <div className="container mx-auto">
          <div className="flex justify-between items-end mb-10 px-4">
            <div>
              <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Canal Cruises Perfect For You</h2>
              <p className="mt-2 text-lg text-gray-600">Discover top-rated experiences in Amsterdam, handpicked by our travel experts.</p>
            </div>
            <button className="flex-shrink-0 flex items-center gap-2 bg-red-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-0.5">
              <span>See all tours</span>
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="relative w-full overflow-hidden group py-8">
            <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
              {duplicatedTours.map((tour, index) => (
                <div key={`${tour.id}-${index}`} className="flex-shrink-0 px-4">
                  <TourCard tour={tour} onAddToCartClick={handleAddToCartClick} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      <BookingSidebar 
        isOpen={isBookingSidebarOpen} 
        onClose={closeSidebar} 
        tour={selectedTour} 
      />
      
      {/* Global Styles & Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        
        .font-sans {
          font-family: 'Poppins', sans-serif;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </>
  );
}


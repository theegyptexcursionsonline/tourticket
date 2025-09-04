'use client';

import React, { useState } from 'react';
import { ArrowRight, Star, ShoppingCart, Clock, Users, X } from 'lucide-react';
import Image from 'next/image';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import BookingSidebar from '@/components/BookingSidebar';

// --- Mock Data with proper Tour interface ---
const featuredTours: Tour[] = [
  { 
    id: 'amsterdam-canal-cruise',
    image: '/images2/1.png', 
    title: '1-Hour Amsterdam Canal Cruise', 
    duration: '60 minutes', 
    rating: 4.5, 
    bookings: 4506416, 
    originalPrice: 20, 
    discountPrice: 15.50, 
    tags: ['Online only deal', 'Staff favourite', '-25%'],
    description: 'Experience Amsterdam from a unique perspective with our 1-hour canal cruise.',
    highlights: [
      'See the famous canal houses and bridges',
      'Audio guide available in multiple languages',
      'Perfect for first-time visitors',
      'Departs from a central location'
    ]
  },
  { 
    id: 'pizza-lovers-cruise',
    image: '/images2/2.png', 
    title: 'New York Pizza by LOVERS Canal Cruise', 
    duration: '75 minutes', 
    rating: 4.6, 
    bookings: 21080, 
    originalPrice: 43.50, 
    discountPrice: 37.50, 
    tags: ['-15%'],
    description: 'Combine delicious New York-style pizza with a scenic Amsterdam canal cruise.',
    highlights: [
      'Fresh New York-style pizza on board',
      'Scenic canal views',
      'Perfect lunch or dinner option',
      'Unique dining experience'
    ]
  },
  { 
    id: 'evening-night-cruise',
    image: '/images2/3.png', 
    title: 'Amsterdam Evening & Night Boat Tour', 
    duration: '60 minutes', 
    rating: 4.5, 
    bookings: 1256854, 
    originalPrice: 20, 
    discountPrice: 15.50, 
    tags: ['Staff favourite', '-25%'],
    description: 'See Amsterdam illuminated at night on this magical evening canal cruise.',
    highlights: [
      'Beautiful city lights reflection on water',
      'Romantic evening atmosphere',
      'Historic canal district at night',
      'Professional commentary'
    ]
  },
  { 
    id: 'wine-cheese-cruise',
    image: '/images2/4.png', 
    title: 'Wine & Cheese Cruise in Amsterdam', 
    duration: '90 minutes', 
    rating: 4.9, 
    bookings: 10245, 
    originalPrice: 38.50, 
    discountPrice: 35, 
    tags: ['New', '-10%'],
    description: 'Indulge in premium Dutch cheeses and fine wines while cruising Amsterdam\'s canals.',
    highlights: [
      'Selection of Dutch cheeses',
      'Premium wine selection',
      'Expert sommelier guidance',
      'Scenic canal views'
    ]
  },
  { 
    id: 'exclusive-dinner-cruise',
    image: '/images2/5.png', 
    title: 'Exclusive Amsterdam Dinner Cruise', 
    duration: '2 hours', 
    rating: 4.8, 
    bookings: 5008, 
    discountPrice: 89, 
    tags: ['Staff favourite'],
    description: 'An exclusive dining experience aboard a luxury canal cruise vessel.',
    highlights: [
      'Multi-course gourmet dinner',
      'Luxury boat with panoramic windows',
      'Professional service',
      'Romantic atmosphere'
    ]
  },
  { 
    id: 'family-pancake-cruise',
    image: '/images2/6.png', 
    title: 'Family-Friendly Pancake Cruise', 
    duration: '75 minutes', 
    rating: 4.8, 
    bookings: 11859, 
    discountPrice: 26, 
    tags: ['Best for Kids'],
    description: 'Perfect for families - enjoy traditional Dutch pancakes while cruising the canals.',
    highlights: [
      'Traditional Dutch pancakes',
      'Kid-friendly atmosphere',
      'Educational canal commentary',
      'Great for all ages'
    ]
  },
];

// --- Coming Soon Modal Component ---
const ComingSoonModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full relative transform transition-all duration-300 scale-95 opacity-0 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors">
          <X size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Coming Soon!</h2>
          <p className="text-gray-600 mb-6">
            This feature is currently under development. Stay tuned for new and exciting updates!
          </p>
          <button onClick={onClose} className="w-full bg-red-600 text-white font-semibold py-3 rounded-md hover:bg-red-700 transition-colors">
            Close
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>
    </div>
  );
};

// --- Tour Card Component (Enhanced & Clickable) ---
const TourCard = ({ tour, onCardClick, onAddToCartClick }: { tour: Tour; onCardClick: (tour: Tour) => void; onAddToCartClick: (tour: Tour) => void }) => {
  const { formatPrice } = useSettings();

  const formatBookings = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k`;
    return num.toString();
  };

  const getTagColor = (tag: string) => {
    if (tag.includes('%')) return 'bg-red-600 text-white';
    if (tag === 'Staff favourite') return 'bg-blue-600 text-white';
    if (tag === 'Online only deal') return 'bg-emerald-600 text-white';
    if (tag === 'New') return 'bg-purple-600 text-white';
    if (tag === 'Best for Kids') return 'bg-yellow-500 text-black';
    return 'bg-gray-200 text-gray-800';
  };

  return (
    <a 
      href="#" 
      onClick={(e) => {
        e.preventDefault();
        onCardClick(tour);
      }}
      className="block flex-shrink-0 w-[340px] bg-white shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
    >
      <div className="relative">
        <Image 
          src={tour.image} 
          alt={tour.title} 
          width={340}
          height={192}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" 
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {tour.tags?.map(tag => (
            <span key={tag} className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full shadow-sm ${getTagColor(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
        <button 
          onClick={(e) => {
            e.preventDefault(); 
            e.stopPropagation(); // Prevents the parent 'a' tag from being clicked
            onAddToCartClick(tour);
          }}
          className="absolute bottom-4 right-4 bg-white/70 backdrop-blur-sm text-gray-800 p-2.5 rounded-full transition-all duration-300 hover:bg-red-600 hover:text-white hover:scale-110"
          aria-label="Add to cart"
        >
          <ShoppingCart size={22} />
        </button>
      </div>
      <div className="p-5 flex flex-col h-[180px]">
        <h3 className="text-xl font-bold text-gray-900 leading-snug flex-grow line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-500 my-3">
          <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-gray-400"/>
            <span className="font-medium">{tour.duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-gray-400"/>
            <span className="font-medium">{formatBookings(tour.bookings || 0)} booked</span>
          </div>
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div className="flex items-center gap-1.5 text-yellow-500">
            <Star size={20} className="fill-current" />
            <span className="font-bold text-lg text-gray-800">{tour.rating?.toFixed(1)}</span>
          </div>
          <div className="text-right">
             <span className="text-3xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
            {tour.originalPrice && (
              <span className="ml-2 text-base font-normal text-gray-500 line-through">{formatPrice(tour.originalPrice)}</span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
};

// --- Main Component ---
export default function FeaturedTours() {
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddToCartClick = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };
  
  const closeSidebar = () => {
    setBookingSidebarOpen(false);
    setTimeout(() => setSelectedTour(null), 300);
  };

  const handleCardClick = () => {
    setIsModalOpen(true);
  };
  
  // Duplicate tours for seamless animation
  const duplicatedTours = [...featuredTours, ...featuredTours];

  return (
    <>
      <section className="bg-white py-20 font-sans">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
            <div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Canal Cruises Perfect For You</h2>
              <p className="mt-2 text-lg text-gray-600 max-w-2xl">Discover top-rated experiences in Amsterdam, handpicked by our travel experts.</p>
            </div>
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleCardClick();
              }}
              className="flex-shrink-0 mt-6 sm:mt-0 flex items-center gap-2 bg-red-600 text-white font-semibold px-6 py-3 shadow-md hover:bg-red-700 transition-all duration-300"
            >
              <span>See all tours</span>
              <ArrowRight size={20} />
            </a>
          </div>

          <div className="relative w-full overflow-hidden group py-8">
            <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
              {duplicatedTours.map((tour, index) => (
                <div key={`${tour.id}-${index}`} className="flex-shrink-0 px-4">
                  <TourCard 
                    tour={tour} 
                    onCardClick={handleCardClick} 
                    onAddToCartClick={handleAddToCartClick}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Conditionally render the new modal */}
      <BookingSidebar 
        isOpen={isBookingSidebarOpen} 
        onClose={closeSidebar} 
        tour={selectedTour} 
      />

      <ComingSoonModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
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
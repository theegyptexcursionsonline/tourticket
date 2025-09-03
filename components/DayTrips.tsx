'use client';

import React, { useRef, useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Heart, X, ShoppingCart } from 'lucide-react';

// --- Type Definitions ---
type DayTrip = {
  title: string;
  duration: string;
  bookings: number;
  rating: number;
  oldPrice?: number;
  newPrice: number;
  discount?: string;
  image: string;
  tags: string[];
};

// --- Mock Data with new, high-quality images ---
const dayTrips: DayTrip[] = [
    { title: 'Countryside & Windmills Tour from Amsterdam', duration: '6 hours', bookings: 20568, rating: 4.4, oldPrice: 59, newPrice: 37.50, discount: '-35%', image: '/images/6.png', tags: ['Operated by Egypt Excursions Online', 'Staff favourite'], },
    { title: 'Zaanse Schans, Marken, Edam & Volendam Day Trip', duration: '7.5 hours', bookings: 8153, rating: 4.7, oldPrice: 66.50, newPrice: 45, discount: '-30%', image: '/images/7.png', tags: ['Operated by Egypt Excursions Online', 'Best deal'], },
    { title: 'Fairytale Giethoorn & Zaanse Schans Tour', duration: '9 hours', bookings: 10831, rating: 4.6, oldPrice: 89, newPrice: 79, discount: '-10%', image: '/images/8.png', tags: ['Operated by Egypt Excursions Online', 'Staff favourite'], },
    { title: 'Rotterdam, Delft & The Hague incl. Madurodam', duration: '9 hours', bookings: 3568, rating: 4.9, oldPrice: 89, newPrice: 79, discount: '-10%', image: '/images/9.png', tags: ['Operated by Egypt Excursions Online', 'Staff favourite'], },
    { title: 'Full Day Trip to the Medieval City of Bruges', duration: '12 hours', bookings: 5179, rating: 4.7, newPrice: 79, image: '/images/10.png', tags: ['Operated by Egypt Excursions Online'], },
];

// Mock hook for price formatting
const useSettings = () => ({
  formatPrice: (price: number) => `$${price.toFixed(2)}`,
});

// Standalone BookingSidebar component
const BookingSidebar = ({ isOpen, onClose, tour }: { isOpen: boolean; onClose: () => void; tour: DayTrip | null }) => {
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


// --- Refined Day Trip Card Component ---
const DayTripCard = ({ trip, onAddToCartClick }: { trip: DayTrip; onAddToCartClick: (trip: DayTrip) => void; }) => {
    const { formatPrice } = useSettings();
    return (
    <div className="flex-shrink-0 w-[270px] bg-white rounded-xl shadow-lg overflow-hidden snap-start group transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
        <div className="relative">
            <img src={trip.image} alt={trip.title} className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105" />
            {trip.discount && <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">{trip.discount}</div>}
            <button className="absolute top-3 right-3 bg-white/80 p-2 rounded-full text-slate-600 backdrop-blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-white">
                <Heart size={20} />
            </button>
             <button 
                onClick={() => onAddToCartClick(trip)}
                className="absolute bottom-3 right-3 bg-red-600 text-white p-2.5 rounded-full shadow-lg transform translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-in-out hover:bg-red-700 hover:scale-110"
                aria-label="Add to cart"
             >
                <ShoppingCart size={20} />
            </button>
        </div>
        <div className="p-4 flex flex-col h-[180px]">
            <h3 className="font-bold text-base text-slate-800 transition-colors group-hover:text-red-600 line-clamp-2 flex-grow">{trip.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{trip.duration}</p>
            <div className="flex items-center mt-2 text-sm">
                <div className="flex items-center text-yellow-500">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold text-slate-800 ml-1">{trip.rating}</span>
                </div>
                <span className="text-slate-500 ml-2">({trip.bookings.toLocaleString()})</span>
            </div>
            <div className="flex items-baseline justify-end mt-auto pt-2">
                {trip.oldPrice && <span className="text-slate-500 line-through mr-2">{formatPrice(trip.oldPrice)}</span>}
                <span className="font-extrabold text-2xl text-slate-900">{formatPrice(trip.newPrice)}</span>
            </div>
        </div>
    </div>
)};


// --- Main Component ---
export default function DayTripsSection() {
    const scrollContainer = useRef<HTMLDivElement>(null);
    const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
    const [selectedTour, setSelectedTour] = useState<DayTrip | null>(null);

    const handleAddToCartClick = (tour: DayTrip) => {
        setSelectedTour(tour);
        setBookingSidebarOpen(true);
    };
    
    const closeSidebar = () => {
        setBookingSidebarOpen(false);
        setTimeout(() => setSelectedTour(null), 300); // Delay clearing tour for animation
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainer.current) {
            const scrollAmount = direction === 'left' ? -294 : 294; // Card width (270) + gap (24)
            scrollContainer.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };
    
    return (
        <>
            <section className="bg-slate-50 py-20 font-sans">
                <div className="container mx-auto">
                    <div className="flex justify-between items-center mb-8 px-4">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Best Deals on Tours from Amsterdam</h2>
                            <p className="mt-2 text-lg text-slate-600">Explore beyond the city with these top-rated day trips, all with exclusive online discounts.</p>
                        </div>
                        <div className="hidden md:flex gap-3">
                            <button onClick={() => scroll('left')} className="bg-white p-3 rounded-full shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600"><ChevronLeft size={20}/></button>
                            <button onClick={() => scroll('right')} className="bg-white p-3 rounded-full shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600"><ChevronRight size={20}/></button>
                        </div>
                    </div>
                    <div ref={scrollContainer} className="flex gap-6 overflow-x-auto pb-4 scroll-smooth" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
                        <div className="flex-shrink-0 w-1"></div> {/* Left padding */}
                        {dayTrips.map(trip => <DayTripCard key={trip.title} trip={trip} onAddToCartClick={handleAddToCartClick} />)}
                        <div className="flex-shrink-0 w-1"></div> {/* Right padding */}
                    </div>
                    <div className="text-center mt-12">
                        <button className="bg-red-600 text-white font-bold py-3.5 px-10 rounded-full text-base hover:bg-red-700 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg">
                            SEE ALL DAY TRIPS FROM AMSTERDAM
                        </button>
                    </div>
                </div>
            </section>
            <BookingSidebar 
                isOpen={isBookingSidebarOpen} 
                onClose={closeSidebar} 
                tour={selectedTour} 
            />
            {/* Global Styles */}
            <style jsx global>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }

                @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .animate-slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
                
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;  
                    overflow: hidden;
                }
            `}</style>
        </>
    );
}


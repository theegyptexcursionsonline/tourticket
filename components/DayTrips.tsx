'use client';

import React, { useRef, useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Heart, ShoppingCart } from 'lucide-react';
import BookingSidebar from '@/components/BookingSidebar';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';

// --- Mock Data with Tour interface compatibility ---
const dayTrips: Tour[] = [
    { 
        id: 'countryside-windmills-tour',
        title: 'Countryside & Windmills Tour from Amsterdam', 
        duration: '6 hours', 
        bookings: 20568, 
        rating: 4.4, 
        originalPrice: 59, 
        
        discountPrice: 37.50, 
        image: '/images/6.png', 
        tags: ['Egypt Excursions Online', 'Staff favourite', '-35%'],
        description: 'Explore the beautiful Dutch countryside and visit traditional windmills on this full-day tour from Amsterdam.',
        highlights: [
            'Visit authentic working windmills',
            'Explore picturesque Dutch countryside',
            'Learn about traditional Dutch culture',
            'Professional tour guide included'
        ]
    },
    { 
        id: 'zaanse-schans-day-trip',
        title: 'Zaanse Schans, Marken, Edam & Volendam Day Trip', 
        duration: '7.5 hours', 
        bookings: 8153, 
        rating: 4.7, 
        originalPrice: 66.50, 
        discountPrice: 45, 
        image: '/images/7.png', 
        tags: ['Egypt Excursions Online', 'Best deal', '-30%'],
        description: 'Visit the most charming villages near Amsterdam including Zaanse Schans, Marken, Edam, and Volendam.',
        highlights: [
            'Traditional windmills at Zaanse Schans',
            'Cheese tasting in Edam',
            'Fishing village of Volendam',
            'Traditional wooden houses in Marken'
        ]
    },
    { 
        id: 'giethoorn-zaanse-schans-tour',
        title: 'Fairytale Giethoorn & Zaanse Schans Tour', 
        duration: '9 hours', 
        bookings: 10831, 
        rating: 4.6, 
        originalPrice: 89, 
        discountPrice: 79, 
        image: '/images/8.png', 
        tags: ['Egypt Excursions Online', 'Staff favourite', '-10%'],
        description: 'Discover the fairy-tale village of Giethoorn and the historic windmills of Zaanse Schans.',
        highlights: [
            'Venice of the North - Giethoorn',
            'Traditional windmills',
            'Canal boat ride',
            'Historic Dutch villages'
        ]
    },
    { 
        id: 'rotterdam-delft-hague-tour',
        title: 'Rotterdam, Delft & The Hague incl. Madurodam', 
        duration: '9 hours', 
        bookings: 3568, 
        rating: 4.9, 
        originalPrice: 89, 
        discountPrice: 79, 
        image: '/images/9.png', 
        tags: ['Egypt Excursions Online', 'Staff favourite', '-10%'],
        description: 'Explore three iconic Dutch cities in one day, including the miniature park Madurodam.',
        highlights: [
            'Modern architecture in Rotterdam',
            'Historic Delft pottery',
            'Dutch government buildings in The Hague',
            'Madurodam miniature park'
        ]
    },
    { 
        id: 'bruges-day-trip',
        title: 'Full Day Trip to the Medieval City of Bruges', 
        duration: '12 hours', 
        bookings: 5179, 
        rating: 4.7, 
        discountPrice: 79, 
        image: '/images/10.png', 
        tags: ['Egypt Excursions Online'],
        description: 'Step back in time with a visit to the medieval city of Bruges, Belgium.',
        highlights: [
            'Medieval architecture',
            'Famous Belgian chocolates',
            'Historic market square',
            'Canal boat ride through Bruges'
        ]
    },
];

// --- Day Trip Card Component ---
const DayTripCard = ({ trip, onAddToCartClick }: { trip: Tour; onAddToCartClick: (trip: Tour) => void; }) => {
    const { formatPrice } = useSettings();
    
    return (
        <div className="flex-shrink-0 w-[270px] bg-white rounded-xl shadow-lg overflow-hidden snap-start group transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
            <div className="relative">
                <img src={trip.image} alt={trip.title} className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105" />
                {trip.tags?.find(tag => tag.includes('%')) && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                        {trip.tags.find(tag => tag.includes('%'))}
                    </div>
                )}
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
                    <span className="text-slate-500 ml-2">({trip.bookings?.toLocaleString()})</span>
                </div>
                <div className="flex items-baseline justify-end mt-auto pt-2">
                    {trip.originalPrice && (
                        <span className="text-slate-500 line-through mr-2">{formatPrice(trip.originalPrice)}</span>
                    )}
                    <span className="font-extrabold text-2xl text-slate-900">{formatPrice(trip.discountPrice)}</span>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
export default function DayTripsSection() {
    const scrollContainer = useRef<HTMLDivElement>(null);
    const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

    const handleAddToCartClick = (tour: Tour) => {
        setSelectedTour(tour);
        setBookingSidebarOpen(true);
    };
    
    const closeSidebar = () => {
        setBookingSidebarOpen(false);
        setTimeout(() => setSelectedTour(null), 300);
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
                            <button onClick={() => scroll('left')} className="bg-white p-3 rounded-full shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600">
                                <ChevronLeft size={20}/>
                            </button>
                            <button onClick={() => scroll('right')} className="bg-white p-3 rounded-full shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600">
                                <ChevronRight size={20}/>
                            </button>
                        </div>
                    </div>
                    <div ref={scrollContainer} className="flex gap-6 overflow-x-auto pb-4 scroll-smooth" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
                        <div className="flex-shrink-0 w-1"></div> {/* Left padding */}
                        {dayTrips.map(trip => <DayTripCard key={trip.id} trip={trip} onAddToCartClick={handleAddToCartClick} />)}
                        <div className="flex-shrink-0 w-1"></div> {/* Right padding */}
                    </div>
                    <div className="text-center mt-12">
                        <button className="bg-red-600 text-white font-bold py-3.5 px-10 rounded-full text-base hover:bg-red-700 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg">
                            SEE ALL DAY TRIPS FROM AMSTERDAM
                        </button>
                    </div>
                </div>
            </section>
            
            {/* Use the proper BookingSidebar component */}
            <BookingSidebar 
                isOpen={isBookingSidebarOpen} 
                onClose={closeSidebar} 
                tour={selectedTour} 
            />
            
            {/* Global Styles */}
            <style jsx global>{`
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
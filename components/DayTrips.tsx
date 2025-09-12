// components/DayTrips.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Heart, ShoppingCart, Loader2 } from 'lucide-react';
import BookingSidebar from '@/components/BookingSidebar';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';

// --- Day Trip Card Component ---
const DayTripCard = ({ trip, onAddToCartClick }: { trip: Tour; onAddToCartClick: (trip: Tour) => void; }) => {
    const { formatPrice } = useSettings();
    
    return (
        <Link href={`/tour/${trip.slug}`} className="flex-shrink-0 w-[270px] bg-white rounded-xl shadow-lg overflow-hidden snap-start group transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
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
                    onClick={(e) => {
                        e.preventDefault();
                        onAddToCartClick(trip);
                    }}
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
        </Link>
    );
};

// --- Main Component ---
export default function DayTripsSection() {
    const scrollContainer = useRef<HTMLDivElement>(null);
    const [tours, setTours] = useState<Tour[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

    useEffect(() => {
        const fetchTours = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/admin/tours');
                if (!response.ok) {
                    throw new Error(`API call failed: ${response.statusText}`);
                }
                const data = await response.json();
                if (data.success) {
                    // **FIX: Correctly filter tours based on the category slug**
                    const dayTrips = data.data.filter((t: Tour) =>
                        t.categories && t.categories.some((cat: any) => cat.slug === 'day-trips')
                    );
                    setTours(dayTrips);
                } else {
                    console.error('API returned an error:', data.error);
                }
            } catch (error) {
                console.error('Failed to fetch tours:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTours();
    }, []);

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
    
    if (isLoading) {
        return (
            <section className="bg-slate-50 py-20 font-sans animate-pulse">
                <div className="container mx-auto">
                    <div className="flex justify-between items-center mb-8 px-4">
                        <div className="h-10 w-1/2 bg-slate-200 rounded-lg" />
                        <div className="flex gap-3">
                            <div className="h-10 w-10 bg-slate-200 rounded-full" />
                            <div className="h-10 w-10 bg-slate-200 rounded-full" />
                        </div>
                    </div>
                    <div className="flex gap-6 overflow-hidden px-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-[270px] h-[360px] bg-slate-200 rounded-xl" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }
    
    if (tours.length === 0) {
        // This will render nothing if no day trips are found, which is intended.
        return null;
    }

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
                    <div ref={scrollContainer} className="flex gap-6 overflow-x-auto pb-4 scroll-smooth px-4" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
                        {/* The empty divs for padding are not strictly necessary with container padding */}
                        {tours.map(trip => <DayTripCard key={trip._id} trip={trip} onAddToCartClick={handleAddToCartClick} />)}
                    </div>
                    <div className="text-center mt-12">
                        <Link href="/search" className="bg-red-600 text-white font-bold py-3.5 px-10 rounded-full text-base hover:bg-red-700 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg">
                            SEE ALL DAY TRIPS FROM AMSTERDAM
                        </Link>
                    </div>
                </div>
            </section>
            
            <BookingSidebar 
                isOpen={isBookingSidebarOpen} 
                onClose={closeSidebar} 
                tour={selectedTour} 
            />
            
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
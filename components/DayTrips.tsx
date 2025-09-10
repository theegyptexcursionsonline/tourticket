'use client';

import React, { useRef, useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Heart, ShoppingCart, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import BookingSidebar from '@/components/BookingSidebar';

// --- Mock Data with Tour interface compatibility ---
const dayTrips: Tour[] = [
    { 
        id: 'countryside-windmills-tour',
        title: 'Countryside & Windmills Tour from Amsterdam', 
        slug: 'countryside-windmills-tour',
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
        ],
        destinationId: 'amsterdam',
        categoryIds: ['day-trips', 'cultural']
    },
    { 
        id: 'zaanse-schans-day-trip',
        title: 'Zaanse Schans, Marken, Edam & Volendam Day Trip', 
        slug: 'zaanse-schans-day-trip',
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
        ],
        destinationId: 'amsterdam',
        categoryIds: ['day-trips', 'cultural']
    },
    { 
        id: 'giethoorn-zaanse-schans-tour',
        title: 'Fairytale Giethoorn & Zaanse Schans Tour', 
        slug: 'giethoorn-zaanse-schans-tour',
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
        ],
        destinationId: 'amsterdam',
        categoryIds: ['day-trips', 'cultural']
    },
    { 
        id: 'rotterdam-delft-hague-tour',
        title: 'Rotterdam, Delft & The Hague incl. Madurodam', 
        slug: 'rotterdam-delft-hague-tour',
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
        ],
        destinationId: 'amsterdam',
        categoryIds: ['day-trips', 'cultural']
    },
    { 
        id: 'bruges-day-trip',
        title: 'Full Day Trip to the Medieval City of Bruges', 
        slug: 'bruges-day-trip',
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
        ],
        destinationId: 'amsterdam',
        categoryIds: ['day-trips', 'cultural']
    },
];

// --- Day Trip Card Component ---
const DayTripCard = ({ trip, onAddToCartClick }: { trip: Tour; onAddToCartClick: (trip: Tour) => void; }) => {
    const { formatPrice } = useSettings();
    
    const getTagColor = (tag: string) => {
        if (tag.includes('%')) return 'bg-red-600 text-white';
        if (tag === 'Staff favourite') return 'bg-blue-600 text-white';
        if (tag === 'Best deal') return 'bg-emerald-600 text-white';
        return 'bg-gray-200 text-gray-800';
    };

    return (
        <a 
            href={`/tour/${trip.slug}`}
            className="flex-shrink-0 w-[270px] bg-white shadow-lg overflow-hidden snap-start transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group"
        >
            <div className="relative">
                <Image 
                    src={trip.image} 
                    alt={trip.title} 
                    width={270}
                    height={160}
                    className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                {trip.tags?.find(tag => tag.includes('%') || tag === 'Best deal') && (
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        {trip.tags.filter(tag => tag.includes('%') || tag === 'Best deal').map(tag => (
                            <span key={tag} className={`px-2.5 py-1 text-xs font-bold uppercase ${getTagColor(tag)}`}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                <button 
                    onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        onAddToCartClick(trip); 
                    }}
                    className="absolute bottom-4 right-4 bg-white/70 backdrop-blur-sm text-gray-800 p-2.5 rounded-full transition-all duration-300 hover:bg-red-600 hover:text-white hover:scale-110"
                    aria-label="Add to cart"
                >
                    <ShoppingCart size={22} />
                </button>
            </div>
            <div className="p-4 flex flex-col h-[180px]">
                <h3 className="font-bold text-lg text-slate-900 transition-colors group-hover:text-red-600 line-clamp-2 flex-grow">{trip.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{trip.duration}</p>
                <div className="flex items-center mt-2 text-sm">
                    <div className="flex items-center text-yellow-500">
                        <Star size={18} fill="currentColor" />
                        <span className="font-bold text-slate-800 ml-1">{trip.rating}</span>
                    </div>
                    <span className="text-slate-500 ml-2">({trip.bookings?.toLocaleString()})</span>
                </div>
                <div className="flex items-baseline justify-end mt-auto pt-2">
                    {trip.originalPrice && (
                        <span className="text-slate-500 line-through mr-2 text-base">{formatPrice(trip.originalPrice)}</span>
                    )}
                    <span className="font-extrabold text-2xl text-red-600">{formatPrice(trip.discountPrice)}</span>
                </div>
            </div>
        </a>
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
            <section className="bg-white py-20 font-sans">
                <div className="container mx-auto px-4 md:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Best Deals on Tours from Amsterdam</h2>
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
                        <a 
                            href="/destinations/amsterdam"
                            className="inline-flex justify-center items-center h-14 px-10 text-base font-bold text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 ease-in-out shadow-lg"
                        >
                            <span>SEE ALL DAY TRIPS FROM AMSTERDAM</span>
                        </a>
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
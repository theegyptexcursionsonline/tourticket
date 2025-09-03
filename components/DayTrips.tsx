'use client';
import { Star, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import React, { useRef } from 'react';
import { useSettings } from '@/hooks/useSettings';

const dayTrips = [
    { title: 'Countryside and windmills tour from Amsterdam', duration: '6 hours', bookings: 20568, rating: 4.4, oldPrice: 59, newPrice: 37.50, discount: '-35%', image: 'https://images.unsplash.com/photo-1528111494793-aa16557c1e6a?q=80&w=1974&auto=format&fit=crop', tags: ['Operated by Tours & Tickets', 'Staff favourite'], },
    { title: 'Zaanse Schans, Marken, Edam and Volendam Day Trip', duration: '7.5 hours', bookings: 8153, rating: 4.7, oldPrice: 66.50, newPrice: 45, discount: '-30%', image: 'https://images.unsplash.com/photo-1596305218539-e9328405d4a1?q=80&w=2070&auto=format&fit=crop', tags: ['Operated by Tours & Tickets', 'Best deal'], },
    { title: 'Giethoorn Tour', duration: '9 hours', bookings: 10831, rating: 4.6, oldPrice: 89, newPrice: 79, discount: '-10%', image: 'https://images.unsplash.com/photo-1595166649339-213f2a15f0d3?q=80&w=1964&auto=format&fit=crop', tags: ['Operated by Tours & Tickets', 'Staff favourite'], },
    { title: 'Rotterdam, Delft & The Hague incl. Madurodam', duration: '9 hours', bookings: 3568, rating: 4.9, oldPrice: 89, newPrice: 79, discount: '-10%', image: 'https://images.unsplash.com/photo-1592035314493-6c61f2518e3e?q=80&w=1974&auto=format&fit=crop', tags: ['Operated by Tours & Tickets', 'Staff favourite'], },
    { title: 'Bruges Tour', duration: '12 hours', bookings: 5179, rating: 4.7, newPrice: 79, image: 'https://images.unsplash.com/photo-1529680341776-5a4358521e1a?q=80&w=1974&auto=format&fit=crop', tags: ['Operated by Tours & Tickets'], },
];

const DayTripCard = ({ trip }: { trip: typeof dayTrips[0] }) => {
    const { formatPrice } = useSettings();
    return (
    <div className="flex-shrink-0 w-80 bg-white rounded-lg shadow-lg overflow-hidden snap-start group transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
        <div className="relative">
            <img src={trip.image} alt={trip.title} className="w-full h-48 object-cover" />
            {trip.discount && <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">{trip.discount}</div>}
             <button className="absolute top-3 right-3 bg-white/80 p-2 rounded-full text-slate-600 hover:text-red-500 hover:bg-white transition-all duration-300 opacity-0 group-hover:opacity-100">
                <Heart size={20} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                 <div className="flex gap-2 flex-wrap">
                    {trip.tags.map(tag => (
                        <span key={tag} className="bg-white/90 text-slate-800 text-xs font-semibold px-2 py-1 rounded-md">{tag}</span>
                    ))}
                </div>
            </div>
        </div>
        <div className="p-4">
            <h3 className="font-bold text-lg text-slate-800 truncate group-hover:text-red-500 transition-colors">{trip.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{trip.duration}</p>
            <div className="flex items-center mt-3 text-sm">
                <div className="flex items-center text-yellow-500">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold text-slate-800 ml-1">{trip.rating}</span>
                </div>
                <span className="text-slate-500 ml-2">({trip.bookings.toLocaleString()} bookings)</span>
            </div>
            <div className="flex items-baseline justify-end mt-4">
                {trip.oldPrice && <span className="text-slate-500 line-through mr-2">{formatPrice(trip.oldPrice)}</span>}
                <span className="font-extrabold text-2xl text-slate-900">{formatPrice(trip.newPrice)}</span>
            </div>
        </div>
    </div>
)};


export default function DayTrips() {
    const scrollContainer = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainer.current) {
            const scrollAmount = direction === 'left' ? -340 : 340;
            scrollContainer.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };
    
    return (
        <section className="bg-white py-16">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-800">Best deals on tours from Amsterdam</h2>
                     <div className="hidden md:flex gap-2">
                        <button onClick={() => scroll('left')} className="bg-white p-2 rounded-full shadow-md hover:bg-slate-100 transition-colors border border-slate-200"><ChevronLeft /></button>
                        <button onClick={() => scroll('right')} className="bg-white p-2 rounded-full shadow-md hover:bg-slate-100 transition-colors border border-slate-200"><ChevronRight /></button>
                    </div>
                </div>
                <div ref={scrollContainer} className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                    {dayTrips.map(trip => <DayTripCard key={trip.title} trip={trip} />)}
                </div>
                 <div className="text-center mt-12">
                    <button className="bg-red-600 text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-red-700 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg">
                        SEE ALL DAY TRIPS FROM AMSTERDAM
                    </button>
                </div>
            </div>
        </section>
    );
}

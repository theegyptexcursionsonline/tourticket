'use client';

import React, { useRef } from "react";
import Image from "next/image";
import { ArrowRight, Star, Tag, Clock, Users, ChevronLeft, ChevronRight, CheckCircle2, ShoppingCart, Award } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// =================================================================
// --- MOCK DATA FOR THE AMSTERDAM PAGE ---
// =================================================================

const top10Tours = [
    { id: 1, title: "1-hour Amsterdam Canal Cruise", price: 20.00, salePrice: 15.50, image: "/images2/1.png" },
    { id: 2, title: "Amsterdam Evening & Night Boat Tour", price: 20.00, salePrice: 15.50, image: "/images2/3.png" },
    { id: 3, title: "Countryside & Windmills Tour", price: 59.00, salePrice: 37.50, image: "/images/6.png" },
    { id: 4, title: "Amsterdam Icebar", price: 28.50, salePrice: 17.50, image: "/images/icebar.png" },
    { id: 5, title: "Van Gogh & Rembrandt in Amsterdam", price: 20.00, salePrice: 17.00, image: "/images/van-gogh-rembrandt.png" },
    { id: 6, title: "Ripley's Believe It or Not! Amsterdam", price: 25.00, salePrice: 22.50, image: "/images2/ripleys.png" },
    { id: 7, title: "BODY WORLDS Amsterdam", price: 25.00, salePrice: 22.50, image: "/images/body-worlds.png" },
    { id: 8, title: "Red Light Secrets - Museum of Prostitution", price: 17.00, salePrice: 14.50, image: "/images2/red-light.png" },
    { id: 9, title: "New York Pizza by LOVERS Canal Cruise", price: 43.50, salePrice: 37.50, image: "/images2/2.png" },
    { id: 10, title: "Giethoorn Tour from Amsterdam", price: 89.00, salePrice: 79.00, image: "/images/giethoorn.png" },
];

const interestCategories = [
    { name: 'KEUKENHOF TOURS', products: 12, icon: '/icons/keukenhof.svg' },
    { name: 'ATTRACTIONS', products: 35, icon: '/icons/attractions.svg' },
    { name: 'CANAL CRUISES', products: 15, icon: '/icons/canal-cruise.svg' },
    { name: 'MUSEUMS', products: 24, icon: '/icons/museum.svg' },
    { name: 'HOP-ON HOP-OFF', products: 5, icon: '/icons/hop-on-off.svg' },
    { name: 'BIKE TOURS', products: 8, icon: '/icons/bike-tours.svg' },
    { name: 'CITY PASS', products: 3, icon: '/icons/city-pass.svg' },
    { name: 'DAY TRIPS', products: 18, icon: '/icons/day-trips.svg' },
];

const combiDeals = [
    { id: 1, title: "Van Gogh & Rembrandt + Canal Cruise", duration: "2 hours", rating: 4.0, bookings: 2752, originalPrice: 40.00, salePrice: 29.50, image: "/images/combi-1.png" },
    { id: 2, title: "Heineken Experience + Canal Cruise", duration: "2.5 hours", rating: 4.2, bookings: 15308, originalPrice: 44.95, salePrice: 38.45, image: "/images/combi-2.png" },
    { id: 3, title: "Rijksmuseum + Amsterdam Canal Cruise", duration: "5 hours", rating: 4.4, bookings: 25120, originalPrice: 45.00, salePrice: 38.50, image: "/images/combi-3.png" },
    { id: 4, title: "Red Light Secrets + Amsterdam Canal Cruise", duration: "2 hours", rating: 4.2, bookings: 4870, originalPrice: 36.00, salePrice: 27.00, image: "/images/combi-4.png" },
    { id: 5, title: "The Amsterdam Dungeon + Canal Cruise", duration: "2.5 hours", rating: 4.5, bookings: 3374, originalPrice: 44.50, salePrice: 39.00, image: "/images/combi-5.png" },
];

// --- Reusable Components for this Page ---
const Top10Card = ({ tour, index }: { tour: typeof top10Tours[0], index: number }) => (
    <a href="#" className="flex items-center gap-6 p-4 bg-white hover:bg-slate-50 transition-colors duration-200 group">
        <span className="text-4xl font-extrabold text-slate-200 group-hover:text-red-500 transition-colors duration-200">{index + 1}.</span>
        <div className="relative w-24 h-24 flex-shrink-0">
            <Image src={tour.image} alt={tour.title} fill className="object-cover" />
        </div>
        <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors duration-200">{tour.title}</h3>
            <div className="mt-2 text-sm">
                {tour.price && <span className="text-slate-500 line-through mr-2">€{tour.price.toFixed(2)}</span>}
                <span className="text-red-600 font-bold text-xl">€{tour.salePrice.toFixed(2)}</span>
            </div>
        </div>
        <ArrowRight className="text-slate-400 group-hover:text-red-500 transition-colors duration-200" />
    </a>
);

const InterestCard = ({ interest }: { interest: typeof interestCategories[0] }) => (
    <a href="#" className="flex flex-col items-center p-6 bg-white shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <div className="relative w-16 h-16 mb-4">
            <Image src={interest.icon} alt={interest.name} fill className="object-contain" />
        </div>
        <h3 className="text-base font-bold text-slate-900 uppercase">{interest.name}</h3>
        <p className="text-sm text-slate-500">{interest.products} products</p>
    </a>
);

const CombiDealCard = ({ deal }: { deal: typeof combiDeals[0] }) => {
    const { formatPrice } = { formatPrice: (price: number) => `€${price.toFixed(2)}` };

    return (
        <a href="#" className="w-80 flex-shrink-0 bg-white shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="relative">
                <Image src={deal.image} alt={deal.title} width={320} height={180} className="w-full h-40 object-cover" />
            </div>
            <div className="p-4">
                <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{deal.title}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-500 my-2">
                    <span className="flex items-center gap-1">
                        <Clock size={14} />{deal.duration}
                    </span>
                    <span className="flex items-center gap-1">
                        <Star size={14} fill="currentColor" className="text-yellow-500" />{deal.rating}
                    </span>
                    <span>{deal.bookings} bookings</span>
                </div>
                <div className="flex items-end justify-end mt-4">
                    {deal.originalPrice && <span className="text-slate-500 line-through mr-2">{formatPrice(deal.originalPrice)}</span>}
                    <span className="text-xl font-extrabold text-red-600">{formatPrice(deal.salePrice)}</span>
                </div>
            </div>
        </a>
    );
};

// =================================================================
// --- AMSTERDAM DESTINATION PAGE ---
// =================================================================
export default function AmsterdamPage() {
    const combiScrollContainer = useRef<HTMLDivElement>(null);

    const scroll = (container: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
        if (container.current) {
            const scrollAmount = direction === 'left' ? -344 : 344; // Card width + gap
            container.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-white">
                
                {/* Hero Section */}
                <section className="relative h-[85vh] w-full flex items-center justify-center text-white overflow-hidden">
                    <Image
                        src="/images/amsterdam.png"
                        alt="Amsterdam canals at sunset"
                        fill
                        priority
                        className="object-cover"
                    />
                    
                    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 text-center">
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-lg">Amsterdam</h1>
                        <p className="mt-4 text-xl md:text-2xl font-medium max-w-3xl mx-auto">
                            Discover the Venice of the North. Your next unforgettable adventure starts here, with our handpicked tours and activities.
                        </p>
                    </div>
                </section>
                
                {/* Your Local Guide Section */}
                <section className="bg-slate-50 py-20">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            <div className="col-span-1 md:col-span-1 lg:col-span-1">
                                <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Your Local Guide In Amsterdam</h2>
                                <p className="text-lg text-slate-600 mb-6">
                                    We are here for you both online and in-person, with over 35 years of experience as your trusted travel buddy.
                                </p>
                                <a href="#" className="inline-flex items-center gap-2 text-red-600 font-bold hover:text-red-700 transition-colors">
                                    <span>Learn more about us</span>
                                    <ArrowRight size={20} />
                                </a>
                            </div>
                            <div className="col-span-1 md:col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="bg-white p-8 shadow-sm hover:shadow-xl transition-shadow duration-300">
                                    <Award className="w-10 h-10 text-red-600 mb-4" />
                                    <h3 className="font-bold text-xl text-slate-900">Great Combi Deals</h3>
                                    <p className="mt-2 text-slate-600">
                                        Combine multiple products in one ticket for amazing Amsterdam discount deals.
                                    </p>
                                </div>
                                <div className="bg-white p-8 shadow-sm hover:shadow-xl transition-shadow duration-300">
                                    <Star className="w-10 h-10 text-red-600 mb-4" />
                                    <h3 className="font-bold text-xl text-slate-900">Quality City Trips</h3>
                                    <p className="mt-2 text-slate-600">
                                        We offer you the best products for your Amsterdam city trip, handpicked by our experts.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Top 10 Things to Do */}
                <section className="py-20 bg-white">
                    <div className="container mx-auto px-4">
                        <h2 className="text-4xl font-extrabold text-slate-900 text-center mb-12">TOP 10 THINGS TO DO IN AMSTERDAM</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {top10Tours.map((tour, index) => (
                                <Top10Card key={tour.id} tour={tour} index={index} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Explore by Interest */}
                <section className="bg-slate-50 py-20">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-6">
                            Discover Amsterdam by Interest
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
                            Find the perfect experience for you, whether you're interested in culture, adventure, or food.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                            {interestCategories.map((interest, index) => (
                                <InterestCard key={index} interest={interest} />
                            ))}
                        </div>
                    </div>
                </section>
                
                {/* Combi Deals Carousel */}
                <section className="py-20 bg-white">
                    <div className="container mx-auto px-4">
                        <div className="flex justify-between items-end mb-10">
                            <h2 className="text-4xl font-extrabold text-slate-900">Best Deals on Combi Tickets</h2>
                            <div className="hidden md:flex gap-3">
                                <button onClick={() => scroll(combiScrollContainer, 'left')} className="bg-white p-3 shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600">
                                    <ChevronLeft size={20}/>
                                </button>
                                <button onClick={() => scroll(combiScrollContainer, 'right')} className="bg-white p-3 shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600">
                                    <ChevronRight size={20}/>
                                </button>
                            </div>
                        </div>
                        <div ref={combiScrollContainer} className="flex gap-6 overflow-x-auto pb-4 scroll-smooth" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
                            {combiDeals.map(deal => <CombiDealCard key={deal.id} deal={deal} />)}
                        </div>
                    </div>
                </section>

                {/* Fun Facts Section */}
                <section className="bg-slate-50 py-20">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <h2 className="text-4xl font-extrabold text-slate-900 text-center mb-10">Fun Facts About Amsterdam</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-600 text-lg">
                            <div>
                                <p className="mb-4">
                                    <strong>More Bridges than Paris:</strong> Amsterdam has over 1,281 bridges, more than Paris, connecting its 165 canals. The most famous is the 'Magere Brug' or 'Skinny Bridge'.
                                </p>
                                <p>
                                    <strong>A City on Poles:</strong> Most of the city's buildings are built on huge wooden poles, driven deep into the soft, marshy ground to provide a stable foundation. The Royal Palace alone sits on over 13,000 poles!
                                </p>
                            </div>
                            <div>
                                <p className="mb-4">
                                    <strong>More Bikes than People:</strong> With over 1.2 million bicycles and only about 821,000 residents, Amsterdam is a cyclist's paradise. It's the most popular mode of transport.
                                </p>
                                <p>
                                    <strong>The Smallest House:</strong> The narrowest house in Amsterdam, located at Singel 7, is just over one meter wide.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
                
            </main>
            <Footer />
        </>
    );
}
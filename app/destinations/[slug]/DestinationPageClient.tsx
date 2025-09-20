'use client';

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { 
    ArrowRight, Star, Tag, Clock, Users, ChevronLeft, ChevronRight, 
    Check, ShoppingCart, Award, MapPin, CheckCircle2 
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Destination, Tour, Category, CartItem } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import BookingSidebar from '@/components/BookingSidebar';

interface DestinationPageClientProps {
  destination: Destination;
  destinationTours: Tour[];
  allCategories: Category[];
}

// --- Card Components ---
const Top10Card = ({ tour, index }: { tour: Tour, index: number }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded) return;
    addToCart(tour as CartItem);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <a href={`/tour/${tour.slug}`} className="flex items-center gap-6 p-4 bg-white hover:bg-slate-50 transition-colors duration-200 group rounded-lg border border-transparent hover:border-slate-200">
      <span className="text-4xl font-extrabold text-slate-200 group-hover:text-red-500 transition-colors duration-200">{index + 1}.</span>
      <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden">
        <Image src={tour.image} alt={tour.title} fill className="object-cover" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors duration-200 line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
          <Clock size={14} />
          <span>{tour.duration}</span>
          <Star size={14} className="ml-2 text-yellow-500 fill-current" />
          <span>{tour.rating}</span>
        </div>
        <div className="mt-2 text-sm">
          {tour.originalPrice && <span className="text-slate-500 line-through mr-2">{formatPrice(tour.originalPrice)}</span>}
          <span className="text-red-600 font-bold text-xl">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <button  
          onClick={handleAddToCart}
          disabled={isAdded}
          aria-label={isAdded ? "Added to cart" : "Add to cart"}
          className={`p-2.5 rounded-full text-white transition-all duration-300 ease-in-out ${
            isAdded 
              ? 'bg-green-500 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
        </button>
        <ArrowRight className="text-slate-400 group-hover:text-red-500 transition-colors duration-200" />
      </div>
    </a>
  );
};

const InterestCard = ({ category, tourCount }: { category: Category, tourCount: number }) => (
  <a href={`/categories/${category.slug}`} className="flex flex-col items-center p-6 bg-white shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-lg">
    <div className="text-4xl mb-4">{category.icon}</div>
    <h3 className="text-base font-bold text-slate-900 uppercase text-center">{category.name}</h3>
    <p className="text-sm text-slate-500">{tourCount} tours</p>
  </a>
);

const CombiDealCard = ({ tour }: { tour: Tour }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded) return;
    addToCart(tour as CartItem);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <a href={`/tour/${tour.slug}`} className="w-80 flex-shrink-0 bg-white shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-lg group">
      <div className="relative">
        <Image src={tour.image} alt={tour.title} width={320} height={180} className="w-full h-40 object-cover" />
        <button  
          onClick={handleAddToCart}
          disabled={isAdded}
          aria-label={isAdded ? "Added to cart" : "Add to cart"}
          className={`absolute bottom-4 right-4 p-2.5 rounded-full text-white transition-all duration-300 ease-in-out transform group-hover:scale-110 ${
            isAdded 
              ? 'bg-green-500 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
        </button>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-3 text-sm text-slate-500 my-2">
          <span className="flex items-center gap-1">
            <Clock size={14} />{tour.duration}
          </span>
          <span className="flex items-center gap-1">
            <Star size={14} fill="currentColor" className="text-yellow-500" />{tour.rating}
          </span>
          <span>{tour.bookings} bookings</span>
        </div>
        <div className="flex items-end justify-end mt-4">
          {tour.originalPrice && <span className="text-slate-500 line-through mr-2">{formatPrice(tour.originalPrice)}</span>}
          <span className="text-xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
    </a>
  );
};

export default function DestinationPageClient({ destination, destinationTours, allCategories }: DestinationPageClientProps) {
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const combiScrollContainer = useRef<HTMLDivElement>(null);

  const scroll = (container: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (container.current) {
      const scrollAmount = direction === 'left' ? -344 : 344;
      container.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleTourSelect = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };
  
  const top10Tours = destinationTours.slice(0, 10);
  const featuredTours = destinationTours.filter(tour => tour.isFeatured).slice(0, 5);
  const destinationCategories = allCategories.map(category => ({
    ...category,
    tourCount: destinationTours.filter(tour => 
      typeof tour.category === 'object' ? tour.category._id === category._id : tour.category === category._id
    ).length
  })).filter(category => category.tourCount > 0);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        
        {/* Hero Section */}
        <section className="relative h-[85vh] w-full flex items-center justify-center text-white overflow-hidden">
          <Image
            src={destination.image || 'https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?w=1200&h=800&fit=crop'}
            alt={`${destination.name} cityscape`}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" aria-hidden="true" />
          
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-lg">{destination.name}</h1>
            <p className="mt-4 text-xl md:text-2xl font-medium max-w-3xl mx-auto drop-shadow-md">
              {destination.description}
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-lg">
              <div className="flex items-center gap-2">
                <MapPin size={20} />
                <span>{destination.country || 'Amazing Destination'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag size={20} />
                <span>{destinationTours.length} tours available</span>
              </div>
            </div>
          </div>
        </section>
        
        {/* Quick Info */}
        <section className="bg-slate-50 py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Best Time to Visit</h3>
                <p className="text-slate-600">{destination.bestTimeToVisit || 'Year-round'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Currency</h3>
                <p className="text-slate-600">{destination.currency || 'EUR'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Time Zone</h3>
                <p className="text-slate-600">{destination.timezone || 'Central European Time'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Available Tours</h3>
                <p className="text-slate-600">{destinationTours.length} experiences</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Your Local Guide Section */}
        <section className="bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              <div className="col-span-1 md:col-span-1 lg:col-span-1">
                <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Your Local Guide In {destination.name}</h2>
                <p className="text-lg text-slate-600 mb-6">
                  {destination.longDescription || `Discover the best of ${destination.name} with our expert local guides. We'll show you hidden gems, share fascinating stories, and create unforgettable memories that will last a lifetime.`}
                </p>
                <a href="/about" className="inline-flex items-center gap-2 text-red-600 font-bold hover:text-red-700 transition-colors">
                  <span>Learn more about us</span>
                  <ArrowRight size={20} />
                </a>
              </div>
              <div className="col-span-1 md:col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
                  <Award className="w-10 h-10 text-red-600 mb-4" />
                  <h3 className="font-bold text-xl text-slate-900">Expert Local Guides</h3>
                  <p className="mt-2 text-slate-600">
                    Our experienced local guides know all the hidden gems and stories of {destination.name}.
                  </p>
                </div>
                <div className="bg-slate-50 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
                  <Star className="w-10 h-10 text-red-600 mb-4" />
                  <h3 className="font-bold text-xl text-slate-900">Quality Experiences</h3>
                  <p className="mt-2 text-slate-600">
                    We offer you the best experiences in {destination.name}, handpicked by our experts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Top 10 Things to Do */}
        {top10Tours.length > 0 && (
          <section className="py-20 bg-slate-50">
            <div className="container mx-auto px-4">
              <h2 className="text-4xl font-extrabold text-slate-900 text-center mb-12">TOP 10 THINGS TO DO IN {destination.name.toUpperCase()}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {top10Tours.map((tour, index) => (
                  <Top10Card key={tour._id} tour={tour} index={index} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Explore by Interest */}
        {destinationCategories.length > 0 && (
          <section className="bg-white py-20">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6">
                Discover {destination.name} by Interest
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
                Find the perfect experience for you, whether you're interested in culture, adventure, or food.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {destinationCategories.map((category) => (
                  <InterestCard key={category._id} category={category} tourCount={category.tourCount} />
                ))}
              </div>
            </div>
          </section>
        )}
        
        {/* Featured Tours Carousel */}
        {featuredTours.length > 0 && (
          <section className="py-20 bg-slate-50 overflow-hidden">
            <div className="container mx-auto">
                <div className="px-4 mb-10">
                    <h2 className="text-4xl font-extrabold text-slate-900">Best Deals in {destination.name}</h2>
                </div>
                <div className="relative">
                    <div ref={combiScrollContainer} className="flex gap-6 overflow-x-auto pb-4 scroll-smooth px-4" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
                        {featuredTours.map(tour => <CombiDealCard key={tour._id} tour={tour} />)}
                    </div>
                    <button 
                        onClick={() => scroll(combiScrollContainer, 'left')} 
                        aria-label="Scroll left"
                        className="absolute top-1/2 -translate-y-1/2 left-0 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 backdrop-blur-sm ml-2"
                    >
                        <ChevronLeft size={24} className="text-slate-700"/>
                    </button>
                    <button 
                        onClick={() => scroll(combiScrollContainer, 'right')} 
                        aria-label="Scroll right"
                        className="absolute top-1/2 -translate-y-1/2 right-0 z-10 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 backdrop-blur-sm mr-2"
                    >
                        <ChevronRight size={24} className="text-slate-700"/>
                    </button>
                </div>
            </div>
          </section>
        )}

        {/* Fun Facts Section */}
        {destination.highlights && destination.highlights.length > 0 && (
          <section className="bg-white py-20">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-4xl font-extrabold text-slate-900 text-center mb-10">Why Visit {destination.name}?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {destination.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                    <p className="text-lg text-slate-600">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Show message for mock data */}
        {destinationTours.some(tour => tour._id.toString().startsWith('mock-')) && (
          <section className="bg-blue-50 py-8">
            <div className="container mx-auto px-4 text-center">
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Sample Tours</h3>
                <p className="text-blue-700">
                  These are example tours to show how {destination.name} would look with available experiences. 
                  Actual tours will be available soon!
                </p>
              </div>
            </div>
          </section>
        )}
        
      </main>
      <Footer />

      <BookingSidebar 
        isOpen={isBookingSidebarOpen} 
        onClose={() => setBookingSidebarOpen(false)} 
        tour={selectedTour} 
      />
    </>
  );
}
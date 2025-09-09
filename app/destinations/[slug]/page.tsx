// DestinationPage.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Star,
  Tag,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ShoppingCart,
  Award,
  MapPin,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { destinations, getDestinationById } from "@/lib/data/destinations";
import { tours, getToursByDestination } from "@/lib/data/tours";
import { categories, getAllCategories } from "@/lib/categories";
import { Destination, Tour, Category } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { useCart } from "@/contexts/CartContext";
import BookingSidebar from "@/components/BookingSidebar";
import { notFound } from "next/navigation";
import ComingSoonModal from "@/components/ComingSoonModal";

interface PageProps {
  params: { slug: string };
}

// --------------------------
// Small UI: Toast Component
// --------------------------
const Toast = ({ message, onClose }: { message: string | null; onClose: () => void }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose(), 2800);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-6 z-50 max-w-xs w-full p-3 rounded-xl shadow-xl bg-white border border-slate-200 flex items-center gap-3"
    >
      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
      <div className="text-sm text-slate-800">{message}</div>
      <button
        aria-label="Close notification"
        onClick={onClose}
        className="ml-auto text-slate-400 hover:text-slate-600"
      >
        ✕
      </button>
    </div>
  );
};

// Top 10 Tours Card (updated to accept onAddFeedback)
const Top10Card = ({
  tour,
  index,
  onAddFeedback,
}: {
  tour: Tour;
  index: number;
  onAddFeedback: (msg: string) => void;
}) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(tour);
    onAddFeedback?.(`${tour.title} added to cart`);
  };

  return (
    <a
      href={`/tour/${tour.slug}`}
      className="flex items-center gap-6 p-4 bg-white hover:bg-slate-50 transition-colors duration-200 group rounded-lg border border-transparent hover:border-slate-100"
      onClick={(e) => {}}
    >
      <span className="text-4xl font-extrabold text-slate-200 group-hover:text-red-500 transition-colors duration-200">
        {index + 1}.
      </span>
      <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-slate-100">
        <Image src={tour.image} alt={tour.title} fill className="object-cover" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors duration-200 line-clamp-2">
          {tour.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
          <Clock size={14} />
          <span>{tour.duration}</span>
          <Star size={14} className="ml-2 text-yellow-500" />
          <span>{tour.rating}</span>
        </div>
        <div className="mt-2 text-sm">
          {tour.originalPrice && (
            <span className="text-slate-500 line-through mr-2">€{tour.originalPrice.toFixed(2)}</span>
          )}
          <span className="text-red-600 font-bold text-xl">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleAddToCart}
          aria-label={`Add ${tour.title} to cart`}
          className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors active:scale-95"
        >
          <ShoppingCart size={18} />
        </button>
        <ArrowRight className="text-slate-400 group-hover:text-red-500 transition-colors duration-200" />
      </div>
    </a>
  );
};

// Interest Card (unchanged)
const InterestCard = ({ category, tourCount }: { category: Category; tourCount: number }) => (
  <a
    href={`/categories/${category.slug}`}
    className="flex flex-col items-center p-6 bg-white shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-lg"
  >
    <div className="text-4xl mb-4">{category.icon}</div>
    <h3 className="text-base font-bold text-slate-900 uppercase text-center">{category.name}</h3>
    <p className="text-sm text-slate-500">{tourCount} tours</p>
  </a>
);

// Combi Deal Card (updated to accept onAddFeedback)
const CombiDealCard = ({ tour, onAddFeedback }: { tour: Tour; onAddFeedback: (m: string) => void }) => {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(tour);
    onAddFeedback?.(`${tour.title} added to cart`);
  };

  return (
    <a
      href={`/tour/${tour.slug}`}
      className="w-80 flex-shrink-0 bg-white shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-lg border border-transparent hover:border-slate-100"
    >
      <div className="relative">
        <Image src={tour.image} alt={tour.title} width={320} height={180} className="w-full h-40 object-cover" />
        <button
          onClick={handleAddToCart}
          aria-label={`Add ${tour.title} to cart`}
          className="absolute bottom-4 right-4 p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors active:scale-95 shadow"
        >
          <ShoppingCart size={18} />
        </button>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-3 text-sm text-slate-500 my-2">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {tour.duration}
          </span>
          <span className="flex items-center gap-1">
            <Star size={14} className="text-yellow-500" />
            {tour.rating}
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

export default function DestinationPage({ params }: PageProps) {
  // Use params directly (fixed)
  const { slug } = params;

  const [destination, setDestination] = useState<Destination | null>(null);
  const [destinationTours, setDestinationTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const combiScrollContainer = useRef<HTMLDivElement>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const destData = getDestinationById(slug);
        if (!destData) {
          notFound();
          return;
        }

        setDestination(destData);
        const toursData = getToursByDestination(destData.id);
        setDestinationTours(toursData);

        if (toursData.length === 0) {
          setShowComingSoon(true);
        }
      } catch (error) {
        console.error("Error fetching destination data:", error);
      } finally {
        // keep brief loader feel
        setTimeout(() => setIsLoading(false), 600);
      }
    };

    fetchData();
  }, [slug]);

  const scroll = (container: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
    if (container.current) {
      const scrollAmount = direction === "left" ? -344 : 344;
      container.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleTourSelect = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };

  // Called by child cards to display feedback
  const showAddFeedback = (msg: string) => {
    setToastMessage(msg);
  };

  // ------------------------------------
  // ENHANCED SKELETON LOADING MARKUP
  // ------------------------------------
  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white animate-pulse">
          {/* ... (keep your skeleton unchanged) */}
          <section className="relative h-[85vh] w-full bg-slate-200">
            <div className="relative z-10 flex h-full items-center justify-center">
              <div className="w-full max-w-3xl px-4 text-center space-y-4">
                <div className="h-16 w-3/4 mx-auto rounded-lg bg-slate-300"></div>
                <div className="h-6 w-full mx-auto rounded-md bg-slate-300"></div>
                <div className="h-6 w-5/6 mx-auto rounded-md bg-slate-300"></div>
                <div className="flex justify-center items-center gap-6 pt-4">
                  <div className="h-5 w-32 rounded-md bg-slate-300"></div>
                  <div className="h-5 w-40 rounded-md bg-slate-300"></div>
                </div>
              </div>
            </div>
          </section>
          {/* rest of skeleton omitted for brevity in this snippet - keep as you had it */}
        </main>
        <Footer />
      </>
    );
  }

  // ------------------------
  // REAL PAGE
  // ------------------------
  if (!destination) {
    return null;
  }

  const top10Tours = destinationTours.slice(0, 10);
  const featuredTours = destinationTours.filter((tour) => tour.featured).slice(0, 5);
  const allCategories = getAllCategories();
  const destinationCategories = allCategories
    .map((category) => ({
      ...category,
      tourCount: destinationTours.filter((tour) => tour.categoryIds.includes(category.id)).length,
    }))
    .filter((category) => category.tourCount > 0);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative h-[85vh] w-full flex items-center justify-center text-white overflow-hidden">
          <Image src={destination.image} alt={`${destination.name} cityscape`} fill priority className="object-cover" />

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-lg">{destination.name}</h1>
            <p className="mt-4 text-xl md:text-2xl font-medium max-w-3xl mx-auto">{destination.description}</p>
            <div className="mt-6 flex items-center justify-center gap-4 text-lg">
              <div className="flex items-center gap-2">
                <MapPin size={20} />
                <span>{destination.country}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag size={20} />
                <span>{destination.tourCount} tours available</span>
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
                <p className="text-slate-600">{destination.bestTimeToVisit}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Currency</h3>
                <p className="text-slate-600">{destination.currency}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Time Zone</h3>
                <p className="text-slate-600">{destination.timezone}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-2">Available Tours</h3>
                <p className="text-slate-600">{destination.tourCount} experiences</p>
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
                <p className="text-lg text-slate-600 mb-6">{destination.longDescription}</p>
                <a href="/about" className="inline-flex items-center gap-2 text-red-600 font-bold hover:text-red-700 transition-colors">
                  <span>Learn more about us</span>
                  <ArrowRight size={20} />
                </a>
              </div>
              <div className="col-span-1 md:col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
                  <Award className="w-10 h-10 text-red-600 mb-4" />
                  <h3 className="font-bold text-xl text-slate-900">Expert Local Guides</h3>
                  <p className="mt-2 text-slate-600">Our experienced local guides know all the hidden gems and stories of {destination.name}.</p>
                </div>
                <div className="bg-slate-50 p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
                  <Star className="w-10 h-10 text-red-600 mb-4" />
                  <h3 className="font-bold text-xl text-slate-900">Quality Experiences</h3>
                  <p className="mt-2 text-slate-600">We offer you the best experiences in {destination.name}, handpicked by our experts.</p>
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
                  <Top10Card key={tour.id} tour={tour} index={index} onAddFeedback={showAddFeedback} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Explore by Interest */}
        {destinationCategories.length > 0 && (
          <section className="bg-white py-20">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Discover {destination.name} by Interest</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">Find the perfect experience for you, whether you're interested in culture, adventure, or food.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {destinationCategories.map((category) => (
                  <InterestCard key={category.id} category={category} tourCount={category.tourCount} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured Tours Carousel */}
        {featuredTours.length > 0 && (
          <section className="py-20 bg-slate-50">
            <div className="container mx-auto px-4 relative">
              <div className="flex justify-between items-end mb-10">
                <h2 className="text-4xl font-extrabold text-slate-900">Best Deals in {destination.name}</h2>

                {/* Arrows - visible on all screens and easier to tap on mobile */}
                <div className="flex gap-3">
                  <button
                    onClick={() => scroll(combiScrollContainer, "left")}
                    className="bg-white p-3 shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => scroll(combiScrollContainer, "right")}
                    className="bg-white p-3 shadow-md hover:bg-slate-100 transition-colors border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center"
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div
                ref={combiScrollContainer}
                className="flex gap-6 overflow-x-auto pb-4 scroll-smooth px-1"
                style={{ scrollbarWidth: "none" as any }}
              >
                {featuredTours.map((tour) => (
                  <CombiDealCard key={tour.id} tour={tour} onAddFeedback={showAddFeedback} />
                ))}
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

        {/* Coming Soon Section for destinations without tours */}
        {destinationTours.length === 0 && (
          <section className="bg-white py-20">
            <div className="container mx-auto px-4 text-center max-w-2xl">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Coming Soon!</h2>
              <p className="text-lg text-slate-600 mb-8">
                We're working hard to bring you exciting tours and experiences in {destination.name}.
                Check back soon for amazing deals and unforgettable adventures!
              </p>
              <a href="/" className="inline-flex items-center gap-2 bg-red-600 text-white font-bold py-3 px-8 rounded-full hover:bg-red-700 transition-colors">
                <span>Explore Other Destinations</span>
                <ArrowRight size={20} />
              </a>
            </div>
          </section>
        )}
      </main>
      <Footer />

      {/* Booking Sidebar */}
      <BookingSidebar isOpen={isBookingSidebarOpen} onClose={() => setBookingSidebarOpen(false)} tour={selectedTour} />

      {/* Coming Soon Modal */}
      <ComingSoonModal isOpen={showComingSoon} onClose={() => setShowComingSoon(false)} destination={destination.name} />

      {/* Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </>
  );
}

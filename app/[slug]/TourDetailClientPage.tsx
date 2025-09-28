'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  Star, Clock, Users, MapPin, Calendar, Heart, Share2, ArrowLeft,
  Check, X, Camera, Shield, ChevronDown, ChevronUp, MessageCircle,
  Phone, Mail, Plus, Minus, ShoppingCart, Info, CheckCircle,
  Umbrella, Thermometer, Bus, Utensils, Mountain, Languages,
  CreditCard, AlertCircle, Car, Plane, Navigation, Backpack,
  Sun, CloudRain, Snowflake, Eye, Gift, Accessibility, Baby,
  PawPrint, Smartphone, Wifi, Headphones, ChevronLeft,
  ChevronRight, ZoomIn
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/contexts/WishlistContext';
import { ITour } from '@/lib/models/Tour';
import toast from 'react-hot-toast';

// --- MOCK DATA AND UTILITIES ---

const MOCK_TOUR = {
  _id: 'mock-tour-id',
  slug: 'mock-tour-of-the-city',
  title: 'Classic City Highlights Tour with a Twist',
  description: 'Experience the city\'s most iconic landmarks and hidden gems on this guided tour. Learn fascinating history and get a feel for the local culture.',
  longDescription: `
    <p>This is a full-day guided tour designed to give you a comprehensive overview of the city. We start at the bustling city center, where you'll witness the fusion of old-world charm and modern architecture. Our expert local guides will share stories and historical facts that you won't find in any guidebook.</p>
    <p>The afternoon is dedicated to exploring the lesser-known, artistic neighborhoods. We'll stroll through vibrant street art displays, visit local artisan shops, and enjoy a tasting of regional delicacies. This tour is perfect for first-time visitors and seasoned travelers alike who want to see the city through a local's eyes.</p>
    <ul>
      <li><strong>Morning:</strong> Historic landmarks and famous squares.</li>
      <li><strong>Afternoon:</strong> Hidden alleyways and local neighborhoods.</li>
      <li><strong>Evening:</strong> Optional sunset viewing and dinner recommendations.</li>
    </ul>
    <p>This experience is curated to be both educational and entertaining, ensuring you leave with unforgettable memories and a deeper appreciation for the city's rich heritage.</p>
  `,
  image: 'https://images.unsplash.com/photo-1549925251-54c330761369?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  images: [
    'https://images.unsplash.com/photo-1594950346067-27083049b71e?q=80&w=2787&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1628172826955-44d56d7df153?q=80&w=2787&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1517409424775-f86a94f6f365?q=80&w=2835&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1517409424775-f86a94f6f365?q=80&w=2835&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1628172826955-44d56d7df153?q=80&w=2787&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1594950346067-27083049b71e?q=80&w=2787&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  ],
  duration: '4 hours',
  price: 150,
  originalPrice: 200,
  discountPrice: 150,
  rating: 4.9,
  reviews: [],
  category: { name: 'City Tours', slug: 'city-tours' },
  destination: { name: 'New York City', slug: 'new-york-city' },
  highlights: [
    'Iconic landmarks & hidden gems',
    'Expert local guides',
    'Small group experience',
    'Includes a tasting of local delicacies',
    'Easy to book and flexible cancellation'
  ],
  whatsIncluded: [
    'Professional, licensed tour guide',
    'Tasting of local snacks',
    'Transportation to all sites',
    'Small bottle of water',
    'Entrance fees to specified attractions'
  ],
  whatsNotIncluded: [
    'Gratuities for your guide',
    'Souvenirs',
    'Additional food or drinks',
    'Hotel pick-up/drop-off'
  ],
  itinerary: [
    {
      time: '09:00 AM',
      title: 'Meet at the Central Square',
      description: 'Our tour begins at the historic central square. Look for our guide holding a red flag.',
      location: 'Central Square Monument',
      icon: 'location'
    },
    {
      time: '09:30 AM',
      title: 'Walking Tour of Old Town',
      description: 'Stroll through the narrow, cobbled streets of the Old Town. We will visit the ancient clock tower and the main cathedral.',
      duration: '1.5 hours',
      icon: 'monument'
    },
    {
      time: '11:00 AM',
      title: 'Local Market Tasting',
      description: 'Visit the vibrant local market to sample some of the city\'s most famous street food and snacks.',
      location: 'Mercado de la Ciudad',
      icon: 'food'
    },
    {
      time: '12:00 PM',
      title: 'River Cruise & Photo Op',
      description: 'Enjoy a short, scenic cruise along the river with stunning views of the city skyline. Perfect for photos!',
      duration: '45 minutes',
      icon: 'camera'
    },
    {
      time: '01:00 PM',
      title: 'Conclusion of the Tour',
      description: 'The tour concludes at the riverside, a central and convenient location for you to continue your own exploration or grab lunch.',
      location: 'Riverside Pier',
      icon: 'location'
    }
  ],
  faq: [
    {
      question: "What should I bring on the tour?",
      answer: "We recommend comfortable walking shoes, a bottle of water, a hat, and a camera. Dress according to the weather. Sunscreen is a good idea in summer!"
    },
    {
      question: "Is this tour suitable for children?",
      answer: "Yes, this tour is family-friendly. Children under 12 must be accompanied by an adult. The walking pace is moderate."
    },
    {
      question: "Can I join the tour if I use a wheelchair?",
      answer: "The tour route includes some uneven surfaces and stairs. Please contact us in advance so we can confirm the possibility of accommodation."
    },
    {
      question: "What is your cancellation policy?",
      answer: "You can cancel up to 24 hours in advance for a full refund. Cancellations made within 24 hours are non-refundable."
    }
  ],
  isPublished: true,
  tags: ['Best Seller', 'Small Group', '4-hour tour']
};

const MOCK_RELATED_TOURS = [
  {
    _id: 'mock-tour-id-2',
    slug: 'mock-food-tasting-tour',
    title: 'Gourmet Food Tasting Tour',
    image: 'https://images.unsplash.com/photo-1596700831649-6510d7a040b2?q=80&w=2787&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    duration: '2 hours',
    rating: 5.0,
    discountPrice: 95,
    tags: ['Foodie'],
  },
  {
    _id: 'mock-tour-id-3',
    slug: 'mock-historic-castle-day-trip',
    title: 'Historic Castle Day Trip',
    image: 'https://images.unsplash.com/photo-1558299834-8c83c27f6775?q=80&w=2835&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    duration: '8 hours',
    rating: 4.7,
    discountPrice: 250,
    tags: ['Day Trip'],
  },
  {
    _id: 'mock-tour-id-4',
    slug: 'mock-street-art-and-culture',
    title: 'Street Art & Hidden Culture Walk',
    image: 'https://images.unsplash.com/photo-1574765792164-90a394a11c1d?q=80&w=2787&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    duration: '3 hours',
    rating: 4.8,
    discountPrice: 80,
    tags: ['Art Lovers'],
  }
];

// --- MOCK COMPONENTS ---

const Header = () => (
  <header className="fixed top-0 w-full z-50 bg-white shadow-md transition-all duration-300">
    <div className="container mx-auto px-4 py-3 flex justify-between items-center">
      <Link href="/" className="text-2xl font-bold text-red-600">Travel</Link>
      <nav className="hidden md:flex space-x-6">
        <Link href="/tours" className="text-slate-600 hover:text-red-600">Tours</Link>
        <Link href="/destinations" className="text-slate-600 hover:text-red-600">Destinations</Link>
        <Link href="/about" className="text-slate-600 hover:text-red-600">About</Link>
        <Link href="/contact" className="text-slate-600 hover:text-red-600">Contact</Link>
      </nav>
      <button className="md:hidden p-2 rounded-full bg-slate-100">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
    </div>
  </header>
);

const Footer = () => (
  <footer className="bg-slate-800 text-slate-300 py-12">
    <div className="container mx-auto px-4 text-center">
      <p>&copy; {new Date().getFullYear()} My Tour Company. All rights reserved.</p>
    </div>
  </footer>
);

const BookingSidebar = ({ isOpen, onClose, tour }: { isOpen: boolean, onClose: () => void, tour: any }) => {
  const { addToCart } = useCart();
  const { formatPrice } = useSettings();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const totalPrice = tour.discountPrice * adults + (tour.discountPrice * 0.8 * children);

  const handleAddToCart = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time');
      return;
    }
    const cartItem = {
      ...tour,
      uniqueId: `${tour._id}-${selectedDate}-${selectedTime}`,
      quantity: adults,
      childQuantity: children,
      infantQuantity: 0,
      selectedDate,
      selectedTime,
      selectedAddOns: {},
      totalPrice,
    };
    addToCart(cartItem);
    toast.success('Tour added to cart!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 bg-white md:w-96 md:left-auto overflow-y-auto shadow-xl"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold">Book Your Tour</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <X size={24} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-3xl font-bold text-slate-900">{formatPrice(totalPrice)}</span>
          </div>
          <p className="text-sm text-slate-500">
            {adults} adult{adults !== 1 ? 's' : ''}{children > 0 && `, ${children} child${children !== 1 ? 'ren' : ''}`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Time</label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">Choose time</option>
            <option value="09:00">09:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="14:00">02:00 PM</option>
          </select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Adults</span>
              <p className="text-sm text-slate-500">Age 13+</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAdults(Math.max(1, adults - 1))}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center">{adults}</span>
              <button
                onClick={() => setAdults(adults + 1)}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Children</span>
              <p className="text-sm text-slate-500">Age 2-12</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChildren(Math.max(0, children - 1))}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center">{children}</span>
              <button
                onClick={() => setChildren(children + 1)}
                className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleAddToCart}
            disabled={!selectedDate || !selectedTime}
            className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-full hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const StickyBookButton = ({ price, currency, onClick }: { price: number, currency: string, onClick: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const isTriggerVisible = useInView(triggerRef, { threshold: 0.1 });

  useEffect(() => {
    // Only show button on small screens (max-lg breakpoint) and when the top trigger is out of view
    const handleScroll = () => {
      if (window.innerWidth < 1024) {
        setIsVisible(!isTriggerVisible);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isTriggerVisible]);

  return (
    <>
      <div ref={triggerRef} className="lg:hidden absolute top-[calc(100vh-100px)]"></div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-4px_6px_-1px_rgb(0_0_0_/_0.1),_0_-2px_4px_-2px_rgb(0_0_0_/_0.1)] p-4 lg:hidden"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xl font-bold text-red-600">{currency}{price}</span>
                <span className="text-slate-500 text-sm"> / person</span>
              </div>
              <button
                onClick={onClick}
                className="bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-colors"
              >
                Check Availability
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Mock Review component - replace with your actual component
const ReviewList = ({ reviews }: { reviews: any[] }) => {
  if (reviews.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500">
        No reviews yet. Be the first to leave one!
      </div>
    );
  }
  return (
    <div className="space-y-6 p-6">
      {reviews.slice(0, 3).map((review, index) => (
        <div key={index} className="border-b pb-4 last:border-b-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-sm">
              {review.author?.name ? review.author.name[0] : 'U'}
            </div>
            <div>
              <p className="font-semibold">{review.author?.name || 'Anonymous'}</p>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className={i < review.rating ? "text-yellow-500 fill-current" : "text-slate-300"} />
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-600">{review.text}</p>
        </div>
      ))}
    </div>
  );
};

const ReviewForm = ({ tourId, onReviewSubmitted }: { tourId: string, onReviewSubmitted: (review: any) => void }) => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !text || !name) {
      toast.error('Please fill out all fields.');
      return;
    }

    const newReview = {
      _id: `mock-review-${Date.now()}`,
      rating,
      text,
      author: { name },
      createdAt: new Date().toISOString()
    };
    onReviewSubmitted(newReview);
    setRating(0);
    setText('');
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-bold text-slate-800">Write a Review</h4>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Your Rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1"
            >
              <Star
                size={24}
                className={rating >= star ? 'text-yellow-500 fill-current' : 'text-slate-300'}
              />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="review-text" className="block text-sm font-medium text-slate-700 mb-1">Your Review</label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full border border-slate-300 rounded-lg p-3"
          placeholder="Tell us about your experience..."
        />
      </div>
      <div>
        <label htmlFor="review-name" className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
        <input
          id="review-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-3"
          placeholder="e.g. John Doe"
        />
      </div>
      <button
        type="submit"
        className="bg-red-600 text-white font-semibold py-3 px-6 rounded-full hover:bg-red-700 transition-colors"
      >
        Submit Review
      </button>
    </form>
  );
};

const Lightbox = ({ images, selectedIndex, onClose }: { images: string[], selectedIndex: number, onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose, nextImage, prevImage]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-[101]"
        aria-label="Close lightbox"
      >
        <X size={32} />
      </button>

      <div className="relative w-full h-full max-w-5xl max-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Tour image ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </AnimatePresence>
      </div>

      <button
        onClick={prevImage}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Previous image"
      >
        <ChevronLeft size={28} />
      </button>

      <button
        onClick={nextImage}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Next image"
      >
        <ChevronRight size={28} />
      </button>
       
       <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full"
        onClick={(e) => e.stopPropagation()}
       >
        {currentIndex + 1} / {images.length}
      </div>
    </motion.div>
  );
};

const ItineraryIcon = ({ iconType, className = "w-5 h-5" }: { iconType?: string, className?: string }) => {
  const icons: { [key: string]: JSX.Element } = {
    location: <MapPin className={className} />,
    transport: <Bus className={className} />,
    monument: <Mountain className={className} />,
    camera: <Camera className={className} />,
    food: <Utensils className={className} />,
    time: <Clock className={className} />,
    info: <Info className={className} />,
    activity: <Users className={className} />,
    shopping: <ShoppingCart className={className} />,
  };
  return icons[iconType || 'location'] || icons.location;
};

const ItinerarySection = ({ itinerary, sectionRef }: { itinerary: any[], sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="itinerary" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Clock size={24} className="text-red-600" />
      Detailed Itinerary
    </h3>
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
      {itinerary.map((item, index) => (
        <div key={index} className="relative flex items-start gap-4 pb-8">
          <div className="flex-shrink-0 w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm relative z-10">
            <ItineraryIcon iconType={item.icon} className="w-6 h-6" />
          </div>
          <div className="flex-1 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  {item.time}
                </span>
                {item.duration && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {item.duration}
                  </span>
                )}
              </div>
              {item.location && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={14} />
                  {item.location}
                </div>
              )}
            </div>
            <h4 className="font-bold text-slate-800 mb-2">{item.title}</h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-3">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TabNavigation = ({ activeTab, tabs, scrollToSection, isHeaderVisible }: any) => {
  const stickyTop = 'top-16 md:top-20';
  const navRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const container = navRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 8);
    setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 8);
  };

  const scrollBy = (delta: number) => {
    const container = navRef.current;
    if (!container) return;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = navRef.current;
    if (!container || !activeTab) return;

    const selector = `a[data-tab-id="${activeTab}"]`;
    let activeEl = container.querySelector(selector) as HTMLElement | null;

    if (!activeEl) {
      const fallback = container.querySelector(`a[href="#${activeTab}"]`) as HTMLElement | null;
      if (!fallback) return;
      activeEl = fallback;
    }

    const elRect = activeEl.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    const elLeft = elRect.left - contRect.left + container.scrollLeft;
    const elRight = elLeft + elRect.width;
    const visibleLeft = container.scrollLeft;
    const visibleRight = container.scrollLeft + container.clientWidth;

    if (elLeft < visibleLeft + 12) {
      container.scrollTo({ left: Math.max(0, elLeft - 12), behavior: 'smooth' });
    }
    else if (elRight > visibleRight - 12) {
      const delta = elRight - visibleRight + 12;
      container.scrollTo({ left: container.scrollLeft + delta, behavior: 'smooth' });
    }

    setTimeout(updateScrollButtons, 250);
    updateScrollButtons();
  }, [activeTab]);

  useEffect(() => {
    const container = navRef.current;
    if (!container) return;
    updateScrollButtons();
    const onScroll = () => updateScrollButtons();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, []);

  return (
    <div
      className={`sticky ${stickyTop} z-20 -mx-4 sm:mx-0 transition-all duration-300 
        bg-white/30 backdrop-blur-md border-b border-white/20 shadow-lg`}
    >
      <div className="container mx-auto px-2 sm:px-4">
        <div className="relative">
          <button
            aria-hidden={!canScrollLeft}
            aria-label="Scroll tabs left"
            onClick={() => scrollBy(-160)}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white shadow-sm transition-opacity ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={navRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-2 scroll-smooth"
            role="tablist"
            aria-label="Tour sections"
          >
            {tabs.map((tab: any) => (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                data-tab-id={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(tab.id);
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-red-600'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </a>
            ))}
          </div>

          <button
            aria-hidden={!canScrollRight}
            aria-label="Scroll tabs right"
            onClick={() => scrollBy(160)}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white shadow-sm transition-opacity ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            type="button"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const OverviewSection = ({ tour, sectionRef }: { tour: any, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="overview" className="space-y-8 scroll-mt-24">
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">About this experience</h2>
      <div
        className="prose prose-slate max-w-none mb-6"
        dangerouslySetInnerHTML={{ __html: tour.longDescription || tour.description }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tour.whatsIncluded && tour.whatsIncluded.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">What's included</h3>
            <ul className="space-y-2">
              {tour.whatsIncluded.map((item: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-slate-600">
                  <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tour.highlights && tour.highlights.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Highlights</h3>
            <ul className="space-y-2">
              {tour.highlights.map((highlight: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-slate-600">
                  <Star size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  </div>
);

const PracticalInfoSection = ({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="practical" className="space-y-8 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Backpack size={24} className="text-blue-600" />
      Practical Information
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Backpack size={20} className="text-blue-600" />
          What to Bring
        </h4>
        <ul className="space-y-2">
          {["Camera for photos", "Comfortable walking shoes", "Weather-appropriate clothing", "Water bottle"].map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sun size={20} className="text-yellow-600" />
          What to Wear
        </h4>
        <ul className="space-y-2">
          {["Comfortable walking shoes", "Weather-appropriate clothing", "Layers for varying temperatures"].map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const AccessibilitySection = ({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="accessibility" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Accessibility size={24} className="text-purple-600" />
      Accessibility & Special Requirements
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-purple-50 p-6 rounded-xl">
        <h4 className="font-bold text-purple-900 mb-4">Accessibility Information</h4>
        <ul className="space-y-3">
          {["Limited wheelchair accessibility - please contact us in advance", "Service animals are welcome", "Please inform us of any special requirements when booking"].map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-purple-800">
              <Info size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-green-50 p-6 rounded-xl">
        <h4 className="font-bold text-green-900 mb-4">Health & Safety Measures</h4>
        <ul className="space-y-3">
          {["Enhanced safety protocols in place", "Hand sanitizer available", "First aid trained guides"].map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-green-800">
              <Shield size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const PoliciesSection = ({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="policies" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Shield size={24} className="text-red-600" />
      Policies
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-sky-50 p-6 rounded-xl">
        <h4 className="font-bold text-sky-900 mb-3 flex items-center gap-2">
          <Umbrella size={20} className="text-sky-600" />
          Weather Policy
        </h4>
        <p className="text-sky-800 text-sm leading-relaxed">Tours operate rain or shine. In case of severe weather, tours may be rescheduled or refunded.</p>
      </div>

      <div className="bg-pink-50 p-6 rounded-xl">
        <h4 className="font-bold text-pink-900 mb-3 flex items-center gap-2">
          <Camera size={20} className="text-pink-600" />
          Photography Policy
        </h4>
        <p className="text-pink-800 text-sm leading-relaxed">Photography is encouraged. Please respect photography restrictions at certain venues and other guests' privacy.</p>
      </div>

      <div className="bg-yellow-50 p-6 rounded-xl">
        <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
          <CreditCard size={20} className="text-yellow-600" />
          Gratuity Policy
        </h4>
        <p className="text-yellow-800 text-sm leading-relaxed">Gratuities are not included but are appreciated for exceptional service.</p>
      </div>
    </div>
  </div>
);

const CulturalSection = ({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="cultural" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Heart size={24} className="text-teal-600" />
      Cultural Information
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-indigo-50 p-6 rounded-xl">
        <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Eye size={20} className="text-indigo-600" />
          Cultural Highlights
        </h4>
        <ul className="space-y-2">
          {["Learn about local history and culture", "Discover architectural highlights", "Understand local traditions and customs"].map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-indigo-800">
              <Star size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-teal-50 p-6 rounded-xl">
        <h4 className="font-bold text-teal-900 mb-4 flex items-center gap-2">
          <Heart size={20} className="text-teal-600" />
          Local Customs & Etiquette
        </h4>
        <ul className="space-y-2">
          {["Arrive at meeting point 15 minutes early", "Respect local customs and dress codes", "Follow guide instructions at all times"].map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-teal-800">
              <Info size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const EnhancedFAQ = ({ faqs, sectionRef }: { faqs: any[], sectionRef: React.RefObject<HTMLDivElement> }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqsToShow = faqs && faqs.length > 0 ? faqs : MOCK_TOUR.faq;
  return (
    <div ref={sectionRef} id="faq" className="space-y-4 scroll-mt-24">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <MessageCircle size={24} className="text-orange-600" />
        Frequently Asked Questions
      </h3>
      {faqsToShow.map((faq, index) => (
        <div key={index} className="border border-slate-200 rounded-lg">
          <button
            onClick={() => setOpenFaq(openFaq === index ? null : index)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-800 pr-4">{faq.question}</span>
            {openFaq === index ? (
              <ChevronUp size={20} className="text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronDown size={20} className="text-slate-500 flex-shrink-0" />
            )}
          </button>
          {openFaq === index && (
            <div className="px-4 pb-4 border-t border-slate-100">
              <p className="text-slate-600 text-sm leading-relaxed mt-3">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ReviewsSection = ({ tour, initialReviews, sectionRef }: { tour: any, initialReviews: any[], sectionRef: React.RefObject<HTMLDivElement> }) => {
  const [reviews, setReviews] = useState(initialReviews);
  const handleNewReview = (newReview: any) => {
    setReviews(prevReviews => [newReview, ...prevReviews]);
  };
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
    : tour.rating?.toFixed(1) || 'N/A';
  return (
    <div ref={sectionRef} id="reviews" className="space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Reviews</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star size={18} className="text-yellow-500 fill-current" />
            <span className="font-bold text-lg">{averageRating}</span>
          </div>
          <span className="text-slate-500">({reviews.length} reviews)</span>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <ReviewList reviews={reviews} />
        <div className="border-t border-slate-200 p-6">
          <ReviewForm tourId={tour._id!} onReviewSubmitted={handleNewReview} />
        </div>
      </div>
    </div>
  );
};

// --- MAIN CLIENT COMPONENT ---

interface TourPageClientProps {
  tour: ITour;
  relatedTours: ITour[];
}

export default function TourDetailClientPage({ tour, relatedTours }: TourPageClientProps) {
  // Use a fallback to mock data if props are not provided (e.g., during development)
  const tourData = tour || MOCK_TOUR;
  const relatedToursData = relatedTours && relatedTours.length > 0 ? relatedTours : MOCK_RELATED_TOURS;
  const initialReviewsData = tourData.reviews && tourData.reviews.length > 0 ? tourData.reviews : [
    { rating: 5, author: { name: "Sarah J." }, text: "An absolutely wonderful experience! Our guide was knowledgeable and fun." },
    { rating: 4, author: { name: "Mark T." }, text: "Great tour, but the pace was a little fast for our group. Still highly recommend!" },
    { rating: 5, author: { name: "Lisa W." }, text: "The local food tasting was the highlight of the day. A perfect way to explore the city." }
  ];

  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  
  const [reviews, setReviews] = useState(initialReviewsData);
  const tourIsWishlisted = isWishlisted(tourData._id!);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tourIsWishlisted) {
      removeFromWishlist(tourData._id!);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist(tourData);
      toast.success('Added to wishlist!');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: tourData.title,
      text: `Check out this amazing tour: ${tourData.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Tour link copied to clipboard!');
      } catch (err) {
        toast.error('Could not copy link.');
      }
    }
  };

  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const overviewRef = useRef<HTMLDivElement>(null);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const practicalRef = useRef<HTMLDivElement>(null);
  const accessibilityRef = useRef<HTMLDivElement>(null);
  const policiesRef = useRef<HTMLDivElement>(null);
  const culturalRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  const inViewOptions = { threshold: 0.1 };
  const isOverviewInView = useInView(overviewRef, inViewOptions);
  const isItineraryInView = useInView(itineraryRef, inViewOptions);
  const isPracticalInView = useInView(practicalRef, inViewOptions);
  const isAccessibilityInView = useInView(accessibilityRef, inViewOptions);
  const isPoliciesInView = useInView(policiesRef, inViewOptions);
  const isCulturalInView = useInView(culturalRef, inViewOptions);
  const isReviewsInView = useInView(reviewsRef, inViewOptions);
  const isFaqInView = useInView(faqRef, inViewOptions);

  useEffect(() => {
    if (isFaqInView) setActiveTab('faq');
    else if (isReviewsInView) setActiveTab('reviews');
    else if (isCulturalInView) setActiveTab('cultural');
    else if (isPoliciesInView) setActiveTab('policies');
    else if (isAccessibilityInView) setActiveTab('accessibility');
    else if (isPracticalInView) setActiveTab('practical');
    else if (isItineraryInView) setActiveTab('itinerary');
    else if (isOverviewInView) setActiveTab('overview');
  }, [
    isOverviewInView, isItineraryInView, isPracticalInView, isAccessibilityInView,
    isPoliciesInView, isCulturalInView, isReviewsInView, isFaqInView
  ]);

  const scrollToSection = (id: string) => {
    let ref;
    switch (id) {
      case 'overview': ref = overviewRef; break;
      case 'itinerary': ref = itineraryRef; break;
      case 'practical': ref = practicalRef; break;
      case 'accessibility': ref = accessibilityRef; break;
      case 'policies': ref = policiesRef; break;
      case 'cultural': ref = culturalRef; break;
      case 'reviews': ref = reviewsRef; break;
      case 'faq': ref = faqRef; break;
      default: return;
    }
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const tourImages = [tourData.image, ...(tourData.images || [])].filter(Boolean);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'itinerary', label: 'Itinerary', icon: Clock },
    { id: 'practical', label: 'What to Know', icon: Backpack },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'policies', label: 'Policies', icon: Shield },
    { id: 'cultural', label: 'Cultural Info', icon: Heart },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'faq', label: 'FAQ', icon: MessageCircle }
  ];

  const handleQuickAdd = async () => {
    if (isAdding) return;
    setIsAdding(true);
    setLiveMessage('Adding tour to cart');

    try {
      const quickAddCartItem = {
        ...tourData,
        uniqueId: `${tourData._id}-quick-add-${Date.now()}`,
        quantity: 1,
        childQuantity: 0,
        selectedDate: new Date().toISOString(),
        selectedTime: 'Anytime',
        selectedAddOns: {},
        totalPrice: tourData.discountPrice,
      };
      addToCart(quickAddCartItem);
      setAdded(true);
      setLiveMessage('Added to cart');

      setTimeout(() => {
        setAdded(false);
      }, 2500);
    } catch (err) {
      console.error('Add to cart failed:', err);
      setLiveMessage('Failed to add to cart. Please try again.');
      setTimeout(() => {
        setLiveMessage('');
      }, 2500);
    } finally {
      setIsAdding(false);
    }
  };

  const openBookingSidebar = () => {
    setBookingSidebarOpen(true);
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <>
      <Header />
      <AnimatePresence>
        {isLightboxOpen && (
          <Lightbox
            images={tourImages}
            selectedIndex={selectedImageIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      <main className="bg-slate-50 pt-20">
        <div className="bg-white py-4">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-slate-500 hover:text-red-600">Home</Link>
              <span className="text-slate-400">/</span>
              <Link href="/tours" className="text-slate-500 hover:text-red-600">Tours</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-800 font-medium">{tourData.title}</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Link
            href="/tours"
            className="inline-flex items-center gap-2 text-red-600 font-semibold mb-6 hover:underline transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to all tours</span>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="relative">
                <div className="flex flex-wrap gap-2 mb-4">
                  {tourData.tags?.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className={`px-3 py-1 text-xs font-semibold uppercase rounded-full tracking-wide leading-none ${tag.includes('%') || tag === 'Online only deal'
                          ? 'bg-red-600 text-white'
                          : tag === 'Staff favourite'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div 
                  className="relative rounded-xl overflow-hidden shadow-lg mb-6 group cursor-pointer"
                  onClick={() => openLightbox(selectedImageIndex)}
                >
                  <Image
                    src={tourImages[selectedImageIndex]}
                    alt={tourData.title}
                    width={1200}
                    height={700}
                    className="w-full h-[420px] md:h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="text-white w-16 h-16" />
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={handleWishlistToggle}
                      className={`p-3 rounded-full backdrop-blur-sm transition-colors shadow-sm ${
                        tourIsWishlisted
                          ? 'bg-red-600 text-white'
                          : 'bg-white/80 text-slate-600 hover:bg-white hover:text-red-600'
                      }`}
                      aria-pressed={tourIsWishlisted}
                      aria-label={tourIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart size={20} fill={tourIsWishlisted ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-slate-600 hover:bg-white hover:text-slate-800 transition-colors shadow-sm"
                      aria-label="Share"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {tourImages.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tourImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all transform ${
                            selectedImageIndex === index
                                ? 'border-red-600 scale-105 shadow'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}
                        aria-label={`View image ${index + 1}`}
                      >
                        <Image
                          src={image}
                          alt={`${tourData.title} image ${index + 1}`}
                          width={80}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1 pr-6">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-3">
                      {tourData.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star size={16} className="text-yellow-500 fill-current" />
                          <span className="font-semibold text-slate-800">{tourData.rating}</span>
                        </div>
                        <span className="text-slate-500">({reviews.length} reviews)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{tourData.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={16} />
                        <span>{typeof tourData.destination === 'string' ? tourData.destination : (tourData.destination as any)?.name || 'Destination'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {tourData.originalPrice && (
                      <p className="text-slate-500 line-through text-lg mb-1">{formatPrice(tourData.originalPrice)}</p>
                    )}
                    <p className="text-3xl md:text-4xl font-extrabold text-red-600 mb-1">
                      {formatPrice(tourData.discountPrice)}
                    </p>
                    <p className="text-sm text-slate-500">per person</p>
                  </div>
                </div>
              </div>

              <TabNavigation
                activeTab={activeTab}
                tabs={tabs}
                scrollToSection={scrollToSection}
                isHeaderVisible={true} // Mocked for simplicity
              />

              <OverviewSection tour={tourData} sectionRef={overviewRef} />
              
              {tourData.itinerary && tourData.itinerary.length > 0 && (
                <ItinerarySection itinerary={tourData.itinerary} sectionRef={itineraryRef} />
              )}
              
              <PracticalInfoSection sectionRef={practicalRef} />
              <AccessibilitySection sectionRef={accessibilityRef} />
              <PoliciesSection sectionRef={policiesRef} />
              <CulturalSection sectionRef={culturalRef} />
              
              <ReviewsSection tour={tourData} initialReviews={initialReviewsData} sectionRef={reviewsRef} />
              
              <EnhancedFAQ faqs={tourData.faq || []} sectionRef={faqRef} />

              {tourData.meetingPoint && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Meeting point</h2>
                  <div className="flex items-start gap-4">
                    <MapPin className="text-red-600 mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-semibold text-slate-800">{tourData.meetingPoint}</p>
                      <p className="text-sm text-slate-600 mt-1">Check-in 15 minutes before departure time</p>
                      <button className="text-red-600 hover:underline text-sm font-medium mt-2">View on map</button>
                    </div>
                  </div>
                </div>
              )}

              {relatedToursData.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">You might also like</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedToursData.map((relatedTour: any) => (
                      <Link key={relatedTour._id} href={`/tour/${relatedTour.slug}`} className="group">
                        <div className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative">
                            <Image
                              src={relatedTour.image}
                              alt={relatedTour.title}
                              width={300}
                              height={200}
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {relatedTour.tags?.map((tag: string, index: number) => (
                              <span
                                key={index}
                                className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded ${tag.includes('%') ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                                  }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="p-3">
                            <h3 className="font-bold text-sm text-slate-800 mb-1 line-clamp-2">{relatedTour.title}</h3>
                            <div className="flex items-center gap-1 mb-1 text-xs text-slate-500">
                              <Clock size={12} />
                              <span>{relatedTour.duration}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Star size={12} className="text-yellow-500 fill-current" />
                                <span className="text-xs font-bold">{relatedTour.rating}</span>
                              </div>
                              <span className="font-bold text-red-600">{formatPrice(relatedTour.discountPrice)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      {tourData.originalPrice && (
                        <span className="text-slate-500 line-through text-lg">{formatPrice(tourData.originalPrice)}</span>
                      )}
                      <span className="text-4xl font-extrabold text-red-600">{formatPrice(tourData.discountPrice)}</span>
                    </div>
                    <p className="text-sm text-slate-500">per person</p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Clock size={20} className="text-red-500" />
                      <span>Duration: {tourData.duration}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Star size={20} className="text-yellow-500" />
                      <span>Rating: {tourData.rating} ({reviews.length} reviews)</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Users size={20} className="text-blue-500" />
                      <span>Available daily</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={openBookingSidebar}
                      className="shimmer-effect w-full bg-red-600 text-white font-bold py-4 px-6 rounded-full hover:bg-red-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <span className="shimmer-line"></span>
                      <Calendar size={20} />
                      <span>Select Date & Time</span>
                    </button>

                    <button
                      onClick={handleQuickAdd}
                      disabled={isAdding}
                      className={`shimmer-effect w-full relative overflow-hidden py-3 px-6 rounded-full border-2 font-bold flex items-center justify-center gap-2 transition-all duration-300 focus:outline-none ${added
                          ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105'
                          : 'bg-white text-red-600 border-red-600 hover:bg-red-50'
                        }`}
                      aria-live="polite"
                      aria-disabled={isAdding}
                    >
                      <span className="shimmer-line"></span>
                      {isAdding && (
                        <svg
                          className="animate-spin -ml-1 mr-2 h-5 w-5 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          ></path>
                        </svg>
                      )}
                      {added ? (
                        <>
                          <CheckCircle size={18} />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={18} />
                          <span>Quick Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <span>Free cancellation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone size={16} className="text-blue-600" />
                        <span>Mobile ticket</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-purple-600" />
                        <span>Safe & secure</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Languages size={16} className="text-orange-600" />
                        <span>Multi-language</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Headphones size={20} className="text-blue-600" />
                    Need help?
                  </h3>
                  <div className="space-y-3">
                    <button className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors w-full text-left">
                      <MessageCircle size={18} />
                      <span>Chat with us</span>
                    </button>
                    <a href="tel:+31204204000" className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
                      <Phone size={18} />
                      <span>+31 (0)20 420 4000</span>
                    </a>
                    <a href="mailto:info@egyptexcursionsonline.com" className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
                      <Mail size={18} />
                      <span>Email support</span>
                    </a>
                  </div>
                  <div className="mt-4 text-xs text-slate-500">
                    <p>Available 24/7 • Average response time: 5 minutes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BookingSidebar isOpen={isBookingSidebarOpen} onClose={() => setBookingSidebarOpen(false)} tour={tourData} />
      <StickyBookButton
        price={tourData.discountPrice}
        currency={'$'} 
        onClick={openBookingSidebar}
      />
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .shimmer-effect {
          position: relative;
          overflow: hidden;
        }
        .shimmer-effect .shimmer-line {
          position: absolute;
          top: 0;
          left: -150%;
          width: 75%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          animation: shimmer 2.5s infinite;
        }
        @keyframes shimmer {x
          100% {
            left: 150%;
          }
        }
      `}</style>
    </>
  );
}
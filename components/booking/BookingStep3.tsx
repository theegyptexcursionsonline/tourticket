'use client';

import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tour } from '@/types';
import { Plus, Check, Loader2, Star } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';
import Image from 'next/image';

interface BookingStep3Props {
    bookingData: any;
    setBookingData: (data: any) => void;
}

// --- MOCK DATA FOR RELATED TOURS ---
const relatedTours: Tour[] = [
  {
    id: 'amsterdam-light-festival',
    title: 'Amsterdam Light Festival 2025 - 2026',
    duration: '75-105 minutes',
    rating: 4.7,
    bookings: 134962,
    discountPrice: 32.50,
    image: '/images2/1.png',
    tags: ['Official partner', 'Staff favourite'],
    description: 'Experience Amsterdam\'s spectacular light festival',
    highlights: []
  },
  {
    id: 'body-worlds',
    title: 'BODY WORLDS Amsterdam',
    duration: '90 minutes',
    rating: 4.7,
    bookings: 300030,
    discountPrice: 25.00,
    image: '/images2/2.png',
    tags: ['Staff favourite', '-10%'],
    description: 'Fascinating journey through the human body',
    highlights: []
  },
  {
    id: 'art-museum',
    title: 'Amsterdam Art Museum',
    duration: '2 hours',
    rating: 4.2,
    bookings: 125000,
    discountPrice: 28.00,
    originalPrice: 35.00,
    image: '/images2/3.png',
    tags: ['Staff favourite', '-20%'],
    description: 'Discover masterpieces of Dutch art',
    highlights: []
  },
];


const RelatedTourCard: FC<{ tour: Tour; onAdd: (tour: Tour) => void }> = ({ tour, onAdd }) => {
  const { formatPrice } = useSettings();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleAddClick = async () => {
    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    onAdd(tour);
    setIsAdding(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };
  
  return (
    <div className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative">
        <Image src={tour.image} alt={tour.title} width={256} height={128} className="w-full h-32 object-cover" />
        <button 
          onClick={handleAddClick}
          disabled={isAdding || showSuccess}
          className={`absolute bottom-2 right-2 p-2 rounded-full shadow-lg transition-all duration-300 ${
            showSuccess 
              ? 'bg-green-500 text-white scale-110' 
              : isAdding 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-gray-700 hover:bg-red-500 hover:text-white hover:scale-110'
          }`}
        >
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                <Check size={16} />
              </motion.div>
            ) : isAdding ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 size={16} className="animate-spin" />
              </motion.div>
            ) : (
              <motion.div key="plus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Plus size={16} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
      
      <div className="p-3">
        <h4 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2 leading-tight">{tour.title}</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
            <Star size={12} className="text-yellow-400 mr-1" fill="currentColor" />
            <span>{tour.rating} ({tour.bookings} reviews)</span>
          </div>
          <div className="text-right">
            {tour.originalPrice && (
              <span className="text-xs text-gray-500 line-through mr-1">
                {formatPrice(tour.originalPrice)}
              </span>
            )}
            <span className="font-bold text-lg text-gray-900">
              {formatPrice(tour.discountPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BookingStep3: FC<BookingStep3Props> = ({ bookingData, setBookingData }) => {
    const { addToCart } = useCart();
    const { formatPrice } = useSettings();

    const handleAddRelatedTour = (relatedTour: Tour) => {
        addToCart(relatedTour);
    };

    return (
        <div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Enhance Your Trip</h2>
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Plus size={24} className="text-red-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">Private Transfer</p>
                            <p className="text-sm text-slate-500">Add an airport transfer for a seamless start to your trip.</p>
                            <p className="text-sm font-bold text-red-600 mt-1">{formatPrice(75.00)}</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={bookingData.privateTransfer}
                            onChange={(e) => setBookingData(prev => ({ ...prev, privateTransfer: e.target.checked }))}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                </div>
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Plus size={24} className="text-red-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">Private Guide</p>
                            <p className="text-sm text-slate-500">Hire a private guide for an exclusive and personalized experience.</p>
                            <p className="text-sm font-bold text-red-600 mt-1">{formatPrice(150.00)}</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={bookingData.privateGuide}
                            onChange={(e) => setBookingData(prev => ({ ...prev, privateGuide: e.target.checked }))}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                </div>
            </div>

            <div className="mt-8 border-t pt-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4">YOU MAY ALSO LIKE</h3>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                    {relatedTours.map((relatedTour) => (
                        <RelatedTourCard key={relatedTour.id} tour={relatedTour} onAdd={handleAddRelatedTour} />
                    ))}
                </div>
            </div>

            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default BookingStep3;
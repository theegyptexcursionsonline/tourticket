'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Clock, Calendar as CalendarIcon, ChevronDown, Plus, Minus, Users, Info, Shield, Smartphone, HeadphonesIcon, ShoppingCart, Loader2 } from 'lucide-react';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '../contexts/CartContext';

function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Mock related tours data
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
  }
];

const CalendarPopup: FC<{
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  onClose: () => void;
}> = ({ selectedDate, onDateSelect, onTimeSelect, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth()));
  const calendarRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(calendarRef, onClose);

  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getDate() === d2.getDate();

  const timeSlots = ['17:45', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-50" onClick={onClose} />
      <div ref={calendarRef} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-2xl border w-[90vw] max-w-[600px] max-h-[90vh] overflow-hidden">
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Select Date & Time</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="flex gap-6 flex-1 overflow-hidden">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-4">
                <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <span className="text-lg font-bold text-gray-600">‹</span>
                </button>
                <div className="font-bold text-lg text-gray-800">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <span className="text-lg font-bold text-gray-600">›</span>
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="font-semibold text-gray-500 p-2">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {dates.map((date, i) => {
                  const isSelected = isSameDay(date, selectedDate);
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isPast = date < new Date().setHours(0, 0, 0, 0);
                  
                  return (
                    <button
                      key={i}
                      onClick={() => !isPast && onDateSelect(date)}
                      disabled={isPast}
                      className={`p-3 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : !isCurrentMonth
                          ? 'text-gray-300'
                          : isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="w-px bg-gray-200"></div>
            <div className="flex-1">
              <h4 className="font-bold mb-4 text-gray-800">Pick a timeslot</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {timeSlots.map(time => (
                  <button 
                    key={time} 
                    onClick={() => onTimeSelect(time)} 
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 hover:border-blue-300 flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-800">{time}</span>
                    <div className="flex items-center text-gray-500 text-sm">
                      <Users size={14} className="mr-1"/>
                      {Math.floor(Math.random() * 100)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const RelatedTourCard: FC<{ tour: Tour; onAdd: (tour: Tour) => void }> = ({ tour, onAdd }) => {
  const { formatPrice } = useSettings();
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="relative">
        <img src={tour.image} alt={tour.title} className="w-full h-32 object-cover" />
        {tour.tags?.find(tag => tag.includes('%')) && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            {tour.tags.find(tag => tag.includes('%'))}
          </div>
        )}
        {tour.tags?.includes('Official partner') && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
            Official partner
          </div>
        )}
        {tour.tags?.includes('Staff favourite') && (
          <div className="absolute top-8 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
            Staff favourite
          </div>
        )}
        <button 
          onClick={() => onAdd(tour)}
          className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        >
          <Plus size={16} className="text-gray-700" />
        </button>
      </div>
      
      <div className="p-3">
        <div className="flex items-center gap-1 mb-2 text-sm">
          <Star size={14} className="text-yellow-500 fill-current" />
          <span className="font-bold">{tour.rating}</span>
          <span className="text-gray-500">{tour.bookings?.toLocaleString()} bookings</span>
        </div>
        
        <div className="flex items-center gap-1 mb-2 text-sm text-gray-500">
          <Clock size={14} />
          <span>{tour.duration}</span>
        </div>
        
        <h4 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2">{tour.title}</h4>
        
        <div className="flex items-center justify-between">
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

interface BookingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
}

const BookingSidebar: FC<BookingSidebarProps> = ({ isOpen, onClose, tour }) => {
  const router = useRouter();
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  
  const [ticketType, setTicketType] = useState('Central Station');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (tour) {
      setTicketType('Central Station');
      setSelectedDate(new Date());
      setSelectedTime('');
      setGuests(1);
      setHasDiscount(false);
      setIsNavigating(false);
    }
  }, [tour]);

  if (!tour) return null;

  const handleAddToCart = () => {
    if (!selectedTime) {
      const timeButton = document.getElementById('time-picker-button');
      if (timeButton) {
        timeButton.focus();
        timeButton.classList.add('border-red-500', 'animate-pulse');
        setTimeout(() => timeButton.classList.remove('border-red-500', 'animate-pulse'), 2000);
      }
      return false;
    }
    
    const cartItem = {
      ...tour,
      quantity: guests,
      details: `${ticketType}, ${selectedDate.toLocaleDateString()}, ${selectedTime}`
    };
    
    addToCart(cartItem);
    return true;
  };

  const handleAddRelatedTour = (relatedTour: Tour) => {
    addToCart(relatedTour);
  };

  const proceedToCheckout = async () => {
    try {
      setIsNavigating(true);
      
      // Add to cart first
      const success = handleAddToCart();
      if (!success) {
        setIsNavigating(false);
        return;
      }

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigate to checkout
      router.push('/checkout');
      
      // Close sidebar after successful navigation
      onClose();
      
    } catch (error) {
      console.error('Navigation failed:', error);
      setIsNavigating(false);
      // You could show an error message here
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-40 flex justify-end"
          >
            <motion.div 
              className="absolute inset-0 bg-black/30" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={onClose} 
            />
            <motion.div 
              className="relative bg-white h-full w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="p-4 flex justify-between items-center border-b flex-shrink-0">
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-500 fill-current" />
                    <span>{tour.rating}</span>
                  </div>
                  <span className="text-slate-300">&#183;</span>
                  <span>{tour.bookings?.toLocaleString()} bookings</span>
                  <span className="text-slate-300">&#183;</span>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{tour.duration}</span>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-1 rounded-full text-slate-500 hover:bg-slate-100"
                  disabled={isNavigating}
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Tour Selection */}
                <div className="p-6">
                  <h2 className="text-3xl font-extrabold text-slate-800 mb-6">{tour.title}</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="font-semibold text-slate-700 flex items-center">
                        Tickets <span className="text-yellow-400 ml-1">*</span>
                      </label>
                      <div className="relative mt-1">
                        <select 
                          value={ticketType} 
                          onChange={(e) => setTicketType(e.target.value)} 
                          className="w-full p-3 border-2 border-slate-200 rounded-lg appearance-none bg-white focus:border-blue-500 outline-none"
                          disabled={isNavigating}
                        >
                          <option>Central Station</option>
                          <option>Rijksmuseum</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-700">Date</label>
                        <button 
                          onClick={() => setShowCalendar(true)} 
                          className="w-full mt-1 p-3 border-2 border-slate-200 rounded-lg text-left flex justify-between items-center bg-white focus:border-blue-500 outline-none hover:border-slate-300 transition-colors"
                          disabled={isNavigating}
                        >
                          <span className="text-slate-700">{selectedDate.toLocaleDateString()}</span>
                          <CalendarIcon className="w-5 h-5 text-slate-400"/>
                        </button>
                      </div>
                      
                      <div>
                        <label className="font-semibold text-slate-700">Time</label>
                        <button 
                          id="time-picker-button" 
                          onClick={() => setShowCalendar(true)} 
                          className={`w-full mt-1 p-3 border-2 rounded-lg text-left bg-white focus:border-blue-500 outline-none hover:border-slate-300 transition-colors ${
                            selectedTime ? 'border-slate-200 text-slate-700' : 'border-slate-200 text-slate-400'
                          }`}
                          disabled={isNavigating}
                        >
                          <span>{selectedTime || 'Pick a time'}</span>
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="font-semibold text-slate-700">Guests</label>
                      <div className="flex items-center justify-between mt-1 w-full p-2 border-2 border-slate-200 rounded-lg">
                        <button 
                          onClick={() => setGuests(g => Math.max(1, g - 1))} 
                          className="p-2 rounded-md hover:bg-slate-100 text-slate-700 disabled:opacity-50 transition-colors" 
                          disabled={guests <= 1 || isNavigating}
                        >
                          <Minus size={16}/>
                        </button>
                        <span className="font-bold text-lg text-slate-800">{guests}</span>
                        <button 
                          onClick={() => setGuests(g => g + 1)} 
                          className="p-2 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
                          disabled={isNavigating}
                        >
                          <Plus size={16}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust Indicators */}
                <div className="px-6 py-4 bg-slate-50 border-t border-b">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-green-600" />
                      <span>Easy and secure booking</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-blue-600" />
                      <span>Ticket is directly available on smartphone</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                    <div className="flex items-center gap-2">
                      <HeadphonesIcon size={16} className="text-purple-600" />
                      <span>Excellent customer service</span>
                    </div>
                  </div>
                </div>

                {/* Discount Code */}
                <div className="px-6 py-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasDiscount}
                      onChange={(e) => setHasDiscount(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={isNavigating}
                    />
                    <span className="text-slate-700">I have a discount code</span>
                  </label>
                </div>

                {/* You May Also Like */}
                <div className="px-6 py-4 border-t">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">YOU MAY ALSO LIKE</h3>
                  <div className="space-y-4">
                    {relatedTours.slice(0, 3).map((relatedTour) => (
                      <RelatedTourCard 
                        key={relatedTour.id} 
                        tour={relatedTour} 
                        onAdd={handleAddRelatedTour}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-6 border-t bg-white flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-lg">Total</span>
                  <div className="text-right">
                    {tour.originalPrice && (
                      <p className="text-slate-500 line-through">
                        {formatPrice(tour.originalPrice * guests)}
                      </p>
                    )}
                    <p className="font-extrabold text-2xl text-slate-800">
                      {formatPrice(tour.discountPrice * guests)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={proceedToCheckout}
                  disabled={isNavigating}
                  className="w-full bg-red-500 text-white font-bold py-3 rounded-full hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors text-lg flex items-center justify-center gap-2"
                >
                  {isNavigating ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>PROCESSING...</span>
                    </>
                  ) : (
                    <span>TO CHECKOUT</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar Popup */}
      <AnimatePresence>
        {showCalendar && !isNavigating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <CalendarPopup 
              selectedDate={selectedDate} 
              onDateSelect={(date) => { 
                setSelectedDate(date); 
              }} 
              onTimeSelect={(time) => { 
                setSelectedTime(time); 
                setShowCalendar(false); 
              }} 
              onClose={() => setShowCalendar(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BookingSidebar;
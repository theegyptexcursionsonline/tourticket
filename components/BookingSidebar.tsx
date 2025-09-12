'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Clock, Calendar as CalendarIcon, ChevronDown, Plus, Minus, Users, Shield, Smartphone, HeadphonesIcon, Loader2, ChevronLeft, ChevronRight, ShoppingCart, ArrowRight, Check } from 'lucide-react';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '../contexts/CartContext';

// --- HELPER HOOK: useOnClickOutside ---
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


// --- HELPER COMPONENT: CalendarPopup ---
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
                  const isPast = date < new Date(new Date().setDate(new Date().getDate() -1));

                  return (
                    <button
                      key={i}
                      onClick={() => !isPast && onDateSelect(date)}
                      disabled={isPast}
                      className={`p-3 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-red-500 text-white'
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
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 hover:border-red-300 flex justify-between items-center"
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


// --- HELPER COMPONENT: RelatedTourCard ---
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
        <img src={tour.image} alt={tour.title} className="w-full h-32 object-cover" />
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


// --- STEP PROGRESS INDICATOR COMPONENT (New) ---
const StepIndicator: FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-600">Step {currentStep} of {totalSteps}</span>
      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-red-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ ease: "easeInOut", duration: 0.5 }}
        />
      </div>
    </div>
  );
};


// --- MAIN BOOKING SIDEBAR COMPONENT (Re-implemented) ---
interface BookingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
}

const BookingSidebar: FC<BookingSidebarProps> = ({ isOpen, onClose, tour }) => {
  const router = useRouter();
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  
  // --- STATE MANAGEMENT ---
  const [currentStep, setCurrentStep] = useState(1);
  const [ticketType, setTicketType] = useState('Central Station');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when a new tour is selected or sidebar is re-opened
  useEffect(() => {
    if (isOpen && tour) {
      setCurrentStep(1);
      setTicketType('Central Station');
      setSelectedDate(new Date());
      setSelectedTime('');
      setGuests(1);
      setHasDiscount(false);
      setIsProcessing(false);
    }
  }, [isOpen, tour]);


  // --- NAVIGATION LOGIC (New) ---
  const handleNext = () => {
    // Validation for step 1
    if (currentStep === 1 && !selectedTime) {
      const timeButton = document.getElementById('time-picker-button');
      if (timeButton) {
        timeButton.focus();
        timeButton.classList.add('border-red-500', 'animate-pulse');
        setTimeout(() => timeButton.classList.remove('border-red-500', 'animate-pulse'), 2000);
      }
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // --- CART ACTION LOGIC (Updated) ---
  const handleAddToCartAndContinue = async () => {
    if (!tour) return;
    setIsProcessing(true);
    const cartItem = {
      ...tour,
      quantity: guests,
      details: `${ticketType}, ${selectedDate.toLocaleDateString()}, ${selectedTime}`
    };
    addToCart(cartItem);
    await new Promise(resolve => setTimeout(resolve, 300));
    onClose();
    router.push('/');
  };

  const proceedToCheckout = async () => {
    if (!tour) return;
    setIsProcessing(true);
    const cartItem = {
      ...tour,
      quantity: guests,
      details: `${ticketType}, ${selectedDate.toLocaleDateString()}, ${selectedTime}`
    };
    addToCart(cartItem);
    await new Promise(resolve => setTimeout(resolve, 300));
    onClose();
    router.push('/checkout');
  };

  const handleAddRelatedTour = (relatedTour: Tour) => {
    addToCart(relatedTour);
  };

  if (!tour) return null;

  // --- RENDER LOGIC ---
  const renderStepContent = () => {
    const stepVariants = {
      hidden: { opacity: 0, x: 20 },
      visible: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={stepVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="p-6"
        >
          {currentStep === 1 && (
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Select Date & Time</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700">Date</label>
                  <button onClick={() => setShowCalendar(true)} className="w-full mt-1 p-3 border-2 border-slate-200 rounded-lg text-left flex justify-between items-center bg-white hover:border-slate-300">
                    <span className="text-slate-700">{selectedDate.toLocaleDateString('en-GB')}</span>
                    <CalendarIcon className="w-5 h-5 text-slate-400"/>
                  </button>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Time <span className="text-yellow-400">*</span></label>
                  <button id="time-picker-button" onClick={() => setShowCalendar(true)} className={`w-full mt-1 p-3 border-2 rounded-lg text-left transition-colors ${selectedTime ? 'border-slate-200 text-slate-700' : 'border-slate-200 text-slate-400'}`}>
                    <span>{selectedTime || 'Pick a time'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Tickets & Guests</h2>
              <div className="space-y-5">
                <div>
                  <label className="font-semibold text-slate-700">Tickets</label>
                  <div className="relative mt-1">
                    <select value={ticketType} onChange={(e) => setTicketType(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-lg appearance-none bg-white">
                      <option>Central Station</option>
                      <option>Rijksmuseum</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Guests</label>
                  <div className="flex items-center justify-between mt-1 w-full p-2 border-2 border-slate-200 rounded-lg">
                    <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50" disabled={guests <= 1}>
                      <Minus size={16}/>
                    </button>
                    <span className="font-bold text-lg text-slate-800">{guests}</span>
                    <button onClick={() => setGuests(g => g + 1)} className="p-2 rounded-md hover:bg-slate-100">
                      <Plus size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Enhance Your Trip</h2>
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                  <span className="text-slate-700">I have a discount code</span>
                </label>
              </div>
              <div className="border-t pt-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4">YOU MAY ALSO LIKE</h3>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                  {relatedTours.map((relatedTour) => (
                    <RelatedTourCard key={relatedTour.id} tour={relatedTour} onAdd={handleAddRelatedTour} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-4">Review & Book</h2>
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-slate-700 border">
                <p><strong>Tour:</strong> {tour.title}</p>
                <p><strong>Date:</strong> {selectedDate.toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> {selectedTime}</p>
                <p><strong>Guests:</strong> {guests}</p>
                <div className="pt-2 border-t mt-2 flex justify-between items-baseline">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-extrabold text-2xl text-slate-800">{formatPrice(tour.discountPrice * guests)}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex justify-end">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.div className="relative bg-white h-full w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <div className="p-4 flex justify-between items-center border-b flex-shrink-0">
                <StepIndicator currentStep={currentStep} totalSteps={4} />
                <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100" disabled={isProcessing}>
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">{renderStepContent()}</div>

              <div className="p-6 border-t bg-white flex-shrink-0">
                {currentStep < 4 && (
                  <div className="flex items-center justify-between">
                    <button onClick={handleBack} className={`font-bold py-3 px-6 rounded-full transition-colors ${currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`} disabled={currentStep === 1}>
                      Back
                    </button>
                    <button onClick={handleNext} disabled={(currentStep === 1 && !selectedTime) || isProcessing} className="bg-red-500 text-white font-bold py-3 px-8 rounded-full hover:bg-red-600 disabled:bg-red-300 flex items-center gap-2">
                      {currentStep === 3 ? 'Review & Book' : 'Next'} <ArrowRight size={16} />
                    </button>
                  </div>
                )}
                {currentStep === 4 && (
                  <div className="space-y-3">
                    <button onClick={handleAddToCartAndContinue} disabled={isProcessing} className="w-full bg-slate-800 text-white font-bold py-3 rounded-full hover:bg-slate-900 disabled:bg-slate-400 transition-colors text-lg flex items-center justify-center gap-2">
                      {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <><ShoppingCart size={20} /> Add to Cart</>}
                    </button>
                    <button onClick={proceedToCheckout} disabled={isProcessing} className="w-full bg-red-500 text-white font-bold py-3 rounded-full hover:bg-red-600 disabled:bg-red-300 transition-colors text-lg">
                      {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCalendar && !isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CalendarPopup
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onTimeSelect={(time) => { setSelectedTime(time); setShowCalendar(false); }}
              onClose={() => setShowCalendar(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
};

export default BookingSidebar;
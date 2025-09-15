'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  X, ArrowRight, ArrowLeft, Calendar, ShoppingCart, CreditCard, 
  Loader2, Clock, User, Users, Smile, Check, Languages, 
  PlusCircle, Minus, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

// Types
interface Tour {
  id: string;
  title: string;
  image: string;
  originalPrice: number;
  discountPrice: number;
  destinationId: string;
}

interface CartItem extends Tour {
  quantity: number;
  childQuantity: number;
  selectedDate: string;
  selectedTime: string;
  uniqueId?: string;
}

interface AddOnTour {
  id: 'atv-sunset' | 'shared-quad';
  title: string;
  duration: string;
  languages: string[];
  description: string;
  price: number;
  availableTimes: string[];
}

type SelectedAddOns = {
  [key: string]: string; // addonId: selectedTime
};

interface BookingData {
  selectedDate: Date;
  selectedTime: string;
  adults: number;
  children: number;
  selectedAddOns: SelectedAddOns;
}

// Sample data
const addOnData: AddOnTour[] = [
  {
    id: 'atv-sunset',
    title: '3-Hour ATV Quad Tour Sunset with Transfer',
    duration: '3 Hours',
    languages: ['English', 'German'],
    description: 'Enjoy a thrilling 30 k.m quad bike ride deep into the desert to a traditional Bedouin village. You\'ll be welcomed with authentic hospitality, learn about their ancient culture.',
    price: 25.00,
    availableTimes: ['2:00 PM', '3:00 PM'],
  },
  {
    id: 'shared-quad',
    title: 'Shared 2-Hour Quad Bike Tour',
    duration: '2 Hours',
    languages: ['English'],
    description: 'A thrilling shared quad bike adventure through the desert canyons. This tour is perfect for a quick and exciting taste of desert exploration.',
    price: 22.00,
    availableTimes: ['10:00 AM', '2:00 PM'],
  }
];

const availableTimes = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM'
];

// Mock hooks
const useSettings = () => ({
  formatPrice: (price: number) => `€${price.toFixed(2)}`
});

const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const addToCart = (item: CartItem) => {
    const uniqueId = `${item.id}_${Date.now()}`;
    setCart(prev => [...prev, { ...item, uniqueId }]);
  };
  
  const removeFromCart = (uniqueId: string) => {
    setCart(prev => prev.filter(item => item.uniqueId !== uniqueId));
  };
  
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity + item.childQuantity, 0);
  
  return { cart, addToCart, removeFromCart, openCart, closeCart, isCartOpen, totalItems };
};

// Components
const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const percent = Math.max(0, Math.round(((currentStep - 1) / (totalSteps - 1)) * 100));
  return (
    <div className="flex items-center gap-2 sm:gap-4 w-full">
      <div className="flex items-center gap-1 sm:gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const step = i + 1;
          return (
            <div key={step} className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-colors ${
              step <= currentStep ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step}
            </div>
          );
        })}
      </div>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-red-500"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <span className="text-xs text-slate-500 hidden sm:inline">{percent}%</span>
    </div>
  );
};

const AnimatedCounter: React.FC<{
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  minValue?: number;
}> = ({ value, onIncrement, onDecrement, minValue = 0 }) => {
  return (
    <div className="flex items-center gap-2 sm:gap-4 border-2 border-slate-200 rounded-full p-1 bg-white shadow-sm">
      <motion.button
        onClick={onDecrement}
        whileTap={{ scale: 0.9 }}
        className="p-1.5 sm:p-2.5 rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={value <= minValue}
        aria-label="Remove one"
      >
        <Minus size={16} />
      </motion.button>
      
      <div className="font-bold text-lg sm:text-xl text-slate-800 w-8 sm:w-10 text-center">
        <motion.span 
          key={value} 
          initial={{ y: -20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: 20, opacity: 0 }} 
          transition={{ duration: 0.2 }}
        >
          {value}
        </motion.span>
      </div>

      <motion.button
        onClick={onIncrement}
        whileTap={{ scale: 0.9 }}
        className="p-1.5 sm:p-2.5 rounded-full text-slate-500 hover:bg-slate-100"
        aria-label="Add one"
      >
        <Plus size={16} />
      </motion.button>
    </div>
  );
};

// Step 1: Date & Time Selection
const BookingStep1: React.FC<{
  bookingData: BookingData;
  setBookingData: React.Dispatch<React.SetStateAction<BookingData>>;
}> = ({ bookingData, setBookingData }) => {
  const [showTimeSelection, setShowTimeSelection] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setBookingData(prev => ({ ...prev, selectedDate: date, selectedTime: '' }));
      setTimeout(() => setShowTimeSelection(true), 500);
    }
  };

  const handleTimeSelect = (time: string) => {
    setBookingData(prev => ({ ...prev, selectedTime: time }));
  };

  const goBackToDateSelection = () => {
    setShowTimeSelection(false);
  };

  useEffect(() => {
    if (!bookingData.selectedDate) {
      setShowTimeSelection(false);
    }
  }, [bookingData.selectedDate]);

  const isToday = bookingData.selectedDate 
    ? bookingData.selectedDate.toDateString() === new Date().toDateString()
    : false;

  const filteredTimes = isToday ? availableTimes.filter(time => {
    try {
      const match = time.match(/(\d+):(\d+) (AM|PM)/);
      if (!match) return false;
      
      const [, hour, minute, ampm] = match;
      let hour24 = parseInt(hour, 10);
      
      if (ampm === 'PM' && hour24 !== 12) {
        hour24 += 12;
      }
      if (ampm === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      const timeDate = new Date(bookingData.selectedDate!);
      timeDate.setHours(hour24, parseInt(minute, 10), 0, 0);

      return timeDate > new Date();
    } catch (error) {
      console.error('Error parsing time:', error);
      return true;
    }
  }) : availableTimes;

  useEffect(() => {
    if (bookingData.selectedTime && !filteredTimes.includes(bookingData.selectedTime)) {
      setBookingData(prev => ({ ...prev, selectedTime: '' }));
    }
  }, [filteredTimes, bookingData.selectedTime]);

  const pickerStyles = `
    .rdp {
      --rdp-cell-size: 40px;
      --rdp-accent-color: #dc2626;
      --rdp-background-color: #dc2626;
      margin: 0;
    }
    .rdp-months {
      justify-content: center;
    }
    .rdp-month {
      margin: 0;
    }
    .rdp-table {
      margin: 0;
      max-width: none;
    }
    .rdp-head_cell {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }
    .rdp-button {
      border: none;
      border-radius: 12px;
      width: 40px;
      height: 40px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
      background-color: #f1f5f9;
      transform: scale(1.05);
    }
    .rdp-day_selected {
      background-color: #dc2626 !important;
      color: white !important;
      font-weight: 600;
    }
    .rdp-day_selected:hover {
      background-color: #b91c1c !important;
    }
    .rdp-day_today:not(.rdp-day_selected) {
      font-weight: 600;
      color: #dc2626;
      background-color: #fef2f2;
      border: 2px solid #dc2626;
    }
    .rdp-button[disabled] {
      opacity: 0.3;
      cursor: not-allowed;
    }
    @media (max-width: 640px) {
      .rdp {
        --rdp-cell-size: 35px;
      }
      .rdp-button {
        width: 35px;
        height: 35px;
        font-size: 13px;
      }
    }
  `;

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-0">
      <style>{pickerStyles}</style>
      
      <AnimatePresence mode="wait">
        {!showTimeSelection ? (
          <motion.div
            key="date-selection"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4">
                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Select Date
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                Choose Your Preferred Date
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                Select an available date for your appointment
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-4 sm:px-6 py-4 border-b border-red-200">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <Calendar className="text-white" size={20} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-800">Choose Date</h3>
                    <p className="text-sm text-slate-600">Click on any available date</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-8">
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={bookingData.selectedDate || undefined}
                    onSelect={handleDateSelect}
                    disabled={{ before: new Date() }}
                    showOutsideDays
                    fixedWeeks
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {bookingData.selectedDate && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 sm:mt-6 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 sm:p-6"
              >
                <div className="text-center">
                  <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-2">Date Selected!</h4>
                  <div className="flex items-center justify-center gap-2 bg-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm mb-3">
                    <Calendar size={18} className="text-blue-600" />
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">
                      {bookingData.selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
                    <Clock size={16} />
                    <span>Proceeding to time selection...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="time-selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={goBackToDateSelection}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors duration-200 bg-slate-100 hover:bg-slate-200 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base"
                >
                  <ArrowLeft size={16} />
                  <span className="font-medium">Back</span>
                </button>
                
                <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 sm:px-4 py-2 rounded-full text-sm font-medium">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Select Time
                </div>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                Choose Your Preferred Time
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                Select an available time slot for your appointment
              </p>
            </div>

            <div className="mb-4 sm:mb-6 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-center gap-2 text-slate-700">
                <Calendar size={16} className="text-red-600" />
                <span className="font-medium text-sm sm:text-base">
                  {bookingData.selectedDate?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-4 sm:px-6 py-4 border-b border-red-200">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <Clock className="text-white" size={20} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-800">Available Time Slots</h3>
                    <p className="text-sm text-slate-600">Click to select your preferred time</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-8">
                {filteredTimes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="text-slate-400" size={24} />
                    </div>
                    <h4 className="text-lg font-medium text-slate-600 mb-2">No Available Slots</h4>
                    <p className="text-slate-500 mb-4 text-sm sm:text-base">No time slots available for this date</p>
                    <button
                      onClick={goBackToDateSelection}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 rounded-lg transition-colors duration-200 text-sm sm:text-base"
                    >
                      Choose Different Date
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                    {filteredTimes.map((time, index) => (
                      <motion.button
                        key={time}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleTimeSelect(time)}
                        className={`p-3 sm:p-4 rounded-xl text-left font-medium transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                          bookingData.selectedTime === time
                            ? 'bg-red-600 text-white border-red-600 shadow-lg transform scale-105'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-red-300 hover:bg-slate-100 hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Clock size={16} className={bookingData.selectedTime === time ? 'text-white' : 'text-red-600'} />
                          <span className="text-sm sm:text-lg">{time}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {bookingData.selectedTime && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 sm:mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 sm:p-6"
              >
                <div className="text-center">
                  <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">✅ Appointment Details</h4>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm">
                      <Calendar size={16} className="text-green-600" />
                      <span className="font-medium text-slate-700 text-sm sm:text-base">
                        {bookingData.selectedDate?.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm">
                      <Clock size={16} className="text-green-600" />
                      <span className="font-medium text-slate-700 text-base sm:text-lg">
                        {bookingData.selectedTime}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-green-700 mt-3 font-medium">
                    Ready to proceed to the next step!
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Step 2: Participants Selection
const BookingStep2: React.FC<{
  bookingData: BookingData;
  setBookingData: React.Dispatch<React.SetStateAction<BookingData>>;
  tour: Tour;
}> = ({ bookingData, setBookingData, tour }) => {
  const { formatPrice } = useSettings();
  const pricePerAdult = tour.discountPrice || 0;
  const pricePerChild = pricePerAdult / 2;
  
  const handleParticipantChange = (type: 'adults' | 'children', change: number) => {
    setBookingData(prev => {
      const currentCount = prev[type];
      const newCount = Math.max(type === 'adults' ? 1 : 0, currentCount + change);
      return { ...prev, [type]: newCount };
    });
  };

  return (
    <div className="px-2 sm:px-0">
      <div className="text-center mb-6 sm:mb-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
          className="w-12 h-12 sm:w-16 sm:h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4"
        >
          <Users size={24} />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Who's Coming?</h2>
        <p className="text-slate-600 mt-2 text-sm sm:text-base">Specify the number of participants for your tour.</p>
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-xl bg-slate-50"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-base sm:text-lg text-slate-800">Adults</p>
              <p className="text-sm text-slate-500">
                Age 13+ <span className="font-semibold text-slate-700">({formatPrice(pricePerAdult)})</span>
              </p>
            </div>
          </div>
          <AnimatedCounter 
            value={bookingData.adults}
            onIncrement={() => handleParticipantChange('adults', 1)}
            onDecrement={() => handleParticipantChange('adults', -1)}
            minValue={1}
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-xl bg-slate-50"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <Smile className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-base sm:text-lg text-slate-800">Children</p>
              <p className="text-sm text-slate-500">
                Age 4-12 <span className="font-semibold text-slate-700">({formatPrice(pricePerChild)})</span>
              </p>
            </div>
          </div>
          <AnimatedCounter 
            value={bookingData.children}
            onIncrement={() => handleParticipantChange('children', 1)}
            onDecrement={() => handleParticipantChange('children', -1)}
            minValue={0}
          />
        </motion.div>
      </div>
    </div>
  );
};

// Add-on Tour Card Component
const AddOnTourCard: React.FC<{
  addOn: AddOnTour;
  isSelected: boolean;
  selectedTime?: string;
  onSelect: (id: AddOnTour['id'], time: string) => void;
  onDeselect: (id: AddOnTour['id']) => void;
}> = ({ addOn, isSelected, selectedTime, onSelect, onDeselect }) => {
  const { formatPrice } = useSettings();

  const handleTimeClick = (time: string) => {
    if (isSelected && selectedTime === time) {
      onDeselect(addOn.id);
    } else {
      onSelect(addOn.id, time);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: addOn.id === 'atv-sunset' ? 0.2 : 0.35, type: 'spring', stiffness: 100 }}
      className={`p-4 sm:p-5 border-2 rounded-2xl transition-all duration-300 ease-in-out ${
        isSelected ? 'bg-purple-50 border-purple-600 shadow-xl' : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col">
        <div className="flex flex-col gap-2 justify-between items-start mb-3">
          <h4 className="font-extrabold text-slate-900 text-lg sm:text-xl">{addOn.title}</h4>
          {isSelected && (
            <div className="flex items-center gap-2 bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full text-sm">
              <Check size={14} />
              <span>Selected at {selectedTime}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 my-3 text-sm text-slate-600">
          <div className="flex items-center gap-1.5"><Clock size={14} /><span>{addOn.duration}</span></div>
<div className="flex items-center gap-1.5"><Languages size={14} /><span>{addOn.languages.join(', ')}</span></div>
        </div>
        <p className="text-sm text-slate-600 mb-4">{addOn.description}</p>
        <button className="text-sm font-bold text-purple-700 hover:underline mb-5 text-left">View Pickup Areas</button>

        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">Select a starting time:</label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {addOn.availableTimes.map(time => {
              const isTimeSelected = isSelected && selectedTime === time;
              return (
                <button
                  key={time}
                  onClick={() => handleTimeClick(time)}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                    isTimeSelected
                      ? 'bg-purple-600 text-white shadow-lg scale-105'
                      : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-purple-500'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="border-t border-slate-200 flex justify-between items-center mt-5 pt-4">
          <div className="text-slate-700">
            <span className="font-semibold text-sm sm:text-base">Price per Adult:</span>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{formatPrice(addOn.price)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Step 3: Add-ons Selection
const BookingStep3: React.FC<{
  bookingData: BookingData;
  setBookingData: React.Dispatch<React.SetStateAction<BookingData>>;
  tour: Tour;
}> = ({ bookingData, setBookingData }) => {
  
  const handleSelectAddOn = (addOnId: AddOnTour['id'], time: string) => {
    setBookingData(prev => ({
      ...prev,
      selectedAddOns: {
        ...prev.selectedAddOns,
        [addOnId]: time
      }
    }));
  };
  
  const handleDeselectAddOn = (addOnId: AddOnTour['id']) => {
    setBookingData(prev => {
      const newSelectedAddOns = { ...prev.selectedAddOns };
      delete newSelectedAddOns[addOnId];
      return {
        ...prev,
        selectedAddOns: newSelectedAddOns
      };
    });
  };

  return (
    <div className="px-2 sm:px-0">
      <div className="text-center mb-8 sm:mb-10">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 text-purple-600 rounded-full mx-auto flex items-center justify-center mb-4">
          <PlusCircle size={24} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Available Add-ons</h2>
        <p className="text-slate-600 mt-2 max-w-md mx-auto text-sm sm:text-base">
          Enhance your main tour by adding these exciting local experiences. You can select multiple add-ons.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {addOnData.map(addOn => (
          <AddOnTourCard 
            key={addOn.id}
            addOn={addOn}
            isSelected={!!bookingData.selectedAddOns?.[addOn.id]}
            selectedTime={bookingData.selectedAddOns?.[addOn.id]}
            onSelect={handleSelectAddOn}
            onDeselect={handleDeselectAddOn}
          />
        ))}
      </div>
    </div>
  );
};

// Step 4: Review & Booking
const BookingStep4: React.FC<{
  bookingData: BookingData;
  tour: Tour;
  onClose: () => void;
}> = ({ bookingData, tour }) => {
  const { formatPrice } = useSettings();

  const { subtotal, extras, total, selectedAddOnDetails } = useMemo(() => {
    const pricePerAdult = tour.discountPrice || 0;
    const pricePerChild = pricePerAdult / 2;
    const subtotalCalc = (bookingData.adults * pricePerAdult) + (bookingData.children * pricePerChild);
    
    const extrasCalc = Object.keys(bookingData.selectedAddOns).reduce((acc, addOnId) => {
      const addOn = addOnData.find(a => a.id === addOnId);
      if (addOn) {
        return acc + (addOn.price * bookingData.adults);
      }
      return acc;
    }, 0);
    
    const selectedAddOnsDetails = Object.keys(bookingData.selectedAddOns).map(addOnId => {
      const addOn = addOnData.find(a => a.id === addOnId);
      return addOn ? {
        ...addOn,
        selectedTime: bookingData.selectedAddOns[addOnId]
      } : null;
    }).filter(Boolean);
    
    return {
      subtotal: subtotalCalc,
      extras: extrasCalc,
      total: subtotalCalc + extrasCalc,
      selectedAddOnDetails: selectedAddOnsDetails,
    };
  }, [tour, bookingData]);

  return (
    <div className="px-2 sm:px-0">
      <div className="text-center mb-6 sm:mb-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.1,
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
          className="w-12 h-12 sm:w-16 sm:h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4"
        >
          <Check size={24} />
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Review & Book</h2>
        <p className="text-slate-600 mt-2 text-sm sm:text-base">
          Please confirm your selections before proceeding.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-slate-200 space-y-4 sm:space-y-5"
      >
        <div>
          <h3 className="font-bold text-lg sm:text-xl text-slate-800">{tour.title}</h3>
          <div className="text-sm text-slate-500 mt-2 space-y-2">
            <p className="flex items-center gap-2">
              <Calendar size={14} />
              <span>
                {bookingData.selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Clock size={14} /> <span>{bookingData.selectedTime}</span>
            </p>
            <p className="flex items-center gap-2">
              <Users size={14} />
              <span>
                {bookingData.adults} Adults{bookingData.children > 0 && `, ${bookingData.children} Children`}
              </span>
            </p>
          </div>
        </div>

        {selectedAddOnDetails && selectedAddOnDetails.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-3">Selected Add-ons:</h4>
            {selectedAddOnDetails.map((addOn: any) => (
              <div key={addOn.id} className="mb-3 last:mb-0">
                <h5 className="font-bold text-base sm:text-lg text-slate-800">{addOn.title}</h5>
                <div className="text-sm text-slate-500 mt-1 space-y-1">
                  <p className="flex items-center gap-2">
                    <Clock size={14} /> <span>{addOn.selectedTime}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Price: {formatPrice(addOn.price)} per adult</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 space-y-2">
          <div className="flex justify-between text-slate-600">
            <p>Main Tour Subtotal</p>
            <p>{formatPrice(subtotal)}</p>
          </div>
          {extras > 0 && (
            <div className="flex justify-between text-slate-600">
              <p>Add-ons Subtotal</p>
              <p>{formatPrice(extras)}</p>
            </div>
          )}
          <div className="flex justify-between items-baseline text-slate-900 pt-2 border-t border-slate-200">
            <p className="text-lg sm:text-xl font-bold">Grand Total</p>
            <p className="text-xl sm:text-2xl font-extrabold">{formatPrice(total)}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Main Booking Sidebar Component
interface BookingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
}

const BookingSidebar: React.FC<BookingSidebarProps> = ({ isOpen, onClose, tour }) => {
  const { formatPrice } = useSettings();
  const { addToCart, openCart } = useCart();
  const router = useRouter();
  const totalSteps = 4;
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState<false | 'cart' | 'checkout'>(false);

  const [bookingData, setBookingData] = useState<BookingData>({
    selectedDate: new Date(),
    selectedTime: '',
    adults: 1,
    children: 0,
    selectedAddOns: {},
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setIsProcessing(false);
      setBookingData({
        selectedDate: new Date(),
        selectedTime: '',
        adults: 1,
        children: 0,
        selectedAddOns: {},
      });
    }
  }, [isOpen]);

  const { total } = useMemo(() => {
    if (!tour) return { total: 0 };
    
    const pricePerAdult = tour.discountPrice || 0;
    const pricePerChild = pricePerAdult / 2;
    const subtotalCalc = (bookingData.adults * pricePerAdult) + (bookingData.children * pricePerChild);
    
    const extrasCalc = Object.keys(bookingData.selectedAddOns).reduce((acc, addOnId) => {
      const addOn = addOnData.find(a => a.id === addOnId);
      if (addOn) {
        return acc + (addOn.price * bookingData.adults);
      }
      return acc;
    }, 0);
    
    return {
      total: subtotalCalc + extrasCalc,
    };
  }, [tour, bookingData]);

  const handleNext = () => {
    if (currentStep === 1 && !bookingData.selectedTime) {
      toast.error('Please select a time slot.');
      return;
    }
    if (currentStep < totalSteps) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };
  
  const handleFinalAction = async (action: 'cart' | 'checkout') => {
    if (!tour || isProcessing) return;
    setIsProcessing(action);

    if (action === 'checkout') {
      toast.loading('Redirecting to checkout...', { position: 'bottom-center' });
    }

    // Add main tour item to cart
    const mainTourCartItem: CartItem = {
      ...tour,
      quantity: bookingData.adults,
      childQuantity: bookingData.children,
      selectedDate: bookingData.selectedDate.toISOString(),
      selectedTime: bookingData.selectedTime,
    };
    addToCart(mainTourCartItem);

    // Add selected add-ons to cart
    Object.entries(bookingData.selectedAddOns).forEach(([addOnId, addOnTime]) => {
      const selectedAddOnDetails = addOnData.find(a => a.id === addOnId);
      if (selectedAddOnDetails) {
        const addOnCartItem: CartItem = {
          id: `addon_${selectedAddOnDetails.id}_${new Date(bookingData.selectedDate).getTime()}`,
          title: selectedAddOnDetails.title,
          image: '/bg2.png',
          originalPrice: selectedAddOnDetails.price,
          discountPrice: selectedAddOnDetails.price,
          quantity: bookingData.adults,
          childQuantity: 0,
          selectedDate: bookingData.selectedDate.toISOString(),
          selectedTime: addOnTime,
          destinationId: tour.destinationId,
        };
        addToCart(addOnCartItem);
      }
    });
    
    onClose();

    await new Promise(resolve => setTimeout(resolve, 300));

    if (action === 'checkout') {
      toast.dismiss();
      router.push('/checkout');
    } else if (action === 'cart') {
      toast.success(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Image src={tour.image} alt={tour.title} width={40} height={40} className="rounded-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Added to Cart!</p>
              <p className="mt-1 text-sm text-slate-600 line-clamp-1">{tour.title}</p>
            </div>
            <button
                onClick={() => { toast.dismiss(t.id); openCart(); }}
                className="ml-4 px-3 py-1.5 border border-transparent rounded-lg text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200"
              >
                View Cart
            </button>
          </div>
        ),
        { duration: 5000, position: 'bottom-center' }
      );
      // Redirect to home page for more browsing
      router.push('/');
    }
    
    if (action === 'cart') {
      setIsProcessing(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BookingStep1 bookingData={bookingData} setBookingData={setBookingData} />;
      case 2:
        return <BookingStep2 bookingData={bookingData} setBookingData={setBookingData} tour={tour!} />;
      case 3:
        return <BookingStep3 bookingData={bookingData} setBookingData={setBookingData} tour={tour!} />;
      case 4:
        return <BookingStep4 bookingData={bookingData} tour={tour!} onClose={onClose} />;
      default:
        return null;
    }
  };
  
  if (!tour) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
          <motion.div 
            className="absolute inset-0 bg-black/40" 
            onClick={onClose} 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
          />
          <motion.div
            className="relative bg-white h-full w-full max-w-sm sm:max-w-lg shadow-xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* HEADER */}
            <div className="p-3 sm:p-4 border-b flex items-center gap-2 sm:gap-3">
              <Image src={tour.image} alt={tour.title} width={48} height={48} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 line-clamp-1 text-sm sm:text-base">{tour.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={12} /> {bookingData.selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 text-sm sm:text-base">{formatPrice(tour.discountPrice)}</p>
                <p className="text-xs text-slate-400">per adult</p>
              </div>
              <button onClick={onClose} className="ml-2 p-1.5 sm:p-2 rounded-full hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            {/* STEP INDICATOR */}
            <div className="p-3 sm:p-4 border-b">
              <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
            </div>

            {/* STEP CONTENT */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50">{renderStep()}</div>

            {/* FOOTER */}
            <div className="p-3 sm:p-4 border-t bg-white space-y-3">
              {currentStep === totalSteps ? (
                <div className="space-y-3">
                   <button
                        onClick={() => handleFinalAction('checkout')}
                        disabled={!!isProcessing}
                        className="w-full bg-red-600 text-white font-bold py-2.5 sm:py-3 rounded-full text-sm sm:text-base flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:bg-red-400 disabled:cursor-not-allowed"
                    >
                        {isProcessing === 'checkout' ? (
                            <><Loader2 size={18} className="animate-spin" /> Processing...</>
                        ) : (
                            <><CreditCard size={16} /> Proceed to Checkout</>
                        )}
                    </button>
                     <button
                        onClick={() => handleFinalAction('cart')}
                        disabled={!!isProcessing}
                        className="w-full bg-white text-slate-700 font-bold py-2.5 sm:py-3 rounded-full text-sm sm:text-base flex items-center justify-center gap-2 border-2 border-slate-300 transition-all transform hover:scale-105 hover:bg-slate-50 disabled:bg-slate-200"
                    >
                        {isProcessing === 'cart' ? (
                            <><Loader2 size={18} className="animate-spin" /> Adding...</>
                        ) : (
                            <><ShoppingCart size={16} /> Add & Continue Browsing</>
                        )}
                    </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full font-semibold text-slate-600 hover:bg-slate-100 transition-opacity text-sm ${
                        currentStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentStep === 1 && !bookingData.selectedTime}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:bg-red-300 disabled:cursor-not-allowed text-sm"
                  >
                    {currentStep === totalSteps - 1 ? 'Review & Book' : 'Next Step'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 pt-2">
                <span>
                  {bookingData.adults} Adult{bookingData.adults > 1 ? 's' : ''}
                  {bookingData.children > 0 && `, ${bookingData.children} Child${bookingData.children > 1 ? 'ren' : ''}`}
                </span>
                <span>Total: <strong className="text-slate-900">{formatPrice(total)}</strong></span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Main Page Component
const BookingPage: React.FC = () => {
  const [isBookingSidebarOpen, setIsBookingSidebarOpen] = useState(false);
  
  // Sample tour data
  const sampleTour: Tour = {
    id: '1',
    title: 'New York Pizza by LOVERS Canal Cruise in Amsterdam',
    image: '/tour-image.jpg',
    originalPrice: 75.00,
    discountPrice: 50.00,
    destinationId: 'amsterdam'
  };

  const openBookingSidebar = () => setIsBookingSidebarOpen(true);
  const closeBookingSidebar = () => setIsBookingSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <Image
          src={sampleTour.image}
          alt={sampleTour.title}
          width={400}
          height={200}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
        <h2 className="text-xl font-bold text-gray-800 mb-2">{sampleTour.title}</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl font-bold text-red-600">€{sampleTour.discountPrice}</span>
          <span className="text-lg text-gray-500 line-through">€{sampleTour.originalPrice}</span>
        </div>
        <button
          onClick={openBookingSidebar}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
        >
          Book Now
        </button>
      </div>

      <BookingSidebar
        isOpen={isBookingSidebarOpen}
        onClose={closeBookingSidebar}
        tour={sampleTour}
      />
    </div>
  );
};

export default BookingPage;
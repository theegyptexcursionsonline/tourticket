'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  X, ArrowRight, ArrowLeft, Calendar, ShoppingCart, CreditCard,
  Loader2, Clock, User, Users, Plus, Minus, Check, Languages,
  ChevronDown, ChevronLeft, ChevronRight, Star, MapPin, Shield,
  ChevronUp, Info, Zap, Award, Heart, Eye, Camera, Car,
  Gift, Sparkles, TrendingUp, CheckCircle, AlertCircle,
  Phone, Mail, MessageCircle, Globe, Wifi, Coffee, Calculator,
  BadgeDollarSign, Edit, Edit3, Settings, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '@/hooks/useCart';
import { useSettings } from '@/hooks/useSettings';

// Enhanced Types with database compatibility
interface Tour {
  id?: string;
  _id?: string;
  title: string;
  image: string;
  originalPrice?: number;
  discountPrice: number;
  destination?: {
    _id: string;
    name: string;
    slug?: string;
  } | string;
  duration?: string;
  rating?: number;
  bookings?: number;
  reviews?: number;
  description?: string;
  longDescription?: string;
  slug?: string;
  maxGroupSize?: number;
  highlights?: string[];
  includes?: string[];
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  bookingOptions?: BookingOption[];
  addOns?: AddOnTour[];
  location?: {
    lat: number;
    lng: number;
    address: string;
  } | string;
  difficulty?: 'Easy' | 'Moderate' | 'Challenging';
  category?: {
    _id: string;
    name: string;
    slug?: string;
  } | string;
  tags?: string[];
  isFeatured?: boolean;
  availability?: {
    type: string;
    availableDays: number[];
    slots: { time: string; capacity: number }[];
  };
  cancellationPolicy?: string;
  languages?: string[];
  operatedBy?: string;
  meetingPoint?: string;
}

interface BookingOption {
  id?: string;
  type: string;
  label: string;
  price: number;
  originalPrice?: number;
  description?: string;
  duration?: string;
  languages?: string[];
  highlights?: string[];
  included?: string[];
  groupSize?: string;
  difficulty?: string;
  badge?: string;
  discount?: number;
  isRecommended?: boolean;
  timeSlots?: TimeSlot[];
}

interface TimeSlot {
  id: string;
  time: string;
  available: number;
  price: number;
  isPopular?: boolean;
  originalAvailable?: number;
  discount?: number;
}

interface AddOnTour {
  id: string;
  name?: string;
  title?: string;
  duration?: string;
  languages?: string[];
  description: string;
  price: number;
  originalPrice?: number;
  availableTimes?: string[];
  required?: boolean;
  maxQuantity?: number;
  popular?: boolean;
  category?: 'Transport' | 'Photography' | 'Food' | 'Experience';
  icon?: React.ElementType;
  savings?: number;
  perGuest?: boolean;
}

interface AvailabilityData {
  date: string;
  timeSlots: TimeSlot[];
  addOns: AddOnTour[];
  tourOptions: TourOption[];
  weatherInfo?: {
    condition: string;
    temperature: string;
    icon: string;
  };
  specialOffers?: SpecialOffer[];
}

interface TourOption {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  duration: string;
  languages: string[];
  description: string;
  timeSlots: TimeSlot[];
  highlights?: string[];
  included?: string[];
  groupSize?: string;
  difficulty?: string;
  badge?: string;
  discount?: number;
  isRecommended?: boolean;
}

interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  discount: number;
  validUntil: string;
  type: 'early-bird' | 'group' | 'seasonal';
}

interface BookingData {
  selectedDate: Date | null;
  selectedTimeSlot: TimeSlot | null;
  adults: number;
  children: number;
  infants: number;
  selectedAddOns: { [key: string]: number };
  selectedLanguage: string;
  specialRequests?: string;
  contactInfo?: {
    email: string;
    phone: string;
  };
}

// Default Add-on data (used as a fallback)
// Import icons for add-ons
const getAddOnIcon = (category: string) => {
  switch (category) {
    case 'Photography': return Camera;
    case 'Transport': return Car;
    case 'Food': return Coffee;
    default: return Gift;
  }
};

// Default Add-on data (used as a fallback)
const addOnData: AddOnTour[] = [  {
    id: 'photo-package',
    title: 'Professional Photography Package',
    description: 'Capture your adventure with 50+ edited high-resolution photos delivered within 24 hours',
    price: 35.00,
    originalPrice: 50.00,
    required: false,
    maxQuantity: 1,
    popular: true,
    category: 'Photography',
    icon: Camera,
    savings: 15,
  },
  {
    id: 'transport-premium',
    title: 'Premium Hotel Transfer Service',
    description: 'Luxury vehicle pickup and drop-off with refreshments and WiFi',
    price: 15.00,
    originalPrice: 25.00,
    required: false,
    maxQuantity: 1,
    category: 'Transport',
    icon: Car,
    savings: 10,
  },
  {
    id: 'refreshment-upgrade',
    title: 'Gourmet Refreshment Package',
    description: 'Premium snacks, fresh juices, and traditional treats',
    price: 12.00,
    originalPrice: 18.00,
    required: false,
    maxQuantity: 1,
    category: 'Food',
    icon: Coffee,
    savings: 6,
    perGuest: true,
  },
];

// Steps configuration
const STEPS = [
  { id: 1, title: 'Date & Guests', shortTitle: 'Date', icon: Calendar },
  { id: 2, title: 'Tour Options', shortTitle: 'Options', icon: Star },
  { id: 3, title: 'Enhance Tour', shortTitle: 'Enhance', icon: Sparkles },
  { id: 4, title: 'Review & Book', shortTitle: 'Review', icon: CheckCircle },
];

const StepsIndicator: React.FC<{
  currentStep: number;
  onStepClick?: (step: number) => void;
  isClickable?: boolean;
}> = ({ currentStep, onStepClick, isClickable = false }) => {
  return (
    <div className="px-4 py-3 bg-white border-b border-gray-200">
      <div className="grid grid-cols-7 items-center max-w-xl mx-auto gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isClickable_ = isClickable && (isCompleted || isActive);
          
          return (
            <React.Fragment key={step.id}>
              {/* Step Circle with Perfect Alignment */}
              <motion.button
                onClick={() => isClickable_ && onStepClick?.(step.id)}
                disabled={!isClickable_}
                className={`flex flex-col items-center justify-center group ${
                  isClickable_ ? 'cursor-pointer' : 'cursor-default'
                }`}
                whileHover={isClickable_ ? { scale: 1.05 } : {}}
                whileTap={isClickable_ ? { scale: 0.95 } : {}}
              >
                {/* Circle */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 mb-1.5 ${
                  isCompleted
                    ? 'bg-green-600 text-white border-green-500 shadow-md'
                    : isActive
                    ? 'bg-red-600 text-white border-red-500 shadow-lg scale-110'
                    : 'bg-white text-gray-500 border-gray-300 shadow-sm'
                } ${isClickable_ ? 'group-hover:shadow-lg group-hover:scale-110' : ''}`}>
                  
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <step.icon size={14} strokeWidth={2} />
                  )}
                  
                  {isActive && (
                    <motion.div
                      className="absolute w-9 h-9 rounded-full border-2 border-red-400/50"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                  )}
                </div>

                {/* Text Below - Ultra Compact */}
                <div className="text-center">
                  <div className={`text-xs font-medium leading-tight ${
                    isActive || isCompleted ? 'text-gray-800' : 'text-gray-500'
                  }`}>
                    <div className="sm:hidden text-xs">{step.shortTitle}</div>
                    <div className="hidden sm:block text-xs">{step.title}</div>
                  </div>
                  <div className={`text-xs mt-0.5 ${
                    isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {isActive ? 'Current' : isCompleted ? 'Done' : 'Next'}
                  </div>
                </div>
              </motion.button>

              {/* Arrow in Grid */}
              {index < STEPS.length - 1 && (
                <div className="flex justify-center">
                  <ArrowRight 
                    size={16} 
                    className={`${isCompleted ? 'text-green-500' : 'text-gray-300'} transition-colors duration-300`}
                    strokeWidth={2}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Enhanced Calendar Component with availability indicators
const CalendarWidget: React.FC<{
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  availabilityData?: { [key: string]: 'high' | 'medium' | 'low' | 'full' };
}> = ({ selectedDate, onDateSelect, availabilityData = {} }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const today = new Date();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'high': return 'bg-green-100 border-green-300 text-green-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'full': return 'bg-red-100 border-red-300 text-red-800 cursor-not-allowed';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const renderCalendarDays = () => {
    const days = [];

    // Previous month's trailing days
    for (let i = 0; i < firstDayOfMonth; i++) {
      const prevMonth = new Date(currentMonth);
      prevMonth.setMonth(currentMonth.getMonth() - 1);
      const prevMonthDays = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      const day = prevMonthDays - firstDayOfMonth + i + 1;

      days.push(
        <div key={`prev-${day}`} className="w-10 h-10 text-sm text-gray-300 flex items-center justify-center">
          {day}
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isToday = currentDate.toDateString() === today.toDateString();
      const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString();
      const isPast = currentDate < today && !isToday;
      const dateKey = currentDate.toISOString().split('T')[0];
      const availability = availabilityData[dateKey];
      const isFull = availability === 'full';

      days.push(
        <motion.button
          key={day}
          onClick={() => !isPast && !isFull && onDateSelect(currentDate)}
          disabled={isPast || isFull}
          whileHover={{ scale: isPast || isFull ? 1 : 1.1 }}
          whileTap={{ scale: isPast || isFull ? 1 : 0.95 }}
          className={`relative w-10 h-10 text-sm rounded-full border-2 transition-all font-medium ${
            isSelected
              ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white border-red-600 shadow-lg scale-110'
              : isToday
              ? 'bg-gradient-to-br from-red-100 to-red-200 text-red-700 border-red-300 font-bold'
              : isPast
              ? 'text-gray-300 bg-gray-50 border-gray-100 cursor-not-allowed'
              : availability
              ? getAvailabilityColor(availability) + ' hover:scale-105'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:scale-105'
          }`}
        >
          {day}
          {availability && availability !== 'full' && (
            <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full ${
              availability === 'high' ? 'bg-green-400' :
              availability === 'medium' ? 'bg-yellow-400' :
              'bg-orange-400'
            }`} />
          )}
        </motion.button>
      );
    }

    return days;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6"
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Select your adventure date</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </motion.button>
        </div>
      </div>

      {/* Availability Legend - Mobile Friendly */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <span className="text-gray-600">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span className="text-gray-600">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-400"></div>
          <span className="text-gray-600">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <span className="text-gray-600">Full</span>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
    </motion.div>
  );
};

// MODIFIED: TourOptionCard now uses real tour data
const TourOptionCard: React.FC<{
  option: TourOption;
  onSelect: (timeSlot: TimeSlot) => void;
  selectedTimeSlot: TimeSlot | null;
  adults: number;
  children: number;
  tour: Tour; // Added tour prop
}> = ({ option, onSelect, selectedTimeSlot, adults, children, tour }) => {
  const { formatPrice } = useSettings();
  const basePrice = option.price;
  const subtotal = (adults * basePrice) + (children * basePrice * 0.5);
  const originalSubtotal = option.originalPrice ? (adults * option.originalPrice) + (children * option.originalPrice * 0.5) : subtotal;
  const savings = originalSubtotal - subtotal;

  // Use real tour data instead of hardcoded values
  const rating = tour.rating || 4.5;
  const totalBookings = tour.bookings || tour.reviews || 0;
  const maxParticipants = tour.maxGroupSize || 15;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative border-2 rounded-2xl p-5 transition-all cursor-pointer bg-white hover:shadow-lg ${
        option.isRecommended
          ? 'border-red-400 bg-gradient-to-br from-red-50 to-orange-50 ring-2 ring-red-200 shadow-md'
          : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
      }`}
      whileHover={{ scale: 1.01 }}
    >
      {/* Header with Badges */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {option.isRecommended && (
              <span className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Sparkles size={12} />
                {option.badge || 'Recommended'}
              </span>
            )}
            {option.discount && (
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                Save {option.discount}%
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-gray-900 leading-tight mb-3">
            {option.title}
          </h3>

          {/* Rating and Bookings Row - Now using real data */}
          <div className="flex items-center gap-2 sm:gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-semibold text-gray-800">{rating}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
              <Users size={14} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">{totalBookings.toLocaleString()} booked</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
              <User size={14} className="text-purple-500" />
              <span className="text-sm font-medium text-gray-700">Max {maxParticipants}</span>
            </div>
          </div>
        </div>

        {/* Price Section */}
        <div className="flex-shrink-0 text-right bg-gray-50 rounded-2xl p-3 w-[110px] sm:w-[120px]">
          {originalSubtotal > subtotal && (
            <div className="text-sm text-gray-400 line-through mb-1 whitespace-nowrap">
              {formatPrice(originalSubtotal)}
            </div>
          )}
          <div className="text-xl font-bold text-red-600 whitespace-nowrap">
            {formatPrice(subtotal)}
          </div>
          <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
            Total price
          </div>
        </div>
      </div>

      {/* Specs Row */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 bg-gray-50 rounded-full p-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-red-500" />
          <span className="font-medium">{option.duration}</span>
        </div>
        <div className="flex items-center gap-2">
          <Languages size={16} className="text-green-500" />
          <span className="font-medium">{option.languages.slice(0, 2).join(', ')}</span>
          {option.languages.length > 2 && (
            <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
              +{option.languages.length - 2}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-orange-500" />
          <span className="font-medium">{option.difficulty}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 leading-relaxed mb-4 bg-white rounded-full p-3 border border-gray-100">
        {option.description}
      </p>

      {/* Highlights */}
      {option.highlights && (
        <div className="mb-5">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">What's Included</h4>
          <div className="grid grid-cols-1 gap-2">
            {option.highlights.slice(0, 3).map((highlight, index) => (
              <div key={index} className="flex items-center gap-2 bg-green-50 rounded-full p-2">
                <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-800 font-medium">{highlight}</span>
              </div>
            ))}
            {option.highlights.length > 3 && (
              <div className="text-sm text-red-600 font-medium bg-red-50 rounded-full p-2 text-center">
                +{option.highlights.length - 3} more benefits included
              </div>
            )}
          </div>
        </div>
      )}

      {/* Price Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 mb-5 border border-gray-200">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-gray-700 font-medium">
            {adults} Adult{adults > 1 ? 's' : ''}{children > 0 && `, ${children} Child${children > 1 ? 'ren' : ''}`}
          </span>
          {savings > 0 && (
            <span className="text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full text-xs">
              You Save {formatPrice(savings)}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Per person: {formatPrice(basePrice)}</span>
          <span className="text-lg font-bold text-gray-900">{formatPrice(subtotal)}</span>
        </div>
      </div>

      {/* Time Slots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800 text-sm">Available Times Today</h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Select one to continue</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {option.timeSlots.map(timeSlot => {
            const isSelected = selectedTimeSlot?.id === timeSlot.id;
            const isLowAvailability = timeSlot.available <= 3;
            const isSoldOut = timeSlot.available === 0;

            return (
              <motion.button
                key={timeSlot.id}
                onClick={() => !isSoldOut && onSelect(timeSlot)}
                disabled={isSoldOut}
                whileHover={{ scale: isSoldOut ? 1 : 1.02 }}
                whileTap={{ scale: isSoldOut ? 1 : 0.98 }}
                className={`relative p-4 rounded-full text-sm font-medium transition-all border-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white border-red-600 shadow-lg'
                    : isSoldOut
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-800 hover:border-red-400 hover:shadow-md hover:bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-bold text-base">{timeSlot.time}</div>
                    <div className={`text-xs mt-1 ${isSelected ? 'text-red-100' : 'text-gray-500'}`}>
                      {isSoldOut ? 'Fully Booked' : `${timeSlot.available} spots left`}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {timeSlot.isPopular && !isSelected && (
                      <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold mb-1">
                        Popular
                      </div>
                    )}
                    <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                      {formatPrice(timeSlot.price)}
                    </div>
                  </div>
                </div>

                {isLowAvailability && !isSoldOut && !isSelected && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <div className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                      Almost Full!
                    </div>
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <Check size={12} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Shield size={12} className="text-green-500" />
          <span>Free cancellation</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <CheckCircle size={12} className="text-blue-500" />
          <span>Instant confirmation</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Heart size={12} className="text-red-500" />
          <span>Highly rated</span>
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Add-on Card
const AddOnCard: React.FC<{
  addOn: AddOnTour;
  quantity: number;
  onQuantityChange: (id: string, quantity: number) => void;
  guestCount: number;
}> = ({ addOn, quantity, onQuantityChange, guestCount }) => {
  const { formatPrice } = useSettings();
  const IconComponent = addOn.icon || Gift;
  const isSelected = quantity > 0;
  
  const calculatedQuantity = addOn.perGuest ? guestCount : 1;
  const totalPrice = isSelected ? addOn.price * calculatedQuantity : 0;
  const totalSavings = isSelected && addOn.savings ? addOn.savings * calculatedQuantity : 0;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Photography': return 'from-purple-400 to-pink-400';
      case 'Transport': return 'from-red-400 to-orange-400';
      case 'Experience': return 'from-green-400 to-emerald-400';
      case 'Food': return 'from-orange-400 to-red-400';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const handleToggle = () => {
    onQuantityChange(addOn.id, isSelected ? 0 : calculatedQuantity);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleToggle}
      className={`relative border-2 rounded-2xl p-4 sm:p-5 transition-all cursor-pointer ${
        isSelected
          ? 'border-red-400 bg-red-50 shadow-lg scale-105'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
      }`}
    >
      {/* Category Badge */}
      <div className="absolute -top-2 left-4">
        <span className={`bg-gradient-to-r ${getCategoryColor(addOn.category || '')} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
          {addOn.category}
        </span>
      </div>

      {/* Popular Badge */}
      {addOn.popular && (
        <div className="absolute -top-2 right-4">
          <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Star size={10} fill="white" />
            Popular
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 sm:gap-4 mb-4 mt-2">
        {/* Icon */}
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${getCategoryColor(addOn.category || '')} flex items-center justify-center text-white flex-shrink-0`}>
          <IconComponent size={20} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-800 text-sm sm:text-base mb-1">{addOn.title}</h4>
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">{addOn.description}</p>

          {/* Price Section */}
          <div className="flex items-center justify-between">
            <div>
              {addOn.originalPrice && addOn.originalPrice > addOn.price && (
                <span className="text-sm text-gray-400 line-through block">
                  {formatPrice(addOn.originalPrice)}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-red-600">
                  {formatPrice(addOn.price)}
                </span>
                {addOn.savings && (
                  <span className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-1 rounded-full">
                    Save {formatPrice(addOn.savings)}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {addOn.perGuest ? `Price is per person` : `Price is for the group`}
              </div>
            </div>

            {/* Selection Indicator */}
            {isSelected ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500 text-white flex items-center justify-center"
              >
                <Check size={16} />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gray-300 text-gray-500 flex items-center justify-center"
              >
                <Plus size={16} />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BookingSummaryCard: React.FC<{
  bookingData: BookingData;
  tour: Tour | null;
  availability: AvailabilityData | null;
  onEditClick: (section: 'date' | 'guests' | 'language') => void;
}> = ({ bookingData, tour, availability, onEditClick }) => {
  const { formatPrice } = useSettings();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatParticipants = () => {
    const total = bookingData.adults + bookingData.children + bookingData.infants;
    const parts = [];
    if (bookingData.adults > 0) parts.push(`${bookingData.adults} Adult${bookingData.adults > 1 ? 's' : ''}`);
    if (bookingData.children > 0) parts.push(`${bookingData.children} Child${bookingData.children > 1 ? 'ren' : ''}`);
    if (bookingData.infants > 0) parts.push(`${bookingData.infants} Infant${bookingData.infants > 1 ? 's' : ''}`);
    return `${total} Participant${total > 1 ? 's' : ''} (${parts.join(', ')})`;
  };

  // Get tour display data with proper fallbacks
  const tourDisplayData = tour ? {
    id: tour.id || tour._id,
    title: tour.title,
    image: tour.image,
    duration: tour.duration,
    rating: tour.rating || 4.5,
    bookings: tour.bookings || tour.reviews || 0,
    destination: typeof tour.destination === 'string' 
      ? tour.destination 
      : tour.destination?.name || 'Unknown',
  } : null;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900">Booking Summary</h3>
        <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
          Final Review
        </div>
      </div>

      <div className="space-y-4">
        {/* Date & Time */}
        <motion.div 
          className="flex items-start justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all group"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-sm sm:text-base">
                {bookingData.selectedDate ? formatDate(bookingData.selectedDate) : 'No date selected'}
              </div>
              <div className="text-xs sm:text-sm text-slate-500">
                {bookingData.selectedTimeSlot ? `at ${bookingData.selectedTimeSlot.time}` : 'No time selected'}
              </div>
            </div>
          </div>
          <motion.button
            onClick={() => onEditClick('date')}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Edit size={16} />
          </motion.button>
        </motion.div>

        {/* Participants */}
        <motion.div 
          className="flex items-start justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all group"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-sm sm:text-base">
                {formatParticipants()}
              </div>
              <div className="text-xs sm:text-sm text-slate-500">
                Group size
              </div>
            </div>
          </div>
          <motion.button
            onClick={() => onEditClick('guests')}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Edit size={16} />
          </motion.button>
        </motion.div>

        {/* Language */}
        <motion.div 
          className="flex items-start justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all group"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Languages size={20} className="text-green-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-sm sm:text-base">
                {bookingData.selectedLanguage || 'English'}
              </div>
              <div className="text-xs sm:text-sm text-slate-500">
                Tour language
              </div>
            </div>
          </div>
          <motion.button
            onClick={() => onEditClick('language')}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Edit size={16} />
          </motion.button>
        </motion.div>

        {/* Selected Tour Option */}
        {(() => {
          const selectedOption = availability?.tourOptions.find(option =>
            option.timeSlots?.some(slot => slot.id === bookingData.selectedTimeSlot?.id)
          );
          
          if (selectedOption) {
            return (
              <motion.div 
                className="flex items-start justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all group"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Star size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm sm:text-base">
                      {selectedOption.title}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
                      <span>{selectedOption.duration}</span>
                      <span>•</span>
                      <span>{selectedOption.languages.slice(0, 2).join(', ')}</span>
                      {selectedOption.badge && (
                        <>
                          <span>•</span>
                          <span className="text-orange-600 font-medium">{selectedOption.badge}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={() => onEditClick('date')}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Edit size={16} />
                </motion.button>
              </motion.div>
            );
          }
          return null;
        })()}

        {/* Tour Information */}
        {tourDisplayData && (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-200">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <Image 
                src={tourDisplayData.image} 
                alt={tourDisplayData.title} 
                width={48} 
                height={48} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-800 text-sm sm:text-base line-clamp-2">
                {tourDisplayData.title}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">
                {tourDisplayData.duration} • {tourDisplayData.rating} ⭐ ({tourDisplayData.bookings.toLocaleString()} reviews)
              </div>
              {tourDisplayData.destination && (
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin size={12} />
                  {tourDisplayData.destination}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Enhanced Booking Sidebar Component
interface BookingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour;
}

const BookingSidebar: React.FC<BookingSidebarProps> = ({ isOpen, onClose, tour }) => {
  const router = useRouter();
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState<false | 'cart' | 'checkout'>(false);
  
  const datePickerRef = useRef<HTMLDivElement>(null);
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const lastToastTimeSlotRef = useRef<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showParticipantsDropdown, setShowParticipantsDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  const [bookingData, setBookingData] = useState<BookingData>({
    selectedDate: null,
    selectedTimeSlot: null,
    adults: 2,
    children: 0,
    infants: 0,
    selectedAddOns: {},
    selectedLanguage: 'English',
    specialRequests: '',
  });

  // Mock availability data with better realism
  const mockAvailabilityData = {
    '2025-09-19': 'high',
    '2025-09-20': 'medium',
    '2025-09-21': 'high',
    '2025-09-22': 'low',
    '2025-09-23': 'full',
    '2025-09-24': 'high',
    '2025-09-25': 'medium',
  };

  // Get tour display data with proper fallbacks
  const tourDisplayData = useMemo(() => {
    if (!tour) return null;
    
    return {
      id: tour.id || tour._id,
      title: tour.title,
      image: tour.image,
      duration: tour.duration,
      rating: tour.rating || 4.5,
      bookings: tour.bookings || tour.reviews || 0,
      destination: typeof tour.destination === 'string' 
        ? tour.destination 
        : tour.destination?.name || 'Unknown',
      discountPrice: tour.discountPrice,
      originalPrice: tour.originalPrice,
      maxGroupSize: tour.maxGroupSize || 15,
      highlights: tour.highlights || [],
      includes: tour.includes || [],
      whatsIncluded: tour.whatsIncluded || [],
      bookingOptions: tour.bookingOptions || [],
      tags: tour.tags || [],
      cancellationPolicy: tour.cancellationPolicy || 'Free cancellation up to 24 hours in advance',
      operatedBy: tour.operatedBy || 'Tour Operator',
      meetingPoint: tour.meetingPoint || 'Central meeting point',
      languages: tour.languages || ['English'],
    };
  }, [tour]);

  // MODIFIED: Fetches availability and options with fallback to mock data
  const fetchAvailability = async (date: Date, totalGuests: number) => {
    setIsLoading(true);
    setError('');

    try {
      const tourId = tour._id || tour.id;
      if (!tourId) {
        throw new Error("Tour ID is missing");
      }

      // Try to fetch tour options from API, but use fallback if it fails
      let tourOptions: TourOption[];
      try {
        const optionsResponse = await fetch(`/api/tours/${tourId}/options`);
        if (!optionsResponse.ok) {
          throw new Error('API endpoint not available');
        }
        tourOptions = await optionsResponse.json();
      } catch (error) {
        console.log('API not available, using mock tour options');
        // Fallback to mock tour options
        tourOptions = [
          {
            id: 'standard-tour',
            title: 'Standard Tour Experience',
            price: tourDisplayData?.discountPrice || 50,
            originalPrice: tourDisplayData?.originalPrice || tourDisplayData?.discountPrice || 50,
            duration: tourDisplayData?.duration || '3 hours',
            languages: tourDisplayData?.languages || ['English'],
            description: 'Perfect introduction to the destination with expert guide',
            timeSlots: [
              { id: 'slot-1', time: '09:00', available: 12, price: tourDisplayData?.discountPrice || 50, isPopular: false },
              { id: 'slot-2', time: '11:00', available: 8, price: tourDisplayData?.discountPrice || 50, isPopular: true },
              { id: 'slot-3', time: '14:00', available: 15, price: tourDisplayData?.discountPrice || 50, isPopular: false },
              { id: 'slot-4', time: '16:00', available: 3, price: tourDisplayData?.discountPrice || 50, isPopular: false },
            ],
            highlights: tourDisplayData?.highlights?.slice(0, 3) || ['Expert guide included', 'Small group experience', 'Photo opportunities'],
            included: tourDisplayData?.includes?.slice(0, 3) || ['Professional guide', 'Entry tickets', 'Group photos'],
            groupSize: `Max ${tourDisplayData?.maxGroupSize || 15} people`,
            difficulty: 'Easy',
            badge: 'Most Popular',
            discount: tourDisplayData?.originalPrice ? Math.round(((tourDisplayData.originalPrice - tourDisplayData.discountPrice) / tourDisplayData.originalPrice) * 100) : 0,
            isRecommended: true,
          },
          {
            id: 'premium-tour',
            title: 'Premium Experience',
            price: (tourDisplayData?.discountPrice || 50) * 1.5,
            originalPrice: (tourDisplayData?.originalPrice || tourDisplayData?.discountPrice || 50) * 1.5,
            duration: tourDisplayData?.duration || '4 hours',
            languages: ['English', 'Spanish', 'French'],
            description: 'Enhanced experience with additional perks and smaller groups',
            timeSlots: [
              { id: 'premium-slot-1', time: '10:00', available: 6, price: (tourDisplayData?.discountPrice || 50) * 1.5, isPopular: false },
              { id: 'premium-slot-2', time: '15:00', available: 4, price: (tourDisplayData?.discountPrice || 50) * 1.5, isPopular: true },
            ],
            highlights: ['VIP access', 'Complimentary refreshments', 'Professional photos included'],
            included: ['Private guide', 'VIP entry', 'Refreshments', 'Photo package'],
            groupSize: `Max ${Math.floor((tourDisplayData?.maxGroupSize || 15) / 2)} people`,
            difficulty: 'Easy',
            badge: 'Premium',
            discount: 10,
            isRecommended: false,
          }
        ];
      }

      // Fetch add-ons with fallbacks
      let addOnsToUse;
      try {
        const addOnsResponse = await fetch(`/api/tours/${tourId}/addons`);
        if (addOnsResponse.ok) {
          addOnsToUse = await addOnsResponse.json();
          addOnsToUse = addOnsToUse.map((addon: any) => ({
            ...addon,
            icon: getAddOnIcon(addon.category),
          }));
        } else {
          throw new Error('Failed to fetch add-ons');
        }
      } catch (error) {
        console.log('Add-ons API not available, using fallback');
        addOnsToUse = tour.addOns && tour.addOns.length > 0 
          ? tour.addOns.map((addon: any, index: number) => ({
              id: addon.id || `addon-${index}`,
              title: addon.name || 'Tour Enhancement',
              description: addon.description || 'Enhance your tour experience',
              price: addon.price || 15,
              originalPrice: addon.price ? Math.round(addon.price * 1.3) : 20,
              required: false,
              maxQuantity: 1,
              popular: index === 0,
              category: (addon.category || 'Experience') as 'Transport' | 'Photography' | 'Food' | 'Experience',
              icon: getAddOnIcon(addon.category || 'Experience'),
              savings: addon.price ? Math.round(addon.price * 0.3) : 5,
              perGuest: addon.category === 'Food',
            }))
          : addOnData;
      }

      const newAvailabilityData: AvailabilityData = {
        date: date.toISOString().split('T')[0],
        timeSlots: [],
        addOns: addOnsToUse,
        tourOptions: tourOptions,
        weatherInfo: {
          condition: 'Sunny',
          temperature: '25°C',
          icon: '☀️'
        },
        specialOffers: []
      };

      setAvailability(newAvailabilityData);
      setCurrentStep(2);
      setAnimationKey(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to check availability.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced price calculations with savings
  const { subtotal, addOnsTotal, total, totalSavings } = useMemo(() => {
    let basePrice = 0;
    let originalBasePrice = 0;
    const totalGuests = bookingData.adults + bookingData.children + bookingData.infants;

    if (bookingData.selectedTimeSlot) {
      basePrice = bookingData.selectedTimeSlot.price;
      
      const selectedOption = availability?.tourOptions.find(option =>
        option.timeSlots?.some(slot => slot.id === bookingData.selectedTimeSlot?.id)
      );
      
      originalBasePrice = bookingData.selectedTimeSlot.originalPrice || 
                         selectedOption?.originalPrice || 
                         bookingData.selectedTimeSlot.price;
    } else if (tourDisplayData) {
      basePrice = tourDisplayData.discountPrice;
      originalBasePrice = tourDisplayData.originalPrice || tourDisplayData.discountPrice;
    }

    const subtotalCalc = (bookingData.adults * basePrice) + (bookingData.children * basePrice * 0.5);
    const originalSubtotal = (bookingData.adults * originalBasePrice) + (bookingData.children * originalBasePrice * 0.5);

    const addOnsCalc = Object.entries(bookingData.selectedAddOns).reduce((acc, [addOnId, quantity]) => {
      const addOn = availability?.addOns.find(a => a.id === addOnId);
      if (addOn) {
        const itemQuantity = addOn.perGuest ? totalGuests : 1;
        return acc + (addOn.price * itemQuantity);
      }
      return acc;
    }, 0);

    const addOnsSavings = Object.entries(bookingData.selectedAddOns).reduce((acc, [addOnId, quantity]) => {
      const addOn = availability?.addOns.find(a => a.id === addOnId);
      if (addOn && addOn.savings) {
        const itemQuantity = addOn.perGuest ? totalGuests : 1;
        return acc + (addOn.savings * itemQuantity);
      }
      return acc;
    }, 0);

    const tourSavings = originalSubtotal - subtotalCalc;
    const totalSavingsCalc = tourSavings + addOnsSavings;

    return {
      subtotal: subtotalCalc,
      addOnsTotal: addOnsCalc,
      total: subtotalCalc + addOnsCalc,
      totalSavings: totalSavingsCalc,
    };
  }, [bookingData, availability, tourDisplayData]);

  // Reset when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setIsProcessing(false);
      setIsLoading(false);
      setError('');
      setShowParticipantsDropdown(false);
      setShowDatePicker(false);
      setAvailability(null);
      setAnimationKey(0);
      setBookingData({
        selectedDate: null,
        selectedTimeSlot: null,
        adults: 2,
        children: 0,
        infants: 0,
        selectedAddOns: {},
        selectedLanguage: 'English',
        specialRequests: '',
      });
      lastToastTimeSlotRef.current = null; // Reset toast tracking
    }
  }, [isOpen]);

  // Enhanced navigation handlers
  const handleNext = useCallback(() => {
    if (currentStep === 2 && !bookingData.selectedTimeSlot) {
      toast.error('Please select a time slot to continue', {
        icon: '⏰',
        style: { background: '#FEF2F2', color: '#DC2626' }
      });
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(s => s + 1);
      setAnimationKey(prev => prev + 1);
    }
  }, [currentStep, bookingData.selectedTimeSlot]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
      setAnimationKey(prev => prev + 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((step: number) => {
    if (step <= currentStep || step === 1) {
      setCurrentStep(step);
      setAnimationKey(prev => prev + 1);
    }
  }, [currentStep]);

  // Enhanced availability check
  const handleCheckAvailability = useCallback(() => {
    if (!bookingData.selectedDate) {
      setError('Please select a date to continue');
      toast.error('Date selection required', { icon: '📅' });
      return;
    }

    const totalGuests = bookingData.adults + bookingData.children + bookingData.infants;
    if (totalGuests === 0) {
      setError('Please select at least one guest');
      toast.error('Guest selection required', { icon: '👥' });
      return;
    }

    const maxSize = tourDisplayData?.maxGroupSize || 20;
    if (totalGuests > maxSize) {
      setError(`Maximum group size is ${maxSize} guests`);
      toast.error(`Group too large (max ${maxSize} guests)`, { icon: '⚠️' });
      return;
    }

    setError('');
    fetchAvailability(bookingData.selectedDate, totalGuests);
  }, [bookingData, tourDisplayData?.maxGroupSize, fetchAvailability]);

  // Enhanced date selection
  const handleDateSelect = useCallback((date: Date) => {
    setBookingData(prev => ({ ...prev, selectedDate: date, selectedTimeSlot: null }));
    setShowDatePicker(false);
    setAvailability(null);
    setCurrentStep(1);

    const dateKey = date.toISOString().split('T')[0];
    const dayAvailability = mockAvailabilityData[dateKey];

    if (dayAvailability === 'full') {
      toast.error('This date is fully booked. Please select another date.', {
        id: 'availability-toast',
        duration: 4000,
        icon: '😞'
      });
    } else if (dayAvailability === 'low') {
      toast('Limited availability on this date! Book soon.', {
        id: 'availability-toast',
        icon: '⚡',
        style: { background: '#FEF3C7', color: '#D97706' }
      });
    } else if (dayAvailability === 'high') {
      toast.success('Great choice! Plenty of availability.', {
        id: 'availability-toast',
        icon: '✨'
      });
    }
  }, [mockAvailabilityData]);

  const handleTimeSlotSelect = useCallback((timeSlot: TimeSlot) => {
    if (timeSlot.available === 0) {
      toast.error('This time slot is fully booked');
      return;
    }

    setBookingData(prev => ({ ...prev, selectedTimeSlot: timeSlot }));

    // Prevent duplicate toasts in React Strict Mode
    const toastId = `${timeSlot.id}-${timeSlot.time}`;
    if (lastToastTimeSlotRef.current !== toastId) {
      lastToastTimeSlotRef.current = toastId;
      toast.success(`${timeSlot.time} selected!`, {
        icon: '⏰',
        duration: 2000
      });

      // Reset after toast duration to allow future selections to show toast
      setTimeout(() => {
        lastToastTimeSlotRef.current = null;
      }, 2100);
    }
  }, []);

  // Enhanced participant controls
  const handleParticipantChange = useCallback((type: 'adults' | 'children' | 'infants', increment: boolean) => {
    setBookingData(prev => {
      const currentCount = prev[type];
      const minValue = type === 'adults' ? 1 : 0;
      const maxValue = (tourDisplayData?.maxGroupSize || 20) - (prev.adults + prev.children + prev.infants - currentCount);

      let newCount = increment
        ? Math.min(maxValue, currentCount + 1)
        : Math.max(minValue, currentCount - 1);

      if (increment && newCount === currentCount && newCount < maxValue) {
        newCount = currentCount + 1;
      }

      return { ...prev, [type]: newCount };
    });
  }, [tourDisplayData?.maxGroupSize]);

  const getParticipantsText = useCallback(() => {
    const totalGuests = bookingData.adults + bookingData.children + bookingData.infants;
    let text = `${totalGuests} participant${totalGuests !== 1 ? 's' : ''}`;
    const details = [];

    if (bookingData.adults > 0) details.push(`${bookingData.adults} adult${bookingData.adults > 1 ? 's' : ''}`);
    if (bookingData.children > 0) details.push(`${bookingData.children} child${bookingData.children > 1 ? 'ren' : ''}`);
    if (bookingData.infants > 0) details.push(`${bookingData.infants} infant${bookingData.infants > 1 ? 's' : ''}`);

    return details.length > 0 ? `${text} (${details.join(', ')})` : text;
  }, [bookingData]);

  // Enhanced add-on quantity management
  const handleAddOnQuantityChange = useCallback((addOnId: string, quantity: number) => {
    setBookingData(prev => {
      const selectedAddOns = { ...prev.selectedAddOns };
      if (quantity === 0) {
        delete selectedAddOns[addOnId];
      } else {
        selectedAddOns[addOnId] = quantity;
      }
      return { ...prev, selectedAddOns };
    });
  }, []);

  // Enhanced final booking actions
  const handleFinalAction = useCallback(async (action: 'cart' | 'checkout') => {
    if (isProcessing || !tourDisplayData) return;

    setIsProcessing(action);

    const loadingToast = toast.loading(
      action === 'checkout'
        ? 'Preparing your booking...'
        : 'Adding to cart...',
      {
        position: 'bottom-center',
        style: { background: '#1F2937', color: 'white' }
      }
    );

    try {
      const selectedOption = availability?.tourOptions.find(option =>
        option.timeSlots?.some(slot => slot.id === bookingData.selectedTimeSlot?.id)
      );

      if (!selectedOption && !tourDisplayData) {
        throw new Error('Tour data not available.');
      }

      if (!bookingData.selectedDate || !bookingData.selectedTimeSlot) {
        throw new Error('Incomplete booking data.');
      }

      // Prepare add-on details for cart storage
      const selectedAddOnDetails: { [key: string]: any } = {};
      Object.keys(bookingData.selectedAddOns).forEach(addOnId => {
        const addOnData = availability?.addOns.find(a => a.id === addOnId);
        if (addOnData) {
          selectedAddOnDetails[addOnId] = {
            id: addOnData.id,
            title: addOnData.title,
            price: addOnData.price,
            category: addOnData.category,
            perGuest: addOnData.perGuest || false,
          };
        }
      });

      // Prepare selected booking option details
      const selectedBookingOptionDetails = selectedOption ? {
        id: selectedOption.id,
        title: selectedOption.title,
        price: selectedOption.price,
        originalPrice: selectedOption.originalPrice,
        duration: selectedOption.duration,
        badge: selectedOption.badge,
      } : undefined;

      // Prepare the cart item
      const newCartItem = {
        ...tourDisplayData,
        id: tourDisplayData.id,
        uniqueId: `${tourDisplayData.id}-${bookingData.selectedDate.toISOString()}-${bookingData.selectedTimeSlot.id}-${JSON.stringify(bookingData.selectedAddOns)}`,
        quantity: bookingData.adults,
        childQuantity: bookingData.children,
        infantQuantity: bookingData.infants,
        selectedDate: bookingData.selectedDate.toISOString(),
        selectedTime: bookingData.selectedTimeSlot.time,
        selectedAddOns: bookingData.selectedAddOns,
        selectedAddOnDetails,
        selectedBookingOption: selectedBookingOptionDetails,
        price: selectedOption?.price || tourDisplayData.discountPrice,
        originalPrice: selectedOption?.originalPrice || tourDisplayData.originalPrice,
        discountPrice: selectedOption?.price || tourDisplayData.discountPrice,
        totalPrice: 0,
      };

      addToCart(newCartItem, false);

      toast.dismiss(loadingToast);
      onClose();

      await new Promise(resolve => setTimeout(resolve, 300));

      if (action === 'checkout') {
        toast.success('Redirecting to secure checkout...', {
          icon: '🔒',
          duration: 1500,
          style: { background: '#10B981', color: 'white' }
        });
        router.push('/checkout');
      } else {
        toast.success('🎉 Added to Cart! Ready for more adventures?', {
          duration: 6000,
          position: 'bottom-center',
          style: { background: '#059669', color: 'white' }
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onClose, router, bookingData, availability, tourDisplayData, addToCart, total]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  // Handle editing from final step
  const handleEditClick = useCallback((section: 'date' | 'guests' | 'language') => {
    switch (section) {
      case 'date':
        setShowDatePicker(true);
        setCurrentStep(1);
        break;
      case 'guests':
        setShowParticipantsDropdown(true);
        setCurrentStep(1);
        break;
      case 'language':
        toast.info('Language selection coming soon!');
        break;
    }
    setAnimationKey(prev => prev + 1);
  }, []);

  // Scrolling logic
  useEffect(() => {
    if (showDatePicker && datePickerRef.current && scrollableContentRef.current) {
      setTimeout(() => {
        const scrollContainer = scrollableContentRef.current;
        const elementToScrollTo = datePickerRef.current;

        const topPosition = elementToScrollTo.offsetTop;

        scrollContainer.scrollTo({
          top: topPosition,
          behavior: 'smooth'
        });
      }, 150);
    }
  }, [showDatePicker]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (showParticipantsDropdown && 
          !target.closest('.participants-dropdown') && 
          !target.closest('.participants-content')) {
        setShowParticipantsDropdown(false);
      }
      
      if (showDatePicker && 
          !target.closest('.date-picker-dropdown') && 
          !target.closest('.date-picker-content')) {
        setShowDatePicker(false);
      }
    };

    if (isOpen && (showParticipantsDropdown || showDatePicker)) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, showParticipantsDropdown, showDatePicker]);

  // Step content renderer
  const renderStepContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6 p-4 sm:p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded-full w-2/3 mb-4"></div>
            <div className="h-24 bg-gray-200 rounded-2xl mb-4"></div>
            <div className="h-4 bg-gray-200 rounded-full w-1/3 mb-4"></div>
            <div className="h-16 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      );
    }

    const contentVariants = {
      enter: { opacity: 0, x: 20 },
      center: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 }
    };

    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key={`step1-${animationKey}`}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-4 p-4 sm:p-6"
          >
            {/* Tour info chips */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <Star size={14} className="text-blue-500 fill-current" />
                {tourDisplayData ? `${tourDisplayData.rating} (${tourDisplayData.bookings.toLocaleString()} reviews)` : 'No ratings yet'}
              </div>
              <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <Users size={14} className="text-red-500" />
                Max {tourDisplayData?.maxGroupSize || 15}
              </div>
            </div>

            {/* Compact Price Section */}
            <div className="flex justify-between items-center bg-gray-100 rounded-2xl p-4 text-gray-800 border border-gray-200">
              <div>
                {tourDisplayData?.originalPrice && (
                  <span className="text-sm text-gray-500 line-through block">
                    {formatPrice(tourDisplayData.originalPrice)}
                  </span>
                )}
                <span className="text-2xl sm:text-3xl font-bold text-red-600 block">
                  {formatPrice(tourDisplayData?.discountPrice || 0)}
                </span>
                <span className="text-xs text-gray-500">per person</span>
              </div>
              <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-100 px-3 py-1 rounded-full text-sm">
                <BadgeDollarSign size={16} />
                <span>Great Value</span>
              </div>
            </div>

            {/* Compact Highlights */}
            <div className="grid grid-cols-1 gap-2">
              {tourDisplayData?.highlights?.slice(0, 2).map((highlight, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-full p-2">
                  <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  <span className="text-xs text-gray-700 font-medium leading-tight">{highlight}</span>
                </div>
              ))}
              {tourDisplayData?.highlights && tourDisplayData.highlights.length > 2 && (
                <div className="text-xs text-red-600 font-medium text-center">
                  +{tourDisplayData.highlights.length - 2} more benefits included
                </div>
              )}
            </div>

            {/* Date Picker */}
            <div ref={datePickerRef} className="date-picker-dropdown">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">1. Select your date</h3>
              <div className="relative">
                <motion.button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full flex items-center justify-between p-3 border-2 border-gray-200 rounded-2xl bg-white text-left hover:border-red-300 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-red-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-800 text-sm">
                        {bookingData.selectedDate ? formatDate(bookingData.selectedDate) : 'Choose Date'}
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                </motion.button>
                <AnimatePresence>
                  {showDatePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 z-30 date-picker-content"
                    >
                      <CalendarWidget
                        selectedDate={bookingData.selectedDate}
                        onDateSelect={handleDateSelect}
                        availabilityData={mockAvailabilityData}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Participants */}
            <div className="participants-dropdown">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">2. How many participants?</h3>
              <div className="relative">
                <motion.button
                  onClick={() => setShowParticipantsDropdown(!showParticipantsDropdown)}
                  className="w-full flex items-center justify-between p-3 border-2 border-gray-200 rounded-2xl bg-white text-left hover:border-red-300 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-red-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-800 text-sm">
                        {getParticipantsText()}
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${showParticipantsDropdown ? 'rotate-180' : ''}`} />
                </motion.button>
                <AnimatePresence>
                  {showParticipantsDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-30 p-4 participants-content"
                    >
                      <div className="space-y-3">
                        {/* Adult Counter */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-3">
                            <div className="font-medium text-gray-800 text-sm">Adults</div>
                            <div className="text-xs text-gray-500">Age 13+ • Full price</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button
                              onClick={() => handleParticipantChange('adults', false)}
                              disabled={bookingData.adults <= 1}
                              className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 text-sm"
                            >
                              <Minus size={14} />
                            </motion.button>
                            <span className="w-6 text-center font-bold text-sm">{bookingData.adults}</span>
                            <motion.button
                              onClick={() => handleParticipantChange('adults', true)}
                              className="w-8 h-8 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center text-sm"
                            >
                              <Plus size={14} />
                            </motion.button>
                          </div>
                        </div>
                        {/* Children Counter */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-3">
                            <div className="font-medium text-gray-800 text-sm">Children</div>
                            <div className="text-xs text-gray-500">Age 4-12 • 50% discount</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button
                              onClick={() => handleParticipantChange('children', false)}
                              disabled={bookingData.children <= 0}
                              className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 text-sm"
                            >
                              <Minus size={14} />
                            </motion.button>
                            <span className="w-6 text-center font-bold text-sm">{bookingData.children}</span>
                            <motion.button
                              onClick={() => handleParticipantChange('children', true)}
                              className="w-8 h-8 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center text-sm"
                            >
                              <Plus size={14} />
                            </motion.button>
                          </div>
                        </div>
                        {/* Infants Counter */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-3">
                            <div className="font-medium text-gray-800 text-sm">Infants</div>
                            <div className="text-xs text-gray-500">Age 0-3 • Free</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button
                              onClick={() => handleParticipantChange('infants', false)}
                              disabled={bookingData.infants <= 0}
                              className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 text-sm"
                            >
                              <Minus size={14} />
                            </motion.button>
                            <span className="w-6 text-center font-bold text-sm">{bookingData.infants}</span>
                            <motion.button
                              onClick={() => handleParticipantChange('infants', true)}
                              className="w-8 h-8 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center text-sm"
                            >
                              <Plus size={14} />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-center text-sm">{error}</p>
            )}
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key={`step2-${animationKey}`}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6 p-4 sm:p-6"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Choose your experience</h2>
            <p className="text-gray-600 mb-6">Select the best option for your group of {getParticipantsText().toLowerCase()}.</p>
            {availability?.tourOptions.map(option => (
              <TourOptionCard
                key={option.id}
                option={option}
                onSelect={handleTimeSlotSelect}
                selectedTimeSlot={bookingData.selectedTimeSlot}
                adults={bookingData.adults}
                children={bookingData.children}
                tour={tour}
              />
            ))}
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key={`step3-${animationKey}`}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6 p-4 sm:p-6"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Enhance your experience</h2>
            <p className="text-gray-600 mb-6">Make your adventure even more memorable with these popular add-ons.</p>
            <div className="space-y-4 sm:space-y-6">
              {availability?.addOns.map(addOn => (
                <AddOnCard
                  key={addOn.id}
                  addOn={addOn}
                  quantity={bookingData.selectedAddOns[addOn.id] || 0}
                  onQuantityChange={handleAddOnQuantityChange}
                  guestCount={bookingData.adults + bookingData.children}
                />
              ))}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key={`step4-${animationKey}`}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6 p-4 sm:p-6"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Review & Book</h2>
            <p className="text-gray-600 mb-6">Your adventure is ready! Review the details and complete your booking.</p>

            <BookingSummaryCard
              bookingData={bookingData}
              tour={tourDisplayData}
              availability={availability}
              onEditClick={handleEditClick}
            />

            {/* Add-ons Summary */}
            {Object.keys(bookingData.selectedAddOns).length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-600" />
                  Tour Enhancements
                </h3>
                <div className="space-y-3">
                  {Object.entries(bookingData.selectedAddOns).map(([addOnId, quantity]) => {
                    const addOn = availability?.addOns.find(a => a.id === addOnId);
                    if (!addOn) return null;
                    
                    const IconComponent = addOn.icon || Gift;
                    const totalPrice = addOn.price * (addOn.perGuest ? (bookingData.adults + bookingData.children) : 1);
                    
                    return (
                      <div key={addOnId} className="flex items-center gap-3 bg-white p-3 rounded-2xl">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <IconComponent size={16} className="text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 text-sm">{addOn.title}</div>
                          <div className="text-xs text-gray-500">{addOn.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-600">{formatPrice(totalPrice)}</div>
                          {addOn.savings && (
                            <div className="text-xs text-green-600">
                              Save {formatPrice(addOn.savings * (addOn.perGuest ? (bookingData.adults + bookingData.children) : 1))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
              <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                <Calculator size={20} className="text-green-600" />
                Price Breakdown
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Tour Price ({bookingData.adults} Adults{bookingData.children > 0 ? `, ${bookingData.children} Children` : ''})</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {addOnsTotal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Add-ons ({Object.keys(bookingData.selectedAddOns).length})</span>
                    <span>{formatPrice(addOnsTotal)}</span>
                  </div>
                )}
                {totalSavings > 0 && (
                  <div className="flex justify-between text-green-700 font-medium">
                    <span>Total Savings</span>
                    <span>-{formatPrice(totalSavings)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-200 my-2"></div>
                <div className="flex justify-between text-xl font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-red-600">{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 bg-green-50 p-3 sm:p-4 rounded-full">
                <Shield size={20} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 p-3 sm:p-4 rounded-full">
                <Clock size={20} className="text-red-600" />
                <span className="text-sm font-medium text-red-800">Free Cancellation</span>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (!tour || !tourDisplayData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          aria-modal="true"
          role="dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative bg-white h-full w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                {currentStep > 1 && (
                  <motion.button
                    onClick={handleBack}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft size={20} />
                  </motion.button>
                )}
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    {currentStep === 1 ? 'Start Your Booking' : 'Customize Your Trip'}
                  </h3>
                  {tourDisplayData && (
                    <p className="text-xs text-gray-500 line-clamp-1">{tourDisplayData.title}</p>
                  )}
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Steps Progress Indicator */}
            <StepsIndicator
              currentStep={currentStep}
              onStepClick={handleStepClick}
              isClickable={currentStep >= 2}
            />

            <div ref={scrollableContentRef} className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <AnimatePresence>
              {/* Fixed Action Button for Step 1 */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="bg-white border-t border-gray-200 p-4 shadow-lg"
                >
                  <motion.button
                    onClick={handleCheckAvailability}
                    disabled={!bookingData.selectedDate || (bookingData.adults + bookingData.children + bookingData.infants === 0) || isLoading}
                    className="w-full bg-red-600 text-white font-bold py-3 rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Checking Availability...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Find My Adventure</span>
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}

              {/* Footer with Price and Actions - Only for Steps 2+ */}
              {currentStep > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="bg-white border-t border-gray-200 p-4 shadow-lg"
                >
                  {/* Price Display */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="block font-bold text-lg text-red-600">{formatPrice(total)}</span>
                      <span className="text-xs text-gray-500">
                        Total Price {totalSavings > 0 && `(Save ${formatPrice(totalSavings)})`}
                      </span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {currentStep < 4 && (
                        <motion.button
                          onClick={handleNext}
                          disabled={isLoading || (currentStep === 2 && !bookingData.selectedTimeSlot)}
                          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-full disabled:opacity-50 shadow-lg"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Continue <ArrowRight size={18} />
                        </motion.button>
                      )}
                      
                      {currentStep === 4 && (
                        <>
                          <motion.button
                            onClick={() => handleFinalAction('cart')}
                            disabled={!!isProcessing}
                            className="flex items-center gap-2 px-4 py-2 border border-red-600 text-red-600 font-bold rounded-full disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <ShoppingCart size={18} /> Add to Cart
                          </motion.button>
                          <motion.button
                            onClick={() => handleFinalAction('checkout')}
                            disabled={!!isProcessing}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-full disabled:opacity-50 shadow-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isProcessing === 'checkout' ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <CreditCard size={18} />
                            )}
                            Book Now
                          </motion.button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSidebar;
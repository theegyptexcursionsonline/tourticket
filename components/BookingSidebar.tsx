// components/BookingSidebar.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  X, ArrowRight, ArrowLeft, Calendar, ShoppingCart, CreditCard, 
  Loader2, Clock, User, Users, Plus, Minus, Check, Languages,
  ChevronDown, ChevronLeft, ChevronRight, Star, MapPin, Shield,
  ChevronUp, Info, Zap, Award, Heart, Eye, Camera, Car,
  Gift, Sparkles, TrendingUp, CheckCircle, AlertCircle,
  Phone, Mail, MessageCircle, Globe, Wifi, Coffee, Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '@/hooks/useCart';

// Enhanced Types with more detailed properties
interface Tour {
  id: string;
  title: string;
  image: string;
  originalPrice: number;
  discountPrice: number;
  destinationId: string;
  duration?: string;
  rating?: number;
  bookings?: number;
  description?: string;
  slug?: string;
  maxGroupSize?: number;
  highlights?: string[];
  included?: string[];
  location?: string;
  difficulty?: 'Easy' | 'Moderate' | 'Challenging';
  category?: string;
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
  title: string;
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
  specialRequests?: string;
  contactInfo?: {
    email: string;
    phone: string;
  };
}

// Enhanced sample data with more details
const tourOptionsData: TourOption[] = [
  {
    id: 'atv-sunset-tour',
    title: '3-Hour ATV Quad Tour Sunset with Traditional Bedouin Experience',
    price: 25.00,
    originalPrice: 35.00,
    duration: '3 Hours',
    languages: ['English', 'German', 'Arabic'],
    description: 'Embark on an exhilarating 30km quad bike adventure deep into the pristine desert landscape. Experience authentic Bedouin hospitality in a traditional village, complete with mint tea ceremony and cultural storytelling under the stars.',
    timeSlots: [
      { id: '1', time: '2:00 PM', available: 8, originalAvailable: 15, price: 25.00, isPopular: true },
      { id: '2', time: '3:00 PM', available: 3, originalAvailable: 12, price: 25.00 },
      { id: '3', time: '4:00 PM', available: 12, originalAvailable: 15, price: 25.00 },
    ],
    highlights: ['Professional guide', 'Safety equipment included', 'Traditional tea ceremony', 'Sunset photography stops'],
    included: ['Quad bike rental', 'Safety briefing', 'Bedouin village visit', 'Refreshments'],
    groupSize: 'Max 12 people',
    difficulty: 'Moderate',
    badge: 'Most Popular',
    discount: 29,
    isRecommended: true,
  },
  {
    id: 'shared-quad-tour',
    title: 'Shared 2-Hour Desert Canyon Discovery',
    price: 22.00,
    originalPrice: 28.00,
    duration: '2 Hours',
    languages: ['English', 'Spanish'],
    description: 'Perfect for beginners! Navigate through stunning desert canyons and ancient rock formations. This shared adventure offers incredible photo opportunities and insights into the desert ecosystem.',
    timeSlots: [
      { id: '4', time: '10:00 AM', available: 6, originalAvailable: 10, price: 22.00 },
      { id: '5', time: '2:00 PM', available: 9, originalAvailable: 10, price: 22.00 },
      { id: '6', time: '5:00 PM', available: 4, originalAvailable: 8, price: 22.00 },
    ],
    highlights: ['Beginner-friendly', 'Canyon exploration', 'Rock formation viewing', 'Group photos'],
    included: ['Quad bike rental', 'Helmet & goggles', 'Basic refreshments'],
    groupSize: 'Max 8 people',
    difficulty: 'Easy',
    discount: 21,
  },
  {
    id: 'private-luxury-tour',
    title: 'Private Luxury Desert Safari with Gourmet Dinner',
    price: 89.00,
    originalPrice: 120.00,
    duration: '4 Hours',
    languages: ['English', 'French', 'German'],
    description: 'Ultimate luxury experience with private quad bikes, dedicated guide, and a gourmet dinner under the stars. Includes premium refreshments and professional photography service.',
    timeSlots: [
      { id: '7', time: '3:00 PM', available: 4, originalAvailable: 6, price: 89.00, isPopular: true },
      { id: '8', time: '4:00 PM', available: 2, originalAvailable: 4, price: 89.00 },
    ],
    highlights: ['Private experience', 'Gourmet dinner', 'Professional photos', 'Premium vehicles'],
    included: ['Private quad bikes', 'Dedicated guide', '3-course dinner', 'Photography service', 'Premium transfers'],
    groupSize: 'Max 4 people',
    difficulty: 'Easy to Moderate',
    badge: 'Luxury Experience',
    discount: 26,
  },
];

const addOnData: AddOnTour[] = [
  {
    id: 'photo-package',
    title: 'Professional Photography Package',
    description: 'Capture your adventure with 50+ edited high-resolution photos and a highlight video delivered within 24 hours',
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
    description: 'Luxury vehicle pickup and drop-off with refreshments and WiFi. Covers all major hotels in the area',
    price: 15.00,
    originalPrice: 25.00,
    required: false,
    maxQuantity: 1,
    category: 'Transport',
    icon: Car,
    savings: 10,
  },
  {
    id: 'gear-upgrade',
    title: 'Premium Safety Gear & GoPro Mount',
    description: 'Upgraded helmets with built-in communication system and GoPro mounting for your own camera',
    price: 12.00,
    originalPrice: 18.00,
    required: false,
    maxQuantity: 4,
    category: 'Experience',
    icon: Shield,
    savings: 6,
  },
  {
    id: 'refreshment-upgrade',
    title: 'Gourmet Refreshment Package',
    description: 'Premium snacks, fresh juices, and traditional sweets served during rest stops',
    price: 8.00,
    originalPrice: 12.00,
    required: false,
    maxQuantity: 1,
    category: 'Food',
    icon: Coffee,
    savings: 4,
  }
];

// Enhanced utility functions
const useSettings = () => ({
  formatPrice: (price: number) => `€${price.toFixed(2)}`,
  selectedCurrency: { symbol: '€', code: 'EUR' },
  formatDiscount: (original: number, current: number) => 
    Math.round(((original - current) / original) * 100)
});

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
          className={`relative w-10 h-10 text-sm rounded-xl border-2 transition-all font-medium ${
            isSelected
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 shadow-lg scale-110'
              : isToday
              ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 border-blue-300 font-bold'
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
      className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6"
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Select your adventure date</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </motion.button>
        </div>
      </div>
      
      {/* Availability Legend */}
      <div className="flex items-center justify-center gap-4 mb-4 text-xs">
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

// Enhanced Tour Option Card with better design
const TourOptionCard: React.FC<{
  option: TourOption;
  onSelect: (timeSlot: TimeSlot) => void;
  selectedTimeSlot: TimeSlot | null;
  adults: number;
  children: number;
}> = ({ option, onSelect, selectedTimeSlot, adults, children }) => {
  const { formatPrice, formatDiscount } = useSettings();
  const basePrice = option.price;
  const subtotal = (adults * basePrice) + (children * basePrice * 0.5);
  const originalSubtotal = option.originalPrice ? (adults * option.originalPrice) + (children * option.originalPrice * 0.5) : subtotal;
  const savings = originalSubtotal - subtotal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative border-2 rounded-2xl p-6 transition-all cursor-pointer group ${
        option.isRecommended 
          ? 'border-gradient-to-r from-blue-400 to-purple-400 bg-gradient-to-br from-blue-50 to-purple-50' 
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg'
      }`}
    >
      {/* Badges */}
      <div className="absolute -top-3 left-6 flex gap-2">
        {option.isRecommended && (
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Sparkles size={12} />
            Recommended
          </span>
        )}
        {option.badge && (
          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            {option.badge}
          </span>
        )}
        {option.discount && (
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            -{option.discount}%
          </span>
        )}
      </div>
      
      <div className="flex items-start justify-between mb-4 mt-2">
        <div className="flex-1 pr-4">
          <h4 className="font-bold text-gray-800 text-lg mb-2 leading-tight">{option.title}</h4>
          
          {/* Tour Details */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
            <span className="flex items-center gap-1">
              <Clock size={14} className="text-blue-500" />
              {option.duration}
            </span>
            <span className="flex items-center gap-1">
              <Languages size={14} className="text-green-500" />
              {option.languages.join(', ')}
            </span>
            {option.groupSize && (
              <span className="flex items-center gap-1">
                <Users size={14} className="text-purple-500" />
                {option.groupSize}
              </span>
            )}
            {option.difficulty && (
              <span className="flex items-center gap-1">
                <TrendingUp size={14} className="text-orange-500" />
                {option.difficulty}
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">{option.description}</p>
          
          {/* Highlights */}
          {option.highlights && (
            <div className="mb-4">
              <h5 className="font-semibold text-gray-700 text-sm mb-2">What's Included:</h5>
              <div className="grid grid-cols-1 gap-1">
                {option.highlights.slice(0, 3).map((highlight, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                    <span>{highlight}</span>
                  </div>
                ))}
                {option.highlights.length > 3 && (
                  <span className="text-xs text-blue-500 font-medium">
                    +{option.highlights.length - 3} more included
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Price Section */}
        <div className="text-right flex-shrink-0">
          <div className="mb-2">
            {option.originalPrice && option.originalPrice > option.price && (
              <span className="text-sm text-gray-400 line-through block">
                {formatPrice(originalSubtotal)}
              </span>
            )}
            <span className="text-2xl font-bold text-blue-600 block">
              {formatPrice(subtotal)}
            </span>
            {savings > 0 && (
              <span className="text-xs text-green-600 font-semibold">
                Save {formatPrice(savings)}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mb-4">
            {adults > 0 && <div>{adults} adult{adults > 1 ? 's' : ''} × {formatPrice(basePrice)}</div>}
            {children > 0 && <div>{children} child{children > 1 ? 'ren' : ''} × {formatPrice(basePrice * 0.5)}</div>}
          </div>
        </div>
      </div>
      
      {/* Time Slots */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-gray-700">Available Times:</p>
          <span className="text-xs text-gray-500">Select to continue</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {option.timeSlots.map(timeSlot => {
            const isSelected = selectedTimeSlot?.id === timeSlot.id;
            const isLowAvailability = timeSlot.available <= 3;
            const availabilityPercentage = timeSlot.originalAvailable ? 
              (timeSlot.available / timeSlot.originalAvailable) * 100 : 100;
            
            return (
              <motion.button
                key={timeSlot.id}
                onClick={() => onSelect(timeSlot)}
                disabled={timeSlot.available === 0}
                whileHover={{ scale: timeSlot.available > 0 ? 1.02 : 1 }}
                whileTap={{ scale: timeSlot.available > 0 ? 0.98 : 1 }}
                className={`relative p-4 rounded-xl font-semibold transition-all text-sm ${
                  isSelected 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                    : timeSlot.available === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-50 text-gray-800 hover:bg-gray-100 border-2 border-transparent hover:border-blue-200'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="font-bold">{timeSlot.time}</span>
                  <span className={`text-xs mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                    {timeSlot.available === 0 ? 'Sold Out' : `${timeSlot.available} spots left`}
                  </span>
                  
                  {timeSlot.isPopular && !isSelected && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Popular
                    </span>
                  )}
                  
                  {isLowAvailability && timeSlot.available > 0 && !isSelected && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        Almost full!
                      </div>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Add-on Card with better visual hierarchy
const AddOnCard: React.FC<{
  addOn: AddOnTour;
  quantity: number;
  onQuantityChange: (id: string, quantity: number) => void;
}> = ({ addOn, quantity, onQuantityChange }) => {
  const { formatPrice } = useSettings();
  const IconComponent = addOn.icon || Gift;
  const isSelected = quantity > 0;
  const totalPrice = addOn.price * quantity;
  const totalSavings = addOn.savings ? addOn.savings * quantity : 0;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Photography': return 'from-purple-400 to-pink-400';
      case 'Transport': return 'from-blue-400 to-cyan-400';
      case 'Experience': return 'from-green-400 to-emerald-400';
      case 'Food': return 'from-orange-400 to-red-400';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative border-2 rounded-2xl p-5 transition-all ${
        isSelected 
          ? 'border-blue-400 bg-blue-50 shadow-lg scale-105' 
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
      
      <div className="flex items-start gap-4 mb-4 mt-2">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryColor(addOn.category || '')} flex items-center justify-center text-white flex-shrink-0`}>
          <IconComponent size={24} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-800 text-base mb-1">{addOn.title}</h4>
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">{addOn.description}</p>
          
          {/* Price Section */}
          <div className="flex items-center justify-between">
            <div>
              {addOn.originalPrice && addOn.originalPrice > addOn.price && (
                <span className="text-sm text-gray-400 line-through block">
                  {formatPrice(addOn.originalPrice)}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">
                  {formatPrice(addOn.price)}
                </span>
                {addOn.savings && (
                  <span className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-1 rounded-full">
                    Save {formatPrice(addOn.savings)}
                  </span>
                )}
              </div>
            </div>
            
            {/* Quantity Controls */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onQuantityChange(addOn.id, Math.max(0, quantity - 1))}
                disabled={quantity === 0}
                className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center disabled:opacity-50 hover:bg-gray-300 transition-colors"
              >
                <Minus size={14} />
              </motion.button>
              
              <span className="w-8 text-center font-bold text-lg">{quantity}</span>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onQuantityChange(addOn.id, Math.min(addOn.maxQuantity || 99, quantity + 1))}
                disabled={quantity >= (addOn.maxQuantity || 99)}
                className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center disabled:opacity-50 hover:bg-blue-600 transition-colors"
              >
                <Plus size={14} />
              </motion.button>
            </div>
          </div>
          
          {/* Total for multiple quantities */}
          {quantity > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total for {quantity} items:</span>
                <div className="text-right">
                  <span className="font-bold text-blue-600">{formatPrice(totalPrice)}</span>
                  {totalSavings > 0 && (
                    <span className="block text-xs text-green-600">
                      Total savings: {formatPrice(totalSavings)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center"
        >
          <Check size={14} />
        </motion.div>
      )}
    </motion.div>
  );
};

// Enhanced Loading Skeletons with better animations
const LoadingSkeleton: React.FC<{ type: 'full' | 'addons' | 'summary' }> = ({ type }) => {
  if (type === 'full') {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl w-2/3 mb-4"></div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="mb-6 p-6 border-2 border-gray-100 rounded-2xl">
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl"></div>
                <div className="h-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (type === 'addons') {
    return (
      <div className="space-y-4 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl w-1/2 mb-6"></div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-2xl mb-4"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl w-3/4 mb-6"></div>
        <div className="h-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-2xl mb-4"></div>
        <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-full mb-2"></div>
        <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );
};

// Enhanced Step Icons with better animations
const StepIcons: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { icon: Calendar, label: 'Date & Guests', description: 'Choose when & who' },
    { icon: Clock, label: 'Tour Options', description: 'Select experience' },
    { icon: Sparkles, label: 'Enhancements', description: 'Add extras' },
    { icon: CreditCard, label: 'Complete', description: 'Finalize booking' }
  ];

  return (
    <div className="px-6 py-4">
      <div className="flex justify-between items-center relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </div>
        
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isActive = currentStep === index + 1;
          const isCompleted = currentStep > index + 1;
          const isUpcoming = currentStep < index + 1;
          
          return (
            <div key={index} className="relative flex flex-col items-center z-10">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ 
                  scale: isActive ? 1.2 : isCompleted ? 1.1 : 1,
                  rotate: isCompleted ? 360 : 0
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all shadow-lg ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' 
                    : isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                    : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? <Check size={18} /> : <IconComponent size={16} />}
              </motion.div>
              
              <div className="text-center max-w-20">
                <div className={`text-xs font-semibold ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Enhanced Price Summary Component
const PriceSummary: React.FC<{
  subtotal: number;
  addOnsTotal: number;
  total: number;
  savings: number;
  isVisible: boolean;
}> = ({ subtotal, addOnsTotal, total, savings, isVisible }) => {
  const { formatPrice } = useSettings();

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200"
    >
      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Calculator size={18} className="text-blue-500" />
        Price Breakdown
      </h4>
      
      <div className="space-y-3">
        {subtotal > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Tour price</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
        )}
        
        {addOnsTotal > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Add-ons</span>
            <span className="font-semibold">{formatPrice(addOnsTotal)}</span>
          </div>
        )}
        
        {savings > 0 && (
          <div className="flex justify-between items-center text-green-600">
            <span>Total savings</span>
            <span className="font-semibold">-{formatPrice(savings)}</span>
          </div>
        )}
        
        <div className="h-px bg-gray-300 my-3"></div>
        
        <div className="flex justify-between items-center text-lg">
          <span className="font-bold text-gray-800">Total</span>
          <motion.span
            key={total}
            initial={{ scale: 1.2, color: '#3B82F6' }}
            animate={{ scale: 1, color: '#1F2937' }}
            className="font-bold"
          >
            {formatPrice(total)}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

// Main Enhanced Booking Sidebar Component
interface BookingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
}

const BookingSidebar: React.FC<BookingSidebarProps> = ({ isOpen, onClose, tour }) => {
  const router = useRouter();
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState<false | 'cart' | 'checkout'>(false);
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
    specialRequests: '',
  });

  // Mock availability data with better realism
  const mockAvailabilityData = {
    '2025-09-16': 'high',
    '2025-09-17': 'medium', 
    '2025-09-18': 'high',
    '2025-09-19': 'low',
    '2025-09-20': 'full',
    '2025-09-21': 'high',
    '2025-09-22': 'medium',
  };

  // Enhanced availability fetching with weather info
  const fetchAvailability = async (date: Date, totalGuests: number) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockAvailability: AvailabilityData = {
        date: date.toISOString().split('T')[0],
        timeSlots: [],
        addOns: addOnData,
        tourOptions: tourOptionsData,
        weatherInfo: {
          condition: 'Sunny',
          temperature: '28°C',
          icon: '☀️'
        },
        specialOffers: [
          {
            id: 'early-bird',
            title: 'Early Bird Special',
            description: 'Book 2 hours ahead and save 10%',
            discount: 10,
            validUntil: '2025-09-20',
            type: 'early-bird'
          }
        ]
      };
      
      setAvailability(mockAvailability);
      setCurrentStep(2);
      setAnimationKey(prev => prev + 1);
    } catch (err) {
      setError('Unable to check availability. Please try again.');
      toast.error('Connection error. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced price calculations with savings
  const { subtotal, addOnsTotal, total, totalSavings } = useMemo(() => {
    let basePrice = 0;
    let originalBasePrice = 0;
    
    if (bookingData.selectedTimeSlot) {
      const selectedOption = availability?.tourOptions.find(option => 
        option.timeSlots.some(slot => slot.id === bookingData.selectedTimeSlot?.id)
      );
      
      if (selectedOption) {
        basePrice = selectedOption.price;
        originalBasePrice = selectedOption.originalPrice || selectedOption.price;
      }
    }
    
    const subtotalCalc = (bookingData.adults * basePrice) + (bookingData.children * basePrice * 0.5);
    const originalSubtotal = (bookingData.adults * originalBasePrice) + (bookingData.children * originalBasePrice * 0.5);
    
    const addOnsCalc = Object.entries(bookingData.selectedAddOns).reduce((acc, [addOnId, quantity]) => {
      const addOn = addOnData.find(a => a.id === addOnId);
      if (addOn && quantity > 0) {
        return acc + (addOn.price * quantity);
      }
      return acc;
    }, 0);
    
    const addOnsSavings = Object.entries(bookingData.selectedAddOns).reduce((acc, [addOnId, quantity]) => {
      const addOn = addOnData.find(a => a.id === addOnId);
      if (addOn && quantity > 0 && addOn.savings) {
        return acc + (addOn.savings * quantity);
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
  }, [bookingData, availability]);

  // Reset when sidebar opens with enhanced animations
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
        specialRequests: '',
      });
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

  // Enhanced availability check with better validation
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
    
    const maxSize = tour?.maxGroupSize || 20;
    if (totalGuests > maxSize) {
      setError(`Maximum group size is ${maxSize} guests`);
      toast.error(`Group too large (max ${maxSize} guests)`, { icon: '⚠️' });
      return;
    }
    
    setError('');
    fetchAvailability(bookingData.selectedDate, totalGuests);
  }, [bookingData, tour?.maxGroupSize]);

  // Enhanced date selection with availability feedback
  const handleDateSelect = useCallback((date: Date) => {
    setBookingData(prev => ({ ...prev, selectedDate: date, selectedTimeSlot: null }));
    setShowDatePicker(false);
    setAvailability(null);
    setCurrentStep(1);
    
    // Provide immediate feedback about availability
    const dateKey = date.toISOString().split('T')[0];
    const dayAvailability = mockAvailabilityData[dateKey];
    
    if (dayAvailability === 'full') {
      toast.error('This date is fully booked. Please select another date.', {
        duration: 4000,
        icon: '😞'
      });
    } else if (dayAvailability === 'low') {
      toast('Limited availability on this date! Book soon.', {
        icon: '⚡',
        style: { background: '#FEF3C7', color: '#D97706' }
      });
    } else if (dayAvailability === 'high') {
      toast.success('Great choice! Plenty of availability.', { icon: '✨' });
    }
  }, []);

  const handleTimeSlotSelect = useCallback((timeSlot: TimeSlot) => {
    if (timeSlot.available === 0) {
      toast.error('This time slot is fully booked');
      return;
    }
    
    setBookingData(prev => ({ ...prev, selectedTimeSlot: timeSlot }));
    toast.success(`${timeSlot.time} selected!`, {
      icon: '⏰',
      duration: 2000
    });
  }, []);

  // Enhanced participant controls with better UX
  const handleParticipantChange = useCallback((type: 'adults' | 'children' | 'infants', increment: boolean) => {
    setBookingData(prev => {
      const currentCount = prev[type];
      const minValue = type === 'adults' ? 1 : 0;
      const maxValue = (tour?.maxGroupSize || 20) - (prev.adults + prev.children + prev.infants - currentCount);
      
      let newCount = increment 
        ? Math.min(maxValue, currentCount + 1)
        : Math.max(minValue, currentCount - 1);
      
      if (increment && newCount === currentCount && newCount < maxValue) {
        newCount = currentCount + 1;
      }
      
      return { ...prev, [type]: newCount };
    });
  }, [tour?.maxGroupSize]);

  const getParticipantsText = useCallback(() => {
    const totalGuests = bookingData.adults + bookingData.children + bookingData.infants;
    let text = `${totalGuests} guest${totalGuests !== 1 ? 's' : ''}`;
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

  // Enhanced final booking actions with better feedback
  const handleFinalAction = useCallback(async (action: 'cart' | 'checkout') => {
    if (isProcessing) return;
    
    setIsProcessing(action);
    
    const loadingToast = toast.loading(
      action === 'checkout'
        ? 'Preparing your adventure...'
        : 'Adding to your collection...',
      {
        position: 'bottom-center',
        style: { background: '#1F2937', color: 'white' }
      }
    );

    try {
      const selectedOption = availability?.tourOptions.find(option =>
        option.timeSlots.some(slot => slot.id === bookingData.selectedTimeSlot?.id)
      );

      if (!selectedOption || !tour || !bookingData.selectedDate || !bookingData.selectedTimeSlot) {
        throw new Error('Incomplete booking data.');
      }

      // Prepare the cart item
      const newCartItem = {
        ...tour,
        id: tour.id,
        uniqueId: `${tour.id}-${bookingData.selectedDate.toISOString()}-${bookingData.selectedTimeSlot.id}-${JSON.stringify(bookingData.selectedAddOns)}`,
        quantity: bookingData.adults,
        childQuantity: bookingData.children,
        infantQuantity: bookingData.infants,
        selectedDate: bookingData.selectedDate.toISOString(),
        selectedTime: bookingData.selectedTimeSlot.time,
        selectedAddOns: bookingData.selectedAddOns,
        price: selectedOption.price,
        originalPrice: selectedOption.originalPrice,
        discountPrice: selectedOption.price,
        totalPrice: total,
      };

      addToCart(newCartItem, false); // Add item to cart but don't open the sidebar yet

      toast.dismiss(loadingToast);
      onClose(); // Close the booking sidebar

      await new Promise(resolve => setTimeout(resolve, 300));

      if (action === 'checkout') {
        toast.success('Redirecting to secure checkout...', {
          icon: '🔒',
          duration: 3000,
          style: { background: '#10B981', color: 'white' }
        });
        router.push('/checkout');
      } else {
        toast.success('🎉 Added to Cart! Ready for more adventures?', {
          duration: 6000,
          position: 'bottom-center',
          style: { background: '#059669', color: 'white' }
        });
        router.push('/'); // Or stay on the same page, depending on desired UX
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onClose, router, bookingData, availability, tour, addToCart, total]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }, []);

  // Enhanced click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.participants-dropdown')) {
        setShowParticipantsDropdown(false);
      }
      if (!target.closest('.date-picker-dropdown')) {
        setShowDatePicker(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Enhanced step content renderer with better animations
  const renderStepContent = () => {
    if (isLoading) {
      return <LoadingSkeleton type="full" />;
    }

    const contentVariants = {
      enter: { opacity: 0, x: 20, scale: 0.95 },
      center: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: -20, scale: 0.95 }
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
            className="space-y-8 p-6"
          >
            {/* Enhanced Tour Header */}
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{tour?.title}</h2>
                {tour?.category && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    {tour.category}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star size={16} className="text-yellow-500 fill-current" />
                  <span className="font-semibold text-gray-700">{tour?.rating}</span>
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <Eye size={16} className="text-blue-500" />
                  <span className="text-sm text-gray-600">{tour?.bookings?.toLocaleString()} bookings</span>
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="flex items-center gap-1">
                  <Clock size={16} className="text-green-500" />
                  <span className="text-sm text-gray-600">{tour?.duration}</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 text-white mb-6">
                <div className="flex items-baseline justify-center gap-3 mb-2">
                  {tour?.originalPrice && tour.originalPrice > tour.discountPrice && (
                    <span className="text-blue-100 line-through text-lg">
                      {formatPrice(tour.originalPrice)}
                    </span>
                  )}
                  <span className="text-3xl font-bold">
                    {formatPrice(tour?.discountPrice || 0)}
                  </span>
                  <span className="text-blue-100">per adult</span>
                </div>
                {tour?.originalPrice && tour.originalPrice > tour.discountPrice && (
                  <div className="flex items-center justify-center gap-2">
                    <Zap size={16} />
                    <span className="text-sm font-semibold">
                      Save {formatPrice((tour.originalPrice || 0) - (tour.discountPrice || 0))} per person!
                    </span>
                  </div>
                )}
              </div>

              {/* Quick highlights */}
              {tour?.highlights && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {tour.highlights.slice(0, 4).map((highlight, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enhanced Date Input */}
            <div className="date-picker-dropdown">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <Calendar className="inline w-5 h-5 mr-2 text-blue-500" />
                When would you like to go?
              </label>
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl bg-white text-left hover:border-blue-300 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Calendar size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {bookingData.selectedDate ? 
                          formatDate(bookingData.selectedDate) : 
                          'Select your adventure date'
                        }
                      </div>
                      {bookingData.selectedDate && (
                        <div className="text-sm text-gray-500">
                          {bookingData.selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={20} className={`text-gray-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                </motion.button>
                
                <AnimatePresence>
                  {showDatePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full left-0 right-0 mt-2 z-30"
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

            {/* Enhanced Participants Dropdown */}
            <div className="participants-dropdown">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <Users className="inline w-5 h-5 mr-2 text-purple-500" />
                How many adventurers?
              </label>
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowParticipantsDropdown(!showParticipantsDropdown)}
                  className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl bg-white text-left hover:border-purple-300 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Users size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {getParticipantsText()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Tap to customize your group
                      </div>
                    </div>
                  </div>
                  {showParticipantsDropdown ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </motion.button>
                
                <AnimatePresence>
                  {showParticipantsDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-30 p-6"
                    >
                      <div className="space-y-6">
                        {/* Adults */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                              <User size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">Adults</div>
                              <div className="text-sm text-gray-500">Age 13+ • Full price</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleParticipantChange('adults', false)}
                              disabled={bookingData.adults <= 1}
                              className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                            >
                              <Minus size={16} />
                            </motion.button>
                            <span className="w-8 text-center font-bold text-lg">{bookingData.adults}</span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleParticipantChange('adults', true)}
                              className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
                            >
                              <Plus size={16} />
                            </motion.button>
                          </div>
                        </div>

                        {/* Children */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                              <Heart size={20} className="text-green-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">Children</div>
                              <div className="text-sm text-gray-500">Age 4-12 • 50% discount</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleParticipantChange('children', false)}
                              disabled={bookingData.children <= 0}
                              className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 hover:border-green-400 hover:bg-green-50 transition-colors"
                            >
                              <Minus size={16} />
                            </motion.button>
                            <span className="w-8 text-center font-bold text-lg">{bookingData.children}</span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleParticipantChange('children', true)}
                              className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                            >
                              <Plus size={16} />
                            </motion.button>
                          </div>
                        </div>

                        {/* Infants */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                              <Heart size={20} className="text-pink-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">Infants</div>
                              <div className="text-sm text-gray-500">Age 0-3 • Free</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleParticipantChange('infants', false)}
                              disabled={bookingData.infants <= 0}
                              className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 hover:border-pink-400 hover:bg-pink-50 transition-colors"
                            >
                              <Minus size={16} />
                            </motion.button>
                            <span className="w-8 text-center font-bold text-lg">{bookingData.infants}</span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleParticipantChange('infants', true)}
                              className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 transition-colors"
                            >
                              <Plus size={16} />
                            </motion.button>
                          </div>
                        </div>
                        
                        {/* Group size indicator */}
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <div className="text-sm text-gray-600 mb-1">Total Group Size</div>
                          <div className="text-2xl font-bold text-gray-800">
                            {bookingData.adults + bookingData.children + bookingData.infants}
                          </div>
                          <div className="text-xs text-gray-500">
                            Max: {tour?.maxGroupSize || 20} people
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Enhanced Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3"
                >
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <span className="text-red-700 font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Check Availability Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckAvailability}
              disabled={!bookingData.selectedDate || isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Finding Your Perfect Adventure...</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>Check Availability & Continue</span>
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>
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
            className="space-y-6 p-6"
          >
            {/* Weather and Date Info */}
            {availability?.weatherInfo && (
              <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {formatDate(bookingData.selectedDate!)}
                  </h4>
                  <p className="text-sm text-gray-600">Perfect weather for your adventure!</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl">{availability.weatherInfo.icon}</div>
                  <div className="font-semibold text-gray-800">{availability.weatherInfo.temperature}</div>
                  <div className="text-sm text-gray-600">{availability.weatherInfo.condition}</div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Choose Your Experience</h3>
              <p className="text-gray-600 mb-6">Select the perfect tour option for your group of {getParticipantsText().toLowerCase()}</p>
              
              <div className="space-y-6">
                {availability?.tourOptions.map(option => (
                  <TourOptionCard
                    key={option.id}
                    option={option}
                    onSelect={handleTimeSlotSelect}
                    selectedTimeSlot={bookingData.selectedTimeSlot}
                    adults={bookingData.adults}
                    children={bookingData.children}
                  />
                ))}
              </div>
            </div>

            {/* Special Offers */}
            {availability?.specialOffers && availability.specialOffers.length > 0 && (
              <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-6 border-2 border-orange-200">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Gift size={18} className="text-orange-500" />
                  Special Offers Available
                </h4>
                {availability.specialOffers.map(offer => (
                  <div key={offer.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{offer.title}</div>
                      <div className="text-sm text-gray-600">{offer.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-orange-600">{offer.discount}% OFF</div>
                      <div className="text-xs text-gray-500">Until {offer.validUntil}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            className="space-y-6 p-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Make It Even Better</h2>
              <p className="text-gray-600">
                Add these premium experiences to create unforgettable memories
              </p>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
              {availability?.addOns.map(addOn => (
                <AddOnCard
                  key={addOn.id}
                  addOn={addOn}
                  quantity={bookingData.selectedAddOns[addOn.id] || 0}
                  onQuantityChange={handleAddOnQuantityChange}
                />
              ))}
            </div>

            {/* Add-ons Summary */}
            {addOnsTotal > 0 && (
              <PriceSummary
                subtotal={0}
                addOnsTotal={addOnsTotal}
                total={addOnsTotal}
                savings={Object.entries(bookingData.selectedAddOns).reduce((acc, [addOnId, quantity]) => {
                  const addOn = addOnData.find(a => a.id === addOnId);
                  return acc + (addOn?.savings ? addOn.savings * quantity : 0);
                }, 0)}
                isVisible={true}
              />
            )}

            {/* No add-ons selected message */}
            {addOnsTotal === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={32} className="text-gray-400" />
                </div>
                <h4 className="font-semibold text-gray-600 mb-2">No extras selected</h4>
                <p className="text-sm text-gray-500">
                  You can always add these later or continue with your base tour
                </p>
              </div>
            )}
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
            className="space-y-6 p-6"
          >
            {/* Booking Summary */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-200 p-6">
              <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-500" />
                Your Adventure Summary
              </h3>
              
              {/* Tour Details */}
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Calendar size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {formatDate(bookingData.selectedDate!)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Departure at {bookingData.selectedTimeSlot?.time}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Users size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{getParticipantsText()}</div>
                    <div className="text-sm text-gray-600">Ready for adventure</div>
                  </div>
                </div>
                
                {Object.keys(bookingData.selectedAddOns).length > 0 && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Sparkles size={20} className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {Object.values(bookingData.selectedAddOns).reduce((sum, qty) => sum + qty, 0)} Premium Add-on{Object.values(bookingData.selectedAddOns).reduce((sum, qty) => sum + qty, 0) > 1 ? 's' : ''}
                      </div>
                      <div className="text-sm text-gray-600">Enhanced experience included</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Price Breakdown */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Price Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Adults ({bookingData.adults})</span>
                    <span className="font-medium">{formatPrice(bookingData.adults * (bookingData.selectedTimeSlot?.price || 0))}</span>
                  </div>
                  {bookingData.children > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Children ({bookingData.children})</span>
                      <span className="font-medium">{formatPrice(bookingData.children * (bookingData.selectedTimeSlot?.price || 0) * 0.5)}</span>
                    </div>
                  )}
                  {addOnsTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Premium Add-ons</span>
                      <span className="font-medium">{formatPrice(addOnsTotal)}</span>
                    </div>
                  )}
                  {totalSavings > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Total Savings</span>
                      <span className="font-medium">-{formatPrice(totalSavings)}</span>
                    </div>
                  )}
                  
                  <div className="h-px bg-gray-300 my-3"></div>
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-800">Total Amount</span>
                    <motion.span
                      key={total}
                      initial={{ scale: 1.2, color: '#3B82F6' }}
                      animate={{ scale: 1, color: '#1F2937' }}
                      className="text-blue-600"
                    >
                      {formatPrice(total)}
                    </motion.span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-green-500" />
                  <div>
                    <div className="font-semibold text-green-800 text-sm">Secure Booking</div>
                    <div className="text-xs text-green-600">SSL encrypted</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-blue-500" />
                  <div>
                    <div className="font-semibold text-blue-800 text-sm">Free Cancellation</div>
                    <div className="text-xs text-blue-600">Up to 24h before</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Need Help?</h4>
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Phone size={16} />
                    Call Us
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <MessageCircle size={16} />
                    Live Chat
                  </motion.button>
                </div>
                <div className="text-xs text-gray-500">Available 24/7</div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFinalAction('cart')}
                disabled={!!isProcessing}
                className="flex items-center justify-center gap-2 py-4 border-2 border-blue-500 text-blue-600 font-bold rounded-2xl transition-all disabled:opacity-50 hover:bg-blue-50"
              >
                {isProcessing === 'cart' ? (
                  <><Loader2 className="animate-spin" size={18} /> Adding...</>
                ) : (
                  <><ShoppingCart size={18} /> Add to Cart</>
                )}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFinalAction('checkout')}
                disabled={!!isProcessing}
                className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl transition-all disabled:opacity-50 hover:from-blue-600 hover:to-purple-700 shadow-lg"
              >
                {isProcessing === 'checkout' ? (
                  <><Loader2 className="animate-spin" size={18} /> Processing...</>
                ) : (
                  <><CreditCard size={18} /> Book Now</>
                )}
              </motion.button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (!tour) return null;

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
            {/* Enhanced Header with gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg sticky top-0 z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-yellow-300 fill-current" />
                    <span className="font-bold">{tour.rating}</span>
                  </div>
                  <div className="h-4 w-px bg-white/30"></div>
                  <div className="flex items-center gap-1">
                    <Eye size={16} />
                    <span className="font-medium">{tour.bookings?.toLocaleString()}</span>
                  </div>
                  <div className="h-4 w-px bg-white/30"></div>
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span className="font-medium">{tour.duration}</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose} 
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </motion.button>
              </div>
            </div>

            {/* Enhanced Step Progress with better visual design */}
            <div className="bg-white shadow-sm sticky top-[72px] z-20">
              <StepIcons currentStep={currentStep} />
            </div>

            {/* Content with enhanced scrolling */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>
            </div>

            {/* Enhanced Footer - only visible when time slot is selected */}
            <AnimatePresence>
              {currentStep > 1 && bookingData.selectedTimeSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 100 }}
                  className="bg-white border-t-2 border-gray-200 sticky bottom-0 z-20 shadow-2xl"
                >
                  {/* Quick Price Preview */}
                  <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600">{getParticipantsText()}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-800">{formatPrice(total)}</span>
                          {totalSavings > 0 && (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-semibold">
                              Save {formatPrice(totalSavings)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {formatDate(bookingData.selectedDate!)}
                        </div>
                        <div className="text-sm font-semibold text-blue-600">
                          {bookingData.selectedTimeSlot?.time}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Controls */}
                  <div className="p-4">
                    <div className="flex justify-between items-center gap-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBack}
                        className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
                      >
                        <ArrowLeft size={18} />
                        Back
                      </motion.button>
                      
                      {currentStep < 4 && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleNext}
                          disabled={isLoading}
                          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                          {currentStep === 3 ? 'Review Booking' : 'Continue'}
                          <ArrowRight size={18} />
                        </motion.button>
                      )}
                    </div>
                    
                    {/* Progress indicator */}
                    <div className="mt-3 flex justify-center">
                      <div className="flex gap-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index + 1 <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Step indicator at bottom - always visible */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-50 text-center py-2 text-xs font-bold text-gray-500 flex items-center justify-center gap-2">
              <span>Step {currentStep} of 4</span>
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${
                      index + 1 === currentStep ? 'bg-blue-500' :
                      index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSidebar;
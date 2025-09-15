'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  X, ArrowRight, ArrowLeft, Calendar, ShoppingCart, CreditCard, 
  Loader2, Clock, User, Users, Plus, Minus, Check, Languages,
  ChevronDown, ChevronLeft, ChevronRight, Star, MapPin, Shield,
  ChevronUp, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
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
}

interface TimeSlot {
  id: string;
  time: string;
  available: number;
  price: number;
  isPopular?: boolean;
}

interface AddOnTour {
  id: string;
  title: string;
  duration?: string;
  languages?: string[];
  description: string;
  price: number;
  availableTimes?: string[];
  required?: boolean;
  maxQuantity?: number;
}

interface AvailabilityData {
  date: string;
  timeSlots: TimeSlot[];
  addOns: AddOnTour[];
  tourOptions: TourOption[];
}

interface TourOption {
  id: string;
  title: string;
  price: number;
  duration: string;
  languages: string[];
  description: string;
  timeSlots: TimeSlot[];
}

interface BookingData {
  selectedDate: Date | null;
  selectedTimeSlot: TimeSlot | null;
  adults: number;
  children: number;
  infants: number;
  selectedAddOns: { [key: string]: number };
}

// Sample data
const tourOptionsData: TourOption[] = [
  {
    id: 'atv-sunset-tour',
    title: '3-Hour ATV Quad Tour Sunset with Transfer',
    price: 25.00,
    duration: '3 Hours',
    languages: ['English', 'German'],
    description: 'Enjoy a thrilling 30 k.m quad bike ride deep into the desert to a traditional Bedouin village. Here, you will be welcomed with authentic hospitality, learn about their ancient culture...',
    timeSlots: [
      { id: '1', time: '2:00 PM', available: 10, price: 25.00 },
      { id: '2', time: '3:00 PM', available: 5, price: 25.00 },
    ],
  },
  {
    id: 'shared-quad-tour',
    title: 'Shared 2-Hour Quad Bike Tour',
    price: 22.00,
    duration: '2 Hours',
    languages: ['English'],
    description: 'A thrilling shared quad bike adventure through the desert canyons. This tour is perfect for a quick and exciting taste of the desert landscape...',
    timeSlots: [
      { id: '3', time: '10:00 AM', available: 8, price: 22.00 },
      { id: '4', time: '2:00 PM', available: 15, price: 22.00 },
    ],
  },
];

const addOnData: AddOnTour[] = [
  {
    id: 'photo-package',
    title: 'Professional Photo Package',
    description: 'Get professional photos of your experience with our expert photographer',
    price: 35.00,
    required: false,
    maxQuantity: 1,
  },
  {
    id: 'transport',
    title: 'Hotel Pickup & Drop-off',
    description: 'Convenient round-trip transportation from your hotel',
    price: 15.00,
    required: false,
    maxQuantity: 1,
  }
];

// Utility functions
const useSettings = () => ({
  formatPrice: (price: number) => `€${price.toFixed(2)}`,
  selectedCurrency: { symbol: '€', code: 'EUR' }
});

// Calendar Component
const CalendarWidget: React.FC<{
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}> = ({ selectedDate, onDateSelect }) => {
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
  
  const renderCalendarDays = () => {
    const days = [];
    
    // Previous month's trailing days
    for (let i = 0; i < firstDayOfMonth; i++) {
      const prevMonth = new Date(currentMonth);
      prevMonth.setMonth(currentMonth.getMonth() - 1);
      const prevMonthDays = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
      const day = prevMonthDays - firstDayOfMonth + i + 1;
      
      days.push(
        <button
          key={`prev-${day}`}
          className="w-8 h-8 text-sm text-gray-400 hover:bg-gray-100 rounded-lg"
          disabled
        >
          {day}
        </button>
      );
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isToday = currentDate.toDateString() === today.toDateString();
      const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString();
      const isPast = currentDate < today && !isToday;
      
      days.push(
        <button
          key={day}
          onClick={() => !isPast && onDateSelect(currentDate)}
          disabled={isPast}
          className={`w-8 h-8 text-sm rounded-lg transition-all ${
            isSelected
              ? 'bg-blue-500 text-white font-semibold'
              : isToday
              ? 'bg-blue-100 text-blue-600 font-semibold'
              : isPast
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };
  
  return (
    <div className="bg-white">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
    </div>
  );
};

// New Component for Tour Option Cards
const TourOptionCard: React.FC<{
  option: TourOption;
  onSelect: (timeSlot: TimeSlot) => void;
  selectedTimeSlot: TimeSlot | null;
  adults: number;
}> = ({ option, onSelect, selectedTimeSlot, adults }) => {
  const { formatPrice } = useSettings();
  const basePrice = option.price;
  const subtotal = adults * basePrice;

  return (
    <div className="border border-gray-200 rounded-xl p-4 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 pr-4">
          <h4 className="font-semibold text-gray-800 text-sm mb-1">{option.title}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {option.duration}
            </span>
            <span className="flex items-center gap-1">
              <Languages size={12} />
              {option.languages.join(', ')}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{option.description}</p>
          <span className="mt-2 text-sm font-semibold text-blue-600 block">
            {formatPrice(subtotal)}
          </span>
          <span className="text-xs text-gray-500">
            {adults} x {formatPrice(basePrice)}
          </span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-2">Select a starting time:</p>
        <div className="flex flex-wrap gap-2">
          {option.timeSlots.map(timeSlot => (
            <button
              key={timeSlot.id}
              onClick={() => onSelect(timeSlot)}
              className={`flex-1 min-w-[100px] text-center px-4 py-2 rounded-lg font-semibold transition-colors
                ${selectedTimeSlot?.id === timeSlot.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              {timeSlot.time}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// New Add-on Card Component with selectable logic
const AddOnCard: React.FC<{
  addOn: AddOnTour;
  isSelected: boolean;
  onToggle: (id: string) => void;
}> = ({ addOn, isSelected, onToggle }) => {
  const { formatPrice } = useSettings();

  return (
    <div
      onClick={() => onToggle(addOn.id)}
      className={`relative border rounded-xl p-4 transition-all cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-4">
          <h4 className="font-semibold text-gray-800 text-sm">{addOn.title}</h4>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{addOn.description}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-semibold text-blue-600">
            {formatPrice(addOn.price)}
          </div>
          <div className="text-xs text-gray-500">Total Price</div>
        </div>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
          <Check size={16} />
        </div>
      )}
    </div>
  );
};

// Loading Skeletons
const LoadingSkeleton: React.FC<{ type: 'full' | 'addons' | 'summary' }> = ({ type }) => {
  if (type === 'full') {
    return (
      <div className="space-y-6 p-6">
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }
  
  if (type === 'addons') {
    return (
      <div className="space-y-4 p-6">
        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-4 p-6">
      <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
      <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
    </div>
  );
};

// Step Icons Component
const StepIcons: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { icon: Calendar, label: 'Date & Guests', completed: currentStep > 1 },
    { icon: Clock, label: 'Time Slots', completed: currentStep > 2 },
    { icon: Plus, label: 'Add-ons', completed: currentStep > 3 },
    { icon: CreditCard, label: 'Complete', completed: currentStep > 4 }
  ];

  return (
    <div className="flex justify-between items-center py-4 px-2">
      {steps.map((step, index) => {
        const IconComponent = step.icon;
        const isActive = currentStep === index + 1;
        const isCompleted = step.completed;
        
        return (
          <div key={index} className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
              isCompleted 
                ? 'bg-green-500 text-white' 
                : isActive 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-400'
            }`}>
              <IconComponent size={16} />
            </div>
            <span className="text-xs text-gray-600 text-center max-w-16">{step.label}</span>
          </div>
        );
      })}
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
  const router = useRouter();
  const { formatPrice } = useSettings();
  const [currentStep, setCurrentStep] = useState(1);
const [isProcessing, setIsProcessing] = useState<false | 'cart' | 'checkout'>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showParticipantsDropdown, setShowParticipantsDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);

  const [bookingData, setBookingData] = useState<BookingData>({
    selectedDate: null,
    selectedTimeSlot: null,
    adults: 2,
    children: 0,
    infants: 0,
    selectedAddOns: {},
  });

  // Mock availability fetching
  const fetchAvailability = async (date: Date, totalGuests: number) => {
    setIsLoading(true);
    setError('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockAvailability: AvailabilityData = {
        date: date.toISOString().split('T')[0],
        timeSlots: [],
        addOns: addOnData,
        tourOptions: tourOptionsData,
      };
      
      setAvailability(mockAvailability);
      setCurrentStep(2);
    } catch (err) {
      setError('Failed to check availability. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total price
  const { subtotal, addOnsTotal, total } = useMemo(() => {
    let basePrice = 0;
    if (bookingData.selectedTimeSlot) {
      basePrice = bookingData.selectedTimeSlot.price;
    }
    
    const subtotalCalc = (bookingData.adults * basePrice) + (bookingData.children * basePrice * 0.5);
    
    const addOnsCalc = Object.entries(bookingData.selectedAddOns).reduce((acc, [addOnId, quantity]) => {
      const addOn = addOnData.find(a => a.id === addOnId);
      if (addOn && quantity > 0) {
        return acc + (addOn.price * quantity);
      }
      return acc;
    }, 0);
    
    return {
      subtotal: subtotalCalc,
      addOnsTotal: addOnsCalc,
      total: subtotalCalc + addOnsCalc,
    };
  }, [bookingData]);

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
      setBookingData({
        selectedDate: null,
        selectedTimeSlot: null,
        adults: 2,
        children: 0,
        infants: 0,
        selectedAddOns: {},
      });
    }
  }, [isOpen]);

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 2 && !bookingData.selectedTimeSlot) {
      toast.error('Please select a time slot.');
      return;
    }
    if (currentStep < 4) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  // Check availability handler
  const handleCheckAvailability = () => {
    if (!bookingData.selectedDate) {
      setError('Please select a date');
      return;
    }
    const totalGuests = bookingData.adults + bookingData.children + bookingData.infants;
    if (totalGuests === 0) {
      setError('Please select at least one guest');
      return;
    }
    if (totalGuests > (tour?.maxGroupSize || 20)) {
      setError(`Maximum group size is ${tour?.maxGroupSize || 20} guests`);
      return;
    }
    
    fetchAvailability(bookingData.selectedDate, totalGuests);
  };

  // Date and time handlers
  const handleDateSelect = (date: Date) => {
    setBookingData(prev => ({ ...prev, selectedDate: date, selectedTimeSlot: null }));
    setShowDatePicker(false);
    setAvailability(null);
    setCurrentStep(1);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    if (timeSlot.available === 0) return;
    setBookingData(prev => ({ ...prev, selectedTimeSlot: timeSlot }));
  };
  
  // Participants handlers
  const handleParticipantChange = (type: 'adults' | 'children' | 'infants', increment: boolean) => {
    setBookingData(prev => {
      const currentCount = prev[type];
      const minValue = type === 'adults' ? 1 : 0;
      const newCount = increment 
        ? currentCount + 1 
        : Math.max(minValue, currentCount - 1);
      return { ...prev, [type]: newCount };
    });
  };

  const getParticipantsText = () => {
    const totalGuests = bookingData.adults + bookingData.children + bookingData.infants;
    let text = `${totalGuests} guest${totalGuests !== 1 ? 's' : ''}`;
    const details = [];
    
    if (bookingData.adults > 0) details.push(`${bookingData.adults} adult${bookingData.adults > 1 ? 's' : ''}`);
    if (bookingData.children > 0) details.push(`${bookingData.children} child${bookingData.children > 1 ? 'ren' : ''}`);
    if (bookingData.infants > 0) details.push(`${bookingData.infants} infant${bookingData.infants > 1 ? 's' : ''}`);
    
    return `${text} (${details.join(', ')})`;
  };

  // Add-ons handlers
  const handleAddOnToggle = (addOnId: string) => {
    setBookingData(prev => {
      const selectedAddOns = { ...prev.selectedAddOns };
      if (selectedAddOns[addOnId]) {
        delete selectedAddOns[addOnId];
      } else {
        selectedAddOns[addOnId] = 1;
      }
      return { ...prev, selectedAddOns };
    });
  };

  // Final actions
  const handleFinalAction = async (action: 'cart' | 'checkout') => {
    if (isProcessing) return;
    setIsProcessing(action);

    if (action === 'checkout') {
      toast.loading('Redirecting to checkout...', { position: 'bottom-center' });
    }

    await new Promise((res) => setTimeout(res, 2000));

    onClose();
    await new Promise(resolve => setTimeout(resolve, 300));

    if (action === 'checkout') {
      toast.dismiss();
      router.push('/checkout');
    } else if (action === 'cart') {
      toast.success('Added to Cart! Continue browsing for more tours.', { 
        duration: 5000, 
        position: 'bottom-center' 
      });
      router.push('/');
    }
    
    setIsProcessing(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Close dropdowns when clicking outside
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Step content renderer
  const renderStepContent = () => {
    if (isLoading) {
      return <LoadingSkeleton type="full" />;
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 p-6">
            {/* Tour Title */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{tour?.title}</h2>
              <div className="flex items-baseline mb-2">
                <span className="text-2xl font-bold text-blue-600">
                  {formatPrice(tour?.discountPrice || 0)}
                </span>
                <span className="text-gray-600 ml-2">per adult</span>
              </div>
            </div>
            {/* Date Input */}
            <div className="date-picker-dropdown">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Select Date
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white text-left hover:border-gray-400 transition-colors"
                >
                  <span>
                    {bookingData.selectedDate ? 
                      bookingData.selectedDate.toLocaleDateString('en-US', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        year: 'numeric' 
                      }) : 
                      'Select a date'
                    }
                  </span>
                  <Calendar size={16} className="text-gray-500" />
                </button>
                
                {showDatePicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-30 p-4">
                    <CalendarWidget
                      selectedDate={bookingData.selectedDate}
                      onDateSelect={handleDateSelect}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Participants Dropdown */}
            <div className="participants-dropdown">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                Guests
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowParticipantsDropdown(!showParticipantsDropdown)}
                  className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white text-left hover:border-gray-400 transition-colors"
                >
                  <span>{getParticipantsText()}</span>
                  {showParticipantsDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showParticipantsDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-30 p-4">
                    <div className="space-y-4">
                      {/* Adults */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">Adults</div>
                          <div className="text-sm text-gray-500">Age 13+</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleParticipantChange('adults', false)}
                            disabled={bookingData.adults <= 1}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 hover:bg-gray-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-semibold">{bookingData.adults}</span>
                          <button
                            onClick={() => handleParticipantChange('adults', true)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">Children</div>
                          <div className="text-sm text-gray-500">Age 4-12 (50% off)</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleParticipantChange('children', false)}
                            disabled={bookingData.children <= 0}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 hover:bg-gray-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-semibold">{bookingData.children}</span>
                          <button
                            onClick={() => handleParticipantChange('children', true)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Infants */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">Infants</div>
                          <div className="text-sm text-gray-500">Age 0-3 (Free)</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleParticipantChange('infants', false)}
                            disabled={bookingData.infants <= 0}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 hover:bg-gray-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-semibold">{bookingData.infants}</span>
                          <button
                            onClick={() => handleParticipantChange('infants', true)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Check Availability Button */}
            <button
              onClick={handleCheckAvailability}
              disabled={!bookingData.selectedDate || isLoading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Checking Availability...
                </>
              ) : (
                <>
                  Find Adventure
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 p-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Tour Options</h3>
              
              <div className="space-y-4">
                {availability?.tourOptions.map(option => (
                  <TourOptionCard
                    key={option.id}
                    option={option}
                    onSelect={handleTimeSlotSelect}
                    selectedTimeSlot={bookingData.selectedTimeSlot}
                    adults={bookingData.adults}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800">Enhance Your Experience</h2>
              <p className="text-sm text-gray-600 mt-2">
                Optional add-ons to make your tour even more memorable
              </p>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {availability?.addOns.map(addOn => (
                <AddOnCard
                  key={addOn.id}
                  addOn={addOn}
                  isSelected={!!bookingData.selectedAddOns[addOn.id]}
                  onToggle={handleAddOnToggle}
                />
              ))}
            </div>

            {addOnsTotal > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Add-ons Total:</span>
                  <span className="font-bold text-blue-600">{formatPrice(addOnsTotal)}</span>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 p-6">
            {/* Booking Summary */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-bold text-lg mb-4">Booking Summary</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-gray-500" />
                  <span className="text-sm">
                    {formatDate(bookingData.selectedDate!)} at {bookingData.selectedTimeSlot?.time}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-gray-500" />
                  <span className="text-sm">{getParticipantsText()}</span>
                </div>
                {addOnsTotal > 0 && (
                  <div className="flex items-center gap-3">
                    <Plus size={16} className="text-gray-500" />
                    <span className="text-sm">
                      {Object.values(bookingData.selectedAddOns).reduce((sum, qty) => sum + qty, 0)} add-on{Object.values(bookingData.selectedAddOns).reduce((sum, qty) => sum + qty, 0) > 1 ? 's' : ''} selected
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Adults ({bookingData.adults})</span>
                  <span>{formatPrice(bookingData.adults * (bookingData.selectedTimeSlot?.price || 0))}</span>
                </div>
                {bookingData.children > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Children ({bookingData.children})</span>
                    <span>{formatPrice(bookingData.children * (bookingData.selectedTimeSlot?.price || 0) * 0.5)}</span>
                  </div>
                )}
                {addOnsTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Add-ons</span>
                    <span>{formatPrice(addOnsTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total Price</span>
                  <span className="text-blue-600">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
            
            {/* Trust Indicators */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Shield size={16} className="text-green-500" />
                <div>
                  <div className="font-medium text-gray-800">Secure Booking</div>
                  <div>Free cancellation up to 24 hours before</div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleFinalAction('cart')}
                disabled={!!isProcessing}
                className="flex-1 border border-blue-600 text-blue-600 font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-blue-50"
              >
                {isProcessing === 'cart' ? (
                  <><Loader2 className="animate-spin" size={16} /> Adding...</>
                ) : (
                  <><ShoppingCart size={16} /> Add to Cart</>
                )}
              </button>
              
              <button
                onClick={() => handleFinalAction('checkout')}
                disabled={!!isProcessing}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                {isProcessing === 'checkout' ? (
                  <><Loader2 className="animate-spin" size={16} /> Processing...</>
                ) : (
                  <>Book Now →</>
                )}
              </button>
            </div>
          </div>
        );

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
            className="relative bg-white h-full w-full max-w-md shadow-xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <Star size={16} className="text-yellow-500 fill-current" />
                <span className="font-semibold">{tour.rating}</span>
                <span className="text-gray-500 text-sm">{tour.bookings?.toLocaleString()} bookings</span>
                <span className="text-gray-500 text-sm">⏱ {tour.duration}</span>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            {/* Step Progress */}
            <div className="border-b bg-white sticky top-[65px] z-20">
              <StepIcons currentStep={currentStep} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {renderStepContent()}
            </div>
            {/* Conditional Footer (only visible when time slot is selected) */}
            {currentStep > 1 && bookingData.selectedTimeSlot && (
              <div className="p-4 border-t bg-white sticky bottom-0 z-20">
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  
                  {currentStep < 4 && (
                    <button
                      onClick={handleNext}
                      disabled={isLoading}
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Next Step
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{getParticipantsText()}</span>
                  <span>Total: <strong className="text-gray-900">{formatPrice(total)}</strong></span>
                </div>
              </div>
            )}
            
            {/* Step indicator at bottom */}
            <div className="text-center py-2 text-2xl font-bold text-gray-300 bg-gray-50">
              {currentStep}/4
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSidebar;
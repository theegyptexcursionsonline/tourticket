'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  X, ArrowRight, ArrowLeft, Calendar, ShoppingCart, CreditCard, 
  Loader2, Clock, User, Users, Plus, Minus, Check, Languages,
  ChevronDown, ChevronLeft, ChevronRight, Star
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

interface BookingData {
  selectedDate: Date | null;
  selectedTime: string;
  adults: number;
  children: number;
  selectedAddOns: { [key: string]: string };
}

// Sample data
const addOnData: AddOnTour[] = [
  {
    id: 'atv-sunset',
    title: '3-Hour ATV Quad Tour Sunset with Transfer',
    duration: '3 Hours',
    languages: ['English', 'German'],
    description: 'Enjoy a thrilling 30 k.m quad bike ride deep into the desert to a traditional Bedouin village. Here, you will be welcomed with authentic hospitality, learn about their ancient culture.',
    price: 25.00,
    availableTimes: ['2:00 PM', '3:00 PM'],
  },
  {
    id: 'shared-quad',
    title: 'Shared 2-Hour Quad Bike Tour',
    duration: '2 Hours',
    languages: ['English'],
    description: 'A thrilling shared quad bike adventure through the desert canyons. This tour is perfect for a quick and exciting taste of the desert landscape. Our guides will lead you through.',
    price: 22.00,
    availableTimes: ['10:00 AM', '2:00 PM'],
  }
];

// Utility functions (make dynamic)
const useSettings = () => ({
  formatPrice: (price: number) => `€${price.toFixed(2)}`, // Dynamic currency
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
              ? 'bg-red-500 text-white font-semibold'
              : isToday
              ? 'bg-red-100 text-red-600 font-semibold'
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

// Add-on Card Component
const AddOnCard: React.FC<{
  addOn: AddOnTour;
  isSelected: boolean;
  selectedTime?: string;
  onSelect: (id: AddOnTour['id'], time: string) => void;
  onDeselect: (id: AddOnTour['id']) => void;
  adults: number;
}> = ({ addOn, isSelected, selectedTime, onSelect, onDeselect, adults }) => {
  const { formatPrice } = useSettings();
  
  const handleTimeSelect = (time: string) => {
    if (isSelected && selectedTime === time) {
      onDeselect(addOn.id);
    } else {
      onSelect(addOn.id, time);
    }
  };

  return (
    <div className={`border rounded-xl p-4 transition-all ${
      isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 text-sm">{addOn.title}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {addOn.duration}
            </span>
            <span className="flex items-center gap-1">
              <Languages size={12} />
              {addOn.languages.join(', ')}
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{addOn.description}</p>
      
      <button className="text-xs text-purple-600 font-medium mb-4 block">
        Read More
      </button>
      
      <button className="text-xs text-purple-600 font-medium mb-4 block">
        View Pickup Areas
      </button>
      
      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-700">Select a starting time:</div>
        <div className="flex gap-2">
          {addOn.availableTimes.map(time => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isSelected && selectedTime === time
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-500">Adults:</div>
          <div className="text-sm font-semibold">{adults} × {formatPrice(addOn.price)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-bold text-gray-800">{formatPrice(addOn.price * adults)}</div>
        </div>
      </div>
    </div>
  );
};

// Step Icons Component
const StepIcons: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { icon: Check, label: 'Your & Time', completed: currentStep > 1 },
    { icon: Plus, label: 'Add-ons', completed: currentStep > 2 },
    { icon: User, label: 'Details', completed: currentStep > 3 },
    { icon: CreditCard, label: 'Payment', completed: currentStep > 4 }
  ];

  return (
    <div className="flex justify-between items-center py-4">
      {steps.map((step, index) => {
        const IconComponent = step.icon;
        const isActive = currentStep === index + 1;
        const isCompleted = step.completed;
        
        return (
          <div key={index} className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
              isCompleted 
                ? 'bg-green-500 text-white' 
                : isActive 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-400'
            }`}>
              <IconComponent size={16} />
            </div>
            <span className="text-xs text-gray-600 text-center">{step.label}</span>
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
  const [showParticipantsDropdown, setShowParticipantsDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [bookingData, setBookingData] = useState<BookingData>({
    selectedDate: new Date('2025-09-26'), // Default date from screenshot
    selectedTime: '',
    adults: 1,
    children: 0,
    selectedAddOns: {},
  });

  // Available times
  const availableTimes = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM'
  ];

  // Calculate total price
  const { subtotal, addOnsTotal, total } = useMemo(() => {
    if (!tour) return { subtotal: 0, addOnsTotal: 0, total: 0 };
    
    const pricePerAdult = tour.discountPrice || 0;
    const pricePerChild = pricePerAdult / 2;
    const subtotalCalc = (bookingData.adults * pricePerAdult) + (bookingData.children * pricePerChild);
    
    const addOnsCalc = Object.keys(bookingData.selectedAddOns).reduce((acc, addOnId) => {
      const addOn = addOnData.find(a => a.id === addOnId);
      if (addOn) {
        return acc + (addOn.price * bookingData.adults);
      }
      return acc;
    }, 0);
    
    return {
      subtotal: subtotalCalc,
      addOnsTotal: addOnsCalc,
      total: subtotalCalc + addOnsCalc,
    };
  }, [tour, bookingData]);

  // Reset when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setIsProcessing(false);
      setShowParticipantsDropdown(false);
      setShowDatePicker(false);
      setBookingData({
        selectedDate: new Date('2025-09-26'),
        selectedTime: '',
        adults: 1,
        children: 0,
        selectedAddOns: {},
      });
    }
  }, [isOpen]);

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 1 && (!bookingData.selectedDate || !bookingData.selectedTime)) {
      toast.error('Please select date and time.');
      return;
    }
    if (currentStep < 3) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  // Find My Adventure handler
  const handleFindMyAdventure = () => {
    if (!bookingData.selectedDate || !bookingData.selectedTime) {
      toast.error('Please select date and time first.');
      return;
    }
    setCurrentStep(2); // Move to add-ons step
  };

  // Date and time handlers
  const handleDateSelect = (date: Date) => {
    setBookingData(prev => ({ ...prev, selectedDate: date, selectedTime: '' }));
    setShowDatePicker(false);
  };

  const handleTimeSelect = (time: string) => {
    setBookingData(prev => ({ ...prev, selectedTime: time }));
  };

  // Participants handlers
  const handleParticipantChange = (type: 'adults' | 'children', increment: boolean) => {
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
    let text = `${bookingData.adults} Adult${bookingData.adults > 1 ? 's' : ''}`;
    if (bookingData.children > 0) {
      text += `, ${bookingData.children} Child${bookingData.children > 1 ? 'ren' : ''}`;
    }
    return text;
  };

  // Add-ons handlers
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
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 p-6">
            {/* Tour Title */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{tour?.title}</h2>
            </div>

            {/* Start Your Adventure Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Start Your Adventure</h3>
              
              <div className="space-y-4">
                {/* Participants Dropdown */}
                <div className="participants-dropdown">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowParticipantsDropdown(!showParticipantsDropdown)}
                      className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white text-left"
                    >
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-500" />
                        <span>{getParticipantsText()}</span>
                      </div>
                      <ChevronDown size={16} className="text-gray-500" />
                    </button>
                    
                    {showParticipantsDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">Adult</div>
                              <div className="text-sm text-gray-500">Age 13-99</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleParticipantChange('adults', false)}
                                disabled={bookingData.adults <= 1}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center font-semibold">{bookingData.adults}</span>
                              <button
                                onClick={() => handleParticipantChange('adults', true)}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">Child</div>
                              <div className="text-sm text-gray-500">Age 10 and younger</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleParticipantChange('children', false)}
                                disabled={bookingData.children <= 0}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center font-semibold">{bookingData.children}</span>
                              <button
                                onClick={() => handleParticipantChange('children', true)}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
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

                {/* Date Input */}
                <div className="date-picker-dropdown">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white text-left"
                    >
                      <span>
                        {bookingData.selectedDate?.toLocaleDateString('en-US', { 
                          month: '2-digit', 
                          day: '2-digit', 
                          year: 'numeric' 
                        })}
                      </span>
                      <Calendar size={16} className="text-gray-500" />
                    </button>
                    
                    {showDatePicker && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 p-4">
                        <CalendarWidget
                          selectedDate={bookingData.selectedDate}
                          onDateSelect={handleDateSelect}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Selection */}
                {bookingData.selectedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Available Times</label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableTimes.map(time => (
                        <button
                          key={time}
                          onClick={() => handleTimeSelect(time)}
                          className={`p-3 rounded-lg text-sm font-medium transition-all ${
                            bookingData.selectedTime === time
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Find My Adventure Button */}
                <button
                  onClick={handleFindMyAdventure}
                  disabled={!bookingData.selectedDate || !bookingData.selectedTime}
                  className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Find My Adventure
                </button>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800">Enhance Your Tour (Optional)</h2>
              <p className="text-sm text-gray-600">Want to upgrade your adventure? These add-ons are not required — you can skip this step and continue, or choose extras for more comfort and a personalized experience.</p>
            </div>

            <div className="space-y-4">
              {addOnData.map(addOn => (
                <AddOnCard
                  key={addOn.id}
                  addOn={addOn}
                  isSelected={!!bookingData.selectedAddOns[addOn.id]}
                  selectedTime={bookingData.selectedAddOns[addOn.id]}
                  onSelect={handleSelectAddOn}
                  onDeselect={handleDeselectAddOn}
                  adults={bookingData.adults}
                />
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 p-6">
            <StepIcons currentStep={currentStep} />
            
            <div className="bg-white rounded-lg p-4 border">
              <h3 className="font-bold text-lg mb-4">Enhance Your Tour (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">Want to upgrade your adventure? These add-ons are not required — you can skip this step and continue, or choose extras for more comfort and a personalized experience.</p>
              
              <div className="space-y-4 mb-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Private Transfer</h4>
                  <p className="text-sm text-gray-600 mb-2">Skip the shared bus and enjoy a comfortable, air-conditioned ride just for your group.</p>
                  <div className="text-right">
                    <span className="text-lg font-bold">+ {formatPrice(25.00)}</span>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Private Guide</h4>
                  <p className="text-sm text-gray-600 mb-2">Get a dedicated expert guide for a personalized and in-depth tour experience.</p>
                  <div className="text-right">
                    <span className="text-lg font-bold">+ {formatPrice(50.00)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Total Price</span>
                  <span className="font-semibold">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleFinalAction('cart')}
                disabled={!!isProcessing}
                className="flex-1 border border-purple-600 text-purple-600 font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing === 'cart' ? (
                  <><Loader2 className="animate-spin" size={16} /> Add to cart</>
                ) : (
                  <>🛒 Add to cart</>
                )}
              </button>
              
              <button
                onClick={() => handleFinalAction('checkout')}
                disabled={!!isProcessing}
                className="flex-1 bg-purple-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing === 'checkout' ? (
                  <><Loader2 className="animate-spin" size={16} /> Processing...</>
                ) : (
                  <>Next Step →</>
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
            <div className="flex items-center justify-between p-4 border-b">
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {renderStepContent()}
            </div>

            {/* Footer */}
            {currentStep > 1 && (
              <div className="p-4 border-t bg-white">
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  
                  {currentStep < 3 && (
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-2 bg-red-500 text-white px-6 py-2 rounded-lg font-semibold"
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
            <div className="text-center py-4 text-4xl font-bold text-gray-300">
              {currentStep}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSidebar;
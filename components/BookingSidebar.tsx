// components/BookingSidebar.tsx
'use client';

import { FC, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Calendar, Users } from 'lucide-react';
import { Tour, CartItem } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/hooks/useSettings';
import Image from 'next/image';
import { addOnData } from './booking/addOnData'; // Import the shared add-on data

// STEP PROGRESS INDICATOR
const StepIndicator: FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const percent = Math.max(0, Math.round(((currentStep - 1) / (totalSteps - 1)) * 100));
  return (
    <div className="flex items-center gap-4 w-full">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const step = i + 1;
          return (
            <div key={step} className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
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
      <span className="text-xs text-slate-500">{percent}%</span>
    </div>
  );
};

// MAIN SIDEBAR COMPONENT
interface BookingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
}

const BookingSidebar: FC<BookingSidebarProps> = ({ isOpen, onClose, tour }) => {
  const { formatPrice } = useSettings();
  const totalSteps = 4;
  const [currentStep, setCurrentStep] = useState(1);

  // --- UPDATED STATE ---
  const [bookingData, setBookingData] = useState({
    selectedDate: new Date(),
    selectedTime: '',
    adults: 1,
    children: 0,
    selectedAddOn: null as 'atv-sunset' | 'shared-quad' | null,
    addOnTime: '',
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setBookingData({
        selectedDate: new Date(),
        selectedTime: '',
        adults: 1,
        children: 0,
        selectedAddOn: null,
        addOnTime: '',
      });
    }
  }, [isOpen]);

  // --- UPDATED DYNAMIC PRICE CALCULATION ---
  const { subtotal, extras, total } = useMemo(() => {
    if (!tour) return { subtotal: 0, extras: 0, total: 0 };
    
    const pricePerAdult = tour.discountPrice || 0;
    const pricePerChild = pricePerAdult / 2;

    const subtotalCalc = (bookingData.adults * pricePerAdult) + (bookingData.children * pricePerChild);
    
    let extrasCalc = 0;
    if (bookingData.selectedAddOn) {
        const addOn = addOnData.find(a => a.id === bookingData.selectedAddOn);
        if (addOn) {
            extrasCalc = addOn.price * bookingData.adults; 
        }
    }
    
    return {
      subtotal: subtotalCalc,
      extras: extrasCalc,
      total: subtotalCalc + extrasCalc,
    };
  }, [tour, bookingData]);

  // --- NAVIGATION HANDLERS ---
  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };
  
  if (!tour) return null;

  // --- DYNAMIC STEP RENDERING ---
  const renderStep = () => {
    const StepComponents = [
      require('./booking/BookingStep1').default,
      require('./booking/BookingStep2').default,
      require('./booking/BookingStep3').default,
      require('./booking/BookingStep4').default,
    ];
    const Step = StepComponents[currentStep - 1];
    // --- FIX: Pass the onClose prop down to the step components ---
    return <Step bookingData={bookingData} setBookingData={setBookingData} tour={tour} onClose={onClose} />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
          <motion.div className="absolute inset-0 bg-black/40" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative bg-white h-full w-full max-w-lg shadow-xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* HEADER */}
            <div className="p-4 border-b flex items-center gap-3">
              <Image src={tour.image} alt={tour.title} width={48} height={48} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <h3 className="font-semibold text-slate-800 line-clamp-1">{tour.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={14} /> {bookingData.selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-bold text-slate-900">{formatPrice(tour.discountPrice)}</p>
                <p className="text-xs text-slate-400">per adult</p>
              </div>
              <button onClick={onClose} className="ml-2 p-2 rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {/* STEP INDICATOR */}
            <div className="p-4 border-b">
              <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
            </div>

            {/* STEP CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">{renderStep()}</div>

            {/* UPDATED FOOTER */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-slate-600 hover:bg-slate-100 transition-opacity ${
                      currentStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <ArrowLeft size={16} /> Back
                </button>

                {/* Hide Next button on the final step */}
                {currentStep < totalSteps ? (
                  <button
                    onClick={handleNext}
                    disabled={currentStep === 1 && !bookingData.selectedTime}
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:bg-red-300 disabled:cursor-not-allowed"
                  >
                    {currentStep === totalSteps - 1 ? 'Review & Book' : 'Next Step'}
                    <ArrowRight size={16} />
                  </button>
                ) : (
                    // On the last step, this space is empty because Step 4 has its own buttons.
                    <div className="w-36 h-12"></div>
                )}
              </div>

              {/* DYNAMIC PRICE SUMMARY */}
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
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

export default BookingSidebar;
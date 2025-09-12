'use client';

import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Tour } from '@/types';
import { useCart } from '@/contexts/CartContext';
import BookingStep1 from './booking/BookingStep1';
import BookingStep2 from './booking/BookingStep2';
import BookingStep3 from './booking/BookingStep3';
import BookingStep4 from './booking/BookingStep4';

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
  const { addToCart } = useCart();
  
  // --- STATE MANAGEMENT ---
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    selectedDate: new Date(),
    selectedTime: '',
    guests: 1,
    hasDiscount: false,
    privateTransfer: false,
    privateGuide: false,
  });

  // Reset state when a new tour is selected or sidebar is re-opened
  useEffect(() => {
    if (isOpen && tour) {
      setCurrentStep(1);
      setBookingData({
        selectedDate: new Date(),
        selectedTime: '',
        guests: 1,
        hasDiscount: false,
        privateTransfer: false,
        privateGuide: false,
      });
    }
  }, [isOpen, tour]);


  // --- NAVIGATION LOGIC ---
  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleProceed = async () => {
    if (!tour) return;
    const cartItem = {
      ...tour,
      quantity: bookingData.guests,
      details: `${bookingData.selectedDate.toLocaleDateString()}, ${bookingData.selectedTime}`
    };
    addToCart(cartItem);
    await new Promise(resolve => setTimeout(resolve, 300));
    onClose();
    router.push('/checkout');
  };

  if (!tour) return null;

  // --- RENDER LOGIC ---
  const renderStepContent = () => {
    const stepVariants = {
      hidden: { opacity: 0, x: 20 },
      visible: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    };

    const commonProps = {
        bookingData,
        setBookingData,
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
          {currentStep === 1 && <BookingStep1 {...commonProps} />}
          {currentStep === 2 && <BookingStep2 {...commonProps} />}
          {currentStep === 3 && <BookingStep3 {...commonProps} />}
          {currentStep === 4 && <BookingStep4 {...commonProps} tour={tour} onProceed={handleProceed} />}
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
                <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{renderStepContent()}</div>
              <div className="p-6 border-t bg-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <button onClick={handleBack} className={`font-bold py-3 px-6 rounded-full transition-colors ${currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`} disabled={currentStep === 1}>
                    <ArrowLeft size={16} className="inline-block mr-2" /> Back
                  </button>
                  {currentStep < 4 ? (
                    <button onClick={handleNext} disabled={currentStep === 1 && !bookingData.selectedTime} className="bg-red-500 text-white font-bold py-3 px-8 rounded-full hover:bg-red-600 disabled:bg-red-300 flex items-center gap-2">
                      {currentStep === 3 ? 'Review & Book' : 'Next'} <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button onClick={handleProceed} className="bg-red-500 text-white font-bold py-3 px-8 rounded-full hover:bg-red-600 flex items-center gap-2">
                      Proceed to Checkout <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BookingSidebar;
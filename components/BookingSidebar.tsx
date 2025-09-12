'use client';

import { FC, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Calendar, Users, DollarSign } from 'lucide-react';
import { Tour } from '@/types';
import { useCart } from '@/contexts/CartContext';

// STEP PROGRESS
const StepIndicator: FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const percent = Math.round((currentStep / totalSteps) * 100);
  return (
    <div className="flex items-center gap-4 w-full">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const step = i + 1;
          return (
            <div key={step} className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${
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

// MAIN SIDEBAR
interface BookingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
}

const BookingSidebar: FC<BookingSidebarProps> = ({ isOpen, onClose, tour }) => {
  const router = useRouter();
  const { addToCart } = useCart();

  const totalSteps = 4;
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    selectedDate: new Date(),
    selectedTime: '',
    guests: 1,
    privateTransfer: false,
    privateGuide: false,
  });

  useEffect(() => {
    if (isOpen && tour) {
      setCurrentStep(1);
      setBookingData({
        selectedDate: new Date(),
        selectedTime: '',
        guests: 1,
        privateTransfer: false,
        privateGuide: false,
      });
    }
  }, [isOpen, tour]);

  const pricePerGuest = useMemo(() => {
    if (!tour) return 0;
    return tour.discountPrice || tour.price || 0;
  }, [tour]);

  const subtotal = bookingData.guests * pricePerGuest;
  const extras = (bookingData.privateTransfer ? 75 : 0) + (bookingData.privateGuide ? 150 : 0);
  const total = subtotal + extras;

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(s => s + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
    else onClose();
  };

  const handleProceed = async () => {
    if (!tour) return;
    const cartItem = {
      ...tour,
      quantity: bookingData.guests,
      details: `${bookingData.selectedDate.toLocaleDateString()} ${bookingData.selectedTime}`,
    };
    addToCart(cartItem);
    await new Promise(res => setTimeout(res, 250));
    onClose();
    router.push('/checkout');
  };

  if (!tour) return null;

  // DYNAMIC STEP RENDER
  const renderStep = () => {
    const StepComponents = [
      require('./booking/BookingStep1').default,
      require('./booking/BookingStep2').default,
      require('./booking/BookingStep3').default,
      require('./booking/BookingStep4').default,
    ];
    const Step = StepComponents[currentStep - 1];
    return <Step bookingData={bookingData} setBookingData={setBookingData} tour={tour} onProceed={handleProceed} />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex justify-end">
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
              <img src={tour.image} alt={tour.title} className="w-12 h-12 rounded object-cover" />
              <div>
                <h3 className="font-semibold text-slate-800">{tour.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={14} /> {bookingData.selectedDate.toLocaleDateString()}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-bold text-slate-900">₹{pricePerGuest}</p>
                <p className="text-xs text-slate-400">per guest</p>
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
            <div className="flex-1 overflow-y-auto p-6">{renderStep()}</div>

            {/* FOOTER */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                    currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeft size={16} /> Back
                </button>

                {currentStep < totalSteps ? (
                  <button
                    onClick={handleNext}
                    disabled={currentStep === 1 && !bookingData.selectedTime}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white ${
                      currentStep === 1 && !bookingData.selectedTime ? 'bg-red-300' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {currentStep === totalSteps - 1 ? 'Review & Book' : 'Next'}
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleProceed}
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-red-600 hover:bg-red-700"
                  >
                    Proceed to Checkout <ArrowRight size={16} />
                  </button>
                )}
              </div>

              {/* PRICE SUMMARY */}
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>Guests: {bookingData.guests}</span>
                <span>Total: <strong className="text-slate-900">₹{total}</strong></span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSidebar;

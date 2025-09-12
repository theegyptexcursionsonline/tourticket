// components/booking/BookingStep2.tsx
'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, User, Smile, Users } from 'lucide-react';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';

interface BookingStep2Props {
    bookingData: {
        adults: number;
        children: number;
        [key: string]: any;
    };
    setBookingData: (updater: (prev: any) => any) => void;
    tour: Tour; // Pass tour for pricing info
}

// Reusable Counter Component with Animation
interface CounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  minValue?: number;
}

const AnimatedCounter: FC<CounterProps> = ({ value, onIncrement, onDecrement, minValue = 0 }) => {
  return (
    <div className="flex items-center gap-4 border-2 border-slate-200 rounded-full p-1 bg-white shadow-sm">
      <motion.button
        onClick={onDecrement}
        whileTap={{ scale: 0.9 }}
        className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={value <= minValue}
        aria-label="Remove one"
      >
        <Minus size={16} />
      </motion.button>
      
      <div className="font-bold text-xl text-slate-800 w-10 text-center">
         <motion.span key={value} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
            {value}
         </motion.span>
      </div>

      <motion.button
        onClick={onIncrement}
        whileTap={{ scale: 0.9 }}
        className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100"
        aria-label="Add one"
      >
        <Plus size={16} />
      </motion.button>
    </div>
  );
};


const BookingStep2: FC<BookingStep2Props> = ({ bookingData, setBookingData, tour }) => {
    const { formatPrice } = useSettings();
    const pricePerAdult = tour.discountPrice || 0;
    // Assuming 50% discount for children for display purposes
    const pricePerChild = pricePerAdult / 2;
    
    const handleParticipantChange = (type: 'adults' | 'children', change: number) => {
        setBookingData(prev => {
            const currentCount = prev[type];
            const newCount = Math.max(type === 'adults' ? 1 : 0, currentCount + change);
            return { ...prev, [type]: newCount };
        });
    };

    return (
        <div>
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                    className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4"
                >
                    <Users size={32} />
                </motion.div>
                <h2 className="text-3xl font-extrabold text-slate-800">Who's Coming?</h2>
                <p className="text-slate-600 mt-2">Specify the number of participants for your tour.</p>
            </div>
            
            <div className="space-y-6">
                {/* Adults Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50"
                >
                    <div className="flex items-center gap-4">
                        <User className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-lg text-slate-800">Adults</p>
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
                
                {/* Children Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50"
                >
                    <div className="flex items-center gap-4">
                        <Smile className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-lg text-slate-800">Children</p>
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

export default BookingStep2;
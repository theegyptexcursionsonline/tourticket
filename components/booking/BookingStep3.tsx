// components/booking/BookingStep3.tsx
'use client';

import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tour } from '@/types';
import { Clock, Check, Users, Languages } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

// --- Type Definitions for this specific UI ---
interface AddOnTour {
  id: 'atv-sunset' | 'shared-quad';
  title: string;
  duration: string;
  languages: string[];
  description: string;
  price: number;
  availableTimes: string[];
}

interface AddOnTourCardProps {
  addOn: AddOnTour;
  isSelected: boolean;
  selectedTime: string;
  onSelect: (time: string) => void;
  onDeselect: () => void;
}


// --- Reusable, Sophisticated Add-on Tour Card ---
const AddOnTourCard: FC<AddOnTourCardProps> = ({ addOn, isSelected, selectedTime, onSelect, onDeselect }) => {
  const { formatPrice } = useSettings();

  const handleTimeClick = (time: string) => {
    // If the same time is clicked again, deselect it. Otherwise, select the new time.
    if (isSelected && selectedTime === time) {
      onDeselect();
    } else {
      onSelect(time);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: addOn.id === 'atv-sunset' ? 0.2 : 0.35, type: 'spring', stiffness: 100 }}
      className={`p-5 border-2 rounded-2xl transition-all duration-300 ease-in-out ${
        isSelected ? 'bg-purple-50 border-purple-600 shadow-2xl' : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start">
          <h4 className="font-extrabold text-slate-900 text-xl">{addOn.title}</h4>
          {isSelected && (
            <div className="flex items-center gap-2 bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full text-sm">
              <Check size={16} />
              <span>Selected</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 my-3 text-sm text-slate-600">
          <div className="flex items-center gap-1.5"><Clock size={14} /><span>{addOn.duration}</span></div>
          <div className="flex items-center gap-1.5"><Languages size={14} /><span>{addOn.languages.join(', ')}</span></div>
        </div>
        <p className="text-sm text-slate-600 mb-4">{addOn.description}</p>
        <a href="#" className="text-sm font-bold text-purple-700 hover:underline mb-5">View Pickup Areas</a>

        {/* Time Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">Select a starting time:</label>
          <div className="flex flex-wrap gap-3">
            {addOn.availableTimes.map(time => {
              const isTimeSelected = isSelected && selectedTime === time;
              return (
                <button
                  key={time}
                  onClick={() => handleTimeClick(time)}
                  className={`px-6 py-3 rounded-xl text-base font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
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

        {/* Footer with Price */}
        <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '20px', paddingTop: '20px' }}
            exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-t border-slate-300 flex justify-between items-center"
          >
            <div className="text-slate-700">
              <span className="font-semibold">Adults:</span>
              <span className="ml-2">1 x {formatPrice(addOn.price)}</span>
            </div>
            <div className="text-right">
              <span className="text-sm text-slate-600 block">Total</span>
              <span className="text-2xl font-extrabold text-slate-900">{formatPrice(addOn.price)}</span>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};


// --- Main Component for Step 3 ---
interface BookingStep3Props {
    bookingData: {
        selectedAddOn: 'atv-sunset' | 'shared-quad' | null;
        addOnTime: string;
        [key: string]: any;
    };
    setBookingData: (updater: (prev: any) => any) => void;
    tour: Tour; // The main tour being booked
}

const BookingStep3: FC<BookingStep3Props> = ({ bookingData, setBookingData }) => {
    
    const addOnData: AddOnTour[] = [
        {
            id: 'atv-sunset',
            title: '3-Hour ATV Quad Tour Sunset with Transfer',
            duration: '3 Hours',
            languages: ['English', 'German'],
            description: 'Enjoy a thrilling 30 k.m quad bike ride deep into the desert to a traditional Bedouin village. Here, you will be welcomed with authentic hospitality, learn about their ancient culture...',
            price: 25.00,
            availableTimes: ['2:00 PM', '3:00 PM'],
        },
        {
            id: 'shared-quad',
            title: 'Shared 2-Hour Quad Bike Tour',
            duration: '2 Hours',
            languages: ['English'],
            description: 'A thrilling shared quad bike adventure through the desert canyons. This tour is perfect for a quick and exciting taste of the desert landscape...',
            price: 22.00, // Example price
            availableTimes: ['10:00 AM', '2:00 PM'],
        }
    ];

    const handleSelectAddOn = (addOnId: AddOnTour['id'], time: string) => {
      setBookingData(prev => ({
        ...prev,
        selectedAddOn: addOnId,
        addOnTime: time
      }));
    };
    
    const handleDeselectAddOn = () => {
        setBookingData(prev => ({
            ...prev,
            selectedAddOn: null,
            addOnTime: ''
        }));
    };

    return (
        <div>
            <div className="text-center mb-10">
                <h2 className="text-3xl font-extrabold text-slate-800">Available Add-ons</h2>
                <p className="text-slate-600 mt-2 max-w-md mx-auto">
                    Enhance your main tour by adding one of these exciting local experiences.
                </p>
            </div>

            <div className="space-y-6">
                {addOnData.map(addOn => (
                    <AddOnTourCard 
                        key={addOn.id}
                        addOn={addOn}
                        isSelected={bookingData.selectedAddOn === addOn.id}
                        selectedTime={bookingData.addOnTime}
                        onSelect={(time) => handleSelectAddOn(addOn.id, time)}
                        onDeselect={handleDeselectAddOn}
                    />
                ))}
            </div>
        </div>
    );
};

export default BookingStep3;
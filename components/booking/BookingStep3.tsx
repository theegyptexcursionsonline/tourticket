// components/booking/BookingStep3.tsx
'use client';

import React, { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tour } from '@/types';
import { Clock, Check, Languages, PlusCircle } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { addOnData, AddOnTour } from './addOnData'; // Import shared data

// --- Type Definitions for this component ---
type SelectedAddOns = {
  [key in AddOnTour['id']]?: string; // e.g., { 'atv-sunset': '2:00 PM' }
};

interface AddOnTourCardProps {
  addOn: AddOnTour;
  isSelected: boolean;
  selectedTime?: string;
  onSelect: (id: AddOnTour['id'], time: string) => void;
  onDeselect: (id: AddOnTour['id']) => void;
}

// --- Reusable, Sophisticated Add-on Tour Card ---
const AddOnTourCard: FC<AddOnTourCardProps> = ({ addOn, isSelected, selectedTime, onSelect, onDeselect }) => {
  const { formatPrice } = useSettings();

  const handleTimeClick = (time: string) => {
    // If the same time is clicked again while selected, deselect the add-on.
    // Otherwise, select the new time for this add-on.
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
      className={`p-5 border-2 rounded-2xl transition-all duration-300 ease-in-out ${
        isSelected ? 'bg-purple-50 border-purple-600 shadow-xl' : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start">
          <h4 className="font-extrabold text-slate-900 text-xl">{addOn.title}</h4>
          {isSelected && (
            <div className="flex items-center gap-2 bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full text-sm">
              <Check size={16} />
              <span>Selected at {selectedTime}</span>
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
        <div className="border-t border-slate-200 flex justify-between items-center mt-5 pt-4">
            <div className="text-slate-700">
              <span className="font-semibold">Price per Adult:</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-slate-900">{formatPrice(addOn.price)}</span>
            </div>
        </div>

      </div>
    </motion.div>
  );
};


// --- Main Component for Step 3 ---
interface BookingStep3Props {
    bookingData: {
        selectedAddOns: SelectedAddOns;
        [key: string]: any;
    };
    setBookingData: (updater: (prev: any) => any) => void;
    tour: Tour;
}

const BookingStep3: FC<BookingStep3Props> = ({ bookingData, setBookingData }) => {
    
    // **FIX:** Change handler to support multiple selections.
    // It now adds or updates an add-on in the `selectedAddOns` object.
    const handleSelectAddOn = (addOnId: AddOnTour['id'], time: string) => {
      setBookingData(prev => ({
        ...prev,
        selectedAddOns: {
            ...prev.selectedAddOns,
            [addOnId]: time
        }
      }));
    };
    
    // **FIX:** Change handler to remove a specific add-on from the state object.
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
        <div>
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full mx-auto flex items-center justify-center mb-4">
                    <PlusCircle size={32} />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800">Available Add-ons</h2>
                <p className="text-slate-600 mt-2 max-w-md mx-auto">
                    Enhance your main tour by adding these exciting local experiences. You can select multiple add-ons.
                </p>
            </div>

            <div className="space-y-6">
                {addOnData.map(addOn => (
                    <AddOnTourCard 
                        key={addOn.id}
                        addOn={addOn}
                        // **FIX:** Check if the add-on ID exists as a key in the object
                        isSelected={!!bookingData.selectedAddOns?.[addOn.id]}
                        // **FIX:** Pass the selected time for this specific add-on
                        selectedTime={bookingData.selectedAddOns?.[addOn.id]}
                        onSelect={handleSelectAddOn}
                        onDeselect={handleDeselectAddOn}
                    />
                ))}
            </div>
        </div>
    );
};

export default BookingStep3;

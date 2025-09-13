'use client';

import { FC, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { Calendar, Clock, Users, Check } from 'lucide-react';
import { addOnData } from './addOnData';

interface BookingStep4Props {
  bookingData: {
    selectedDate: Date;
    selectedTime: string;
    adults: number;
    children: number;
    selectedAddOn: 'atv-sunset' | 'shared-quad' | null;
    addOnTime: string;
  };
  tour: Tour;
  onClose: () => void;
}

const BookingStep4: FC<BookingStep4Props> = ({ bookingData, tour }) => {
  const { formatPrice } = useSettings();

  // --- Price Calculation ---
  const { subtotal, extras, total, selectedAddOnDetails } = useMemo(() => {
    const pricePerAdult = tour.discountPrice || 0;
    const pricePerChild = pricePerAdult / 2;
    const subtotalCalc =
      bookingData.adults * pricePerAdult + bookingData.children * pricePerChild;

    let extrasCalc = 0;
    const addOn = addOnData.find((a) => a.id === bookingData.selectedAddOn);
    if (addOn) {
      extrasCalc = addOn.price * bookingData.adults;
    }

    return {
      subtotal: subtotalCalc,
      extras: extrasCalc,
      total: subtotalCalc + extrasCalc,
      selectedAddOnDetails: addOn,
    };
  }, [tour, bookingData]);

  return (
    <div>
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.1,
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
          className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4"
        >
          <Check size={32} />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-slate-800">Review & Book</h2>
        <p className="text-slate-600 mt-2">
          Please confirm your selections before proceeding.
        </p>
      </div>

      {/* Booking Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-6 rounded-2xl border-2 border-slate-200 space-y-5"
      >
        {/* Main Tour Details */}
        <div>
          <h3 className="font-bold text-lg text-slate-800">{tour.title}</h3>
          <div className="text-sm text-slate-500 mt-2 space-y-2">
            <p className="flex items-center gap-2">
              <Calendar size={14} />{' '}
              <span>
                {bookingData.selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Clock size={14} /> <span>{bookingData.selectedTime}</span>
            </p>
            <p className="flex items-center gap-2">
              <Users size={14} />{' '}
              <span>
                {bookingData.adults} Adults, {bookingData.children} Children
              </span>
            </p>
          </div>
        </div>

        {/* Add-on Details */}
        {selectedAddOnDetails && (
          <div className="pt-4 border-t border-slate-200">
            <h4 className="font-semibold text-slate-700">Your Add-on:</h4>
            <h3 className="font-bold text-lg text-slate-800">
              {selectedAddOnDetails.title}
            </h3>
            <div className="text-sm text-slate-500 mt-2 space-y-2">
              <p className="flex items-center gap-2">
                <Clock size={14} /> <span>{bookingData.addOnTime}</span>
              </p>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <div className="flex justify-between text-slate-600">
            <p>Main Tour Subtotal</p>
            <p>{formatPrice(subtotal)}</p>
          </div>
          {selectedAddOnDetails && (
            <div className="flex justify-between text-slate-600">
              <p>Add-on Subtotal</p>
              <p>{formatPrice(extras)}</p>
            </div>
          )}
          <div className="flex justify-between items-baseline text-slate-900 pt-2">
            <p className="text-xl font-bold">Grand Total</p>
            <p className="text-2xl font-extrabold">{formatPrice(total)}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BookingStep4;

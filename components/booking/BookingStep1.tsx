// components/booking/BookingStep1.tsx
'use client';

import { FC, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

interface BookingStep1Props {
  bookingData: {
    selectedDate: Date;
    selectedTime: string;
    [key: string]: any;
  };
  setBookingData: (updater: (prev: any) => any) => void;
}

// Example time slots. In a real application, these might be fetched from an API based on the selected date.
const availableTimes = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM'
];

const BookingStep1: FC<BookingStep1Props> = ({ bookingData, setBookingData }) => {
  const [internalStep, setInternalStep] = useState<'date' | 'time'>('date');
  const [isDateSelected, setIsDateSelected] = useState(false);

  useEffect(() => {
    // Reset to date selection if the whole sidebar is reopened
    setInternalStep('date');
    setIsDateSelected(false);
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setBookingData(prev => ({ ...prev, selectedDate: date, selectedTime: '' })); // Reset time on new date selection
      setIsDateSelected(true);
      // Smoothly transition to time selection
      setTimeout(() => setInternalStep('time'), 300);
    }
  };

  const handleTimeSelect = (time: string) => {
    setBookingData(prev => ({ ...prev, selectedTime: time }));
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };

  // Custom styles for react-day-picker to match the theme
  const pickerStyles = `
    .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
      background-color: #f1f5f9; /* slate-100 */
    }
    .rdp-day_selected {
      background-color: #dc2626 !important; /* red-600 */
      color: white;
      opacity: 1;
    }
    .rdp-button:focus-visible:not([disabled]) {
        border: 2px solid #dc2626;
        outline: none;
    }
    .rdp-day_today {
      font-weight: bold;
      color: #dc2626; /* red-600 */
    }
  `;

  return (
    <div>
      <style>{pickerStyles}</style>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-extrabold text-slate-800">
          {internalStep === 'date' ? 'Select a Date' : 'Select a Time'}
        </h2>
        {isDateSelected && (
          <button 
            onClick={() => setInternalStep(internalStep === 'date' ? 'time' : 'date')}
            className="text-sm font-semibold text-red-600 hover:underline flex items-center gap-1"
          >
            {internalStep === 'date' ? 'Choose Time' : 'Change Date'}
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      <div className="relative h-[400px] overflow-hidden">
        <AnimatePresence initial={false} custom={internalStep === 'date' ? -1 : 1}>
          {internalStep === 'date' && (
            <motion.div
              key="date"
              custom={-1}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute w-full"
            >
              <div className="flex justify-center border border-slate-200 rounded-xl p-2 sm:p-4 bg-white">
                <DayPicker
                  mode="single"
                  selected={bookingData.selectedDate}
                  onSelect={handleDateSelect}
                  fromDate={new Date()}
                  className="w-full"
                  showOutsideDays
                />
              </div>
            </motion.div>
          )}

          {internalStep === 'time' && (
            <motion.div
              key="time"
              custom={1}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute w-full"
            >
              <div className="p-2">
                <div className="font-semibold text-slate-700 mb-4 text-center">
                  Available slots for: <span className="text-red-600">{bookingData.selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {availableTimes.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className={`w-full py-3 rounded-full text-sm font-bold transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        bookingData.selectedTime === time
                          ? 'bg-red-600 text-white border-red-600 shadow-lg scale-105'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-red-500 hover:bg-white'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookingStep1;
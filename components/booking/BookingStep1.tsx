// components/booking/BookingStep1.tsx
'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface BookingStep1Props {
  tourId: string; // tourId is now required to fetch availability
  bookingData: {
    selectedDate: Date | null;
    selectedTime: string;
    [key: string]: any;
  };
  setBookingData: (updater: (prev: any) => any) => void;
}

// Type for the availability data fetched from the API
interface AvailabilityData {
  availableSlotsByDate: { [key: string]: { time: string; remaining: number }[] };
  fullyBookedDates: string[];
}

const BookingStep1: FC<BookingStep1Props> = ({ tourId, bookingData, setBookingData }) => {
  const [internalStep, setInternalStep] = useState<'date' | 'time'>(
    bookingData.selectedDate ? 'time' : 'date'
  );
  const [isDateSelected, setIsDateSelected] = useState(!!bookingData.selectedDate);

  // --- NEW State for dynamic availability ---
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(bookingData.selectedDate || new Date());

  // --- NEW Function to fetch availability data ---
  const fetchAvailability = useCallback(async (month: Date) => {
    setIsLoading(true);
    setError(null);
    const monthString = format(month, 'yyyy-MM');
    try {
      const response = await fetch(`/api/tours/${tourId}/availability?month=${monthString}`);
      if (!response.ok) throw new Error('Could not load availability. Please try again.');
      const data = await response.json();
      setAvailability(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [tourId]);

  // --- Fetch initial availability on component mount ---
  useEffect(() => {
    fetchAvailability(currentMonth);
  }, [fetchAvailability, currentMonth]);
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      // Only proceed if the date is not fully booked
      if (!availability?.fullyBookedDates.includes(dateString)) {
        setBookingData(prev => ({ ...prev, selectedDate: date, selectedTime: '' }));
        setIsDateSelected(true);
        setTimeout(() => setInternalStep('time'), 300);
      }
    }
  };
  
  const handleDayClick = (date: Date) => {
    handleDateSelect(date);
  };

  const handleTimeSelect = (time: string) => {
    setBookingData(prev => ({ ...prev, selectedTime: time }));
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
  };

  const pickerStyles = `
    .rdp-button { border-radius: 50%; width: 40px; height: 40px; transition: all 0.2s ease; }
    .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f1f5f9; transform: scale(1.05); }
    .rdp-day_selected { background-color: #dc2626 !important; color: white !important; opacity: 1; cursor: pointer; font-weight: bold; }
    .rdp-day_selected:hover { background-color: #b91c1c !important; transform: scale(1.05); }
    .rdp-button:focus-visible:not([disabled]) { border: 2px solid #dc2626; outline: none; }
    .rdp-day_today:not(.rdp-day_selected) { font-weight: bold; color: #dc2626; border: 2px solid #dc2626; }
    .rdp-button:not([disabled]) { cursor: pointer; }
    .rdp-button[disabled] { opacity: 0.3; cursor: not-allowed; }
    .rdp-month { margin: 0; }
    .rdp-table { margin: 0; }
    .rdp-head_cell { font-weight: 600; color: #475569; }
  `;

  // --- DYNAMICALLY get available times for the selected date ---
  const selectedDateString = bookingData.selectedDate ? format(bookingData.selectedDate, 'yyyy-MM-dd') : '';
  const isToday = bookingData.selectedDate ? bookingData.selectedDate.toDateString() === new Date().toDateString() : false;
  
  const availableTimes = availability?.availableSlotsByDate[selectedDateString]?.map(slot => slot.time) || [];
  
  const filteredTimes = isToday ? availableTimes.filter(time => {
    try {
      const [hourStr, minuteStr] = time.split(':');
      const timeDate = new Date(bookingData.selectedDate!);
      timeDate.setHours(parseInt(hourStr, 10), parseInt(minuteStr, 10), 0, 0);
      return timeDate > new Date();
    } catch {
      return true; // Keep time if parsing fails
    }
  }) : availableTimes;

  useEffect(() => {
    if (bookingData.selectedTime && !filteredTimes.includes(bookingData.selectedTime)) {
      setBookingData(prev => ({ ...prev, selectedTime: '' }));
    }
  }, [filteredTimes, bookingData.selectedTime, setBookingData]);

  useEffect(() => {
    setIsDateSelected(!!bookingData.selectedDate);
  }, [bookingData.selectedDate]);
  
  const disabledDays = [
      { before: new Date() },
      ...(availability?.fullyBookedDates.map(d => new Date(d + "T12:00:00Z")) || [])
  ];

  return (
    <div>
      <style>{pickerStyles}</style>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-extrabold text-slate-800">
          {internalStep === 'date' ? 'Select a Date' : 'Select a Time'}
        </h2>
        {isDateSelected && (
          <button onClick={() => setInternalStep(internalStep === 'date' ? 'time' : 'date')} className="text-sm font-semibold text-red-600 hover:underline flex items-center gap-1 transition-all duration-200 hover:gap-2">
            {internalStep === 'date' ? 'Choose Time' : 'Change Date'}
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      <div className="relative h-[400px] overflow-hidden">
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-xl">
                <Loader2 className="h-8 w-8 text-red-600 animate-spin"/>
            </div>
        )}
        
        <AnimatePresence initial={false} custom={internalStep === 'date' ? -1 : 1}>
          {internalStep === 'date' && (
            <motion.div key="date" custom={-1} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute w-full">
              <div className="flex justify-center border border-slate-200 rounded-xl p-4 sm:p-6 bg-white shadow-sm">
                <DayPicker
                  mode="single"
                  selected={bookingData.selectedDate || undefined}
                  onSelect={handleDateSelect}
                  onDayClick={handleDayClick}
                  month={currentMonth}
                  onMonthChange={handleMonthChange}
                  disabled={disabledDays}
                  className="w-full"
                  showOutsideDays
                  fixedWeeks
                />
              </div>
              {bookingData.selectedDate && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-600">
                    Selected: <span className="font-semibold text-red-600">
                      {bookingData.selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {internalStep === 'time' && bookingData.selectedDate && (
            <motion.div key="time" custom={1} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute w-full">
              <div className="p-2">
                <div className="font-semibold text-slate-700 mb-6 text-center bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500 mb-1">Available slots for:</div>
                  <div className="text-lg text-red-600">
                    {bookingData.selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                
                {filteredTimes.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="mx-auto mb-4 text-slate-400" size={48} />
                    <p className="text-slate-600 font-medium">No available time slots for this date</p>
                    <p className="text-sm text-slate-500 mt-2">Please select a different date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredTimes.map((time) => (
                      <button key={time} onClick={() => handleTimeSelect(time)} className={`w-full py-4 px-2 rounded-xl text-sm font-bold transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${ bookingData.selectedTime === time ? 'bg-red-600 text-white border-red-600 shadow-lg transform scale-105' : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-red-500 hover:bg-white hover:shadow-md hover:transform hover:scale-102' }`}>
                        <div className="flex items-center justify-center gap-1">
                          <Clock size={14} />
                          {time}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookingStep1;
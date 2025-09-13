// components/booking/BookingStep1.tsx
'use client';

import { FC, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';

interface BookingStep1Props {
  bookingData: {
    selectedDate: Date | null;
    selectedTime: string;
    [key: string]: any;
  };
  setBookingData: (updater: (prev: any) => any) => void;
}

const availableTimes = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM'
];

const BookingStep1: FC<BookingStep1Props> = ({ bookingData, setBookingData }) => {
  // Always start with date selection (false = show date, true = show time)
  const [showTimeSelection, setShowTimeSelection] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setBookingData(prev => ({ ...prev, selectedDate: date, selectedTime: '' }));
      // Small delay to show the selected date before transitioning
      setTimeout(() => setShowTimeSelection(true), 500);
    }
  };

  const handleTimeSelect = (time: string) => {
    setBookingData(prev => ({ ...prev, selectedTime: time }));
  };

  const goBackToDateSelection = () => {
    setShowTimeSelection(false);
  };

  // Reset to date selection when component mounts or when date is cleared
  useEffect(() => {
    if (!bookingData.selectedDate) {
      setShowTimeSelection(false);
    }
  }, [bookingData.selectedDate]);

  // Check if selected date is today
  const isToday = bookingData.selectedDate 
    ? bookingData.selectedDate.toDateString() === new Date().toDateString()
    : false;

  // Filter times based on current time if today is selected
  const filteredTimes = isToday ? availableTimes.filter(time => {
    try {
      const match = time.match(/(\d+):(\d+) (AM|PM)/);
      if (!match) return false;
      
      const [, hour, minute, ampm] = match;
      let hour24 = parseInt(hour, 10);
      
      if (ampm === 'PM' && hour24 !== 12) {
        hour24 += 12;
      }
      if (ampm === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      const timeDate = new Date(bookingData.selectedDate!);
      timeDate.setHours(hour24, parseInt(minute, 10), 0, 0);

      return timeDate > new Date();
    } catch (error) {
      console.error('Error parsing time:', error);
      return true;
    }
  }) : availableTimes;

  // Clear selected time if it's no longer available
  useEffect(() => {
    if (bookingData.selectedTime && !filteredTimes.includes(bookingData.selectedTime)) {
      setBookingData(prev => ({ ...prev, selectedTime: '' }));
    }
  }, [filteredTimes, bookingData.selectedTime, setBookingData]);

  // Custom styles for react-day-picker
  const pickerStyles = `
    .rdp {
      --rdp-cell-size: 45px;
      --rdp-accent-color: #dc2626;
      --rdp-background-color: #dc2626;
      margin: 0;
    }
    .rdp-months {
      justify-content: center;
    }
    .rdp-month {
      margin: 0;
    }
    .rdp-table {
      margin: 0;
      max-width: none;
    }
    .rdp-head_cell {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }
    .rdp-button {
      border: none;
      border-radius: 12px;
      width: 45px;
      height: 45px;
      font-size: 15px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
      background-color: #f1f5f9;
      transform: scale(1.05);
    }
    .rdp-day_selected {
      background-color: #dc2626 !important;
      color: white !important;
      font-weight: 600;
    }
    .rdp-day_selected:hover {
      background-color: #b91c1c !important;
    }
    .rdp-day_today:not(.rdp-day_selected) {
      font-weight: 600;
      color: #dc2626;
      background-color: #fef2f2;
      border: 2px solid #dc2626;
    }
    .rdp-button[disabled] {
      opacity: 0.3;
      cursor: not-allowed;
    }
  `;

  return (
    <div className="max-w-2xl mx-auto">
      <style>{pickerStyles}</style>
      
      <AnimatePresence mode="wait">
        {!showTimeSelection ? (
          // Stage 1: Date Selection View
          <motion.div
            key="date-selection"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Select Date
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                Choose Your Preferred Date
              </h2>
              <p className="text-slate-600">
                Select an available date for your appointment
              </p>
            </div>

            {/* Date Selection Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-slate-800">Choose Date</h3>
                    <p className="text-sm text-slate-600">Click on any available date</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={bookingData.selectedDate || undefined}
                    onSelect={handleDateSelect}
                    disabled={{ before: new Date() }}
                    showOutsideDays
                    fixedWeeks
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Selected Date Display */}
            {bookingData.selectedDate && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6"
              >
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-slate-800 mb-2">Date Selected!</h4>
                  <div className="flex items-center justify-center gap-2 bg-white px-4 py-3 rounded-lg shadow-sm mb-3">
                    <Calendar size={20} className="text-blue-600" />
                    <span className="font-semibold text-slate-700">
                      {bookingData.selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
                    <Clock size={16} />
                    <span>Proceeding to time selection...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          // Stage 2: Time Selection View
          <motion.div
            key="time-selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header with Back Button */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={goBackToDateSelection}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors duration-200 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg"
                >
                  <ArrowLeft size={18} />
                  <span className="font-medium">Back</span>
                </button>
                
                <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium">
                  <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Select Time
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                Choose Your Preferred Time
              </h2>
              <p className="text-slate-600">
                Select an available time slot for your appointment
              </p>
            </div>

            {/* Selected Date Display */}
            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-slate-700">
                <Calendar size={18} className="text-red-600" />
                <span className="font-medium">
                  {bookingData.selectedDate?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>

            {/* Time Selection Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <Clock className="text-white" size={24} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-slate-800">Available Time Slots</h3>
                    <p className="text-sm text-slate-600">Click to select your preferred time</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                {filteredTimes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="text-slate-400" size={32} />
                    </div>
                    <h4 className="text-lg font-medium text-slate-600 mb-2">No Available Slots</h4>
                    <p className="text-slate-500 mb-4">No time slots available for this date</p>
                    <button
                      onClick={goBackToDateSelection}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                    >
                      Choose Different Date
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredTimes.map((time, index) => (
                      <motion.button
                        key={time}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleTimeSelect(time)}
                        className={`p-4 rounded-xl text-left font-medium transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                          bookingData.selectedTime === time
                            ? 'bg-red-600 text-white border-red-600 shadow-lg transform scale-105'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-red-300 hover:bg-slate-100 hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Clock size={18} className={bookingData.selectedTime === time ? 'text-white' : 'text-red-600'} />
                          <span className="text-lg">{time}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Time Display */}
            {bookingData.selectedTime && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6"
              >
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">✅ Appointment Details</h4>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-sm">
                      <Calendar size={18} className="text-green-600" />
                      <span className="font-medium text-slate-700">
                        {bookingData.selectedDate?.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg shadow-sm">
                      <Clock size={18} className="text-green-600" />
                      <span className="font-medium text-slate-700 text-lg">
                        {bookingData.selectedTime}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-green-700 mt-3 font-medium">
                    Ready to proceed to the next step!
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingStep1;
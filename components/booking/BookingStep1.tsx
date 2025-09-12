'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Users } from 'lucide-react';

interface BookingStep1Props {
    bookingData: any;
    setBookingData: (data: any) => void;
}

// --- HELPER HOOK: useOnClickOutside ---
function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}


// --- HELPER COMPONENT: CalendarPopup ---
const CalendarPopup: FC<{
  selectedDate: Date;
  selectedTime: string;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  onClose: () => void;
}> = ({ selectedDate, selectedTime, onDateSelect, onTimeSelect, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth()));
  const calendarRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(calendarRef, onClose);

  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const timeSlots = ['17:45', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-50" onClick={onClose} />
      <div ref={calendarRef} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-2xl border w-[90vw] max-w-[600px] max-h-[90vh] overflow-hidden">
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Select Date & Time</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="flex gap-6 flex-1 overflow-hidden">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-4">
                <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <span className="text-lg font-bold text-gray-600">‹</span>
                </button>
                <div className="font-bold text-lg text-gray-800">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <span className="text-lg font-bold text-gray-600">›</span>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="font-semibold text-gray-500 p-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {dates.map((date, i) => {
                  const isSelected = isSameDay(date, selectedDate);
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <button
                      key={i}
                      onClick={() => !isPast && onDateSelect(date)}
                      disabled={isPast}
                      className={`p-3 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-red-500 text-white'
                          : !isCurrentMonth
                          ? 'text-gray-300'
                          : isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-px bg-gray-200"></div>
            <div className="flex-1">
              <h4 className="font-bold mb-4 text-gray-800">Pick a timeslot</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {timeSlots.map(time => (
                  <button
                    key={time}
                    onClick={() => onTimeSelect(time)}
                    className={`w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border ${selectedTime === time ? 'border-red-500' : 'border-gray-200 hover:border-red-300'} flex justify-between items-center`}
                  >
                    <span className="font-medium text-gray-800">{time}</span>
                    <div className="flex items-center text-gray-500 text-sm">
                      <Users size={14} className="mr-1"/>
                      {Math.floor(Math.random() * 100)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


const BookingStep1: FC<BookingStep1Props> = ({ bookingData, setBookingData }) => {
    const [showCalendar, setShowCalendar] = useState(false);

    const handleDateSelect = (date: Date) => {
        setBookingData(prev => ({ ...prev, selectedDate: date }));
    };

    const handleTimeSelect = (time: string) => {
        setBookingData(prev => ({ ...prev, selectedTime: time }));
        setShowCalendar(false);
    };

    return (
        <div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Select Date & Time</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="font-semibold text-slate-700">Date</label>
                    <button onClick={() => setShowCalendar(true)} className="w-full mt-1 p-3 border-2 border-slate-200 rounded-lg text-left flex justify-between items-center bg-white hover:border-slate-300">
                        <span className="text-slate-700">{bookingData.selectedDate.toLocaleDateString('en-GB')}</span>
                        <CalendarIcon className="w-5 h-5 text-slate-400"/>
                    </button>
                </div>
                <div>
                    <label className="font-semibold text-slate-700">Time <span className="text-yellow-400">*</span></label>
                    <button onClick={() => setShowCalendar(true)} className={`w-full mt-1 p-3 border-2 rounded-lg text-left transition-colors ${bookingData.selectedTime ? 'border-slate-200 text-slate-700' : 'border-slate-200 text-slate-400'}`}>
                        <span>{bookingData.selectedTime || 'Pick a time'}</span>
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showCalendar && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <CalendarPopup
                            selectedDate={bookingData.selectedDate}
                            selectedTime={bookingData.selectedTime}
                            onDateSelect={handleDateSelect}
                            onTimeSelect={handleTimeSelect}
                            onClose={() => setShowCalendar(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BookingStep1;
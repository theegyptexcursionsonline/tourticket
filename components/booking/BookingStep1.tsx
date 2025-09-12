'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface BookingStep1Props {
  bookingData: {
    selectedDate: Date;
    selectedTime: string;
    guests?: number;
    [k: string]: any;
  };
  setBookingData: (updater: (prev: any) => any) => void;
}

function useOnClickOutside<T extends HTMLElement>(ref: React.RefObject<T>, handler: (e: MouseEvent | TouchEvent) => void) {
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

const CalendarPopup: FC<{
  anchorRef: React.RefObject<HTMLElement>;
  selectedDate: Date;
  selectedTime: string;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  onClose: () => void;
}> = ({ anchorRef, selectedDate, selectedTime, onDateSelect, onTimeSelect, onClose }) => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(popupRef, onClose);

  // Build month grid (simple implementation)
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // go to Sunday start
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // to Saturday end

  const dates: Date[] = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const timeSlots = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'];

  return (
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.14 }}
      className="fixed inset-0 z-50 flex items-start justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white shadow-2xl rounded-lg max-w-[900px] w-[92vw] max-h-[86vh] overflow-hidden z-50">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">Select Date & Time</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 p-5">
          {/* Calendar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  aria-label="Previous month"
                  className="p-2 rounded hover:bg-slate-100"
                >
                  ‹
                </button>
                <div className="font-semibold">
                  {currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  aria-label="Next month"
                  className="p-2 rounded hover:bg-slate-100"
                >
                  ›
                </button>
              </div>
              <div className="text-sm text-slate-500">Selected: <span className="font-medium">{selectedDate.toLocaleDateString('en-GB')}</span></div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="font-semibold py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {dates.map((dt, idx) => {
                const disabled = dt < new Date(new Date().setHours(0, 0, 0, 0));
                const inMonth = dt.getMonth() === currentMonth.getMonth();
                const selected = isSameDay(dt, selectedDate);

                return (
                  <button
                    key={idx}
                    onClick={() => !disabled && onDateSelect(new Date(dt))}
                    disabled={disabled}
                    className={`p-2 rounded-full transition-colors ${
                      selected ? 'bg-red-500 text-white' : !inMonth ? 'text-slate-300' : disabled ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                    aria-pressed={selected}
                    aria-disabled={disabled}
                  >
                    {dt.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeslots */}
          <div className="w-full sm:w-80 border-l sm:border-l-1 pl-0 sm:pl-4">
            <h4 className="font-semibold mb-3">Available times</h4>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {timeSlots.map((t) => {
                const active = t === selectedTime;
                return (
                  <button
                    key={t}
                    onClick={() => onTimeSelect(t)}
                    className={`w-full text-left p-3 rounded-lg flex justify-between items-center border transition ${
                      active ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-300'
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={16} />
                      <span className="font-medium">{t}</span>
                    </div>
                    <div className="text-sm text-slate-500">Availability</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BookingStep1: FC<BookingStep1Props> = ({ bookingData, setBookingData }) => {
  const [openCalendar, setOpenCalendar] = useState(false);
  const inputRef = useRef<HTMLButtonElement | null>(null);

  const handleDateSelect = (date: Date) => {
    setBookingData((prev: any) => ({ ...prev, selectedDate: date }));
  };
  const handleTimeSelect = (time: string) => {
    setBookingData((prev: any) => ({ ...prev, selectedTime: time }));
    setOpenCalendar(false);
  };

  useEffect(() => {
    // close calendar on Escape
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCalendar(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Select Date & Time</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
          <div>
            <button
              ref={inputRef}
              onClick={() => setOpenCalendar(true)}
              className="w-full mt-1 p-3 border-2 border-slate-200 rounded-lg text-left flex justify-between items-center bg-white hover:border-slate-300"
              aria-haspopup="dialog"
              aria-expanded={openCalendar}
            >
              <span className="text-slate-700">{bookingData.selectedDate.toLocaleDateString('en-GB')}</span>
              <CalendarIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Time <span className="text-amber-400">*</span></label>
          <div>
            <button
              onClick={() => setOpenCalendar(true)}
              className={`w-full mt-1 p-3 border-2 rounded-lg text-left transition ${bookingData.selectedTime ? 'border-slate-200 text-slate-700' : 'border-slate-200 text-slate-400'}`}
              aria-haspopup="dialog"
            >
              <span>{bookingData.selectedTime || 'Pick a time'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-sm text-slate-500">
        <p>Please select a suitable date and time. Times are shown in local timezone.</p>
      </div>

      <AnimatePresence>
        {openCalendar && (
          <CalendarPopup
            anchorRef={inputRef}
            selectedDate={bookingData.selectedDate}
            selectedTime={bookingData.selectedTime}
            onDateSelect={handleDateSelect}
            onTimeSelect={handleTimeSelect}
            onClose={() => setOpenCalendar(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingStep1;

'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Clock, Calendar as CalendarIcon, ChevronDown, Plus, Minus, Users, Info } from 'lucide-react';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';

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

const CalendarPopup: FC<{
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  onClose: () => void;
}> = ({ selectedDate, onDateSelect, onTimeSelect, onClose }) => {
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

  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  const timeSlots = ['17:45', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

  return (
    <div ref={calendarRef} className="absolute z-20 top-full mt-2 bg-white rounded-lg shadow-xl border w-[600px] -translate-x-1/2 left-1/2 p-4 flex gap-4">
      <div className="w-1/2">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 rounded-full hover:bg-slate-100">&lt;</button>
          <div className="font-bold text-lg">{currentMonth.toLocaleString('default', { month: 'long', year: 'year' })}</div>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 rounded-full hover:bg-slate-100">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <div key={day} className="font-semibold text-slate-500 p-2">{day}</div>)}
          {dates.map((date, i) => (
            <button
              key={i}
              onClick={() => onDateSelect(date)}
              className={`p-2 rounded-full ${ isSameDay(date, selectedDate) ? 'bg-blue-500 text-white' : date.getMonth() !== currentMonth.getMonth() ? 'text-slate-300' : 'hover:bg-slate-100' }`}
            >
              {date.getDate()}
            </button>
          ))}
        </div>
      </div>
      <div className="w-1/2 border-l pl-4">
        <h3 className="font-bold mb-2">Pick a timeslot</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {timeSlots.map(time => (
            <button key={time} onClick={() => onTimeSelect(time)} className="w-full text-left p-3 hover:bg-slate-100 rounded-md flex justify-between">
              <span>{time}</span>
              <span className="text-slate-500"><Users size={16} className="inline-block mr-1"/>{Math.floor(Math.random() * 100)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface BookingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
}

const BookingSidebar: FC<BookingSidebarProps> = ({ isOpen, onClose, tour }) => {
  const { formatPrice } = useSettings();
  const { addItem } = useCart();
  const [ticketType, setTicketType] = useState('Central Station');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (tour) {
      setTicketType('Central Station');
      setSelectedDate(new Date());
      setSelectedTime('');
      setGuests(1);
    }
  }, [tour]);

  if (!tour) return null;

  const handleAddToCart = () => {
    if (!selectedTime) {
      // Simple validation feedback
      const timeButton = document.getElementById('time-picker-button');
      if (timeButton) {
        timeButton.focus();
        timeButton.classList.add('border-red-500', 'animate-shake');
        setTimeout(() => timeButton.classList.remove('border-red-500', 'animate-shake'), 500);
      }
      return;
    }
    addItem({
      id: `${tour.id}-${ticketType}-${selectedDate.toISOString()}-${selectedTime}-${Math.random()}`,
      tourId: tour.id,
      name: tour.title,
      price: tour.discountPrice,
      quantity: guests,
      image: tour.image,
      details: `${ticketType}, ${selectedDate.toLocaleDateString()}, ${selectedTime}`
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex justify-end">
          <motion.div className="absolute inset-0 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="relative bg-white h-full w-full max-w-lg shadow-2xl flex flex-col" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="p-4 flex justify-between items-center border-b flex-shrink-0">
              <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                <div className="flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-current" /><span>{tour.rating}</span></div>
                <span className="text-slate-300">&#183;</span>
                <span>{tour.bookings.toLocaleString()} bookings</span>
                <span className="text-slate-300">&#183;</span>
                <div className="flex items-center gap-1"><Clock size={14} /><span>{tour.duration}</span></div>
              </div>
              <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>
            
            <div className="p-6 flex-grow overflow-y-auto">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">{tour.title}</h2>
              <div className="space-y-5">
                <div>
                  <label className="font-semibold text-slate-700 flex items-center">Tickets <span className="text-yellow-400 ml-1">*</span></label>
                  <div className="relative mt-1"><select value={ticketType} onChange={(e) => setTicketType(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-lg appearance-none bg-white focus:border-blue-500 outline-none"><option>Central Station</option><option>Rijksmuseum</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="font-semibold text-slate-700">Date</label>
                    <button onClick={() => setShowCalendar(!showCalendar)} className="w-full mt-1 p-3 border-2 border-slate-200 rounded-lg text-left flex justify-between items-center bg-white focus:border-blue-500 outline-none"><span>{selectedDate.toLocaleDateString()}</span><CalendarIcon className="w-5 h-5 text-slate-400"/></button>
                    {showCalendar && <CalendarPopup selectedDate={selectedDate} onDateSelect={(date) => { setSelectedDate(date); }} onTimeSelect={(time) => { setSelectedTime(time); setShowCalendar(false); }} onClose={() => setShowCalendar(false)} />}
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Time</label>
                    <button id="time-picker-button" onClick={() => setShowCalendar(true)} className="w-full mt-1 p-3 border-2 border-slate-200 rounded-lg text-left bg-white focus:border-blue-500 outline-none"><span>{selectedTime || 'Pick a time'}</span></button>
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Guests</label>
                  <div className="flex items-center justify-between mt-1 w-full p-2 border-2 border-slate-200 rounded-lg">
                    <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="p-2 rounded-md hover:bg-slate-100 text-slate-700 disabled:opacity-50" disabled={guests <= 1}><Minus size={16}/></button>
                    <span className="font-bold text-lg">{guests}</span>
                    <button onClick={() => setGuests(g => g + 1)} className="p-2 rounded-md hover:bg-slate-100 text-slate-700"><Plus size={16}/></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-white flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-lg">Total</span>
                <div className="text-right">
                  {tour.originalPrice && <p className="text-slate-500 line-through">{formatPrice(tour.originalPrice * guests)}</p>}
                  <p className="font-extrabold text-2xl text-slate-800">{formatPrice(tour.discountPrice * guests)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleAddToCart} className="w-full bg-slate-800 text-white font-bold py-3 rounded-full hover:bg-slate-900 transition-colors">ADD TO CART</button>
                <button className="w-full bg-red-500 text-white font-bold py-3 rounded-full hover:bg-red-600 transition-colors">BOOK NOW</button>
              </div>
              <p className="text-xs text-slate-500 mt-4 text-center"><b>Having doubts?</b> You can cancel or reschedule this booking up to 8 hours in advance for free.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookingSidebar;

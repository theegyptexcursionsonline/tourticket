'use client';

import { FC } from 'react';
import { Minus, Plus, ChevronDown } from 'lucide-react';

interface BookingStep2Props {
    bookingData: any;
    setBookingData: (data: any) => void;
}

const BookingStep2: FC<BookingStep2Props> = ({ bookingData, setBookingData }) => {
    const handleGuestsChange = (change: number) => {
        setBookingData(prev => ({ ...prev, guests: Math.max(1, prev.guests + change) }));
    };

    return (
        <div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Tickets & Guests</h2>
            <div className="space-y-5">
                <div>
                    <label className="font-semibold text-slate-700">Tickets</label>
                    <div className="relative mt-1">
                        <select
                            value={bookingData.ticketType}
                            onChange={(e) => setBookingData(prev => ({ ...prev, ticketType: e.target.value }))}
                            className="w-full p-3 border-2 border-slate-200 rounded-lg appearance-none bg-white"
                        >
                            <option>Central Station</option>
                            <option>Rijksmuseum</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="font-semibold text-slate-700">Guests</label>
                    <div className="flex items-center justify-between mt-1 w-full p-2 border-2 border-slate-200 rounded-lg">
                        <button onClick={() => handleGuestsChange(-1)} className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50" disabled={bookingData.guests <= 1}>
                            <Minus size={16}/>
                        </button>
                        <span className="font-bold text-lg text-slate-800">{bookingData.guests}</span>
                        <button onClick={() => handleGuestsChange(1)} className="p-2 rounded-md hover:bg-slate-100">
                            <Plus size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingStep2;
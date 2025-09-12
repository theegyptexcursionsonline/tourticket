'use client';

import { FC, useState } from 'react';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { ShoppingCart, Loader2 } from 'lucide-react';

interface BookingStep4Props {
    bookingData: any;
    tour: Tour;
    onProceed: () => void;
}

const BookingStep4: FC<BookingStep4Props> = ({ bookingData, tour, onProceed }) => {
    const { formatPrice } = useSettings();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleProceed = async () => {
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        onProceed();
        setIsProcessing(false);
    };

    return (
        <div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-4">Review & Book</h2>
            <div className="bg-slate-50 p-6 rounded-lg space-y-4 text-slate-700 border border-slate-200">
                <div className="flex justify-between items-center">
                    <span className="font-semibold">Tour:</span>
                    <span className="font-medium text-right">{tour.title}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold">Date:</span>
                    <span className="font-medium">{bookingData.selectedDate.toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold">Time:</span>
                    <span className="font-medium">{bookingData.selectedTime}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold">Guests:</span>
                    <span className="font-medium">{bookingData.guests}</span>
                </div>
                {bookingData.privateTransfer && (
                    <div className="flex justify-between items-center">
                        <span className="font-semibold">Private Transfer:</span>
                        <span className="font-medium">{formatPrice(75.00)}</span>
                    </div>
                )}
                {bookingData.privateGuide && (
                    <div className="flex justify-between items-center">
                        <span className="font-semibold">Private Guide:</span>
                        <span className="font-medium">{formatPrice(150.00)}</span>
                    </div>
                )}
                <div className="pt-4 border-t border-slate-200 mt-4 flex justify-between items-baseline">
                    <span className="font-extrabold text-xl">Total</span>
                    <span className="font-extrabold text-2xl text-slate-800">
                        {formatPrice(
                            (tour.discountPrice * bookingData.guests) +
                            (bookingData.privateTransfer ? 75.00 : 0) +
                            (bookingData.privateGuide ? 150.00 : 0)
                        )}
                    </span>
                </div>
            </div>

            <div className="space-y-3 mt-6">
                <button
                    onClick={handleProceed}
                    disabled={isProcessing}
                    className="w-full bg-red-500 text-white font-bold py-3 rounded-full hover:bg-red-600 disabled:bg-red-300 transition-colors text-lg flex items-center justify-center gap-2"
                >
                    {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <><ShoppingCart size={20} /> Proceed to Checkout</>}
                </button>
            </div>
        </div>
    );
};

export default BookingStep4;
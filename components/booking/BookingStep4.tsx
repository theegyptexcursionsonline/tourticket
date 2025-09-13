'use client';

import { FC, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tour, CartItem } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart'; // CORRECTED IMPORT PATH
import { Calendar, Clock, Users, ShoppingCart, CreditCard, Loader2, Check } from 'lucide-react';
import { addOnData } from './addOnData';

// --- UPDATED PROPS INTERFACE ---
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

const BookingStep4: FC<BookingStep4Props> = ({ bookingData, tour, onClose }) => {
    const { formatPrice } = useSettings();
    const { addToCart } = useCart();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState<false | 'cart' | 'checkout'>(false);

    // --- Price Calculation ---
    const { subtotal, extras, total, selectedAddOnDetails } = useMemo(() => {
        const pricePerAdult = tour.discountPrice || 0;
        const pricePerChild = pricePerAdult / 2;
        const subtotalCalc = (bookingData.adults * pricePerAdult) + (bookingData.children * pricePerChild);
        let extrasCalc = 0;
        const addOn = addOnData.find(a => a.id === bookingData.selectedAddOn);
        if (addOn) {
            extrasCalc = addOn.price * bookingData.adults;
        }
        return {
            subtotal: subtotalCalc,
            extras: extrasCalc,
            total: subtotalCalc + extrasCalc,
            selectedAddOnDetails: addOn
        };
    }, [tour, bookingData]);

    // --- Action Handlers ---
    const handleFinalAction = async (action: 'cart' | 'checkout') => {
        setIsProcessing(action);

        // 1. Create main tour item
        const mainTourCartItem: CartItem = {
            ...tour,
            quantity: bookingData.adults,
            childQuantity: bookingData.children,
            selectedDate: bookingData.selectedDate.toISOString(),
            selectedTime: bookingData.selectedTime,
        };
        addToCart(mainTourCartItem, false);

        // 2. Create and add add-on item
        if (selectedAddOnDetails) {
            const addOnCartItem: CartItem = {
                id: `addon_${selectedAddOnDetails.id}`,
                _id: `addon_${selectedAddOnDetails.id}`, // Ensure _id is also set for compatibility
                title: selectedAddOnDetails.title,
                image: '/bg2.png',
                originalPrice: selectedAddOnDetails.price,
                discountPrice: selectedAddOnDetails.price,
                quantity: bookingData.adults,
                childQuantity: 0,
                selectedDate: bookingData.selectedDate.toISOString(),
                selectedTime: bookingData.addOnTime,
                destinationId: tour.destinationId,
                categoryIds: [],
            };
            addToCart(addOnCartItem, false);
        }

        // 3. Close the booking sidebar
        onClose();

        // 4. Wait for animation, then redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (action === 'cart') {
            // If just adding to cart, maybe just stay on the page or go to home
            // router.push('/'); // You can decide where this goes
        } else {
            router.push('/checkout');
        }
    };

    return (
        <div>
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                    className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4"
                >
                    <Check size={32} />
                </motion.div>
                <h2 className="text-3xl font-extrabold text-slate-800">Review & Book</h2>
                <p className="text-slate-600 mt-2">Please confirm your selections before proceeding.</p>
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
                        <p className="flex items-center gap-2"><Calendar size={14} /> <span>{bookingData.selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                        <p className="flex items-center gap-2"><Clock size={14} /> <span>{bookingData.selectedTime}</span></p>
                        <p className="flex items-center gap-2"><Users size={14} /> <span>{bookingData.adults} Adults, {bookingData.children} Children</span></p>
                    </div>
                </div>

                {/* Add-on Details */}
                {selectedAddOnDetails && (
                    <div className="pt-4 border-t border-slate-200">
                        <h4 className="font-semibold text-slate-700">Your Add-on:</h4>
                        <h3 className="font-bold text-lg text-slate-800">{selectedAddOnDetails.title}</h3>
                         <div className="text-sm text-slate-500 mt-2 space-y-2">
                            <p className="flex items-center gap-2"><Clock size={14} /> <span>{bookingData.addOnTime}</span></p>
                        </div>
                    </div>
                )}

                {/* Price Breakdown */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                    <div className="flex justify-between text-slate-600"><p>Main Tour Subtotal</p><p>{formatPrice(subtotal)}</p></div>
                    {selectedAddOnDetails && <div className="flex justify-between text-slate-600"><p>Add-on Subtotal</p><p>{formatPrice(extras)}</p></div>}
                    <div className="flex justify-between items-baseline text-slate-900 pt-2">
                        <p className="text-xl font-bold">Grand Total</p>
                        <p className="text-2xl font-extrabold">{formatPrice(total)}</p>
                    </div>
                </div>
            </motion.div>
            
            {/* Action Buttons */}
            <div className="mt-8 space-y-4">
                 <button
                    onClick={() => handleFinalAction('checkout')}
                    disabled={!!isProcessing}
                    className="w-full bg-red-600 text-white font-bold py-4 rounded-full text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:bg-red-400"
                >
                    {isProcessing === 'checkout' ? <Loader2 size={24} className="animate-spin" /> : <><CreditCard size={20} /> Proceed to Checkout</>}
                </button>
                 <button
                    onClick={() => handleFinalAction('cart')}
                    disabled={!!isProcessing}
                    className="w-full bg-white text-slate-700 font-bold py-4 rounded-full text-lg flex items-center justify-center gap-2 border-2 border-slate-300 transition-all transform hover:scale-105 hover:bg-slate-50 disabled:bg-slate-200"
                >
                    {isProcessing === 'cart' ? <Loader2 size={24} className="animate-spin" /> : <><ShoppingCart size={20} /> Add to Cart & Continue</>}
                </button>
            </div>
        </div>
    );
};

export default BookingStep4;
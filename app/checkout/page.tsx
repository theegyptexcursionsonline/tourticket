// app/checkout/page.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, Shield, CheckCircle, CalendarDays, User, Trash2, Smartphone, Headphones } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from '@/types';

// --- Reusable SVG Icons ---
const VisaIcon = () => ( <svg width="48" height="28" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" className="opacity-95"><rect width="38" height="24" rx="4" fill="#1A1F71"/><g transform="translate(3,4)" fill="#FFF" fontFamily="Arial"><text x="0" y="12" fontSize="8" fontWeight="700">VISA</text></g></svg> );
const MastercardIcon = () => ( <svg width="48" height="28" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" className="opacity-95"><rect width="38" height="24" rx="4" fill="#FFFFFF"/><circle cx="15" cy="12" r="7" fill="#EB001B"/><circle cx="23" cy="12" r="7" fill="#F79E1B"/></svg> );
const AmexIcon = () => ( <svg width="48" height="28" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" className="opacity-95"><rect width="38" height="24" rx="4" fill="#006FCF"/><g transform="translate(6,6)" fill="#FFF" fontFamily="Arial"><text x="0" y="8" fontSize="7" fontWeight="700">AMEX</text></g></svg> );
const PayPalIcon = () => ( <svg width="48" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="opacity-95"><path d="M3 21c.2.4.6.6 1 .6h8c2.8 0 5-2 5-4.6 0-2.8-2.1-4.4-5.1-4.4H8" fill="#0070BA"/></svg> );

// --- Reusable Input Component ---
const FormInput = ({ label, name, type = 'text', placeholder, required = true, value, onChange }: any) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-2">{label}{required && <span className="text-rose-500 ml-1">*</span>}</label>
        <input
            type={type}
            id={name}
            name={name}
            placeholder={placeholder}
            required={required}
            value={value}
            onChange={onChange}
            className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 px-4 py-3 rounded-xl shadow-sm placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition duration-200"
        />
    </div>
);

// --- Cart Item for Booking Summary ---
const SummaryItem: React.FC<{item: CartItem}> = ({ item }) => {
    const { formatPrice } = useSettings();
    const { removeFromCart } = useCart();
    return (
        <div className="flex gap-4 py-4">
            <Image src={item.image || ''} alt={item.title} width={64} height={64} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
            <div className="flex-1">
                <h4 className="font-bold text-md text-slate-800 leading-tight">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.details}</p>
                <p className="text-sm text-slate-500">{item.quantity} x guest(s)</p>
                {item.addOns && item.addOns.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1 pl-4 border-l-2">
                        <strong>Add-ons:</strong> {item.addOns.map(a => a.name).join(', ')}
                    </div>
                )}
            </div>
            <div className="text-right flex flex-col justify-between items-end">
                <p className="font-bold text-lg text-slate-800">{formatPrice(item.totalPrice || item.discountPrice * item.quantity)}</p>
                <button onClick={() => removeFromCart(item.uniqueId!)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
        </div>
    )
}

// --- Booking Summary Component ---
const BookingSummary = ({ pricing, promoCode, setPromoCode, applyPromoCode }: any) => {
    const { formatPrice } = useSettings();
    const { cart } = useCart(); // Corrected: use 'cart' instead of 'cartItems'

    if (!cart || cart.length === 0) return null;

    return (
        <aside className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-100 p-6 shadow-lg sticky top-28">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Your Booking Summary</h3>
            <div className="divide-y divide-slate-200">
                {cart.map((item, index) => (
                    <SummaryItem key={`${item.id}-${index}`} item={item} />
                ))}
            </div>
            <div className="mt-4 rounded-xl p-4 bg-slate-50 border border-slate-100">
                <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatPrice(pricing.subtotal)}</span></div>
                <div className="flex justify-between text-sm text-slate-600 mt-2"><span>Service fee</span><span>{formatPrice(pricing.serviceFee)}</span></div>
                <div className="flex justify-between text-sm text-slate-600"><span>Taxes & fees</span><span>{formatPrice(pricing.tax)}</span></div>
                {pricing.discount > 0 && <div className="flex justify-between text-sm text-emerald-700 font-medium mt-2"><span>Discount Applied</span><span>-{formatPrice(pricing.discount)}</span></div>}
                <div className="border-t pt-3 mt-3 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-600">Total</p>
                        <p className="text-lg font-bold text-rose-600">{formatPrice(pricing.total)}</p>
                    </div>
                </div>
            </div>
            <div className="mt-4">
                <div className="flex gap-2">
                    <input type="text" placeholder="Promotional code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-200 transition" />
                    <button onClick={applyPromoCode} type="button" className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition">Apply</button>
                </div>
            </div>
            <div className="mt-6 hidden lg:block">
                <button type="submit" form="checkout-form" className="w-full rounded-2xl py-4 bg-red-600 text-white font-extrabold text-lg hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-md transition">
                    <span className="inline-flex items-center justify-center gap-2"><Lock size={18} /> Complete Booking & Pay</span>
                </button>
                <p className="text-xs text-slate-500 text-center mt-3">By completing this booking you agree to our <a className="underline" href="/terms">Terms of Service</a>.</p>
            </div>
        </aside>
    );
};

// --- Checkout Form Step ---
const CheckoutFormStep = ({ onPaymentSuccess }: { onPaymentSuccess: () => void; }) => {
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card');
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '', emergencyContact: '', specialRequests: '',
        cardholderName: '', cardNumber: '', expiryDate: '', cvv: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Processing payment with data:', formData);
        onPaymentSuccess();
    };

    return (
        <form onSubmit={handleSubmit} id="checkout-form" className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-100 p-8 shadow-md space-y-8">
            <section>
                <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-extrabold text-slate-900">Contact Information</h2><div className="flex items-center gap-2 text-sm text-slate-500"><Shield size={14} className="text-emerald-500" /> <span>Secure &amp; encrypted</span></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="First Name" name="firstName" placeholder="Enter your first name" value={formData.firstName} onChange={handleInputChange} />
                    <FormInput label="Last Name" name="lastName" placeholder="Enter your last name" value={formData.lastName} onChange={handleInputChange} />
                    <FormInput label="Email Address" name="email" type="email" placeholder="Enter your email address" value={formData.email} onChange={handleInputChange} />
                    <FormInput label="Phone Number" name="phone" type="tel" placeholder="Enter your phone number" value={formData.phone} onChange={handleInputChange} />
                    <div className="md:col-span-2"><FormInput label="Emergency Contact (optional)" name="emergencyContact" placeholder="Name and phone number" required={false} value={formData.emergencyContact} onChange={handleInputChange} /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">Special Requests</label><textarea name="specialRequests" value={formData.specialRequests} onChange={handleInputChange} placeholder="Any special requirements, dietary restrictions, etc..." rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-visible:ring-2 focus-visible:ring-red-500" /></div>
                </div>
            </section>
            <section>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Payment Information</h2>
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <button type="button" onClick={() => setPaymentMethod('card')} aria-pressed={paymentMethod === 'card'} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-shadow ${paymentMethod === 'card' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-slate-100 hover:shadow-sm'}`}><div className="flex gap-1 items-center"> <VisaIcon /> <MastercardIcon /> <AmexIcon /> </div><span className="text-sm font-medium">Card</span></button>
                    <button type="button" onClick={() => setPaymentMethod('paypal')} aria-pressed={paymentMethod === 'paypal'} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-shadow ${paymentMethod === 'paypal' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-slate-100 hover:shadow-sm'}`}><PayPalIcon /><span className="text-sm font-medium">PayPal</span></button>
                    <button type="button" onClick={() => setPaymentMethod('bank')} aria-pressed={paymentMethod === 'bank'} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-shadow ${paymentMethod === 'bank' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-slate-100 hover:shadow-sm'}`}><div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center"><Image src="/bank.svg" alt="Bank" width={20} height={20}/></div><span className="text-sm font-medium">Bank</span></button>
                </div>
                <AnimatePresence mode="wait">
                    <motion.div key={paymentMethod} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                        {paymentMethod === 'card' && (<div className="space-y-4 p-6 bg-slate-50 rounded-xl border border-slate-100"><div className="grid grid-cols-1 gap-4"><FormInput label="Cardholder Name" name="cardholderName" placeholder="John M. Doe" value={formData.cardholderName} onChange={handleInputChange} /><FormInput label="Card Number" name="cardNumber" placeholder="1234 5678 9012 3456" value={formData.cardNumber} onChange={handleInputChange} /></div><div className="grid grid-cols-2 gap-4"><FormInput label="Expiry Date" name="expiryDate" placeholder="MM / YY" value={formData.expiryDate} onChange={handleInputChange} /><FormInput label="CVV" name="cvv" placeholder="123" value={formData.cvv} onChange={handleInputChange} /></div></div>)}
                        {paymentMethod === 'paypal' && (<div className="rounded-xl p-6 bg-slate-50 border border-slate-100 text-center text-slate-700"><p className="font-medium">You will be redirected to PayPal to complete your payment securely.</p></div>)}
                        {paymentMethod === 'bank' && (<div className="rounded-xl p-6 bg-slate-50 border border-slate-100 text-center text-slate-700"><p className="font-medium">Bank transfer details will be provided after booking.</p></div>)}
                    </motion.div>
                </AnimatePresence>
            </section>
        </form>
    );
};

// --- Thank You Page ---
const ThankYouPage = ({ orderedItems }: { orderedItems: CartItem[] }) => {
    const { formatPrice } = useSettings();
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 shadow-xl max-w-3xl mx-auto text-center">
            <div className="mx-auto w-fit mb-6 p-4 rounded-full bg-emerald-100"><CheckCircle size={48} className="text-emerald-600" /></div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Thank you — your booking is confirmed</h1>
            <p className="text-slate-600 mb-6">We’ve emailed the booking details and payment confirmation to you.</p>
            <div className="space-y-3 mb-6">{orderedItems.map((item, index) => (<div key={`${item.id}-${index}`} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-lg overflow-hidden"><Image src={item.image!} alt={item.title} width={48} height={48} className="object-cover"/></div><div><p className="font-semibold text-slate-800">{item.title}</p><p className="text-sm text-slate-500">{item.quantity} Adult{item.quantity > 1 ? 's' : ''}</p></div></div><div className="text-slate-700 font-medium">{formatPrice((item.discountPrice) * item.quantity)}</div></div>))}</div>
            <div className="flex justify-center gap-3"><button onClick={() => window.location.assign('/')} className="px-5 py-2 rounded-xl border border-slate-200 hover:shadow-sm">Go to homepage</button><button onClick={() => window.print()} className="px-5 py-2 rounded-xl bg-slate-900 text-white">Print receipt</button></div>
        </motion.div>
    );
};

// --- Trust Indicators ---
const TrustIndicators = () => (
    <div className="flex flex-col sm:flex-row justify-center items-center gap-6 md:gap-12 py-8 mt-12 border-t border-slate-200">
        <div className="flex items-center gap-2 text-slate-600"><Shield size={20} className="text-emerald-600" /><span>Easy and secure booking</span></div>
        <div className="flex items-center gap-2 text-slate-600"><Smartphone size={20} className="text-red-600" /><span>Ticket available on smartphone</span></div>
        <div className="flex items-center gap-2 text-slate-600"><Headphones size={20} className="text-slate-900" /><span>Excellent customer service</span></div>
    </div>
);


// --- MAIN CHECKOUT PAGE COMPONENT ---
export default function CheckoutPage() {
    const { cart, clearCart } = useCart(); // Corrected: use 'cart' instead of 'cartItems'
    const { formatPrice } = useSettings();
    const router = useRouter();
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);

    const pricing = useMemo(() => {
        const subtotal = (cart || []).reduce((acc, item) => acc + (item.totalPrice || (item.discountPrice * item.quantity)), 0);
        const serviceFee = +(subtotal * 0.03).toFixed(2);
        const tax = +(subtotal * 0.05).toFixed(2);
        const total = +(subtotal + serviceFee + tax - discount).toFixed(2);
        return { subtotal, serviceFee, tax, total, discount };
    }, [cart, discount]);

    const applyPromoCode = () => {
        if (promoCode.trim().toUpperCase() === 'SALE10') {
            setDiscount(Math.round(pricing.subtotal * 0.10 * 100) / 100);
        } else {
            setDiscount(0);
        }
    };

    const handlePaymentSuccess = () => {
        setOrderedItems([...(cart || [])]); 
        clearCart(); 
        setIsConfirmed(true); 
    };
    
    // This effect handles the case where the user lands on the page with an empty cart
    useEffect(() => {
        if (cart && cart.length === 0 && !isConfirmed) {
            router.push('/');
        }
    }, [cart, isConfirmed, router]);

    if (!cart) { // Corrected: check for 'cart' instead of 'cartItems'
        return ( // Show a loading state until the cart is hydrated from localStorage
            <>
                <Header startSolid={true} />
                <main className="min-h-screen bg-slate-50 pt-24 pb-16 flex items-center justify-center">
                    <div className="text-center p-4">
                        <h1 className="text-3xl font-bold mb-4">Loading your booking...</h1>
                    </div>
                </main>
                <Footer />
            </>
        )
    }

    if (cart.length === 0 && !isConfirmed) { // Corrected: check for 'cart' instead of 'cartItems'
        return ( // Show an empty cart message if the cart is empty after loading
            <>
                <Header startSolid={true} />
                <main className="min-h-screen bg-slate-50 pt-24 pb-16 flex items-center justify-center">
                    <div className="text-center p-4">
                        <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
                        <p className="text-slate-600 mb-8">Please add tours to your cart before proceeding.</p>
                        <a href="/" className="px-8 py-3 bg-red-600 text-white font-semibold hover:bg-red-700 rounded-full transition-colors">Explore Tours</a>
                    </div>
                </main>
                <Footer />
            </>
        )
    }

    return (
        <>
            <Header startSolid={true} />
            <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-24 pb-40 lg:pb-16">
                <div className="container mx-auto px-6 max-w-7xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isConfirmed ? 'thankyou' : 'checkout'}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.45 }}
                        >
                            {isConfirmed ? (
                                <ThankYouPage orderedItems={orderedItems} />
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                                    <div className="lg:col-span-2">
                                        <CheckoutFormStep onPaymentSuccess={handlePaymentSuccess} />
                                    </div>
                                    <div className="lg:col-span-1">
                                        <BookingSummary
                                            pricing={pricing}
                                            promoCode={promoCode}
                                            setPromoCode={setPromoCode}
                                            applyPromoCode={applyPromoCode}
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                    {!isConfirmed && <TrustIndicators />}
                </div>
            </main>

            {!isConfirmed && cart && cart.length > 0 && ( // Corrected: check for 'cart' instead of 'cartItems'
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 p-4 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-slate-600">Total price:</span>
                        <span className="font-bold text-xl text-rose-600">{formatPrice(pricing.total)}</span>
                    </div>
                    <button
                        type="submit"
                        form="checkout-form"
                        className="w-full rounded-2xl py-3.5 bg-red-600 text-white font-bold text-base hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-md transition"
                    >
                        <span className="inline-flex items-center justify-center gap-2">
                            <Lock size={16} /> Complete Booking & Pay
                        </span>
                    </button>
                </div>
            )}

            <Footer />
        </>
    );
}
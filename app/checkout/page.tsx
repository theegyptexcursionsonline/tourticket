'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowLeft, Clock, User, Lock, Shield, Smartphone, Headphones, CheckCircle, CalendarDays, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from '@/types';

// --- Checkout Steps Component ---
const CheckoutSteps = ({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) => (
  <div className="flex items-center justify-center mb-12">
    <div className="flex items-center gap-6">
      <button
        onClick={() => onStepClick(1)}
        className={`flex items-center gap-2 font-medium transition-all duration-300 ${currentStep >= 1 ? 'text-red-600' : 'text-slate-500'}`}
      >
        <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${currentStep >= 1 ? 'border-red-600 bg-red-600 text-white' : 'border-slate-400'}`}>1</span>
        <span className="hidden md:block">Personal details</span>
      </button>
      <div className={`w-12 h-0.5 rounded-full ${currentStep > 1 ? 'bg-red-600' : 'bg-slate-200'}`} />
      <button
        onClick={() => onStepClick(2)}
        className={`flex items-center gap-2 font-medium transition-all duration-300 ${currentStep >= 2 ? 'text-red-600' : 'text-slate-500'}`}
      >
        <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${currentStep >= 2 ? 'border-red-600 bg-red-600 text-white' : 'border-slate-400'}`}>2</span>
        <span className="hidden md:block">Payment</span>
      </button>
    </div>
  </div>
);

// --- Cart Item for Booking Summary ---
const SummaryItem: React.FC<{item: CartItem}> = ({ item }) => {
    const { formatPrice } = useSettings();
    const { removeFromCart } = useCart();
    return (
        <div className="flex gap-4 py-4">
            <Image src={item.image || ''} alt={item.title} width={64} height={64} className="w-16 h-16 object-cover rounded-md" />
            <div className="flex-1">
                <h4 className="font-bold text-md text-slate-800 leading-tight">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.details}</p>
                 <p className="text-sm text-slate-500">{item.quantity} x guest(s)</p>
            </div>
            <div className="text-right flex flex-col justify-between items-end">
                <p className="font-bold text-lg text-slate-800">{formatPrice(item.discountPrice * item.quantity)}</p>
                <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
        </div>
    )
}

// --- Booking Summary Component (Now with all features) ---
const BookingSummary = () => {
  const { formatPrice } = useSettings();
  const { cartItems, cartTotal } = useCart();
  const [timeLeft, setTimeLeft] = useState(504); // 8 minutes 24 seconds

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const bookingFee = 1.50;
  const tax = cartTotal * 0.09; // Example 9% tax
  const finalTotal = cartTotal + bookingFee + tax;

  if (!cartItems || cartItems.length === 0) {
      return (
          <div className="bg-white shadow-xl border border-slate-200 p-8 sticky top-24 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Your Order</h3>
            <p className="text-slate-500">Your cart is currently empty.</p>
          </div>
      )
  }

  return (
    <div className="bg-white shadow-xl border border-slate-200 p-8 sticky top-24">
      <div className="bg-red-700 text-white p-4 mb-6 flex items-center gap-3">
        <Clock size={20} />
        <span className="text-sm font-medium">
            Prices are valid for another {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')} minutes
        </span>
      </div>

      <h3 className="text-2xl font-bold text-slate-900 mb-2">Your Order Summary</h3>
      <div className="divide-y divide-slate-200">{cartItems.map(item => (<SummaryItem key={String(item.id)} item={item} />))}</div>

      <div className="my-6 pt-6 border-t border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 text-red-600 focus:ring-red-600" />
          <span className="text-slate-700">I have a discount code</span>
        </label>
      </div>

      <div className="space-y-3 pt-6 border-t border-slate-200">
        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatPrice(cartTotal)}</span></div>
        <div className="flex justify-between text-slate-600"><span>Tax (est.)</span><span>{formatPrice(tax)}</span></div>
        <div className="flex justify-between text-slate-600"><span>Booking fee</span><span>{formatPrice(bookingFee)}</span></div>
      </div>

      <div className="flex justify-between text-2xl font-bold pt-4 mt-4 border-t border-slate-200">
        <span>Total</span><span className="text-red-600">{formatPrice(finalTotal)}</span>
      </div>
    </div>
  );
};

// --- Personal Details Step ---
const PersonalDetailsStep = ({ onNext }: { onNext: () => void }) => {
  const [formData, setFormData] = useState({ email: '', fullName: '', phone: '' });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onNext(); };
  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-xl p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Personal details</h2>
        <div className="space-y-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Your e-mail address*</label><input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-4 border border-slate-300 focus:ring-2 focus:ring-red-600" placeholder="Enter your email" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Your full name*</label><input type="text" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full p-4 border border-slate-300 focus:ring-2 focus:ring-red-600" placeholder="Enter your full name" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Phone number</label><div className="flex"><select className="p-4 border border-r-0 border-slate-300 bg-white"><option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option></select><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="flex-1 p-4 border border-slate-300 focus:ring-2 focus:ring-red-600" placeholder="Phone number"/></div></div>
        </div>
        <button type="submit" className="w-full bg-red-600 text-white font-bold py-4 hover:bg-red-700 transition-colors text-lg mt-8">CONTINUE TO PAYMENT</button>
    </form>
  );
};

// --- Payment Step ---
const PaymentStep = ({ onBack, onPaymentSuccess }: { onBack: () => void; onPaymentSuccess: () => void; }) => {
  const { formatPrice } = useSettings();
  const { cartTotal } = useCart();
  const [paymentData, setPaymentData] = useState({ cardNumber: '', expiryDate: '', securityCode: '', nameOnCard: '' });
  const finalTotal = cartTotal + 1.50 + (cartTotal * 0.09); // Recalculate for display
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onPaymentSuccess(); };
  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-xl p-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-600 font-medium mb-6 hover:text-red-600 transition-colors"><ArrowLeft size={20} />BACK TO DETAILS</button>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Select your payment method</h2>
        <div className="p-6 bg-[#F8F8F8]"><div className="space-y-6"><div><label className="block text-sm font-medium text-slate-700 mb-2">Card number</label><input type="text" required value={paymentData.cardNumber} onChange={(e) => setPaymentData({...paymentData, cardNumber: e.target.value})} className="w-full p-4 border border-slate-300" placeholder="1234 5678 9012 3456" /></div><div className="grid grid-cols-2 gap-6"><div><label className="block text-sm font-medium text-slate-700 mb-2">Expiry date</label><input type="text" required value={paymentData.expiryDate} onChange={(e) => setPaymentData({...paymentData, expiryDate: e.target.value})} className="w-full p-4 border border-slate-300" placeholder="MM / YY" /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">Security code</label><input type="text" required value={paymentData.securityCode} onChange={(e) => setPaymentData({...paymentData, securityCode: e.target.value})} className="w-full p-4 border border-slate-300" placeholder="123" /></div></div><div><label className="block text-sm font-medium text-slate-700 mb-2">Name on card</label><input type="text" required value={paymentData.nameOnCard} onChange={(e) => setPaymentData({...paymentData, nameOnCard: e.target.value})} className="w-full p-4 border border-slate-300" placeholder="John Doe" /></div></div><button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 mt-8 hover:bg-red-600 transition-colors flex items-center justify-center gap-3"><Lock size={20} />Pay {formatPrice(finalTotal)}</button></div>
    </form>
  );
};

// --- Thank You Page (Now Dynamic) ---
const ThankYouPage = ({ purchasedItems }: { purchasedItems: CartItem[] }) => (
    <div className="bg-white shadow-xl p-8 text-center max-w-2xl mx-auto col-span-full">
        <div className="flex flex-col items-center justify-center mb-8">
            <CheckCircle size={80} className="text-emerald-500 mb-4" />
            <h2 className="text-4xl font-extrabold text-slate-900 mb-2">Thank you for your order!</h2>
            <p className="text-lg text-slate-600 max-w-md">Your booking is confirmed. We have sent a confirmation email with your tickets.</p>
        </div>
        <div className="border border-slate-200 p-6 text-left mb-8">
            <h3 className="font-bold text-xl text-slate-900 mb-4">Booking Summary</h3>
            <div className="divide-y divide-slate-100">
                {purchasedItems.map(item => (
                    <div key={String(item.id)} className="flex gap-4 py-3">
                        <Image src={item.image || ''} alt={item.title} width={80} height={80} className="w-20 h-20 object-cover rounded-lg" />
                        <div className="flex-1 text-left">
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1"><CalendarDays size={16} />{item.details}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-2"><User size={16} />{item.quantity} guest(s)</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="flex justify-center gap-4 mt-6"><a href="/" className="px-8 py-3 bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">Back to Homepage</a><a href="/account" className="px-8 py-3 bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200 transition-colors">View Bookings</a></div>
    </div>
);

// --- Trust Indicators ---
const TrustIndicators = () => (<div className="flex flex-col sm:flex-row justify-center items-center gap-6 md:gap-12 py-8 mt-8 border-t border-slate-200"><div className="flex items-center gap-2 text-slate-600"><Shield size={20} className="text-emerald-600" /><span>Easy and secure booking</span></div><div className="flex items-center gap-2 text-slate-600"><Smartphone size={20} className="text-red-600" /><span>Ticket is on your smartphone</span></div><div className="flex items-center gap-2 text-slate-600"><Headphones size={20} className="text-slate-900" /><span>Excellent customer service</span></div></div>);

// --- MAIN CHECKOUT PAGE COMPONENT ---
export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [purchasedItems, setPurchasedItems] = useState<CartItem[]>([]);
  const { cartItems, clearCart } = useCart();

  const handlePaymentSuccess = () => {
    setPurchasedItems([...cartItems]); // Save a copy of the cart items for the thank you page
    setCurrentStep(3);
    clearCart();
  };

  // If the cart is empty and we're not on the thank you page yet, show an empty state.
  if (!cartItems || cartItems.length === 0 && currentStep < 3) {
      return (
           <>
              <Header startSolid={true} />
              <main className="min-h-screen bg-slate-50 pt-24 pb-16 flex items-center justify-center">
                    <div className="text-center p-4">
                        <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
                        <p className="text-slate-600 mb-8">Please add tours to your cart before proceeding to checkout.</p>
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
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {currentStep < 3 && <CheckoutSteps currentStep={currentStep} onStepClick={(step) => step < currentStep && setCurrentStep(step)} />}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              {currentStep === 1 && <PersonalDetailsStep onNext={() => setCurrentStep(2)} />}
              {currentStep === 2 && <PaymentStep onBack={() => setCurrentStep(1)} onPaymentSuccess={handlePaymentSuccess} />}
              {currentStep === 3 && <ThankYouPage purchasedItems={purchasedItems} />}
            </div>
            {currentStep < 3 && (<div className="lg:col-span-1"><BookingSummary /></div>)}
          </div>
          {currentStep < 3 && <TrustIndicators />}
        </div>
      </main>
      <Footer />
    </>
  );
}
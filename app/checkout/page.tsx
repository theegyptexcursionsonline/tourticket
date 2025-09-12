'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Clock, User, Zap, Lock, Shield, Smartphone, Headphones, X, CheckCircle, Mail, CalendarDays } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSettings } from '@/hooks/useSettings';

// Mock checkout data
const checkoutData = {
  tour: {
    title: 'Amsterdam Evening & Night Boat Tour',
    guests: '2 adults',
    type: 'Canal Cruise 1hr',
    date: '05/09/2025',
    time: '09:15',
    price: 31.00,
    image: '/images2/3.png'
  },
  pricing: {
    subtotal: 32.50,
    tax: 2.82,
    bookingFee: 1.50,
    total: 32.50
  }
};

const upgrades = [
  {
    id: 'red-light-secrets',
    title: 'ADD-ON: RED LIGHT SECRETS',
    description: 'Save 25%',
    duration: '45 minutes',
    bookings: 3638,
    originalPrice: 17,
    salePrice: 12.50,
    image: '/images2/red-light.png'
  },
  {
    id: 'ripleys-believe',
    title: 'ADD-ON: RIPLEY\'S BELIEVE IT OR NOT!',
    description: '',
    duration: '2 hours',
    bookings: 10573,
    originalPrice: 22.50,
    salePrice: 12.50,
    image: '/images2/ripleys.png'
  }
];

// --- Checkout Steps Component (Enhanced) ---
const CheckoutSteps = ({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) => (
  <div className="flex items-center justify-center mb-12">
    <div className="flex items-center gap-6">
      <button
        onClick={() => onStepClick(1)}
        className={`flex items-center gap-2 font-medium transition-all duration-300 ${
          currentStep >= 1 ? 'text-red-600' : 'text-slate-500'
        }`}
      >
        <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-colors duration-300 ${currentStep >= 1 ? 'border-red-600 bg-red-600 text-white' : 'border-slate-400 bg-transparent text-slate-400'}`}>1</span>
        <span className="hidden md:block">Personal details</span>
      </button>
      
      <div className={`w-12 h-0.5 rounded-full transition-colors duration-300 ${currentStep > 1 ? 'bg-red-600' : 'bg-slate-200'}`} />
      
      <button
        onClick={() => onStepClick(2)}
        className={`flex items-center gap-2 font-medium transition-colors duration-300 ${
          currentStep >= 2 ? 'text-red-600' : 'text-slate-500'
        }`}
      >
        <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-colors duration-300 ${currentStep >= 2 ? 'border-red-600 bg-red-600 text-white' : 'border-slate-400 bg-transparent text-slate-400'}`}>2</span>
        <span className="hidden md:block">Upgrades</span>
      </button>
      
      <div className={`w-12 h-0.5 rounded-full transition-colors duration-300 ${currentStep > 2 ? 'bg-red-600' : 'bg-slate-200'}`} />
      
      <button
        onClick={() => onStepClick(3)}
        className={`flex items-center gap-2 font-medium transition-colors duration-300 ${
          currentStep >= 3 ? 'text-red-600' : 'text-slate-500'
        }`}
      >
        <span className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-colors duration-300 ${currentStep >= 3 ? 'border-red-600 bg-red-600 text-white' : 'border-slate-400 bg-transparent text-slate-400'}`}>3</span>
        <span className="hidden md:block">Payment</span>
      </button>
    </div>
  </div>
);

// --- Booking Summary Component (Enhanced) ---
const BookingSummary = () => {
  const { formatPrice } = useSettings();
  
  return (
    <div className="bg-white shadow-xl border border-slate-200 p-8 sticky top-24">
      {/* Timer */}
      <div className="bg-red-700 text-white p-4 mb-6 flex items-center gap-3">
        <Clock size={20} />
        <span className="text-sm font-medium">Prices are valid for another 08:24 minutes</span>
      </div>

      {/* Tour Details */}
      <div className="flex gap-6 mb-6">
        <Image
          src={checkoutData.tour.image} 
          alt={checkoutData.tour.title}
          width={80}
          height={80}
          className="w-20 h-20 object-cover"
        />
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-900 mb-1">
            {checkoutData.tour.title}
          </h3>
          <p className="text-sm text-slate-600 mb-1">{checkoutData.tour.guests}</p>
          <p className="text-sm text-slate-600 mb-1">{checkoutData.tour.type}</p>
          <p className="text-sm text-slate-600">
            {checkoutData.tour.date} {checkoutData.tour.time}
          </p>
        </div>
        <div className="text-right flex flex-col justify-between">
          <div className="flex flex-col gap-1 text-sm font-medium">
            <button className="text-slate-600 hover:text-red-600 transition-colors">EDIT</button>
            <button className="text-red-600 hover:underline transition-colors">REMOVE</button>
          </div>
          <p className="text-xl font-bold text-red-600 mt-2">
            {formatPrice(checkoutData.tour.price)}
          </p>
        </div>
      </div>

      {/* Discount Code */}
      <div className="mb-8 pt-4 border-t border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 text-red-600 focus:ring-red-600" />
          <span className="text-slate-700">I have a discount code</span>
        </label>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3 mb-6 pt-6 border-t border-slate-200">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span>{formatPrice(checkoutData.pricing.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Tax</span>
          <span>{formatPrice(checkoutData.pricing.tax)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Booking fee</span>
          <span>{formatPrice(checkoutData.pricing.bookingFee)}</span>
        </div>
      </div>

      <div className="flex justify-between text-2xl font-bold pt-4 border-t border-slate-200">
        <span>Total</span>
        <span className="text-red-600">{formatPrice(checkoutData.pricing.total)}</span>
      </div>
    </div>
  );
};

// --- Personal Details Step (Enhanced) ---
const PersonalDetailsStep = ({ onNext }: { onNext: () => void }) => {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-xl p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Personal details</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your e-mail address*
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full p-4 border border-slate-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your full name*
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            className="w-full p-4 border border-slate-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Phone number
          </label>
          <div className="flex">
            <select className="p-4 border border-r-0 border-slate-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 bg-white">
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
            </select>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="flex-1 p-4 border border-slate-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
              placeholder="Phone number"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            We'll reach out to you via WhatsApp with essential updates, news, or changes to your booking.
          </p>
        </div>
      </div>

      <div className="flex justify-center items-center gap-6 mt-12">
        <div className="flex items-center justify-center gap-4">
            <button type="button" className="w-12 h-12 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
            </button>
            <button type="button" className="w-12 h-12 bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            </button>
            <button type="button" className="w-12 h-12 bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
            </button>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-red-600 text-white font-bold py-4 hover:bg-red-700 transition-colors text-lg mt-8"
      >
        CONTINUE TO UPGRADES
      </button>
    </form>
  );
};

// --- Upgrades Step (Enhanced) ---
const UpgradesStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
  const { formatPrice } = useSettings();

  return (
    <div className="bg-white shadow-xl p-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 font-medium mb-6 hover:text-red-600 transition-colors"
      >
        <ArrowLeft size={20} />
        BACK TO DETAILS
      </button>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">Book together to save money</h2>
      <p className="text-lg text-slate-600 mb-8">Make more memories with an extra experience.</p>

      <div className="space-y-8 mb-8">
        {upgrades.map((upgrade) => (
          <div key={upgrade.id} className="border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row gap-6 transition-all duration-300 hover:shadow-lg">
            <div className="relative flex-shrink-0 w-full sm:w-auto">
              <Image
                src={upgrade.image}
                alt={upgrade.title}
                width={120}
                height={120}
                className="w-full h-32 sm:w-24 sm:h-24 object-cover"
              />
              {upgrade.description && (
                <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-2 py-1">
                  {upgrade.description}
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-between">
              <h3 className="font-bold text-lg text-slate-900 mb-2">{upgrade.title}</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mb-4">
                <span>{upgrade.bookings} bookings</span>
                <span className="flex items-center gap-1">
                  <Clock size={14} className="text-slate-400" />
                  {upgrade.duration}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg text-slate-500 line-through">
                  From {formatPrice(upgrade.originalPrice)}
                </span>
                <span className="text-2xl font-bold text-red-600">
                  {formatPrice(upgrade.salePrice)}
                </span>
              </div>
            </div>

            <button className="w-full sm:w-auto bg-slate-900 text-white font-bold py-3 px-6 hover:bg-red-600 transition-colors self-end">
                ADD TO CART
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full bg-red-600 text-white font-bold py-4 hover:bg-red-700 transition-colors text-lg"
      >
        PAY NOW
      </button>
    </div>
  );
};

// --- Payment Step (Enhanced) ---
const PaymentStep = ({ onBack, onPaymentSuccess }: { onBack: () => void; onPaymentSuccess: () => void; }) => {
  const { formatPrice } = useSettings();
  
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    securityCode: '',
    nameOnCard: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate payment processing
    console.log('Processing payment...', paymentData);
    // On success, call the onPaymentSuccess handler
    onPaymentSuccess();
  };

  // SVGs for card logos
  const PaymentCardIcons = () => (
    <div className="flex gap-3 mt-2">
      <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><text x="20" y="16" textAnchor="middle" fill="#1A1F71" fontSize="10" fontWeight="bold">VISA</text></svg>
      <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><circle cx="16" cy="12" r="6" fill="#FF5F00" /><circle cx="24" cy="12" r="6" fill="#EB001B" fillOpacity="0.8" /></svg>
      <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="#006FCF" /><text x="20" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AMEX</text></svg>
      <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><path d="M14.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3h-1.5L15 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3h-1.3l-.4 2.8h1.7z" fill="#003087" /><path d="M19.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3H21L20.3 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3H21l-.4 2.8h1.7z" fill="#0070E0" /></svg>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-xl p-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 font-medium mb-6 hover:text-red-600 transition-colors"
      >
        <ArrowLeft size={20} />
        BACK TO UPGRADES
      </button>

      <h2 className="text-2xl font-bold text-slate-900 mb-6">Please select your payment method</h2>

      <div className="p-6 bg-[#F8F8F8]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-6 bg-slate-900 flex items-center justify-center text-white">
            <Lock size={16} />
          </div>
          <span className="font-bold text-lg text-slate-900">Cards</span>
        </div>
        
        <p className="text-sm text-slate-600 mb-4">All fields are required unless marked otherwise.</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Card number
            </label>
            <input
              type="text"
              required
              value={paymentData.cardNumber}
              onChange={(e) => setPaymentData({...paymentData, cardNumber: e.target.value})}
              className="w-full p-4 border border-slate-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
              placeholder="1234 5678 9012 3456"
            />
            <PaymentCardIcons />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expiry date
              </label>
              <input
                type="text"
                required
                value={paymentData.expiryDate}
                onChange={(e) => setPaymentData({...paymentData, expiryDate: e.target.value})}
                className="w-full p-4 border border-slate-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                placeholder="MM / YY"
              />
              <p className="text-xs text-slate-500 mt-1">Front of card in MM/YY format</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Security code
              </label>
              <input
                type="text"
                required
                value={paymentData.securityCode}
                onChange={(e) => setPaymentData({...paymentData, securityCode: e.target.value})}
                className="w-full p-4 border border-slate-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                placeholder="123"
              />
              <p className="text-xs text-slate-500 mt-1">3 digits on back of card</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name on card
            </label>
            <input
              type="text"
              required
              value={paymentData.nameOnCard}
              onChange={(e) => setPaymentData({...paymentData, nameOnCard: e.target.value})}
              className="w-full p-4 border border-slate-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
              placeholder="John Doe"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-slate-900 text-white font-bold py-4 mt-8 hover:bg-red-600 transition-colors flex items-center justify-center gap-3"
        >
          <Lock size={20} />
          Pay {formatPrice(checkoutData.pricing.total)}
        </button>
      </div>
    </form>
  );
};

// --- Thank You Page (NEW) ---
const ThankYouPage = ({ bookingData }: { bookingData: typeof checkoutData }) => (
    <div className="bg-white shadow-xl p-8 text-center max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center mb-8">
            <CheckCircle size={80} className="text-emerald-500 mb-4" />
            <h2 className="text-4xl font-extrabold text-slate-900 mb-2">Thank you for your order!</h2>
            <p className="text-lg text-slate-600 max-w-md">
                Your booking is confirmed. We have sent a confirmation email to the address provided with all the details you need.
            </p>
        </div>

        <div className="border border-slate-200 p-6 text-left mb-8">
            <h3 className="font-bold text-xl text-slate-900 mb-4">Booking Details</h3>
            <div className="flex gap-6 mb-4">
                <Image
                    src={bookingData.tour.image}
                    alt={bookingData.tour.title}
                    width={100}
                    height={100}
                    className="w-24 h-24 object-cover"
                />
                <div className="flex-1">
                    <p className="text-lg font-semibold text-slate-900">{bookingData.tour.title}</p>
                    <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                        <CalendarDays size={16} className="text-slate-400" />
                        {bookingData.tour.date} {bookingData.tour.time}
                    </p>
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                        <User size={16} className="text-slate-400" />
                        {bookingData.tour.guests}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">
                        €{bookingData.pricing.total}
                    </p>
                </div>
            </div>
        </div>

        <div className="space-y-4 text-center">
            <h3 className="font-bold text-xl text-slate-900">What's next?</h3>
            <p className="text-slate-600">
                You will receive a confirmation email shortly. You can also view your booking details by signing in to your account.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                <a href="/" className="px-8 py-3 bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors">
                    Back to Homepage
                </a>
                <a href="/login" className="px-8 py-3 bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200 transition-colors">
                    Sign in to manage booking
                </a>
            </div>
        </div>
    </div>
);

// --- Trust Indicators Component (Enhanced) ---
const TrustIndicators = () => (
  <div className="flex flex-col sm:flex-row justify-center items-center gap-6 md:gap-12 py-8 mt-8 border-t border-slate-200">
    <div className="flex items-center gap-2 text-slate-600">
      <Shield size={20} className="text-emerald-600" />
      <span className="font-medium">Easy and secure booking</span>
    </div>
    <div className="flex items-center gap-2 text-slate-600">
      <Smartphone size={20} className="text-red-600" />
      <span className="font-medium">Ticket is directly available on smartphone</span>
    </div>
    <div className="flex items-center gap-2 text-slate-600">
      <Headphones size={20} className="text-slate-900" />
      <span className="font-medium">Excellent customer service</span>
    </div>
  </div>
);

// =================================================================
// --- MAIN CHECKOUT PAGE COMPONENT ---
// =================================================================
export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <>
      <Header startSolid={true} />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {currentStep !== 4 && (
            <CheckoutSteps currentStep={currentStep} onStepClick={setCurrentStep} />
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              {currentStep === 1 && (
                <PersonalDetailsStep onNext={() => setCurrentStep(2)} />
              )}
              
              {currentStep === 2 && (
                <UpgradesStep 
                  onNext={() => setCurrentStep(3)} 
                  onBack={() => setCurrentStep(1)}
                />
              )}
              
              {currentStep === 3 && (
                <PaymentStep onBack={() => setCurrentStep(2)} onPaymentSuccess={() => setCurrentStep(4)} />
              )}

              {currentStep === 4 && (
                <ThankYouPage bookingData={checkoutData} />
              )}
            </div>

            {currentStep !== 4 && (
              <div className="lg:col-span-1">
                <BookingSummary />
              </div>
            )}
          </div>

          <TrustIndicators />
        </div>
      </main>
      <Footer />
    </>
  );
}
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Lock,
  Shield,
  CheckCircle,
  CalendarDays,
  User,
  Trash2,
  Smartphone,
  Headphones,
  Loader2,
  Download,
  Printer,
  UserPlus,
  LogIn,
  Mail,
  Phone,
  UserCheck,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import StripePaymentForm from '@/components/StripePaymentForm';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { CartItem } from '@/types';
import toast from 'react-hot-toast';

// Small payment SVG icons (keeping existing ones)
const VisaIcon = ({ className = '', width = 48, height = 28 }: { className?: string; width?: number; height?: number }) => (
  <svg width={width} height={height} viewBox="0 0 48 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
    <rect width="48" height="28" rx="4" fill="#1A1F71" />
    <path d="M11.2 19.6h2.1l2.1-11.2H13L11.2 19.6zM18.9 8.4c-1.15 0-2.05.55-2.6 1.3l-.5-1.9h-2.9l-1.9 11.2h2.4l.7-3.9c.65-.35 1.45-.55 2.3-.55 3.15 0 5.15-2.2 5.7-5.15.35-1.55.05-2.75-.65-3.45-.8-.8-1.95-1.2-3.45-1.2zM28.3 16.1c-.25 1.45-1.3 2.45-2.8 2.45-.7 0-1.2-.25-1.6-.8-.35-.6-.3-1.25-.05-2 .25-1.45 1.3-2.45 2.8-2.45.7 0 1.2.25 1.6.8.35.6.3 1.25.05 2z" fill="#fff" />
  </svg>
);

const MastercardIcon = ({ className = '', width = 48, height = 28 }: { className?: string; width?: number; height?: number }) => (
  <svg width={width} height={height} viewBox="0 0 48 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
    <rect width="48" height="28" rx="4" fill="#fff" stroke="#e6e7ea" />
    <g transform="translate(8,4)">
      <circle cx="10" cy="10" r="8" fill="#EB001B" />
      <circle cx="22" cy="10" r="8" fill="#F79E1B" />
      <path d="M16 2c1.6 1.3 2.6 3.2 2.6 5.2 0 2-1 3.9-2.6 5.2-1.6-1.3-2.6-3.2-2.6-5.2C13.4 5.2 14.4 3.3 16 2z" fill="#FF5F00" />
    </g>
  </svg>
);

const AmexIcon = ({ className = '', width = 48, height = 28 }: { className?: string; width?: number; height?: number }) => (
  <svg width={width} height={height} viewBox="0 0 48 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
    <rect width="48" height="28" rx="4" fill="#006FCF" />
    <g transform="translate(4,6)" fill="#fff">
      <path d="M2 2h6l1 2 1-2h6v8h-3v-4l-1 2h-2l-1-2v4H2V2z" />
      <path d="M14 2h8v2h-5v1h4v2h-4v1h5v2h-8v-8z" />
      <path d="M26 2h4l3 5v-5h3v8h-4l-3-5v5h-3v-8z" />
    </g>
  </svg>
);

const PayPalIcon = ({ className = '', width = 36, height = 24 }: { className?: string; width?: number; height?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 36 24" aria-hidden="true" className={className}>
    <g fill="none" fillRule="evenodd">
      <path fill="#003087" d="M11.9 1.2H6.4C5.8 1.2 5.3 1.6 5.1 2.2L2 14.6c-.1.4.2.8.6.8h3.1l-.2 1.3c-.1.4.2.8.6.8h2.4c.4 0 .8-.3.9-.7l.5-3.1.1-.6c.1-.4.4-.7.8-.7h1.1c3 0 5.4-1.1 6.5-3.7.4-1 .4-2.1.1-3.1-.3-1.4-1.1-2.4-2.1-3.1-.4-.2-.8-.4-1.2-.5-1.2-.3-2.6-.3-4.1-.3z" />
      <path fill="#009CDE" d="M6.7 16.3h2.1c.4 0 .8-.3.9-.7l.5-3.1c.1-.4.4-.7.8-.7h1.1c2.9 0 5-1.1 5.7-3.9.2-1 .1-1.9-.3-2.7.8.5 1.3 1.4 1.5 2.6.3 1.5.2 2.7-.4 3.9-.9 1.9-2.8 3.3-5.6 3.7H9.3c-.6 0-1 .4-1.1 1l-.2 1.3z" />
      <path fill="#112E51" d="M9.8 6.2h3.9c1 0 1.8.2 2.3.6.2.1.4.3.6.5.2.2.3.5.4.8.1.4.1.9-.1 1.4-.6 2-2.3 3.2-5.2 3.2H9.3c-.6 0-1 .4-1.1 1l-.2 1.3h3.4l-.2 1.3H7.2L9.8 6.2z" />
    </g>
  </svg>
);

const FormInput = ({ label, name, type = 'text', placeholder, required = true, value, onChange, disabled = false }: any) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-2">
      {label}
      {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full bg-white border border-slate-300 px-4 py-3 shadow-sm placeholder:text-slate-400 focus:outline-none focus:border-slate-500 focus-visible:ring-2 focus-visible:ring-red-500 transition duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
    />
  </div>
);

// Customer Type Selection Component
const CustomerTypeSelector = ({ 
  customerType, 
  setCustomerType, 
  onLoginClick, 
  onSignupClick 
}: {
  customerType: 'guest' | 'login' | 'signup';
  setCustomerType: (type: 'guest' | 'login' | 'signup') => void;
  onLoginClick: () => void;
  onSignupClick: () => void;
}) => {
  return (
    <div className="bg-white p-4 sm:p-6 shadow-xl space-y-3 sm:space-y-4 border-t border-b border-r border-slate-200">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">How would you like to checkout?</h2>
      
      <div className="space-y-3">
        {/* Continue as Guest */}
        <motion.button
          type="button"
          onClick={() => setCustomerType('guest')}
          className={`w-full p-3 sm:p-4 border-2 rounded-xl text-left transition-all ${
            customerType === 'guest'
              ? 'border-red-500 bg-red-50'
              : 'border-slate-200 hover:border-red-300 hover:bg-red-50'
          }`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className={`w-4 h-4 rounded-full border-2 ${
                customerType === 'guest' 
                  ? 'border-red-500 bg-red-500' 
                  : 'border-slate-300'
              }`}>
                {customerType === 'guest' && (
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base text-slate-800">Continue as Guest</div>
                <div className="text-xs sm:text-sm text-slate-600">Quick checkout without creating an account</div>
              </div>
            </div>
            <User size={20} className={`${customerType === 'guest' ? 'text-red-500' : 'text-slate-400'} flex-shrink-0 hidden sm:block`} />
          </div>
        </motion.button>

        {/* Sign In */}
        <motion.button
          type="button"
          onClick={onLoginClick}
          className="w-full p-4 border-2 border-slate-200 rounded-xl text-left transition-all hover:border-blue-300 hover:bg-blue-50"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <LogIn size={20} className="text-blue-500" />
              <div>
                <div className="font-semibold text-slate-800">Sign In</div>
                <div className="text-sm text-slate-600">Access your account for faster checkout</div>
              </div>
            </div>
            <div className="text-blue-500 text-sm font-medium">Sign In →</div>
          </div>
        </motion.button>

        {/* Create Account */}
        <motion.button
          type="button"
          onClick={onSignupClick}
          className="w-full p-4 border-2 border-slate-200 rounded-xl text-left transition-all hover:border-green-300 hover:bg-green-50"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UserPlus size={20} className="text-green-500" />
              <div>
                <div className="font-semibold text-slate-800">Create Account</div>
                <div className="text-sm text-slate-600">Save your details for future bookings</div>
              </div>
            </div>
            <div className="text-green-500 text-sm font-medium">Sign Up →</div>
          </div>
        </motion.button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
        <Shield size={14} className="text-green-500" />
        <span>Your personal information is always secure and protected</span>
      </div>
    </div>
  );
};

const SummaryItem: React.FC<{ item: CartItem }> = ({ item }) => {
  const { formatPrice } = useSettings();
  const { removeFromCart } = useCart();

  // Use the same calculation logic as in BookingSidebar and CartSidebar
  const getItemTotal = (item: CartItem) => {
    const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
    const adultPrice = basePrice * (item.quantity || 1);
    const childPrice = (basePrice / 2) * (item.childQuantity || 0);
    let tourTotal = adultPrice + childPrice;

    let addOnsTotal = 0;
    if (item.selectedAddOns && item.selectedAddOnDetails) {
      Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
        const addOnDetail = item.selectedAddOnDetails?.[addOnId];
        if (addOnDetail && quantity > 0) {
          const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
          const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
          addOnsTotal += addOnDetail.price * addOnQuantity;
        }
      });
    }

    return tourTotal + addOnsTotal;
  };

  const itemTotal = getItemTotal(item);

  return (
    <div className="flex gap-3 sm:gap-4 py-3 sm:py-4">
      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 overflow-hidden rounded">
        {item.image ? (
          <Image src={item.image} alt={item.title} width={64} height={64} className="w-16 h-16 object-cover" />
        ) : (
          <div className="w-16 h-16 bg-slate-100" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm sm:text-base text-slate-800 leading-tight">{item.title}</h4>
        
       {/* This line should show the selected booking option */}
  {item.selectedBookingOption && (
    <p className="text-sm text-blue-600 font-medium mb-1">{item.selectedBookingOption.title}</p>
  )}
        
        {/* Show booking details */}
        {item.selectedDate && (
          <p className="text-xs text-slate-500">
            {new Date(item.selectedDate).toLocaleDateString()} at {item.selectedTime}
          </p>
        )}
        
        {/* Show participant counts */}
        <div className="text-sm text-slate-500">
          {item.quantity > 0 && `${item.quantity} Adult${item.quantity > 1 ? 's' : ''}`}
          {item.childQuantity > 0 && item.quantity > 0 && ', '}
          {item.childQuantity > 0 && `${item.childQuantity} Child${item.childQuantity > 1 ? 'ren' : ''}`}
          {item.infantQuantity > 0 && (item.quantity > 0 || item.childQuantity > 0) && ', '}
          {item.infantQuantity > 0 && `${item.infantQuantity} Infant${item.infantQuantity > 1 ? 's' : ''}`}
        </div>
        
        {/* Show selected add-ons */}
        {item.selectedAddOns && item.selectedAddOnDetails && Object.keys(item.selectedAddOns).length > 0 && (
          <div className="text-xs text-slate-500 mt-1 pl-4 border-l-2 border-slate-200">
            <strong>Add-ons:</strong>
            <div className="mt-1 space-y-1">
              {Object.entries(item.selectedAddOns).map(([addOnId, quantity]) => {
                const addOnDetail = item.selectedAddOnDetails?.[addOnId];
                if (!addOnDetail || quantity === 0) return null;

                const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
                const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
                const addOnTotal = addOnDetail.price * addOnQuantity;

                return (
                  <div key={addOnId} className="flex justify-between">
                    <span>• {addOnDetail.title}{addOnDetail.perGuest && ` (${totalGuests}x)`}</span>
                    <span>{formatPrice(addOnTotal)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="text-right flex flex-col justify-between items-end flex-shrink-0">
        <p className="font-bold text-base sm:text-lg text-slate-800">{formatPrice(itemTotal)}</p>
        <button
          onClick={() => removeFromCart(item.uniqueId!)}
          className="text-slate-400 hover:text-red-500 transition-colors mt-2"
          aria-label="Remove item"
        >
          <Trash2 size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};

const BookingSummary = ({ pricing, promoCode, setPromoCode, applyPromoCode, isProcessing, isApplyingCoupon, couponMessage }: any) => {
  const { formatPrice } = useSettings();
  const { cart } = useCart();

  if (!cart || cart.length === 0) return null;

  return (
    <aside className="bg-white border-t border-b border-l border-slate-200 p-4 sm:p-6 shadow-xl lg:sticky lg:top-28">
      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Your Booking Summary</h3>
      <div className="divide-y divide-slate-200">
        {cart.map((item, index) => (
          <SummaryItem key={`${item._id ?? item.uniqueId}-${index}`} item={item} />
        ))}
      </div>

      <div className="mt-4 p-4 bg-slate-50 border-t border-b border-slate-200">
        <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatPrice(pricing.subtotal)}</span></div>
        <div className="flex justify-between text-sm text-slate-600 mt-2"><span>Service fee</span><span>{formatPrice(pricing.serviceFee)}</span></div>
        <div className="flex justify-between text-sm text-slate-600"><span>Taxes & fees</span><span>{formatPrice(pricing.tax)}</span></div>
        {pricing.discount > 0 && (
          <div className="flex justify-between text-sm text-emerald-700 font-medium mt-2">
            <span>Discount Applied</span>
            <span>-{formatPrice(pricing.discount)}</span>
          </div>
        )}
        <div className="border-t pt-3 mt-3 flex justify-between items-center">
          <p className="text-sm text-slate-600">Total</p>
          <p className="text-lg font-bold text-rose-600">{formatPrice(pricing.total)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Promotional code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            disabled={isApplyingCoupon || pricing.discount > 0}
            className="flex-1 px-4 py-2 border border-slate-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-200 transition disabled:bg-slate-100"
          />
          <button
            onClick={applyPromoCode}
            type="button"
            disabled={isApplyingCoupon || pricing.discount > 0}
            className="px-4 py-2 bg-slate-900 text-white font-semibold hover:bg-slate-800 transition disabled:bg-slate-400 flex items-center justify-center w-24"
          >
            {isApplyingCoupon ? <Loader2 className="animate-spin" size={20} /> : 'Apply'}
          </button>
        </div>
        {couponMessage && (
          <p className={`mt-2 text-sm ${pricing.discount > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {couponMessage}
          </p>
        )}
      </div>

      <div className="mt-6 hidden lg:block">
        <button
          type="submit"
          form="checkout-form"
          disabled={isProcessing}
          className="w-full py-4 bg-red-600 text-white font-extrabold text-lg hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-md transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <span className="inline-flex items-center justify-center gap-2"><Lock size={18} /> Complete Booking & Pay</span>}
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">
          By completing this booking you agree to our <a className="underline" href="/terms">Terms of Service</a>.
        </p>
      </div>
    </aside>
  );
};

type FormDataShape = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: string;
  specialRequests: string;
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
};

const CheckoutFormStep = ({
  onPaymentProcess,
  isProcessing,
  formData,
  setFormData,
  customerType,
  setCustomerType,
  onAuthModalOpen,
  user,
  pricing,
  cart,
  promoCode,
  paymentIntentId,
  setPaymentIntentId,
}: {
  onPaymentProcess: () => void;
  isProcessing: boolean;
  formData: FormDataShape;
  setFormData: (v: FormDataShape) => void;
  customerType: 'guest' | 'login' | 'signup';
  setCustomerType: (type: 'guest' | 'login' | 'signup') => void;
  onAuthModalOpen: (mode: 'login' | 'signup') => void;
  user: any;
  pricing: any;
  cart: any[];
  promoCode: string;
  paymentIntentId: string;
  setPaymentIntentId: (id: string) => void;
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that we have a payment intent ID from Stripe
    if (!paymentIntentId) {
      toast.error('Please complete the payment before submitting');
      return;
    }

    onPaymentProcess();
  };

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card');

  // Auto-fill form if user is logged in
  useEffect(() => {
    if (user && customerType !== 'guest') {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
        cardholderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.cardholderName,
      }));
    }
  }, [user, customerType, setFormData]);

  return (
    <form onSubmit={handleSubmit} id="checkout-form" className="bg-white p-4 sm:p-6 md:p-8 shadow-xl space-y-6 sm:space-y-8 border-t border-b border-r border-slate-200">
      {/* Customer Type Selection (only show if not authenticated) */}
      {!user && (
        <section>
          <CustomerTypeSelector
            customerType={customerType}
            setCustomerType={setCustomerType}
            onLoginClick={() => onAuthModalOpen('login')}
            onSignupClick={() => onAuthModalOpen('signup')}
          />
        </section>
      )}

      {/* Welcome message for authenticated users */}
      {user && (
        <section className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <UserCheck size={24} className="text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Welcome back, {user.firstName}!</h3>
              <p className="text-sm text-green-600">Your account details have been pre-filled for faster checkout.</p>
            </div>
          </div>
        </section>
      )}

      {/* Contact Information (show for guest or authenticated users) */}
      {(customerType === 'guest' || user) && (
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Contact Information</h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <Shield size={14} className="text-emerald-500" /> 
              <span>Secure &amp; encrypted</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput 
              label="First Name" 
              name="firstName" 
              placeholder="Enter your first name" 
              value={formData.firstName} 
              onChange={handleInputChange} 
              disabled={isProcessing} 
            />
            <FormInput 
              label="Last Name" 
              name="lastName" 
              placeholder="Enter your last name" 
              value={formData.lastName} 
              onChange={handleInputChange} 
              disabled={isProcessing} 
            />
            <FormInput 
              label="Email Address" 
              name="email" 
              type="email" 
              placeholder="Enter your email address" 
              value={formData.email} 
              onChange={handleInputChange} 
              disabled={isProcessing || !!user} 
            />
            <FormInput 
              label="Phone Number" 
              name="phone" 
              type="tel" 
              placeholder="Enter your phone number" 
              value={formData.phone} 
              onChange={handleInputChange} 
              disabled={isProcessing} 
            />
            <div className="md:col-span-2">
              <FormInput 
                label="Emergency Contact (optional)" 
                name="emergencyContact" 
                placeholder="Name and phone number" 
                required={false} 
                value={formData.emergencyContact} 
                onChange={handleInputChange} 
                disabled={isProcessing} 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Special Requests</label>
              <textarea 
                name="specialRequests" 
                value={formData.specialRequests} 
                onChange={handleInputChange} 
                placeholder="Any special requirements, dietary restrictions, etc..." 
                rows={4} 
                className="w-full px-4 py-3 border border-slate-300 focus-visible:ring-2 focus-visible:ring-red-500" 
                disabled={isProcessing} 
              />
            </div>
          </div>
        </section>
      )}

      {/* Payment Information (show for guest or authenticated users) */}
      {(customerType === 'guest' || user) && (
        <section>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4">Payment Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-6">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              aria-pressed={paymentMethod === 'card'}
              className={`flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-2 p-3 sm:p-4 border border-slate-200 transition-shadow ${paymentMethod === 'card' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white hover:shadow-sm'}`}
            >
              <div className="h-8 sm:h-10 flex items-center">
                <Image src="/payment/visam.png" alt="Card logos" width={60} height={24} className="object-contain sm:w-[72px] sm:h-[28px]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700">Card</span>
            </button>

            <button 
              type="button" 
              onClick={() => setPaymentMethod('paypal')} 
              aria-pressed={paymentMethod === 'paypal'} 
              className={`flex flex-col items-center gap-2 p-4 border border-slate-200 transition-shadow ${paymentMethod === 'paypal' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white hover:shadow-sm'}`}
            >
              <div className="h-10 flex items-center">
                <Image src="/payment/paypal2.png" alt="PayPal" width={48} height={30} className="object-contain" />
              </div>
              <span className="text-sm font-medium text-slate-700">PayPal</span>
            </button>

            <button 
              type="button" 
              onClick={() => setPaymentMethod('bank')} 
              aria-pressed={paymentMethod === 'bank'} 
              className={`flex flex-col items-center gap-2 p-4 border border-slate-200 transition-shadow ${paymentMethod === 'bank' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white hover:shadow-sm'}`}
            >
              <div className="h-10 flex items-center">
                <Image src="/payment/bank.png" alt="Bank transfer" width={48} height={30} className="object-contain" />
              </div>
              <span className="text-sm font-medium text-slate-700">Bank Transfer</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={paymentMethod}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {paymentMethod === 'card' && (
                <div className="mt-4">
                  <StripePaymentForm
                    amount={pricing.total}
                    currency={pricing.currency}
                    customer={{
                      email: formData.email,
                      firstName: formData.firstName,
                      lastName: formData.lastName,
                    }}
                    cart={cart}
                    pricing={pricing}
                    discountCode={promoCode}
                    onSuccess={(paymentIntent) => {
                      setPaymentIntentId(paymentIntent);
                      toast.success('Payment completed successfully! Now finalizing your booking...');
                      // Automatically submit the form after successful payment
                      setTimeout(() => {
                        const form = document.getElementById('checkout-form') as HTMLFormElement;
                        if (form) {
                          form.requestSubmit();
                        }
                      }, 500);
                    }}
                    onError={(error) => {
                      toast.error(error);
                    }}
                  />
                </div>
              )}
              {paymentMethod === 'paypal' && (
                <div className="p-6 bg-slate-50 border border-slate-200 text-center text-slate-700">
                  <p className="font-medium">You will be redirected to PayPal to complete your payment securely.</p>
                  <p className="text-sm text-slate-500 mt-2">PayPal integration coming soon. Please use card payment.</p>
                </div>
              )}
              {paymentMethod === 'bank' && (
                <div className="p-6 bg-slate-50 border border-slate-200 text-center text-slate-700">
                  <p className="font-medium">Please follow the instructions in the confirmation email to complete your bank transfer.</p>
                  <p className="text-sm text-slate-500 mt-2">Bank transfer integration coming soon. Please use card payment.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      )}
    </form>
  );
};

const ThankYouPage = ({
  orderedItems,
  pricing,
  customer,
  lastOrderId,
  discount = 0,
}: {
  orderedItems: CartItem[];
  pricing: any;
  customer: FormDataShape | null;
  lastOrderId?: string;
  discount?: number;
}) => {
  const { formatPrice } = useSettings();
  const [isDownloading, setIsDownloading] = useState(false);

const handleDownloadReceipt = async () => {
  if (isDownloading) return;
  setIsDownloading(true);

  try {
    const orderId = lastOrderId ?? `ORD-${Date.now()}`;

    // DON'T recalculate - use the exact pricing from the thank you page
    const pricingForPdf = {
      subtotal: pricing.subtotal,
      serviceFee: pricing.serviceFee,
      tax: pricing.tax,
      discount: pricing.discount,
      total: pricing.total,
      currency: pricing.currency,
      symbol: pricing.symbol,
    };

    // DON'T recalculate item totals - use them as they are displayed
    const orderedItemsForPdf = orderedItems.map((item) => {
      // Calculate the same way as shown on thank you page
      const getItemTotal = (item: CartItem) => {
        const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
        const adultPrice = basePrice * (item.quantity || 1);
        const childPrice = (basePrice / 2) * (item.childQuantity || 0);
        let tourTotal = adultPrice + childPrice;

        let addOnsTotal = 0;
        if (item.selectedAddOns && item.selectedAddOnDetails) {
          Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
            const addOnDetail = item.selectedAddOnDetails?.[addOnId];
            if (addOnDetail && quantity > 0) {
              const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
              const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
              addOnsTotal += addOnDetail.price * addOnQuantity;
            }
          });
        }

        return tourTotal + addOnsTotal;
      };

      return {
        ...item,
        // Keep the item total as calculated for display consistency
        totalPrice: getItemTotal(item),
        finalPrice: getItemTotal(item),
      };
    });

    const customerForPdf = {
      name: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Guest',
      email: customer?.email,
      phone: customer?.phone,
    };

    const firstItem = orderedItems[0];
    const bookingForPdf = {
      date: firstItem?.selectedDate ? new Date(firstItem.selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) : undefined,
      time: firstItem?.selectedTime,
      guests: orderedItems.reduce((sum, item) => 
        sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0), 0
      ),
      specialRequests: customer?.specialRequests ?? '',
    };

    const qrData = `https://your-site.example.com/booking/${orderId}`;

    const payload = {
      orderId,
      customer: customerForPdf,
      orderedItems: orderedItemsForPdf,
      pricing: pricingForPdf, // Use exact pricing - no recalculation
      booking: bookingForPdf,
      qrData,
      notes: customer?.specialRequests || 'Receipt requested from Thank You page',
    };

    const res = await fetch('/api/checkout/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      console.error('Failed to get receipt:', res.status, text);
      alert('Failed to generate receipt. Please try again later.');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download receipt error:', err);
    alert('An error occurred while downloading the receipt.');
  } finally {
    setIsDownloading(false);
  }
};

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-4 sm:p-6 md:p-10 shadow-xl max-w-3xl mx-auto text-center border border-slate-200"
    >
      <div className="mx-auto w-fit mb-4 sm:mb-6 p-3 sm:p-4 bg-emerald-100 rounded-full">
        <CheckCircle size={36} className="sm:w-12 sm:h-12 text-emerald-600" />
      </div>
      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">Thank you — your booking is confirmed!</h1>
      <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6">We've sent a booking confirmation and receipt to your email address.</p>

      <div className="text-left bg-slate-50 p-4 sm:p-6 border border-slate-200 mb-4 sm:mb-6">
        <h3 className="font-bold text-lg text-slate-800 mb-4">Your Receipt</h3>
      <div className="space-y-3 mb-4 divide-y divide-slate-200">
  {orderedItems.map((item, index) => {
    // Use the same calculation logic
    const getItemTotal = (item: CartItem) => {
      const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
      const adultPrice = basePrice * (item.quantity || 1);
      const childPrice = (basePrice / 2) * (item.childQuantity || 0);
      let tourTotal = adultPrice + childPrice;

      let addOnsTotal = 0;
      if (item.selectedAddOns && item.selectedAddOnDetails) {
        Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
          const addOnDetail = item.selectedAddOnDetails?.[addOnId];
          if (addOnDetail && quantity > 0) {
            const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
            const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
            addOnsTotal += addOnDetail.price * addOnQuantity;
          }
        });
      }

      return tourTotal + addOnsTotal;
    };

    const itemTotal = getItemTotal(item);

    return (
      <div key={`${item._id ?? index}-${index}`} className="flex items-center justify-between pt-3 first:pt-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 overflow-hidden rounded">
            {item.image ? <Image src={item.image} alt={item.title} width={48} height={48} className="object-cover" /> : <div className="w-12 h-12 bg-slate-100" />}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{item.title}</p>
            {item.selectedBookingOption && (
              <p className="text-xs text-blue-600 font-medium">{item.selectedBookingOption.title}</p>
            )}
            <p className="text-sm text-slate-500">
              {item.quantity} Adult{item.quantity > 1 ? 's' : ''}
              {item.childQuantity > 0 && `, ${item.childQuantity} Child${item.childQuantity > 1 ? 'ren' : ''}`}
            </p>
            {/* Show add-ons in receipt */}
            {item.selectedAddOns && item.selectedAddOnDetails && Object.keys(item.selectedAddOns).length > 0 && (
              <div className="text-xs text-slate-500 mt-1">
                Add-ons: {Object.entries(item.selectedAddOns).map(([addOnId]) => {
                  const addOnDetail = item.selectedAddOnDetails?.[addOnId];
                  return addOnDetail?.title;
                }).filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
        <div className="text-slate-700 font-medium">{formatPrice(itemTotal)}</div>
      </div>
    );
  })}
</div>

        <div className="border-t border-slate-200 pt-3 space-y-1">
          <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatPrice(pricing.subtotal)}</span></div>
          {pricing.discount > 0 && <div className="flex justify-between text-sm text-emerald-700"><span>Discount</span><span>-{formatPrice(pricing.discount)}</span></div>}
          <div className="flex justify-between text-sm text-slate-600"><span>Fees & Taxes</span><span>{formatPrice(pricing.serviceFee + pricing.tax)}</span></div>
          <div className="flex justify-between text-lg font-bold text-slate-900 mt-2"><span>Total Paid</span><span>{formatPrice(pricing.total)}</span></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
        <button
          onClick={() => window.location.assign('/')}
          className="px-4 sm:px-5 py-2.5 sm:py-3 border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-sm sm:text-base font-semibold rounded-lg"
        >
          Go to homepage
        </button>
        <button
          onClick={handleDownloadReceipt}
          disabled={isDownloading}
          className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-900 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-500 flex items-center justify-center gap-2"
        >
          {isDownloading ? <Loader2 className="animate-spin" size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Download size={16} className="sm:w-[18px] sm:h-[18px]" />}
          Download Receipt
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 sm:px-5 py-2.5 sm:py-3 border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-sm sm:text-base font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          <Printer size={16} className="sm:w-[18px] sm:h-[18px]" /> Print
        </button>
      </div>
    </motion.div>
  );
};

const TrustIndicators = () => (
  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 md:gap-12 py-6 sm:py-8 mt-8 sm:mt-12 border-t border-slate-200">
    <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600"><Shield size={18} className="sm:w-5 sm:h-5 text-emerald-600" /><span>Easy and secure booking</span></div>
    <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600"><Smartphone size={18} className="sm:w-5 sm:h-5 text-red-600" /><span>Ticket available on smartphone</span></div>
    <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600"><Headphones size={18} className="sm:w-5 sm:h-5 text-slate-900" /><span>Excellent customer service</span></div>
  </div>
);

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { formatPrice, selectedCurrency } = useSettings();
  const { user } = useAuth();
  const router = useRouter();

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
  const [finalPricing, setFinalPricing] = useState<any>(null);
  const [finalCustomer, setFinalCustomer] = useState<FormDataShape | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [lastOrderId, setLastOrderId] = useState<string | undefined>(undefined);

  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');

  // Customer type and auth modal states
  const [customerType, setCustomerType] = useState<'guest' | 'login' | 'signup'>('guest');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Stripe payment intent ID
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  const [formData, setFormData] = useState<FormDataShape>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    emergencyContact: '',
    specialRequests: '',
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });

 const pricing = useMemo(() => {
  // Use the same calculation logic as in other components
  const getItemTotal = (item: CartItem) => {
    const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
    const adultPrice = basePrice * (item.quantity || 1);
    const childPrice = (basePrice / 2) * (item.childQuantity || 0);
    let tourTotal = adultPrice + childPrice;

    let addOnsTotal = 0;
    if (item.selectedAddOns && item.selectedAddOnDetails) {
      Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
        const addOnDetail = item.selectedAddOnDetails?.[addOnId];
        if (addOnDetail && quantity > 0) {
          const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
          const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
          addOnsTotal += addOnDetail.price * addOnQuantity;
        }
      });
    }

    return tourTotal + addOnsTotal;
  };

  const subtotal = Number(((cart || []).reduce((acc, item) => acc + getItemTotal(item), 0)).toFixed(2));
  const serviceFee = Number((subtotal * 0.03).toFixed(2));
  const tax = Number((subtotal * 0.05).toFixed(2));
  const total = Number((subtotal + serviceFee + tax - Number(discount || 0)).toFixed(2));
  
  return {
    subtotal,
    serviceFee,
    tax,
    total,
    discount,
    currency: selectedCurrency?.code ?? 'USD',
    symbol: selectedCurrency?.symbol ?? '$',
  };
}, [cart, discount, selectedCurrency]);

  // Set customer type based on authentication status
  useEffect(() => {
    if (user) {
      setCustomerType('login'); // Will show authenticated flow
    }
  }, [user]);

  const handleApplyCoupon = async () => {
    if (!promoCode) {
      setCouponMessage('Please enter a coupon code.');
      return;
    }
    setIsApplyingCoupon(true);
    setCouponMessage('');

    try {
      const response = await fetch(`/api/discounts/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      });

      const data = await response.json();

      if (data.success) {
        const discountData = data.data;
        let calculatedDiscount = 0;
        if (discountData.discountType === 'percentage') {
          calculatedDiscount = (pricing.subtotal * discountData.value) / 100;
        } else {
          calculatedDiscount = discountData.value;
        }
        setDiscount(calculatedDiscount);
        setCouponMessage(`Success! A discount of ${formatPrice(calculatedDiscount)} has been applied.`);
      } else {
        setDiscount(0);
        setCouponMessage(data.error || 'Invalid or expired coupon code.');
      }
    } catch (error) {
      console.error('Failed to apply coupon:', error);
      setDiscount(0);
      setCouponMessage('An error occurred. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleAuthModalOpen = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthModalClose = () => {
    setIsAuthModalOpen(false);
  };

  const handleAuthSuccess = () => {
    setCustomerType('login'); // User is now authenticated
    toast.success('Great! You can now complete your booking.');
  };

  const handlePaymentProcess = async () => {
    setIsProcessing(true);

    try {
      // Validate required fields
      if (customerType === 'guest' || user) {
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim()) {
          toast.error('Please fill in all required contact information');
          setIsProcessing(false);
          return;
        }
      } else {
        toast.error('Please select a checkout option');
        setIsProcessing(false);
        return;
      }

      // Prepare booking data
      const bookingPayload = {
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          emergencyContact: formData.emergencyContact,
          specialRequests: formData.specialRequests,
        },
        cart: cart || [],
        pricing,
        paymentMethod: 'card',
        paymentDetails: {
          paymentIntentId, // Include the Stripe PaymentIntent ID
          cardholderName: formData.cardholderName,
        },
        userId: user?._id || user?.id,
        isGuest: !user,
        discountCode: discount > 0 ? promoCode : null,
      };

      // Call the checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success - show thank you page
        setOrderedItems([...(cart || [])]);
        setFinalPricing(pricing);
        setFinalCustomer(formData);
        setLastOrderId(result.bookingId || `ORD-${Date.now()}`);

        clearCart();
        setIsConfirmed(true);

        toast.success('Booking confirmed! Check your email for details.', { duration: 5000 });
      } else {
        toast.error(result.message || 'Booking failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment process error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (cart && cart.length === 0 && !isConfirmed) {
      router.push('/');
    }
  }, [cart, isConfirmed, router]);

  if (!cart) {
    return (
      <>
        <Header startSolid={true} />
        <main className="min-h-screen bg-slate-50 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center p-4">
            <h1 className="text-3xl font-bold mb-4">Loading your booking...</h1>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header startSolid={true} />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-20 sm:pt-24 pb-40 lg:pb-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div 
              key={isConfirmed ? 'thankyou' : 'checkout'} 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -12 }} 
              transition={{ duration: 0.45 }}
            >
              {isConfirmed ? (
                <ThankYouPage 
                  orderedItems={orderedItems} 
                  pricing={finalPricing} 
                  customer={finalCustomer} 
                  lastOrderId={lastOrderId} 
                  discount={discount} 
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 items-start">
                  <div className="lg:col-span-2 order-2 lg:order-1">
                    <CheckoutFormStep
                      onPaymentProcess={handlePaymentProcess}
                      isProcessing={isProcessing}
                      formData={formData}
                      setFormData={setFormData}
                      customerType={customerType}
                      setCustomerType={setCustomerType}
                      onAuthModalOpen={handleAuthModalOpen}
                      user={user}
                      pricing={pricing}
                      cart={cart}
                      promoCode={promoCode}
                      paymentIntentId={paymentIntentId}
                      setPaymentIntentId={setPaymentIntentId}
                    />
                  </div>
                  <div className="lg:col-span-1 order-1 lg:order-2">
                    <BookingSummary
                      pricing={pricing}
                      promoCode={promoCode}
                      setPromoCode={setPromoCode}
                      applyPromoCode={handleApplyCoupon}
                      isProcessing={isProcessing}
                      isApplyingCoupon={isApplyingCoupon}
                      couponMessage={couponMessage}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {!isConfirmed && <TrustIndicators />}
        </div>
      </main>

      {!isConfirmed && cart && cart.length > 0 && (customerType === 'guest' || user) && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-600">Total price:</span>
            <span className="font-bold text-xl text-rose-600">{formatPrice(pricing.total)}</span>
          </div>
          <button 
            type="submit" 
            form="checkout-form" 
            disabled={isProcessing} 
            className="w-full py-3.5 bg-red-600 text-white font-bold text-base hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-md transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <span className="inline-flex items-center justify-center gap-2"><Lock size={16} /> Complete Booking & Pay</span>}
          </button>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthModalClose}
        initialMode={authModalMode}
        onSuccess={handleAuthSuccess}
      />

      <Footer />
    </>
  );
}
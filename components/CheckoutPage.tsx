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
  X,
  CreditCard,
  CreditCardIcon,
  Ticket,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/types';
import toast from 'react-hot-toast';

// -------------------------------
// Small payment SVG icons (kept inline to avoid external imports)
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

// -------------------------------
// Small form input component
const FormInput = ({ label, name, type = 'text', placeholder, required = true, value, onChange, disabled = false, error }: any) => (
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
      className={`w-full bg-white border px-4 py-3 shadow-sm placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500 transition duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed ${
        error ? 'border-rose-500' : 'border-slate-300'
      }`}
    />
    {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
  </div>
);

// -------------------------------
// Summary Item (single cart item within BookingSummary)
const SummaryItem: React.FC<{ item: CartItem }> = ({ item }) => {
  const { formatPrice } = useSettings();
  const { removeFromCart } = useCart();
  return (
    <div className="flex gap-4 py-4">
      <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg">
        {item.image ? (
          <Image src={item.image} alt={item.title} width={64} height={64} className="w-16 h-16 object-cover" />
        ) : (
          <div className="w-16 h-16 bg-slate-100" />
        )}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-md text-slate-800 leading-tight">{item.title}</h4>
        <p className="text-sm text-slate-500 mt-1">{item.details}</p>
        <p className="text-xs text-slate-500">
          {item.quantity} Adult{item.quantity > 1 ? 's' : ''} {item.childQuantity > 0 ? `, ${item.childQuantity} Child${item.childQuantity > 1 ? 'ren' : ''}` : ''}
        </p>
        {item.selectedAddOns && Object.keys(item.selectedAddOns).length > 0 && (
          <div className="text-xs text-slate-500 mt-2 pl-3 border-l-2 border-slate-200">
            <strong>Add-ons:</strong> {Object.keys(item.selectedAddOns).join(', ')}
          </div>
        )}
      </div>
      <div className="text-right flex flex-col justify-between items-end">
        <p className="font-bold text-lg text-slate-800">{formatPrice(Number(item.totalPrice ?? (item.discountPrice ?? 0) * (item.quantity ?? 1)))}</p>
        <button onClick={() => removeFromCart(item.uniqueId!)} className="text-slate-400 hover:text-red-500 transition-colors" aria-label="Remove item">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// -------------------------------
// Booking Summary (right column)
const BookingSummary = ({ pricing, promoCode, setPromoCode, applyPromoCode, isProcessing }: any) => {
  const { formatPrice } = useSettings();
  const { cart } = useCart();

  if (!cart || cart.length === 0) return null;

  return (
    <aside className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl sticky top-28">
      <h3 className="text-2xl font-bold text-slate-900 mb-6">Your Booking Summary</h3>
      <div className="divide-y divide-slate-200">
        {cart.map((item, index) => (
          <SummaryItem key={`${item._id ?? item.uniqueId}-${index}`} item={item} />
        ))}
      </div>

      <div className="mt-6">
        <h4 className="font-bold text-slate-800 mb-3">Pricing Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatPrice(pricing.subtotal)}</span></div>
          <div className="flex justify-between text-slate-600"><span>Service fee</span><span>{formatPrice(pricing.serviceFee)}</span></div>
          <div className="flex justify-between text-slate-600"><span>Taxes & fees</span><span>{formatPrice(pricing.tax)}</span></div>
          {pricing.discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Discount</span>
              <span>-{formatPrice(pricing.discount)}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center text-lg font-bold">
            <p className="text-slate-900">Total</p>
            <p className="text-rose-600">{formatPrice(pricing.total)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-6">
        <h4 className="font-bold text-slate-800 mb-3">Have a promo code?</h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter code here"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition"
          />
          <button onClick={applyPromoCode} type="button" className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition">
            Apply
          </button>
        </div>
      </div>

      <div className="mt-8 hidden lg:block">
        <button
          type="submit"
          form="checkout-form"
          disabled={isProcessing}
          className="w-full py-4 bg-red-600 text-white font-extrabold text-lg hover:bg-red-700 rounded-xl active:translate-y-[1px] transform-gpu shadow-lg transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><Lock size={18} /> Complete Booking & Pay</>}
        </button>
        <p className="text-xs text-slate-500 text-center mt-4">
          By completing this booking you agree to our <a className="underline text-slate-700" href="/terms">Terms of Service</a>.
        </p>
      </div>
    </aside>
  );
};

// -------------------------------
// Checkout Form Step
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

const CheckoutFormStep = ({ onPaymentProcess, isProcessing, formData, setFormData }: { onPaymentProcess: () => void; isProcessing: boolean; formData: FormDataShape; setFormData: (v: FormDataShape) => void }) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card');
  const [errors, setErrors] = useState<Partial<Record<keyof FormDataShape, string>>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof FormDataShape, string>> = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required.';
    if (!formData.lastName) newErrors.lastName = 'Last name is required.';
    if (!formData.email) newErrors.email = 'Email address is required.';
    if (!formData.phone) newErrors.phone = 'Phone number is required.';
    // Add more validation rules here
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onPaymentProcess();
    } else {
      toast.error('Please fill in all required fields.');
    }
  };

  return (
    <form onSubmit={handleSubmit} id="checkout-form" className="bg-white p-8 rounded-xl shadow-xl space-y-8 border border-slate-200">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-extrabold text-slate-900">Contact Information</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500"><Shield size={14} className="text-emerald-500" /> <span>Secure &amp; encrypted</span></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="First Name" name="firstName" placeholder="Enter your first name" value={formData.firstName} onChange={handleInputChange} disabled={isProcessing} error={errors.firstName} />
          <FormInput label="Last Name" name="lastName" placeholder="Enter your last name" value={formData.lastName} onChange={handleInputChange} disabled={isProcessing} error={errors.lastName} />
          <FormInput label="Email Address" name="email" type="email" placeholder="Enter your email address" value={formData.email} onChange={handleInputChange} disabled={isProcessing} error={errors.email} />
          <FormInput label="Phone Number" name="phone" type="tel" placeholder="Enter your phone number" value={formData.phone} onChange={handleInputChange} disabled={isProcessing} error={errors.phone} />
          <div className="md:col-span-2">
            <FormInput label="Emergency Contact (optional)" name="emergencyContact" placeholder="Name and phone number" required={false} value={formData.emergencyContact} onChange={handleInputChange} disabled={isProcessing} error={errors.emergencyContact} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Special Requests</label>
            <textarea name="specialRequests" value={formData.specialRequests} onChange={handleInputChange} placeholder="Any special requirements, dietary restrictions, etc..." rows={4} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500 transition disabled:bg-slate-100" disabled={isProcessing} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Payment Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.button
            type="button"
            onClick={() => setPaymentMethod('card')}
            aria-pressed={paymentMethod === 'card'}
            whileTap={{ scale: 0.98 }}
            className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-all ${paymentMethod === 'card' ? 'bg-red-50 border-red-500 shadow-md' : 'bg-white border-slate-200 hover:shadow-sm'}`}
          >
          <div className="h-10 flex items-center gap-2">
  <Image src="/payment/visam.png" alt="Card logos" width={72} height={28} className="object-contain" />
</div>

            <span className="text-sm font-semibold text-slate-700">Credit/Debit Card</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setPaymentMethod('paypal')}
            aria-pressed={paymentMethod === 'paypal'}
            whileTap={{ scale: 0.98 }}
            className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-all ${paymentMethod === 'paypal' ? 'bg-red-50 border-red-500 shadow-md' : 'bg-white border-slate-200 hover:shadow-sm'}`}
          >
          <div className="h-10 flex items-center">
  <Image src="/payment/paypal.png" alt="PayPal" width={48} height={30} className="object-contain" />
</div>

            <span className="text-sm font-semibold text-slate-700">PayPal</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setPaymentMethod('bank')}
            aria-pressed={paymentMethod === 'bank'}
            whileTap={{ scale: 0.98 }}
            className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-all ${paymentMethod === 'bank' ? 'bg-red-50 border-red-500 shadow-md' : 'bg-white border-slate-200 hover:shadow-sm'}`}
          >
          <div className="h-10 flex items-center">
  <Image src="/payment/bank.png" alt="Bank transfer" width={48} height={30} className="object-contain" />
</div>

            <span className="text-sm font-semibold text-slate-700">Bank Transfer</span>
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={paymentMethod} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {paymentMethod === 'card' && (
              <div className="space-y-4 p-6 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="grid grid-cols-1 gap-4">
                  <FormInput label="Cardholder Name" name="cardholderName" placeholder="John M. Doe" value={formData.cardholderName} onChange={handleInputChange} disabled={isProcessing} error={errors.cardholderName} />
                  <FormInput label="Card Number" name="cardNumber" placeholder="1234 5678 9012 3456" value={formData.cardNumber} onChange={handleInputChange} disabled={isProcessing} error={errors.cardNumber} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Expiry Date" name="expiryDate" placeholder="MM / YY" value={formData.expiryDate} onChange={handleInputChange} disabled={isProcessing} error={errors.expiryDate} />
                  <FormInput label="CVV" name="cvv" placeholder="123" value={formData.cvv} onChange={handleInputChange} disabled={isProcessing} error={errors.cvv} />
                </div>
              </div>
            )}
            {paymentMethod === 'paypal' && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-700">
                <p className="font-medium">You will be redirected to PayPal to complete your payment securely.</p>
              </div>
            )}
            {paymentMethod === 'bank' && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-700">
                <p className="font-medium">Please follow the instructions in the confirmation email to complete your bank transfer.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </form>
  );
};

// -------------------------------
// Thank You page (show after confirmation) - receives everything it needs from props
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

      // Normalize ordered items for the PDF payload
      const orderedItemsForPdf = orderedItems.map((it) => {
        const qty = Number(it.quantity ?? 1);
        const price = Number(it.price ?? 0);
        const discountPrice = it.discountPrice != null ? Number(it.discountPrice) : undefined;
        const finalPrice = it.finalPrice != null ? Number(it.finalPrice) : (discountPrice ?? price);
        const totalPrice = Number((finalPrice * qty).toFixed(2));
        return {
          _id: it._id,
          title: it.title,
          image: it.image,
          price,
          discountPrice: discountPrice ?? 0,
          finalPrice,
          quantity: qty,
          totalPrice,
          details: it.details ?? '',
          addOns: it.addOns ?? [],
        };
      });

      const subtotal = Number(orderedItemsForPdf.reduce((s, it) => s + it.totalPrice, 0).toFixed(2));
      const serviceFee = Number((subtotal * 0.03).toFixed(2));
      const tax = Number((subtotal * 0.05).toFixed(2));
      const discountAmount = Number((discount || 0).toFixed(2));
      const total = Number((subtotal + serviceFee + tax - discountAmount).toFixed(2));

      const pricingForPdf = {
        subtotal,
        serviceFee,
        tax,
        discount: discountAmount,
        total,
        currency: pricing?.currency ?? 'USD',
        symbol: pricing?.symbol ?? '$',
      };

      // Build customer
      const customerForPdf = {
        name: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Guest',
        email: customer?.email,
        phone: customer?.phone,
      };

      // Minimal booking details (you can expand if you pass booking-related props)
      const bookingForPdf = {
        date: (customer as any)?.expiryDate ?? undefined,
        guests: orderedItemsForPdf.reduce((s, it) => s + (it.quantity || 1), 0),
        specialRequests: (customer as any)?.specialRequests ?? '',
      };

      const qrData = `https://your-site.example.com/booking/${orderId}`;

      const payload = {
        orderId,
        customer: customerForPdf,
        orderedItems: orderedItemsForPdf,
        pricing: pricingForPdf,
        booking: bookingForPdf,
        qrData,
        notes: (customer as any)?.specialRequests || 'Receipt requested from Thank You page',
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 shadow-xl max-w-3xl mx-auto text-center border border-slate-200 rounded-xl">
      <div className="mx-auto w-fit mb-6 p-4 bg-emerald-100 rounded-full">
        <CheckCircle size={48} className="text-emerald-600" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Thank you — your booking is confirmed!</h1>
      <p className="text-slate-600 mb-6">We've sent a booking confirmation and receipt to your email address.</p>

      <div className="text-left bg-slate-50 p-6 border border-slate-200 mb-6 rounded-xl">
        <h3 className="font-bold text-lg text-slate-800 mb-4">Your Receipt</h3>
        <div className="space-y-3 mb-4 divide-y divide-slate-200">
          {orderedItems.map((item, index) => (
            <div key={`${item._id ?? index}-${index}`} className="flex items-center justify-between pt-3 first:pt-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 overflow-hidden rounded-lg">
                  {item.image ? <Image src={item.image} alt={item.title} width={48} height={48} className="object-cover" /> : <div className="w-12 h-12 bg-slate-100" />}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.quantity} Adult{item.quantity > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="text-slate-700 font-medium">{formatPrice(Number((item.discountPrice ?? item.totalPrice ?? 0)))}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-3 space-y-1">
          <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatPrice(pricing.subtotal)}</span></div>
          {pricing.discount > 0 && <div className="flex justify-between text-sm text-emerald-700"><span>Discount</span><span>-{formatPrice(pricing.discount)}</span></div>}
          <div className="flex justify-between text-sm text-slate-600"><span>Fees & Taxes</span><span>{formatPrice(pricing.serviceFee + pricing.tax)}</span></div>
          <div className="flex justify-between text-xl font-bold text-slate-900 mt-2"><span>Total Paid</span><span>{formatPrice(pricing.total)}</span></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button onClick={() => window.location.assign('/')} className="px-5 py-3 border border-slate-300 bg-white hover:bg-slate-50 transition-colors font-semibold rounded-lg text-sm">Go to homepage</button>
        <button onClick={handleDownloadReceipt} disabled={isDownloading} className="px-5 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-500 flex items-center gap-2 text-sm">
          {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
          Download PDF
        </button>
        <button onClick={() => window.print()} className="px-5 py-3 border border-slate-300 bg-white hover:bg-slate-50 transition-colors font-semibold rounded-lg flex items-center gap-2 text-sm">
          <Printer size={18} /> Print
        </button>
      </div>
    </motion.div>
  );
};

// -------------------------------
// Trust Indicators
const TrustIndicators = () => (
  <div className="flex flex-col sm:flex-row justify-center items-center gap-6 md:gap-12 py-8 mt-12 border-t border-slate-200">
    <div className="flex items-center gap-2 text-slate-600"><Shield size={20} className="text-emerald-600" /><span>Easy and secure booking</span></div>
    <div className="flex items-center gap-2 text-slate-600"><Smartphone size={20} className="text-rose-600" /><span>Ticket available on smartphone</span></div>
    <div className="flex items-center gap-2 text-slate-600"><Headphones size={20} className="text-slate-900" /><span>Excellent customer service</span></div>
  </div>
);

// -------------------------------
// Main Checkout Page Component (default export)
export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { formatPrice, selectedCurrency } = useSettings();
  const router = useRouter();

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
  const [finalPricing, setFinalPricing] = useState<any>(null);
  const [finalCustomer, setFinalCustomer] = useState<FormDataShape | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [lastOrderId, setLastOrderId] = useState<string | undefined>(undefined);

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
    const subtotal = Number(((cart || []).reduce((acc, item) => acc + Number(item.totalPrice ?? (Number(item.discountPrice ?? 0) * Number(item.quantity ?? 1))), 0)).toFixed(2));
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

  const applyPromoCode = () => {
    if (promoCode.trim().toUpperCase() === 'SALE10') {
      setDiscount(Math.round(pricing.subtotal * 0.10 * 100) / 100);
      toast.success('Promo code applied successfully!');
    } else {
      setDiscount(0);
      toast.error('Invalid promo code.');
    }
  };

  const handlePaymentProcess = async () => {
    setIsProcessing(true);
    try {
      // Mock processing delay — replace with your real payment flow
      await new Promise((res) => setTimeout(res, 2000));
      const createdOrderId = `ORD-${Date.now()}`;

      // Save final state used by ThankYouPage
      setOrderedItems([...(cart || [])]);
      setFinalPricing(pricing);
      setFinalCustomer(formData);
      setLastOrderId(createdOrderId);

      // Clear cart and show confirmation
      clearCart();
      setIsConfirmed(true);
    } catch (err) {
      console.error('Payment flow error:', err);
      toast.error('Payment failed. Please try again.');
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
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-24 pb-40 lg:pb-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div key={isConfirmed ? 'thankyou' : 'checkout'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45 }}>
              {isConfirmed ? (
                <ThankYouPage orderedItems={orderedItems} pricing={finalPricing} customer={finalCustomer} lastOrderId={lastOrderId} discount={discount} />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                  <div className="lg:col-span-2">
                    <CheckoutFormStep onPaymentProcess={handlePaymentProcess} isProcessing={isProcessing} formData={formData} setFormData={setFormData} />
                  </div>
                  <div className="lg:col-span-1">
                    <BookingSummary pricing={pricing} promoCode={promoCode} setPromoCode={setPromoCode} applyPromoCode={applyPromoCode} isProcessing={isProcessing} />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {!isConfirmed && <TrustIndicators />}
        </div>
      </main>

      {!isConfirmed && cart && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-600">Total price:</span>
            <span className="font-bold text-xl text-rose-600">{formatPrice(pricing.total)}</span>
          </div>
          <button type="submit" form="checkout-form" disabled={isProcessing} className="w-full py-3.5 bg-red-600 text-white font-bold text-base hover:bg-red-700 rounded-lg active:translate-y-[1px] transform-gpu shadow-md transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><Lock size={16} /> Complete Booking & Pay</>}
          </button>
        </div>
      )}

      <Footer />
    </>
  );
}
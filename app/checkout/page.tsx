'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, Shield, CheckCircle, CalendarDays, User, Trash2, Smartphone, Headphones, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/types';

// Replace VisaIcon with this exact SVG component
const VisaIcon = ({ className = '', width = 48, height = 28 }: { className?: string; width?: number; height?: number }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 48 28"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <rect width="48" height="28" rx="4" fill="#1A1F71"/>
    {/* Stylized VISA wordmark (simplified vector shapes for crisp rendering) */}
    <path d="M11.2 19.6h2.1l2.1-11.2H13L11.2 19.6zM18.9 8.4c-1.15 0-2.05.55-2.6 1.3l-.5-1.9h-2.9l-1.9 11.2h2.4l.7-3.9c.65-.35 1.45-.55 2.3-.55 3.15 0 5.15-2.2 5.7-5.15.35-1.55.05-2.75-.65-3.45-.8-.8-1.95-1.2-3.45-1.2zM28.3 16.1c-.25 1.45-1.3 2.45-2.8 2.45-.7 0-1.2-.25-1.6-.8-.35-.6-.3-1.25-.05-2 .25-1.45 1.3-2.45 2.8-2.45.7 0 1.2.25 1.6.8.35.6.3 1.25.05 2z" fill="#fff"/>
    {/* Fallback text for accessibility (visually hidden by default) */}
    <text x="6" y="23" fill="transparent" fontSize="8" fontFamily="Arial, sans-serif" fontWeight="700">VISA</text>
  </svg>
);


const MastercardIcon = ({ className = '', width = 48, height = 28 }: { className?: string; width?: number; height?: number }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 48 28"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <rect width="48" height="28" rx="4" fill="#fff" stroke="#e6e7ea"/>
    <g transform="translate(8,4)">
      <circle cx="10" cy="10" r="8" fill="#EB001B" />
      <circle cx="22" cy="10" r="8" fill="#F79E1B" />
      <path d="M16 2c1.6 1.3 2.6 3.2 2.6 5.2 0 2-1 3.9-2.6 5.2-1.6-1.3-2.6-3.2-2.6-5.2C13.4 5.2 14.4 3.3 16 2z" fill="#FF5F00"/>
    </g>
  </svg>
);


// AmexIcon — paste above CheckoutFormStep
const AmexIcon = ({ className = '', width = 48, height = 28 }: { className?: string; width?: number; height?: number }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 48 28"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <rect width="48" height="28" rx="4" fill="#006FCF"/>
    <g transform="translate(4,6)" fill="#fff">
      <path d="M2 2h6l1 2 1-2h6v8h-3v-4l-1 2h-2l-1-2v4H2V2z" />
      <path d="M14 2h8v2h-5v1h4v2h-4v1h5v2h-8v-8z" />
      <path d="M26 2h4l3 5v-5h3v8h-4l-3-5v5h-3v-8z" />
    </g>
  </svg>
);
// Replace PayPalIcon with this exact SVG component (increased default size)
const PayPalIcon = ({ className = '', width = 36, height = 24 }: { className?: string; width?: number; height?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 36 24"
    aria-hidden="true"
    className={className}
  >
    {/* Background shapes removed — keep logo just the mark for clean UI */}
    <g fill="none" fillRule="evenodd">
      <path fill="#003087" d="M11.9 1.2H6.4C5.8 1.2 5.3 1.6 5.1 2.2L2 14.6c-.1.4.2.8.6.8h3.1l-.2 1.3c-.1.4.2.8.6.8h2.4c.4 0 .8-.3.9-.7l.5-3.1.1-.6c.1-.4.4-.7.8-.7h1.1c3 0 5.4-1.1 6.5-3.7.4-1 .4-2.1.1-3.1-.3-1.4-1.1-2.4-2.1-3.1-.4-.2-.8-.4-1.2-.5-1.2-.3-2.6-.3-4.1-.3z"/>
      <path fill="#009CDE" d="M6.7 16.3h2.1c.4 0 .8-.3.9-.7l.5-3.1c.1-.4.4-.7.8-.7h1.1c2.9 0 5-1.1 5.7-3.9.2-1 .1-1.9-.3-2.7.8.5 1.3 1.4 1.5 2.6.3 1.5.2 2.7-.4 3.9-.9 1.9-2.8 3.3-5.6 3.7H9.3c-.6 0-1 .4-1.1 1l-.2 1.3z"/>
      <path fill="#112E51" d="M9.8 6.2h3.9c1 0 1.8.2 2.3.6.2.1.4.3.6.5.2.2.3.5.4.8.1.4.1.9-.1 1.4-.6 2-2.3 3.2-5.2 3.2H9.3c-.6 0-1 .4-1.1 1l-.2 1.3h3.4l-.2 1.3H7.2L9.8 6.2z"/>
    </g>
  </svg>
);


// --- Reusable Input Component ---
const FormInput = ({ label, name, type = 'text', placeholder, required = true, value, onChange, disabled = false }: any) => (
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
            disabled={disabled}
            className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 px-4 py-3 rounded-xl shadow-sm placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
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
const BookingSummary = ({ pricing, promoCode, setPromoCode, applyPromoCode, isProcessing }: any) => {
    const { formatPrice } = useSettings();
    const { cart } = useCart();

    if (!cart || cart.length === 0) return null;

    return (
        <aside className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-100 p-6 shadow-lg sticky top-28">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Your Booking Summary</h3>
            <div className="divide-y divide-slate-200">
                {cart.map((item, index) => (
                    <SummaryItem key={`${item._id}-${index}`} item={item} />
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
                <button type="submit" form="checkout-form" disabled={isProcessing} className="w-full rounded-2xl py-4 bg-red-600 text-white font-extrabold text-lg hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-md transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center">
                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <span className="inline-flex items-center justify-center gap-2"><Lock size={18} /> Complete Booking & Pay</span>}
                </button>
                <p className="text-xs text-slate-500 text-center mt-3">By completing this booking you agree to our <a className="underline" href="/terms">Terms of Service</a>.</p>
            </div>
        </aside>
    );
};

// --- Checkout Form Step (now controlled via props) ---
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPaymentProcess();
    };

    const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' >('card');

    return (
        <form onSubmit={handleSubmit} id="checkout-form" className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-100 p-8 shadow-md space-y-8">
            <section>
                <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-extrabold text-slate-900">Contact Information</h2><div className="flex items-center gap-2 text-sm text-slate-500"><Shield size={14} className="text-emerald-500" /> <span>Secure &amp; encrypted</span></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="First Name" name="firstName" placeholder="Enter your first name" value={formData.firstName} onChange={handleInputChange} disabled={isProcessing}/>
                    <FormInput label="Last Name" name="lastName" placeholder="Enter your last name" value={formData.lastName} onChange={handleInputChange} disabled={isProcessing}/>
                    <FormInput label="Email Address" name="email" type="email" placeholder="Enter your email address" value={formData.email} onChange={handleInputChange} disabled={isProcessing}/>
                    <FormInput label="Phone Number" name="phone" type="tel" placeholder="Enter your phone number" value={formData.phone} onChange={handleInputChange} disabled={isProcessing}/>
                    <div className="md:col-span-2"><FormInput label="Emergency Contact (optional)" name="emergencyContact" placeholder="Name and phone number" required={false} value={formData.emergencyContact} onChange={handleInputChange} disabled={isProcessing}/></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">Special Requests</label><textarea name="specialRequests" value={formData.specialRequests} onChange={handleInputChange} placeholder="Any special requirements, dietary restrictions, etc..." rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus-visible:ring-2 focus-visible:ring-red-500" disabled={isProcessing}/></div>
                </div>
            </section>
            <section>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Payment Information</h2>
              <div className="grid grid-cols-3 gap-3 mb-6">
  {/* Card option */}
  <button
    type="button"
    onClick={() => setPaymentMethod('card')}
    aria-pressed={paymentMethod === 'card'}
    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-shadow ${
      paymentMethod === 'card'
        ? 'bg-red-50 border-red-200 shadow-sm'
        : 'bg-white border-slate-100 hover:shadow-sm'
    }`}
  >
    <Image
      src="/visam.png"
      alt="Credit & debit cards"
      width={144}
      height={40}
      className="h-10 w-auto object-contain"
    />
    <span className="text-sm font-medium text-slate-700">Card</span>
  </button>

  {/* PayPal option */}
  <button
    type="button"
    onClick={() => setPaymentMethod('paypal')}
    aria-pressed={paymentMethod === 'paypal'}
    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-shadow ${
      paymentMethod === 'paypal'
        ? 'bg-red-50 border-red-200 shadow-sm'
        : 'bg-white border-slate-100 hover:shadow-sm'
    }`}
  >
    <Image
      src="/paypal.png"
      alt="PayPal"
      width={144}
      height={40}
      className="h-10 w-auto object-contain"
    />
  </button>

  {/* Bank Transfer option */}
  <button
    type="button"
    onClick={() => setPaymentMethod('bank')}
    aria-pressed={paymentMethod === 'bank'}
    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-shadow ${
      paymentMethod === 'bank'
        ? 'bg-red-50 border-red-200 shadow-sm'
        : 'bg-white border-slate-100 hover:shadow-sm'
    }`}
  >
    <Image
      src="/bank.png"
      alt="Bank Transfer"
      width={144}
      height={40}
      className="h-10 w-auto object-contain"
    />
    <span className="text-sm font-medium text-slate-700">Bank Transfer</span>
  </button>
</div>

                <AnimatePresence mode="wait">
                    <motion.div key={paymentMethod} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                        {paymentMethod === 'card' && (<div className="space-y-4 p-6 bg-slate-50 rounded-xl border border-slate-100"><div className="grid grid-cols-1 gap-4"><FormInput label="Cardholder Name" name="cardholderName" placeholder="John M. Doe" value={formData.cardholderName} onChange={handleInputChange} disabled={isProcessing}/><FormInput label="Card Number" name="cardNumber" placeholder="1234 5678 9012 3456" value={formData.cardNumber} onChange={handleInputChange} disabled={isProcessing}/></div><div className="grid grid-cols-2 gap-4"><FormInput label="Expiry Date" name="expiryDate" placeholder="MM / YY" value={formData.expiryDate} onChange={handleInputChange} disabled={isProcessing}/><FormInput label="CVV" name="cvv" placeholder="123" value={formData.cvv} onChange={handleInputChange} disabled={isProcessing}/></div></div>)}
                        {paymentMethod === 'paypal' && (<div className="rounded-xl p-6 bg-slate-50 border border-slate-100 text-center text-slate-700"><p className="font-medium">You will be redirected to PayPal to complete your payment securely.</p></div>)}
                    </motion.div>
                </AnimatePresence>
            </section>
        </form>
    );
};

// --- Thank You Page ---
const ThankYouPage = ({ orderedItems, pricing, lastOrderId }: { orderedItems: CartItem[], pricing: any, lastOrderId?: string }) => {
    const { formatPrice } = useSettings();
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 shadow-xl max-w-3xl mx-auto text-center">
            <div className="mx-auto w-fit mb-6 p-4 rounded-full bg-emerald-100"><CheckCircle size={48} className="text-emerald-600" /></div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Thank you — your booking is confirmed!</h1>
            <p className="text-slate-600 mb-6">We've sent a booking confirmation and receipt to your email address.</p>
            
            <div className="text-left bg-slate-50 rounded-xl p-6 border border-slate-100 mb-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Your Receipt</h3>
                <div className="space-y-3 mb-4 divide-y divide-slate-200">
                    {orderedItems.map((item, index) => (
                        <div key={`${item._id}-${index}`} className="flex items-center justify-between pt-3 first:pt-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden">
                                    <Image src={item.image!} alt={item.title} width={48} height={48} className="object-cover"/>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">{item.title}</p>
                                    <p className="text-sm text-slate-500">{item.quantity} Adult{item.quantity > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <div className="text-slate-700 font-medium">{formatPrice((item.discountPrice) * item.quantity)}</div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-slate-200 pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatPrice(pricing.subtotal)}</span></div>
                    {pricing.discount > 0 && <div className="flex justify-between text-sm text-emerald-700"><span>Discount</span><span>-{formatPrice(pricing.discount)}</span></div>}
                    <div className="flex justify-between text-sm text-slate-600"><span>Fees & Taxes</span><span>{formatPrice(pricing.serviceFee + pricing.tax)}</span></div>
                    <div className="flex justify-between text-lg font-bold text-slate-900 mt-2"><span>Total Paid</span><span>{formatPrice(pricing.total)}</span></div>
                </div>
            </div>

            <div className="flex justify-center gap-3">
                <button onClick={() => window.location.assign('/')} className="px-5 py-2 rounded-xl border border-slate-200 hover:shadow-sm">Go to homepage</button>

                <button
                  onClick={async () => {
                    try {
                      // If we have lastOrderId and server stored that PDF (or regenerates), use it.
                      // We'll regenerate on-demand with the same data in the UI.
                      const orderId = lastOrderId ?? `ORD-${Date.now()}`;
                      const payload = {
                        orderId,
                        customer: { name: '', email: '', phone: '' },
                        orderedItems,
                        pricing,
                        notes: 'Receipt requested from Thank You page'
                      };

                      const res = await fetch('/api/checkout/receipt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });

                     if (!res.ok) {
  const text = await res.text().catch(() => '<no body>');
  console.error('Failed to get receipt:', res.status, text);
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
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white"
                >
                  Download receipt
                </button>

                <button onClick={() => window.print()} className="px-5 py-2 rounded-xl border border-slate-200 hover:shadow-sm">Print</button>
            </div>
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
    const { cart, clearCart } = useCart();
    const { formatPrice } = useSettings();
    const router = useRouter();
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
    const [finalPricing, setFinalPricing] = useState<any>(null);
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [lastOrderId, setLastOrderId] = useState<string | undefined>(undefined);

    // Controlled form state lifted to parent so we can include customer data in receipt payload
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

    // ---------- NEW: handlePaymentProcess implemented to call receipt API ----------
    const handlePaymentProcess = async () => {
        setIsProcessing(true);

        try {
            // Simulate payment delay (keep your current UX)
            await new Promise((res) => setTimeout(res, 2000));

            // finalize order data
            const createdOrderId = `ORD-${Date.now()}`;
            const payload = {
              orderId: createdOrderId,
              customer: {
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email,
                phone: formData.phone
              },
              orderedItems: cart || [],
              pricing: pricing,
              notes: 'Booking created via website'
            };

            // Update UI state
            setOrderedItems([...(cart || [])]);
            setFinalPricing(pricing);
            setLastOrderId(createdOrderId);

            // Clear cart and show thank you state
            clearCart();
            setIsConfirmed(true);
            setIsProcessing(false);

            // Request PDF from server and download it
            const res = await fetch('/api/checkout/receipt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              // If PDF generation failed, log for debugging and optionally inform the user
console.error('Receipt API failed', res.status, await res.text().catch(() => '<no body>'));
              return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `receipt-${createdOrderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error('Payment / Receipt flow error:', err);
            setIsProcessing(false);
            // Optionally show error notification/toast here
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
                                <ThankYouPage orderedItems={orderedItems} pricing={finalPricing} lastOrderId={lastOrderId} />
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                                    <div className="lg:col-span-2">
                                        <CheckoutFormStep onPaymentProcess={handlePaymentProcess} isProcessing={isProcessing} formData={formData} setFormData={setFormData} />
                                    </div>
                                    <div className="lg:col-span-1">
                                        <BookingSummary
                                            pricing={pricing}
                                            promoCode={promoCode}
                                            setPromoCode={setPromoCode}
                                            applyPromoCode={applyPromoCode}
                                            isProcessing={isProcessing}
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                    {!isConfirmed && <TrustIndicators />}
                </div>
            </main>

            {!isConfirmed && cart && cart.length > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 p-4 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-slate-600">Total price:</span>
                        <span className="font-bold text-xl text-rose-600">{formatPrice(pricing.total)}</span>
                    </div>
                    <button
                        type="submit"
                        form="checkout-form"
                        disabled={isProcessing}
                        className="w-full rounded-2xl py-3.5 bg-red-600 text-white font-bold text-base hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-md transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <span className="inline-flex items-center justify-center gap-2"><Lock size={16} /> Complete Booking & Pay</span>}
                    </button>
                </div>
            )}
            <Footer />
        </>
    );
}

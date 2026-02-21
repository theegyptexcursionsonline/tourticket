'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, Lock, ShieldCheck, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettings } from '@/hooks/useSettings';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  paymentCompleted: boolean;
  setPaymentCompleted: (value: boolean) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  clientSecret,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
  paymentCompleted,
  setPaymentCompleted,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async () => {
    // Prevent double submission
    if (!stripe || !elements || isProcessing || paymentCompleted) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Mark payment as completed IMMEDIATELY to prevent double-charge
        setPaymentCompleted(true);
        onSuccess(paymentIntent.id);
        // Note: Don't set isProcessing to false here - keep button disabled
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        // Payment is still processing
        toast.loading('Payment is being processed...', { duration: 5000 });
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      onError(err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  // If payment already completed, show success state
  if (paymentCompleted) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="text-green-800 font-semibold text-lg">Payment Successful!</p>
          <p className="text-green-600 text-sm mt-1">Creating your booking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      <button
        type="button"
        disabled={!stripe || isProcessing || paymentCompleted}
        onClick={handleSubmit}
        className="w-full py-4 bg-red-600 text-white font-extrabold text-lg hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-md transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
          <Loader2 className="animate-spin" size={24} />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <Lock size={18} />
            <span>Complete Payment</span>
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </div>
  );
};

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    emergencyContact?: string;
    hotelPickupDetails?: string;
    hotelPickupLocation?: {
      address?: string;
      lat: number;
      lng: number;
      placeId?: string;
      name?: string;
    } | null;
    specialRequests?: string;
  };
  cart: any[];
  pricing: any;
  discountCode?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  currency,
  customer,
  cart,
  pricing,
  discountCode,
  onSuccess,
  onError,
}) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  
  // Use settings for consistent price formatting with currency conversion
  const { formatPrice, selectedCurrency } = useSettings();
  
  // Check if display currency is different from charge currency (USD)
  const isDisplayCurrencyDifferent = selectedCurrency.code !== 'USD';
  
  // Use refs to track if we've already created a payment intent for this cart
  const paymentIntentCreatedRef = useRef(false);
  const lastCartHashRef = useRef<string>('');
  
  // Generate a hash of cart items to detect real changes (includes add-ons + booking option + children)
  const getCartHash = useCallback((cartItems: any[], pricingData: any, discount?: string) => {
    const normalizeQty = (v: any) => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') return Number(v) || 0;
      if (v && typeof v === 'object') return normalizeQty(v.quantity ?? v.qty ?? v.count);
      return 0;
    };

    const stableAddOns = (item: any) => {
      const addOns = item?.selectedAddOns;
      if (!addOns) return '';
      // selectedAddOns can be object or array; we only hash ids + numeric qty
      if (Array.isArray(addOns)) {
        return addOns
          .map((a: any) => `${a?.id}:${normalizeQty(a?.quantity)}`)
          .sort()
          .join(',');
      }
      if (typeof addOns === 'object') {
        return Object.entries(addOns)
          .map(([id, q]) => `${id}:${normalizeQty(q)}`)
          .sort()
          .join(',');
      }
      return '';
    };

    const cartSig = (cartItems || []).map((item) => {
      const id = item._id || item.id;
      const date = item.selectedDate || '';
      const time = item.selectedTime || '';
      const adults = normalizeQty(item.quantity || 0);
      const children = normalizeQty(item.childQuantity || 0);
      const infants = normalizeQty(item.infantQuantity || 0);
      const bookingOption = item.selectedBookingOption?.id || '';
      const addOnsSig = stableAddOns(item);
      return `${id}|${date}|${time}|a${adults}|c${children}|n${infants}|bo${bookingOption}|ao${addOnsSig}`;
    }).join('||');

    return `${cartSig}::${(pricingData?.currency || currency || 'USD').toUpperCase()}::${pricingData?.total || 0}::${discount || ''}`;
  }, [currency]);

  // Helper function to validate email format
  const isValidEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  useEffect(() => {
    // If payment already completed, don't create new intents
    if (paymentCompleted) {
      return;
    }

    // Validate customer data before creating PaymentIntent
    if (!customer.email || !customer.firstName || !customer.lastName) {
      setIsLoading(false);
      return;
    }

    // Validate email format
    if (!isValidEmail(customer.email)) {
      setIsLoading(false);
      return;
    }

    // Validate cart has items
    if (!cart || cart.length === 0) {
      setIsLoading(false);
      return;
    }

    // Validate pricing
    if (!pricing || pricing.total <= 0) {
      setIsLoading(false);
      return;
    }

    // Check if cart/pricing has actually changed
    const currentCartHash = getCartHash(cart, pricing, discountCode);
    
    // If we already have a payment intent and cart hasn't changed, don't create another
    if (paymentIntentCreatedRef.current && clientSecret && lastCartHashRef.current === currentCartHash) {
      setIsLoading(false);
      return;
    }

    // Debounce payment intent creation
    const timeoutId = setTimeout(() => {
      const createPaymentIntent = async () => {
        // Double-check we haven't created one already (race condition protection)
        if (paymentIntentCreatedRef.current && lastCartHashRef.current === currentCartHash && clientSecret) {
          setIsLoading(false);
          return;
        }

        try {
          const response = await fetch('/api/checkout/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer,
              pricing,
              cart,
              discountCode,
              // Send existing payment intent ID if we have one (for update instead of create)
              existingPaymentIntentId: paymentIntentId || undefined,
            }),
          });

          const data = await response.json();

          if (data.success && data.clientSecret) {
            setClientSecret(data.clientSecret);
            setPaymentIntentId(data.paymentIntentId);
            paymentIntentCreatedRef.current = true;
            lastCartHashRef.current = currentCartHash;
          } else {
            console.error('Failed to create payment intent:', data.message);
            onError(data.message || 'Failed to initialize payment');
          }
        } catch (error) {
          console.error('Error creating payment intent:', error);
          onError('Failed to initialize payment');
        } finally {
          setIsLoading(false);
        }
      };

      createPaymentIntent();
    }, 1500); // Increased debounce to 1.5 seconds

    return () => clearTimeout(timeoutId);
  }, [customer.email, customer.firstName, customer.lastName, cart, pricing, discountCode, getCartHash, isValidEmail, onError, paymentCompleted, clientSecret, paymentIntentId]);

  if (isLoading) {
    return (
      <div className="bg-white/80 border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <Loader2 className="animate-spin text-red-600" size={28} />
        </div>
        <p className="text-lg font-semibold text-slate-900">Preparing secure payment</p>
        <p className="text-sm text-slate-500 max-w-sm">
          Please wait while we create a secure connection with our payment partner.
        </p>
      </div>
    );
  }

  // Show message if customer data is incomplete or invalid
  if (!customer.email || !customer.firstName || !customer.lastName || !isValidEmail(customer.email)) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center gap-3">
          <Lock size={20} className="text-emerald-400" />
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Secure Checkout</p>
            <p className="text-lg font-semibold">Contact details required</p>
          </div>
        </div>
        <div className="px-6 py-8 text-center space-y-3">
          <p className="text-base text-slate-600">
            {!customer.email || !customer.firstName || !customer.lastName
              ? 'Please complete your contact information above to unlock payment.'
              : 'Please enter a valid email address to continue with payment.'}
          </p>
          <p className="text-sm text-slate-400">We use your details to send booking confirmations and receipts.</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="bg-white border border-red-100 rounded-2xl shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-3 text-red-600 mb-3">
          <AlertCircle size={24} />
          <p className="font-semibold">Unable to initialize payment</p>
        </div>
        <p className="text-slate-600 text-sm mb-4">
          There was a problem connecting to our payment system. Please refresh the page and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#dc2626',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  // Use formatPrice for consistent currency conversion with the rest of the app
  const displayTotal = pricing?.total ?? amount ?? 0;
  const formattedTotal = formatPrice(displayTotal);
  const numberOfTours = cart?.length || 1;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 text-white px-6 py-6 md:px-8 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-300" />
            Secure Payment
          </p>
          <p className="text-3xl font-extrabold mt-2">{formattedTotal}</p>
          <p className="text-sm text-white/80">
            for {numberOfTours} {numberOfTours === 1 ? 'experience' : 'experiences'}
          </p>
          {isDisplayCurrencyDifferent && (
            <p className="text-xs text-white/60 mt-1">
              You will be charged ${(pricing?.total ?? amount ?? 0).toFixed(2)} USD
            </p>
          )}
        </div>
        <div className="space-y-2 text-sm text-white/90">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-emerald-300" />
            256-bit SSL encryption
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-300" />
            Fraud detection & buyer protection
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-8 space-y-6 bg-slate-50/60">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-slate-400" />
            <span>Visa</span>
            <span>Mastercard</span>
            <span>Amex</span>
            <span>Apple Pay</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wide">
            <CheckCircle2 size={16} />
            No hidden fees
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 md:p-6">
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              clientSecret={clientSecret}
              onSuccess={onSuccess}
              onError={onError}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              paymentCompleted={paymentCompleted}
              setPaymentCompleted={setPaymentCompleted}
            />
          </Elements>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-slate-400" />
            Your card is never stored on our servers
          </div>
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-slate-400" />
            Powered by Stripe
          </div>
        </div>

        {isDisplayCurrencyDifferent && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700">
              <strong>Currency Notice:</strong> Your payment will be processed in USD (${(pricing?.total ?? amount ?? 0).toFixed(2)}). 
              The displayed {selectedCurrency.code} amount is an estimate based on current exchange rates. 
              Your bank may apply additional conversion fees.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StripePaymentForm;

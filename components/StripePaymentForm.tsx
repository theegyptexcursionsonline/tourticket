'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettings } from '@/hooks/useSettings';
import { getErrorMessage, isRecord } from './componentTypes';
import { getOrCreateCheckoutAttemptId } from '@/lib/checkout/checkoutAttempt';
import {
  isAuthoritativePriceQuote,
  type AuthoritativePriceQuote,
} from '@/lib/cart/authoritativeCart';
import type { PaymentExperience } from '@/lib/checkout/paymentExperience';

interface CheckoutCartItem {
  _id?: string;
  id?: string;
  selectedDate?: string;
  selectedTime?: string;
  quantity?: unknown;
  childQuantity?: unknown;
  infantQuantity?: unknown;
  selectedBookingOption?: { id?: string; pricingKey?: string };
  guestPrices?: { adult?: number; child?: number; infant?: number };
  priceVersion?: number;
  priceExecutionId?: string | null;
  priceOverrideId?: string | null;
  priceSource?: 'catalogue' | 'override';
  selectedAddOns?: Record<string, unknown> | Array<{ id?: string; quantity?: unknown }>;
}

interface CheckoutPricing {
  currency?: string;
  total: number;
}

// Keep non-payment pages usable when Stripe is intentionally unavailable
// (for example, isolated CI). Checkout renders its unavailable state instead
// of asking Stripe.js to parse an undefined key.
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface PaymentFormProps {
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  paymentCompleted: boolean;
  setPaymentCompleted: (value: boolean) => void;
}

export const StripeElementsPaymentForm: React.FC<PaymentFormProps> = ({
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
  paymentCompleted,
  setPaymentCompleted,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [hasExpressCheckout, setHasExpressCheckout] = useState(false);

  const handleSubmit = async () => {
    // Prevent double submission
    if (!stripe || !elements || isProcessing || paymentCompleted) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || 'Please check your payment details and try again.');
        setIsProcessing(false);
        return;
      }

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
        setIsProcessing(false);
      } else {
        onError('Payment could not be completed. Please try again.');
        setIsProcessing(false);
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      onError(getErrorMessage(err, 'An unexpected error occurred'));
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
    <div className="space-y-5">
      <div
        className={hasExpressCheckout ? 'space-y-4' : 'h-0 overflow-hidden opacity-0'}
        aria-hidden={!hasExpressCheckout}
      >
        <ExpressCheckoutElement
          onConfirm={handleSubmit}
          onReady={({ availablePaymentMethods }) => {
            setHasExpressCheckout(Boolean(availablePaymentMethods && Object.keys(availablePaymentMethods).length > 0));
          }}
          options={{
            buttonHeight: 50,
            layout: { maxColumns: 2, maxRows: 2 },
            buttonType: {
              applePay: 'check-out',
              googlePay: 'checkout',
            },
          }}
        />
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Or pay another way
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      </div>

      <PaymentElement
        options={{
          layout: {
            type: 'accordion',
            defaultCollapsed: false,
            radios: true,
            spacedAccordionItems: true,
          },
        }}
      />

      <button
        type="button"
        disabled={!stripe || isProcessing || paymentCompleted}
        onClick={handleSubmit}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-red-700 active:translate-y-[1px] disabled:cursor-not-allowed disabled:bg-red-300"
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

      <p className="text-center text-xs leading-5 text-slate-500">
        Stripe securely processes your payment. Egypt Excursions Online never stores your card details.
      </p>
    </div>
  );
};

export interface StripePaymentFormProps {
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
  cart: CheckoutCartItem[];
  pricing: CheckoutPricing;
  discountCode?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onPriceChanged: (quote: AuthoritativePriceQuote) => Promise<boolean> | boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  experience?: PaymentExperience;
}

type StripePaymentPanelProps = Omit<StripePaymentFormProps, 'isOpen' | 'onOpenChange' | 'experience'> & {
  onProcessingChange?: (processing: boolean) => void;
  paymentExperience: 'inline' | 'modal';
};

const StripePaymentPanel: React.FC<StripePaymentPanelProps> = ({
  amount,
  currency,
  customer,
  cart,
  pricing,
  discountCode,
  onSuccess,
  onError,
  onPriceChanged,
  onProcessingChange,
  paymentExperience,
}) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [checkoutAttemptId, setCheckoutAttemptId] = useState('');
  const [pendingPriceChange, setPendingPriceChange] = useState<AuthoritativePriceQuote | null>(null);
  const [isAcceptingPriceChange, setIsAcceptingPriceChange] = useState(false);
  const [priceChangeError, setPriceChangeError] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);

  const updateProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
    onProcessingChange?.(processing);
  }, [onProcessingChange]);
  
  // Use settings for consistent price formatting with currency conversion
  const { selectedCurrency } = useSettings();
  
  // Check if display currency is different from charge currency (USD)
  const isDisplayCurrencyDifferent = selectedCurrency.code !== 'USD';
  
  // Use refs to track if we've already created a payment intent for this cart
  const paymentIntentCreatedRef = useRef(false);
  const lastCartHashRef = useRef<string>('');
  const customerPayload = useMemo(() => ({
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    emergencyContact: customer.emergencyContact,
    hotelPickupDetails: customer.hotelPickupDetails,
    hotelPickupLocation: customer.hotelPickupLocation,
    specialRequests: customer.specialRequests,
  }), [
    customer.email,
    customer.firstName,
    customer.lastName,
    customer.phone,
    customer.emergencyContact,
    customer.hotelPickupDetails,
    customer.hotelPickupLocation,
    customer.specialRequests,
  ]);
  
  // Generate a hash of cart items to detect real changes (includes add-ons + booking option + children)
  const getCartHash = useCallback((cartItems: CheckoutCartItem[], pricingData: CheckoutPricing, discount?: string) => {
    const normalizeQty = (v: unknown): number => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') return Number(v) || 0;
      if (isRecord(v)) return normalizeQty(v.quantity ?? v.qty ?? v.count);
      return 0;
    };

    const stableAddOns = (item: CheckoutCartItem) => {
      const addOns = item?.selectedAddOns;
      if (!addOns) return '';
      // selectedAddOns can be object or array; we only hash ids + numeric qty
      if (Array.isArray(addOns)) {
        return addOns
          .map((addOn) => `${addOn.id || ''}:${normalizeQty(addOn.quantity)}`)
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
      const bookingOption = item.selectedBookingOption?.pricingKey || item.selectedBookingOption?.id || '';
      const guestPrices = item.guestPrices
        ? `${item.guestPrices.adult ?? ''}:${item.guestPrices.child ?? ''}:${item.guestPrices.infant ?? ''}`
        : '';
      const priceIdentity = `${item.priceVersion ?? ''}:${item.priceExecutionId ?? ''}:${item.priceOverrideId ?? ''}:${item.priceSource ?? ''}`;
      const addOnsSig = stableAddOns(item);
      return `${id}|${date}|${time}|a${adults}|c${children}|n${infants}|bo${bookingOption}|gp${guestPrices}|pi${priceIdentity}|ao${addOnsSig}`;
    }).join('||');

    return `${cartSig}::${(pricingData?.currency || currency || 'USD').toUpperCase()}::${pricingData?.total || 0}::${discount || ''}`;
  }, [currency]);

  // Helper function to validate email format
  const isValidEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const customerDetailsComplete = Boolean(
    customer.email
    && customer.firstName
    && customer.lastName
    && customer.phone
    && isValidEmail(customer.email),
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setCheckoutAttemptId(getOrCreateCheckoutAttemptId());
      } catch (error) {
        console.error('Unable to initialize checkout attempt:', error);
        setIsLoading(false);
        onError('Secure checkout is unavailable in this browser. Please try another browser.');
      }
    });
    return () => {
      active = false;
    };
  }, [onError]);

  useEffect(() => {
    // If payment already completed, don't create new intents
    if (paymentCompleted) {
      return;
    }
    if (!checkoutAttemptId) {
      return;
    }
    if (pendingPriceChange) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    // Validate customer data before creating PaymentIntent
    if (!customerDetailsComplete) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    // Validate cart has items
    if (!cart || cart.length === 0) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    // Validate pricing
    if (!pricing || pricing.total <= 0) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    // Check if cart/pricing has actually changed
    const currentCartHash = getCartHash(cart, pricing, discountCode);
    
    // If we already have a payment intent and cart hasn't changed, don't create another
    if (paymentIntentCreatedRef.current && clientSecret && lastCartHashRef.current === currentCartHash) {
      queueMicrotask(() => setIsLoading(false));
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
              customer: customerPayload,
              pricing,
              cart,
              discountCode,
              checkoutAttemptId,
              paymentExperience,
            }),
          });

          const data = await response.json();

          if (response.status === 409 && data.code === 'PRICE_CHANGED' && isAuthoritativePriceQuote(data.quote)) {
            setClientSecret('');
            setPendingPriceChange(data.quote);
            setPriceChangeError('');
            paymentIntentCreatedRef.current = false;
            lastCartHashRef.current = '';
          } else if (data.success && data.clientSecret) {
            setClientSecret(data.clientSecret);
            paymentIntentCreatedRef.current = true;
            lastCartHashRef.current = currentCartHash;
          } else {
            console.error('Failed to create payment intent:', data.message);
            const message = data.message || 'Failed to initialize payment';
            onError(message);
          }
        } catch (error) {
          console.error('Error creating payment intent:', error);
          const message = 'Payment service could not be reached. Please try again.';
          onError(message);
        } finally {
          setIsLoading(false);
        }
      };

      createPaymentIntent();
    }, 1500); // Increased debounce to 1.5 seconds

    return () => clearTimeout(timeoutId);
  }, [customerDetailsComplete, customerPayload, cart, pricing, discountCode, checkoutAttemptId, getCartHash, onError, paymentCompleted, clientSecret, pendingPriceChange, retryNonce, paymentExperience]);

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

  if (pendingPriceChange) {
    const formatQuotePrice = (price: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: pendingPriceChange.currency,
      minimumFractionDigits: 2,
    }).format(price);

    const acceptUpdatedPrice = async () => {
      if (isAcceptingPriceChange) return;
      setIsAcceptingPriceChange(true);
      setPriceChangeError('');
      try {
        const accepted = await onPriceChanged(pendingPriceChange);
        if (!accepted) {
          setPriceChangeError('We could not save the updated quote. Your original cart is unchanged. Please try again.');
          return;
        }
        paymentIntentCreatedRef.current = false;
        lastCartHashRef.current = '';
        setClientSecret('');
        setPaymentCompleted(false);
        setPendingPriceChange(null);
        setIsLoading(true);
        toast.success('Updated price accepted. Rebuilding secure payment…');
      } catch (error) {
        console.error('Unable to accept updated quote:', error);
        setPriceChangeError('We could not save the updated quote. Your original cart is unchanged. Please try again.');
      } finally {
        setIsAcceptingPriceChange(false);
      }
    };

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-lg"
      >
        <div className="flex items-start gap-3 bg-amber-50 px-5 py-4 sm:px-6">
          <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
            <AlertCircle size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-slate-900">Your price was updated</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              The current price changed before payment. You have not been charged. Review and accept the new server-verified quote to continue.
            </p>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {pendingPriceChange.tourTitle || 'Selected experience'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {pendingPriceChange.date} at {pendingPriceChange.time} · {pendingPriceChange.currency}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-2">
              {(['adult', 'child', 'infant'] as const).map((guestType) => (
                <div key={guestType} className="rounded-lg bg-white px-3 py-3 ring-1 ring-slate-200">
                  <dt className="text-[11px] font-semibold capitalize text-slate-500">{guestType}</dt>
                  <dd className="mt-1 text-sm font-extrabold text-slate-900">
                    {formatQuotePrice(pendingPriceChange.prices[guestType])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {priceChangeError && (
            <p role="status" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {priceChangeError}
            </p>
          )}

          <button
            type="button"
            onClick={acceptUpdatedPrice}
            disabled={isAcceptingPriceChange}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAcceptingPriceChange ? (
              <><Loader2 className="animate-spin" size={18} /> Saving updated quote…</>
            ) : (
              <><ShieldCheck size={18} /> Accept updated price &amp; continue</>
            )}
          </button>
          <p className="text-center text-xs text-slate-500">
            Payment will only be prepared after you confirm this quote.
          </p>
        </div>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="bg-white border border-red-100 rounded-2xl shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-3 text-red-600 mb-3">
          <AlertCircle size={24} />
          <p className="font-semibold">Unable to initialize payment</p>
        </div>
        <p className="text-slate-600 text-sm mb-4">
          {stripePromise
            ? 'There was a problem connecting to our payment system. Please try again.'
            : 'Secure payment is temporarily unavailable. Please contact support.'}
        </p>
        {stripePromise && (
          <button
            type="button"
            onClick={() => {
              paymentIntentCreatedRef.current = false;
              lastCartHashRef.current = '';
              setIsLoading(true);
              setRetryNonce((value) => value + 1);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
          >
            Try again
          </button>
        )}
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

  return (
    <div className="space-y-5">
      <Elements stripe={stripePromise} options={options}>
        <StripeElementsPaymentForm
          onSuccess={onSuccess}
          onError={onError}
          isProcessing={isProcessing}
          setIsProcessing={updateProcessing}
          paymentCompleted={paymentCompleted}
          setPaymentCompleted={setPaymentCompleted}
        />
      </Elements>

      {isDisplayCurrencyDifferent && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs leading-5 text-amber-800">
            <strong>Currency notice:</strong> Stripe will process ${(pricing?.total ?? amount ?? 0).toFixed(2)} USD.
            The displayed {selectedCurrency.code} amount is an estimate; your bank may apply conversion fees.
          </p>
        </div>
      )}
    </div>
  );
};

const StripeHostedCheckoutLauncher: React.FC<Omit<StripePaymentFormProps, 'isOpen' | 'onOpenChange' | 'experience' | 'onSuccess'>> = ({
  amount,
  customer,
  cart,
  pricing,
  discountCode,
  onError,
  onPriceChanged,
}) => {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutAttemptId, setCheckoutAttemptId] = useState('');
  const [pendingPriceChange, setPendingPriceChange] = useState<AuthoritativePriceQuote | null>(null);
  const [isAcceptingPriceChange, setIsAcceptingPriceChange] = useState(false);
  const [priceChangeError, setPriceChangeError] = useState('');
  const { formatPrice } = useSettings();
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email);
  const customerDetailsComplete = Boolean(
    customer.firstName
    && customer.lastName
    && customer.email
    && customer.phone
    && emailIsValid,
  );

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setCheckoutAttemptId(getOrCreateCheckoutAttemptId());
      } catch (error) {
        console.error('Unable to initialize hosted checkout attempt:', error);
        onError('Secure checkout is unavailable in this browser. Please try another browser.');
      }
    });
  }, [onError]);

  const startHostedCheckout = async () => {
    if (!customerDetailsComplete || !checkoutAttemptId || isRedirecting) return;
    setIsRedirecting(true);
    try {
      const localeCandidate = window.location.pathname.split('/').filter(Boolean)[0] || 'en';
      const locale = ['en', 'ar', 'de', 'fr', 'es'].includes(localeCandidate)
        ? localeCandidate
        : 'en';
      const response = await fetch('/api/checkout/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          pricing,
          cart,
          discountCode,
          checkoutAttemptId,
          locale,
        }),
      });
      const payload = await response.json() as {
        success?: boolean;
        url?: unknown;
        code?: string;
        message?: string;
        quote?: unknown;
      };

      if (response.status === 409 && payload.code === 'PRICE_CHANGED' && isAuthoritativePriceQuote(payload.quote)) {
        setPendingPriceChange(payload.quote);
        setPriceChangeError('');
        setIsRedirecting(false);
        return;
      }
      if (!response.ok || payload.success !== true || typeof payload.url !== 'string') {
        throw new Error(payload.message || 'Stripe Checkout could not be opened.');
      }

      const destination = new URL(payload.url);
      if (destination.protocol !== 'https:' || !destination.hostname.endsWith('.stripe.com')) {
        throw new Error('Stripe returned an invalid checkout destination.');
      }
      window.location.assign(destination.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stripe Checkout could not be opened.';
      onError(message);
      setIsRedirecting(false);
    }
  };

  const acceptUpdatedPrice = async () => {
    if (!pendingPriceChange || isAcceptingPriceChange) return;
    setIsAcceptingPriceChange(true);
    setPriceChangeError('');
    try {
      const accepted = await onPriceChanged(pendingPriceChange);
      if (!accepted) {
        setPriceChangeError('We could not save the updated quote. Your original cart is unchanged. Please try again.');
        return;
      }
      setPendingPriceChange(null);
      toast.success('Updated price accepted. You can now continue to Stripe Checkout.');
    } catch {
      setPriceChangeError('We could not save the updated quote. Your original cart is unchanged. Please try again.');
    } finally {
      setIsAcceptingPriceChange(false);
    }
  };

  if (pendingPriceChange) {
    return (
      <div role="alert" className="overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-sm">
        <div className="flex items-start gap-3 bg-amber-50 px-5 py-4">
          <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={22} />
          <div>
            <p className="font-extrabold text-slate-950">Your price was updated</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              The current server-verified total is {new Intl.NumberFormat('en-US', { style: 'currency', currency: pendingPriceChange.currency }).format(pendingPriceChange.prices.adult)} per adult. You have not been charged.
            </p>
          </div>
        </div>
        <div className="p-5">
          {priceChangeError && <p className="mb-3 text-sm font-medium text-red-700">{priceChangeError}</p>}
          <button
            type="button"
            onClick={() => void acceptUpdatedPrice()}
            disabled={isAcceptingPriceChange}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {isAcceptingPriceChange ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            Accept updated price &amp; continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <ArrowRight size={23} aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-slate-950">Continue to Stripe Checkout</p>
            <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">
              Complete payment on Stripe’s secure hosted page, then return here for verified booking status.
            </p>
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total due</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{formatPrice(pricing?.total ?? amount ?? 0)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void startHostedCheckout()}
        disabled={!customerDetailsComplete || !checkoutAttemptId || isRedirecting}
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
      >
        {isRedirecting ? <Loader2 className="animate-spin" size={19} /> : <Lock size={18} />}
        {isRedirecting ? 'Opening Stripe Checkout…' : 'Pay securely with Stripe'}
        {!isRedirecting && <ArrowRight size={18} />}
      </button>
      {!customerDetailsComplete && (
        <p className="mt-3 text-center text-sm text-slate-500">Complete your name, email, and phone number to continue.</p>
      )}
      <p className="mt-3 text-center text-xs text-slate-400">Cards, Link, and eligible wallets are shown by Stripe for this device.</p>
    </div>
  );
};

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  currency,
  customer,
  cart,
  pricing,
  discountCode,
  onSuccess,
  onError,
  onPriceChanged,
  isOpen,
  onOpenChange,
  experience = 'modal',
}) => {
  const [uncontrolledPaymentOpen, setUncontrolledPaymentOpen] = useState(false);
  const [panelProcessing, setPanelProcessing] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const { formatPrice } = useSettings();

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email);
  const customerDetailsComplete = Boolean(
    customer.firstName
    && customer.lastName
    && customer.email
    && customer.phone
    && emailIsValid,
  );
  const displayTotal = pricing?.total ?? amount ?? 0;
  const formattedTotal = formatPrice(displayTotal);
  const numberOfTours = cart?.length || 1;
  const isPaymentOpen = isOpen ?? uncontrolledPaymentOpen;

  const setPaymentOpen = useCallback((open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
      return;
    }
    setUncontrolledPaymentOpen(open);
  }, [onOpenChange]);

  const openPayment = useCallback(() => {
    if (!customerDetailsComplete) return;
    setPaymentOpen(true);
  }, [customerDetailsComplete, setPaymentOpen]);

  const closePayment = useCallback(() => {
    if (panelProcessing) return;
    setPaymentOpen(false);
    window.requestAnimationFrame(() => openButtonRef.current?.focus());
  }, [panelProcessing, setPaymentOpen]);

  useEffect(() => {
    if (experience !== 'modal') return;
    if (!isPaymentOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePayment();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closePayment, experience, isPaymentOpen]);

  if (experience === 'inline') {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <CreditCard size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="font-extrabold text-slate-950">Secure card &amp; wallet payment</p>
              <p className="mt-1 text-sm text-slate-500">Pay here without leaving the checkout page.</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total due</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formattedTotal}</p>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <StripePaymentPanel
            amount={amount}
            currency={currency}
            customer={customer}
            cart={cart}
            pricing={pricing}
            discountCode={discountCode}
            onSuccess={onSuccess}
            onError={onError}
            onPriceChanged={onPriceChanged}
            onProcessingChange={setPanelProcessing}
            paymentExperience="inline"
          />
        </div>
      </div>
    );
  }

  if (experience === 'hosted') {
    return (
      <StripeHostedCheckoutLauncher
        amount={amount}
        currency={currency}
        customer={customer}
        cart={cart}
        pricing={pricing}
        discountCode={discountCode}
        onError={onError}
        onPriceChanged={onPriceChanged}
      />
    );
  }

  const dialog = experience === 'modal' && isPaymentOpen && customerDetailsComplete && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePayment();
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="secure-payment-title"
            className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Lock size={19} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Egypt Excursions Online</p>
                  <h2 id="secure-payment-title" className="mt-1 text-xl font-extrabold text-slate-950">Secure payment</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {formattedTotal} for {numberOfTours} {numberOfTours === 1 ? 'experience' : 'experiences'}
                  </p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closePayment}
                disabled={panelProcessing}
                aria-label="Close secure payment"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </header>

            <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <StripePaymentPanel
                amount={amount}
                currency={currency}
                customer={customer}
                cart={cart}
                pricing={pricing}
                discountCode={discountCode}
                onSuccess={onSuccess}
                onError={onError}
                onPriceChanged={onPriceChanged}
                onProcessingChange={setPanelProcessing}
                paymentExperience="modal"
              />

            </div>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:px-7">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Encrypted payment</span>
              <span className="inline-flex items-center gap-1.5"><Lock size={14} /> Powered by Stripe</span>
            </footer>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <CreditCard size={23} aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-950">Pay securely in the next step</p>
              <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">
                Stripe will show the cards and eligible wallets available for this device.
              </p>
            </div>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total due</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{formattedTotal}</p>
          </div>
        </div>

        <button
          ref={openButtonRef}
          type="button"
          onClick={openPayment}
          disabled={!customerDetailsComplete}
          className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:translate-y-[1px] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          <Lock size={17} aria-hidden="true" />
          Continue to secure payment
          <ArrowRight size={18} aria-hidden="true" />
        </button>

        {!customerDetailsComplete && (
          <p className="mt-3 text-center text-sm text-slate-500">
            Complete your name, email, and phone number to continue.
          </p>
        )}
      </div>
      {dialog}
    </>
  );
};

export default StripePaymentForm;

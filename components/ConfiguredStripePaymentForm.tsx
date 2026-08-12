'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import StripePaymentForm, { type StripePaymentFormProps } from '@/components/StripePaymentForm';
import { isPaymentExperience, type PaymentExperience } from '@/lib/checkout/paymentExperience';

export default function ConfiguredStripePaymentForm(props: StripePaymentFormProps) {
  const [experience, setExperience] = useState<PaymentExperience | null>(null);
  const [error, setError] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);

  const loadConfiguration = useCallback(async (signal: AbortSignal) => {
    setError('');
    setExperience(null);
    try {
      const response = await fetch('/api/checkout/config', { cache: 'no-store', signal });
      const payload = await response.json() as {
        success?: boolean;
        paymentExperience?: unknown;
        message?: string;
      };
      if (!response.ok || !isPaymentExperience(payload.paymentExperience)) {
        throw new Error(payload.message || 'Secure checkout configuration could not be loaded.');
      }
      setExperience(payload.paymentExperience);
    } catch (loadError) {
      if (signal.aborted) return;
      setError(loadError instanceof Error ? loadError.message : 'Secure checkout configuration could not be loaded.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void loadConfiguration(controller.signal));
    return () => controller.abort();
  }, [loadConfiguration, retryNonce]);

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={22} />
          <div>
            <p className="font-extrabold text-slate-950">Secure checkout is temporarily unavailable</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRetryNonce((value) => value + 1)}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-live="polite">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-red-600" size={28} />
          <p className="mt-3 text-sm font-semibold text-slate-700">Loading secure payment options…</p>
        </div>
      </div>
    );
  }

  return <StripePaymentForm {...props} experience={experience} />;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CreditCard,
  ExternalLink,
  LayoutPanelTop,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import toast from 'react-hot-toast';
import withAuth from '@/components/admin/withAuth';
import {
  DEFAULT_PAYMENT_EXPERIENCE,
  isPaymentExperience,
  type PaymentExperience,
} from '@/lib/checkout/paymentExperience';

const options: Array<{
  value: PaymentExperience;
  title: string;
  eyebrow: string;
  description: string;
  detail: string;
  icon: typeof CreditCard;
}> = [
  {
    value: 'inline',
    title: 'Inline payment',
    eyebrow: 'Payment on checkout page',
    description: 'Show Stripe cards, Link, and eligible wallets directly below the booking details.',
    detail: 'Best when you want the fewest steps and the payment form to remain visible on the page.',
    icon: LayoutPanelTop,
  },
  {
    value: 'modal',
    title: 'Secure payment modal',
    eyebrow: 'Dedicated on-site step',
    description: 'Open the polished Stripe payment experience in a focused overlay after customer details.',
    detail: 'Recommended balance of conversion, visual focus, and keeping the customer on your domain.',
    icon: WalletCards,
  },
  {
    value: 'hosted',
    title: 'Stripe-hosted Checkout',
    eyebrow: 'Redirect to Stripe',
    description: 'Send the customer to Stripe Checkout, then return them to a verified booking status page.',
    detail: 'Best when you want Stripe to own the whole payment-page UI and device-specific payment methods.',
    icon: ExternalLink,
  },
];

function CheckoutSettingsPage() {
  const [saved, setSaved] = useState<PaymentExperience>(DEFAULT_PAYMENT_EXPERIENCE);
  const [selected, setSelected] = useState<PaymentExperience>(DEFAULT_PAYMENT_EXPERIENCE);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/admin/checkout-settings', { cache: 'no-store' });
      const payload = await response.json() as {
        success?: boolean;
        data?: { paymentExperience?: unknown; updatedAt?: string | null };
        error?: string;
      };
      if (!response.ok || !isPaymentExperience(payload.data?.paymentExperience)) {
        throw new Error(payload.error || 'Payment settings could not be loaded.');
      }
      setSaved(payload.data.paymentExperience);
      setSelected(payload.data.paymentExperience);
      setUpdatedAt(payload.data.updatedAt || null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Payment settings could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadSettings());
  }, [loadSettings]);

  const saveSettings = async () => {
    if (selected === saved || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/checkout-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentExperience: selected }),
      });
      const payload = await response.json() as {
        success?: boolean;
        data?: { paymentExperience?: unknown; updatedAt?: string | null };
        error?: string;
      };
      if (!response.ok || !isPaymentExperience(payload.data?.paymentExperience)) {
        throw new Error(payload.error || 'Payment settings could not be saved.');
      }
      setSaved(payload.data.paymentExperience);
      setSelected(payload.data.paymentExperience);
      setUpdatedAt(payload.data.updatedAt || null);
      toast.success('Checkout payment experience updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment settings could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-9 sm:py-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-200">
              <ShieldCheck size={15} aria-hidden="true" /> Payment experience
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Choose how customers pay</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              All three layouts use the same server-verified price, inventory hold, Stripe payment, webhook recovery, and booking lifecycle. This setting changes the customer experience—not the financial rules.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <p className="font-bold text-white">Current live mode</p>
            <p className="mt-1 capitalize">{saved === 'hosted' ? 'Stripe-hosted Checkout' : `${saved} payment`}</p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-red-600" aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-800">Loading payment settings…</p>
          </div>
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-3xl border border-red-200 bg-white p-7 shadow-sm">
          <p className="font-bold text-red-700">Payment settings are unavailable</p>
          <p className="mt-2 text-sm text-slate-600">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            <RefreshCw size={16} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : (
        <>
          <fieldset>
            <legend className="sr-only">Checkout payment experience</legend>
            <div className="grid gap-5 lg:grid-cols-3">
              {options.map((option) => {
                const Icon = option.icon;
                const active = selected === option.value;
                return (
                  <label
                    key={option.value}
                    className={`relative flex cursor-pointer flex-col rounded-3xl border-2 bg-white p-6 shadow-sm transition focus-within:ring-2 focus-within:ring-red-500 focus-within:ring-offset-2 ${
                      active ? 'border-red-500 shadow-lg shadow-red-100' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentExperience"
                      value={option.value}
                      checked={active}
                      onChange={() => setSelected(option.value)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        <Icon size={23} aria-hidden="true" />
                      </div>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${active ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 text-transparent'}`}>
                        <Check size={16} strokeWidth={3} aria-hidden="true" />
                      </span>
                    </div>
                    <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-red-600">{option.eyebrow}</p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">{option.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{option.description}</p>
                    <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">{option.detail}</p>
                    {option.value === 'modal' && (
                      <span className="mt-5 inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Recommended</span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <section aria-labelledby="payment-provider-heading" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div>
              <h2 id="payment-provider-heading" className="text-lg font-black text-slate-950">Payment providers</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Only providers with verified payment, webhook, refund, retry, and recovery flows can be activated.</p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-extrabold text-slate-950">Stripe</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">Active</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">Cards and Stripe-eligible wallets use the selected presentation above.</p>
              </div>
              {[
                ['PayPal', 'Requires approved credentials plus complete order, webhook, refund, and recovery verification.'],
                ['Bank transfer', 'Requires approved bank details plus pending-payment expiry and reconciliation controls.'],
              ].map(([provider, detail]) => (
                <div key={provider} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-extrabold text-slate-800">{provider}</span>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700">Setup required</span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-center sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Lock size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="font-extrabold text-slate-950">One secure payment lifecycle</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Eligible Apple Pay, Google Pay, and Link options are decided by Stripe for the customer’s device, browser, country, and wallet setup. No mode fabricates unavailable wallets.
                </p>
                {updatedAt && (
                  <p className="mt-2 text-xs text-slate-400">Last saved {new Date(updatedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={selected === saved || isSaving}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none md:w-auto"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSaving ? 'Saving…' : selected === saved ? 'Saved' : 'Save & publish'}
            </button>
          </div>

          <p className="flex items-center gap-2 px-1 text-xs leading-5 text-slate-500">
            <ArrowUpRight size={15} aria-hidden="true" /> New checkout visits use the saved mode immediately. Existing payment attempts keep their original provider session so they cannot be charged twice.
          </p>
        </>
      )}
    </div>
  );
}

export default withAuth(CheckoutSettingsPage, { permissions: ['managePayments'] });

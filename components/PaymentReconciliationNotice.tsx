'use client';

/** A received payment is not a confirmed booking until the durable checkout agrees. */
export default function PaymentReconciliationNotice({ checking, onRetry }: {
  checking: boolean; onRetry: () => void;
}) {
  return <div role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
    <p>Your payment was received. Booking confirmation is still being checked. Do not pay again.</p>
    <button type="button" disabled={checking} onClick={onRetry} className="mt-3 rounded-lg border border-amber-300 px-4 py-2 font-semibold disabled:opacity-50">
      {checking ? 'Checking confirmation...' : 'Check confirmation again'}
    </button>
  </div>;
}

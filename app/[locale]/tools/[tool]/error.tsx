'use client';

import { CircleAlert, RefreshCw } from 'lucide-react';

export default function ToolRouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center bg-slate-50 px-4 py-12">
      <div role="alert" className="mx-auto w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-7 text-amber-950">
        <CircleAlert aria-hidden="true" className="h-7 w-7 text-amber-700" />
        <h1 className="mt-4 text-2xl font-bold">The travel tool could not be opened</h1>
        <p className="mt-2 text-sm leading-6">Nothing has been estimated. Try loading the verified tool again.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900 focus-visible:ring-offset-2"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Try again
        </button>
      </div>
    </main>
  );
}

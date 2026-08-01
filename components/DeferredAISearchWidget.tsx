'use client';

import dynamic from 'next/dynamic';
import { Search, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

// Lazy-load the AI search widget (kept out of SSR + the initial bundle) but
// render it on ALL viewports — mobile included — so AI search stays available
// everywhere.
const AISearchWidget = dynamic(() => import('@/components/AISearchWidget'), {
  ssr: false,
});

export default function DeferredAISearchWidget() {
  const [ready, setReady] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);

  useEffect(() => {
    let ticking = false;
    const widgetWindow = window as Window & {
      __pendingAIOpenAgent?: boolean;
      __pendingAIOpenAgentQuery?: string;
    };

    const handleOpen = (event: Event) => {
      const query = event instanceof CustomEvent && typeof event.detail?.query === 'string'
        ? event.detail.query
        : '';
      widgetWindow.__pendingAIOpenAgent = true;
      widgetWindow.__pendingAIOpenAgentQuery = query;
      setReady(true);
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setShowLauncher(window.scrollY > window.innerHeight * 0.8);
        ticking = false;
      });
    };

    window.addEventListener('openAIAgent', handleOpen);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('openAIAgent', handleOpen);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (ready) return <AISearchWidget />;
  if (!showLauncher) return null;

  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('openAIAgent', { detail: { query: '' } }));
      }}
      className="fixed bottom-4 left-1/2 z-[15] flex w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 items-center gap-3 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 text-left shadow-xl backdrop-blur-md transition hover:border-blue-300 hover:shadow-2xl md:bottom-6 md:px-5"
      aria-label="Open tour search and AI travel assistant"
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700 md:text-base">
        Search tours and destinations
      </span>
      <Search className="h-5 w-5 flex-none text-gray-500" aria-hidden="true" />
    </button>
  );
}

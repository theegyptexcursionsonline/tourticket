'use client';

import dynamic from 'next/dynamic';

// Lazy-load the AI search widget (kept out of SSR + the initial bundle) but
// render it on ALL viewports — mobile included — so AI search stays available
// everywhere.
const AISearchWidget = dynamic(() => import('@/components/AISearchWidget'), {
  ssr: false,
});

export default function DeferredAISearchWidget() {
  return <AISearchWidget />;
}

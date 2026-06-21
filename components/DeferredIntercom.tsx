'use client';

import dynamic from 'next/dynamic';

// Lazy-load Intercom (kept out of SSR + the initial bundle) but render it on
// ALL viewports — mobile included — so live chat stays available everywhere.
const IntercomClient = dynamic(() => import('@/components/IntercomClient'), {
  ssr: false,
});

export default function DeferredIntercom() {
  return <IntercomClient />;
}

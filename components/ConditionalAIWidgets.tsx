'use client';

import { usePathname } from 'next/navigation';
import AIAgentWidget from './AIAgentWidget';

/**
 * Wrapper component that conditionally renders AI widgets
 * based on the current page. Hides widgets on checkout/booking pages.
 */
export default function ConditionalAIWidgets() {
  const pathname = usePathname();

  // Hide AI widgets on checkout and booking-related pages
  const shouldHideWidgets = pathname?.includes('/checkout') ||
                           pathname?.includes('/booking') ||
                           pathname?.includes('/payment');

  if (shouldHideWidgets) {
    return null;
  }

  return <AIAgentWidget />;
}

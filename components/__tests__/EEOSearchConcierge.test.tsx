import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import EEOSearchConcierge from '@/components/EEOSearchConcierge';

let pathname = '/en';
let locale = 'en';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));
jest.mock('next-intl', () => ({
  useLocale: () => locale,
}));

describe('EEOSearchConcierge', () => {
  beforeEach(() => {
    pathname = '/en';
    locale = 'en';
    window.history.replaceState(null, '', '/en');
  });

  afterEach(() => {
    cleanup();
    document.getElementById('eeo-search-concierge-script')?.remove();
    document.getElementById('foxes-launcher-host')?.remove();
  });

  it('loads one customer-branded hosted launcher on the EEO storefront', async () => {
    render(<EEOSearchConcierge />);

    await waitFor(() => {
      const script = document.getElementById('eeo-search-concierge-script') as HTMLScriptElement;
      expect(script).toBeInTheDocument();
      expect(script.dataset.widgetId).toBe('wgt_6JW5umlfasNQfJywtFPs6g');
      expect(script.dataset.style).toBe('concierge');
      expect(script.dataset.label).toBe('Plan your Egypt trip');
      expect(script.dataset.kicker).toBe('AI trip concierge');
    });
  });

  it('uses Arabic customer copy and the RTL-safe left position', async () => {
    pathname = '/ar/tours';
    locale = 'ar';
    render(<EEOSearchConcierge />);

    await waitFor(() => {
      const script = document.getElementById('eeo-search-concierge-script') as HTMLScriptElement;
      expect(script.dataset.label).toBe('خطط لرحلتك في مصر');
      expect(script.dataset.position).toBe('left');
    });
  });

  it.each(['/en/checkout', '/ar/booking/abc', '/de/payment', '/en/admin']) (
    'does not load on sensitive route %s',
    async (route) => {
      pathname = route;
      render(<EEOSearchConcierge />);
      await waitFor(() => expect(document.getElementById('eeo-search-concierge-script')).toBeNull());
    }
  );
});

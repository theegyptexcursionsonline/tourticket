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
      expect(script.dataset.style).toBe('searchbar');
      expect(script.dataset.label).toBe('Search Egypt tours with AI');
      expect(script.dataset.kicker).toBe('AI trip search');
      expect(script.dataset.placeholder).toBe('Search tours, places, or experiences...');
      expect(script.dataset.submitLabel).toBe('Search');
      expect(script.dataset.color).toBe('#0b5d3b');
      expect(script.dataset.dir).toBe('ltr');
    });
  });

  it('uses Arabic customer copy and the RTL-safe left position', async () => {
    pathname = '/ar/tours';
    locale = 'ar';
    render(<EEOSearchConcierge />);

    await waitFor(() => {
      const script = document.getElementById('eeo-search-concierge-script') as HTMLScriptElement;
      expect(script.dataset.label).toBe('ابحث عن رحلات مصر بالذكاء الاصطناعي');
      expect(script.dataset.placeholder).toBe('ابحث عن جولات وأماكن وتجارب...');
      expect(script.dataset.submitLabel).toBe('ابحث');
      expect(script.dataset.position).toBe('left');
      expect(script.dataset.dir).toBe('rtl');
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

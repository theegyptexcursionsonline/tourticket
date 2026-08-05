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
      expect(script.dataset.placeholder).toBe('Search Egypt tours...');
      expect(script.dataset.submitLabel).toBeUndefined();
      expect(script.dataset.color).toBe('#0b5d3b');
      expect(script.dataset.dir).toBe('ltr');
      expect(script.dataset.locale).toBe('en');
      expect(script.src).toContain('/widget/foxes-launcher.js?v=20260806-search-polish');
    });
  });

  it('uses Arabic customer copy and the RTL-safe left position', async () => {
    pathname = '/ar/tours';
    locale = 'ar';
    render(<EEOSearchConcierge />);

    await waitFor(() => {
      const script = document.getElementById('eeo-search-concierge-script') as HTMLScriptElement;
      expect(script.dataset.label).toBe('ابحث عن رحلات مصر بالذكاء الاصطناعي');
      expect(script.dataset.placeholder).toBe('ابحث عن رحلات مصر...');
      expect(script.dataset.submitLabel).toBeUndefined();
      expect(script.dataset.position).toBe('left');
      expect(script.dataset.dir).toBe('rtl');
      expect(script.dataset.locale).toBe('ar');
    });
  });

  it.each([
    ['de', 'Ägypten-Touren suchen...'],
    ['fr', 'Excursions en Égypte...'],
    ['es', 'Buscar tours en Egipto...'],
  ])('uses a concise, mobile-safe %s prompt', async (activeLocale, placeholder) => {
    pathname = `/${activeLocale}`;
    locale = activeLocale;
    render(<EEOSearchConcierge />);

    await waitFor(() => {
      const script = document.getElementById('eeo-search-concierge-script') as HTMLScriptElement;
      expect(script.dataset.placeholder).toBe(placeholder);
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

  it('hides the hosted launcher while an application dialog is mounted', async () => {
    render(<EEOSearchConcierge />);

    const host = document.createElement('div');
    host.id = 'foxes-launcher-host';
    document.body.appendChild(host);

    await waitFor(() => expect(host.hidden).toBe(false));

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    await waitFor(() => expect(host.hidden).toBe(true));

    dialog.remove();
    await waitFor(() => expect(host.hidden).toBe(false));
  });
});

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
    document.querySelector('[data-mobile-booking-bar="true"]')?.remove();
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
      expect(script.src).toContain('/widget/foxes-launcher.js?v=20260808-compact-launcher');
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

  const visibleRects = () => [{ width: 320, height: 200 }] as unknown as DOMRectList;

  it('hides the hosted launcher while a visible application modal is open', async () => {
    render(<EEOSearchConcierge />);

    const host = document.createElement('div');
    host.id = 'foxes-launcher-host';
    document.body.appendChild(host);

    await waitFor(() => expect(host.hidden).toBe(false));

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.getClientRects = visibleRects;
    document.body.appendChild(dialog);

    await waitFor(() => expect(host.hidden).toBe(true));

    dialog.remove();
    await waitFor(() => expect(host.hidden).toBe(false));
  });

  it('ignores non-modal embedded dialogs such as Google Maps InfoWindows', async () => {
    render(<EEOSearchConcierge />);

    const host = document.createElement('div');
    host.id = 'foxes-launcher-host';
    document.body.appendChild(host);
    await waitFor(() => expect(host.hidden).toBe(false));

    // Mirrors the itinerary map DOM: role="dialog" without aria-modal, inside .gm-style.
    const mapRoot = document.createElement('div');
    mapRoot.className = 'gm-style';
    const infoWindow = document.createElement('div');
    infoWindow.className = 'gm-style-iw gm-style-iw-c';
    infoWindow.setAttribute('role', 'dialog');
    infoWindow.getClientRects = visibleRects;
    mapRoot.appendChild(infoWindow);
    document.body.appendChild(mapRoot);

    // A plain non-modal dialog outside the map must not hide the launcher either.
    const nonModal = document.createElement('div');
    nonModal.setAttribute('role', 'dialog');
    nonModal.getClientRects = visibleRects;
    document.body.appendChild(nonModal);

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(host.hidden).toBe(false);

    mapRoot.remove();
    nonModal.remove();
  });

  it('ignores a mounted modal that is not actually visible', async () => {
    render(<EEOSearchConcierge />);

    const host = document.createElement('div');
    host.id = 'foxes-launcher-host';
    document.body.appendChild(host);
    await waitFor(() => expect(host.hidden).toBe(false));

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.getClientRects = () => [] as unknown as DOMRectList;
    document.body.appendChild(dialog);

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(host.hidden).toBe(false);

    dialog.remove();
  });

  it('re-syncs when a modal is revealed by an attribute change alone', async () => {
    render(<EEOSearchConcierge />);

    const host = document.createElement('div');
    host.id = 'foxes-launcher-host';
    document.body.appendChild(host);

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.className = 'closed';
    dialog.getClientRects = () =>
      (dialog.className === 'open' ? [{ width: 320, height: 200 }] : []) as unknown as DOMRectList;
    document.body.appendChild(dialog);

    await waitFor(() => expect(host.hidden).toBe(false));

    dialog.className = 'open';
    await waitFor(() => expect(host.hidden).toBe(true));

    dialog.className = 'closed';
    await waitFor(() => expect(host.hidden).toBe(false));

    dialog.remove();
  });

  it('keeps the hosted launcher above the rendered mobile booking bar', async () => {
    render(<EEOSearchConcierge />);

    const host = document.createElement('div');
    host.id = 'foxes-launcher-host';
    const shadow = host.attachShadow({ mode: 'open' });
    const launcher = document.createElement('form');
    launcher.className = 'launcher searchbar';
    shadow.appendChild(launcher);
    document.body.appendChild(host);

    const bookingBar = document.createElement('div');
    bookingBar.dataset.mobileBookingBar = 'true';
    bookingBar.getBoundingClientRect = () => ({
      x: 0,
      y: 768,
      top: 768,
      right: 390,
      bottom: 844,
      left: 0,
      width: 390,
      height: 76,
      toJSON: () => ({}),
    });
    document.body.appendChild(bookingBar);

    await waitFor(() => {
      expect(launcher.style.getPropertyValue('bottom')).toBe('88px');
      expect(launcher.style.getPropertyPriority('bottom')).toBe('important');
    });

    bookingBar.remove();
    await waitFor(() => expect(launcher.style.getPropertyValue('bottom')).toBe(''));
  });
});

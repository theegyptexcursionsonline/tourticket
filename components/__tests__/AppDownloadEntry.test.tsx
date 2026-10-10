import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppDownloadEntry, {
  APP_ENTRY_AUTO_OPEN_DELAY_MS,
  APP_ENTRY_STORAGE_KEY,
  autoOpenAllowedOnPath,
} from '../AppDownloadEntry';
import type { MobileAppStores } from '@/lib/config/mobileApp';

let mockPathname = '/';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('qrcode', () => ({ __esModule: true, default: { toDataURL: jest.fn(async () => 'data:image/png;base64,QR') } }));

const COMING_SOON: MobileAppStores = { appStoreUrl: null, playStoreUrl: null, appStoreId: null };
const LIVE: MobileAppStores = {
  appStoreUrl: 'https://apps.apple.com/us/app/egypt-excursions-online/id1234567890',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.eeoapp',
  appStoreId: '1234567890',
};

function setDesktop(matches: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches, media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(),
    addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
  }));
}

function renderEntry(stores: MobileAppStores = COMING_SOON) {
  return render(<AppDownloadEntry isTransparent={false} headerLinkClasses="text-gray-800" stores={stores} />);
}

const layer = () => (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer ?? [];

beforeEach(() => {
  mockPathname = '/';
  window.localStorage.clear();
  (window as Window & { dataLayer?: unknown[] }).dataLayer = [];
  document.body.innerHTML = '';
  setDesktop(false);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the header button', () => {
  it('names itself and starts closed', () => {
    renderEntry();
    const button = screen.getByRole('button', { name: 'buttonLabel' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
  });

  it('opens the card with the QR code, what the app does and the app page', async () => {
    renderEntry();
    fireEvent.click(screen.getByRole('button', { name: 'buttonLabel' }));

    const card = screen.getByRole('dialog', { name: 'titleSoon' });
    expect(screen.getByRole('button', { name: 'buttonLabel' })).toHaveAttribute('aria-expanded', 'true');
    expect(card).toHaveTextContent('benefitBookings');
    expect(card).toHaveTextContent('benefitUpdates');
    expect(card).toHaveTextContent('benefitWishlist');
    expect(screen.getByRole('link', { name: /learnMore/ })).toHaveAttribute('href', '/mobile-app');
    await waitFor(() => expect(screen.getByAltText('qrAlt')).toHaveAttribute('src', 'data:image/png;base64,QR'));
    expect(layer()).toContainEqual({ event: 'eeo_app_entry', app_entry_action: 'open', app_state: 'coming_soon' });
  });
});

describe('before the app is in the stores', () => {
  it('shows both stores as coming soon and links to no store', () => {
    renderEntry(COMING_SOON);
    fireEvent.click(screen.getByRole('button', { name: 'buttonLabel' }));

    expect(screen.getAllByLabelText('storeComingSoon')).toHaveLength(2);
    const storeLinks = screen.queryAllByRole('link').filter((link) => /apps\.apple\.com|play\.google\.com/.test(link.getAttribute('href') ?? ''));
    expect(storeLinks).toHaveLength(0);
  });
});

describe('once the store listings are configured', () => {
  it('links each store in a new tab and records which one was chosen', () => {
    renderEntry(LIVE);
    fireEvent.click(screen.getByRole('button', { name: 'buttonLabel' }));

    expect(screen.getByRole('dialog', { name: 'titleLive' })).toBeInTheDocument();
    const appStore = screen.getByRole('link', { name: /App Store/ });
    const play = screen.getByRole('link', { name: /Google Play/ });
    expect(appStore).toHaveAttribute('href', LIVE.appStoreUrl);
    expect(play).toHaveAttribute('href', LIVE.playStoreUrl);
    for (const link of [appStore, play]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(screen.queryByLabelText('storeComingSoon')).not.toBeInTheDocument();

    fireEvent.click(play);
    expect(layer()).toContainEqual({ event: 'eeo_app_entry', app_entry_action: 'store_click', app_state: 'live', app_store: 'android' });
  });

  it('shows a configured store as a link and the other as coming soon', () => {
    renderEntry({ ...COMING_SOON, playStoreUrl: LIVE.playStoreUrl });
    fireEvent.click(screen.getByRole('button', { name: 'buttonLabel' }));

    expect(screen.getByRole('link', { name: /Google Play/ })).toHaveAttribute('href', LIVE.playStoreUrl);
    expect(screen.getAllByLabelText('storeComingSoon')).toHaveLength(1);
  });
});

describe('closing', () => {
  it('closes on Escape, returns focus to the button and stays quiet afterwards', () => {
    renderEntry();
    const button = screen.getByRole('button', { name: 'buttonLabel' });
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(JSON.parse(window.localStorage.getItem(APP_ENTRY_STORAGE_KEY) ?? '{}').quietUntil).toBeGreaterThan(Date.now());
    expect(layer()).toContainEqual({ event: 'eeo_app_entry', app_entry_action: 'close', app_state: 'coming_soon' });
  });

  it('closes on the close button and on a click outside', () => {
    renderEntry();
    fireEvent.click(screen.getByRole('button', { name: 'buttonLabel' }));
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'buttonLabel' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
  });

  it('closes when the visitor moves to another page', () => {
    const view = renderEntry();
    fireEvent.click(screen.getByRole('button', { name: 'buttonLabel' }));
    expect(screen.getByTestId('app-entry-card')).toBeInTheDocument();

    mockPathname = '/tours';
    view.rerender(<AppDownloadEntry isTransparent={false} headerLinkClasses="text-gray-800" stores={COMING_SOON} />);
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
  });
});

describe('opening by itself', () => {
  it('opens once on a desktop browsing page and not again on the next visit', () => {
    jest.useFakeTimers();
    setDesktop(true);
    const first = renderEntry();
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(APP_ENTRY_AUTO_OPEN_DELAY_MS); });
    expect(screen.getByTestId('app-entry-card')).toBeInTheDocument();
    expect(layer()).toContainEqual({ event: 'eeo_app_entry', app_entry_action: 'auto_open', app_state: 'coming_soon' });
    first.unmount();

    renderEntry();
    act(() => { jest.advanceTimersByTime(APP_ENTRY_AUTO_OPEN_DELAY_MS * 2); });
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
  });

  it('never opens by itself on a phone', () => {
    jest.useFakeTimers();
    setDesktop(false);
    renderEntry();
    act(() => { jest.advanceTimersByTime(APP_ENTRY_AUTO_OPEN_DELAY_MS * 2); });
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
  });

  it.each(['/checkout', '/de/checkout/payment', '/booking/confirmation', '/login', '/ar/user/bookings', '/mobile-app'])(
    'never opens by itself on %s',
    (path) => {
      jest.useFakeTimers();
      setDesktop(true);
      mockPathname = path;
      renderEntry();
      act(() => { jest.advanceTimersByTime(APP_ENTRY_AUTO_OPEN_DELAY_MS * 2); });
      expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
    },
  );

  it('never opens by itself while someone is typing', () => {
    jest.useFakeTimers();
    setDesktop(true);
    const search = document.createElement('input');
    document.body.appendChild(search);
    search.focus();
    renderEntry();
    act(() => { jest.advanceTimersByTime(APP_ENTRY_AUTO_OPEN_DELAY_MS); });
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
  });

  it('never opens by itself on a tour page or over an open dialog', () => {
    jest.useFakeTimers();
    setDesktop(true);
    const tourMarker = document.createElement('div');
    tourMarker.setAttribute('data-page-type', 'tour');
    document.body.appendChild(tourMarker);
    const tour = renderEntry();
    act(() => { jest.advanceTimersByTime(APP_ENTRY_AUTO_OPEN_DELAY_MS); });
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
    tour.unmount();
    tourMarker.remove();

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    renderEntry();
    act(() => { jest.advanceTimersByTime(APP_ENTRY_AUTO_OPEN_DELAY_MS); });
    expect(screen.queryByTestId('app-entry-card')).not.toBeInTheDocument();
  });
});

describe('autoOpenAllowedOnPath', () => {
  it.each([
    ['/', true], ['/de', true], ['/tours', true], ['/destinations/luxor', true],
    ['/checkout', false], ['/fr/offer/abc', false], ['/tour/pyramids', false], ['/admin', false],
  ])('%s → %s', (path, allowed) => {
    expect(autoOpenAllowedOnPath(path)).toBe(allowed);
  });
});

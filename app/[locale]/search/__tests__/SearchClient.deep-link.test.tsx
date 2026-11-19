import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import SearchClient, { filtersFromParams } from '../SearchClient';

// 19 Nov 2026, live: opening /search?q=makadi%20atv kept the query on only 2
// of 6 loads. The filters started empty, so the first fetch wrote
// /search?sortBy=relevance over the link before the query reached the box,
// and the page then showed all 100 tours (or none) with an empty search box.

// A faithful stand-in for next/navigation: replacing the URL really does change
// what useSearchParams returns, and really does re-render the subscribers.
// Without that, the defect this test exists for cannot reproduce.
const mockNav = {
  params: new URLSearchParams('sortBy=relevance'),
  listeners: new Set<() => void>(),
  replaceCalls: [] as string[],
  subscribe(listener: () => void) {
    mockNav.listeners.add(listener);
    return () => { mockNav.listeners.delete(listener); };
  },
  read: () => mockNav.params,
  navigate(url: string) {
    mockNav.replaceCalls.push(url);
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    mockNav.params = new URLSearchParams(query);
    mockNav.listeners.forEach((listener) => listener());
  },
};

const routerInstance = {
  replace: (url: string) => mockNav.navigate(url),
  push: jest.fn(),
  prefetch: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => routerInstance,
  usePathname: () => '/search',
  useSearchParams: () => React.useSyncExternalStore(
    mockNav.subscribe,
    mockNav.read,
    mockNav.read,
  ),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/Header', () => ({ __esModule: true, default: () => <header /> }));
jest.mock('@/components/Footer', () => ({ __esModule: true, default: () => <footer /> }));
jest.mock('@/components/user/TourCard', () => ({
  __esModule: true,
  default: ({ tour }: { tour: { title: string } }) => <article>{tour.title}</article>,
}));

const TOURS = [
  { _id: '1', title: 'Giza Pyramids Tour', slug: 'giza', price: 40, duration: '4 hours' },
  { _id: '2', title: 'Luxor Day Trip', slug: 'luxor', price: 90, duration: '12 hours' },
];

let fetchCalls = 0;
let abortedCalls = 0;

beforeEach(() => {
  fetchCalls = 0;
  abortedCalls = 0;
  mockNav.params = new URLSearchParams('sortBy=relevance');
  mockNav.replaceCalls = [];

  // Resolve on a later tick, as a network call does — an effect that re-enters
  // will abort this before it settles, exactly as it did in production.
  global.fetch = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve({
        ok: true,
        json: async () => TOURS,
      } as Response), 10);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        abortedCalls += 1;
        reject(Object.assign(new DOMException('Aborted', 'AbortError')));
      });
    });
  }) as unknown as typeof fetch;
});

async function settle(ms = 60) {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
}

describe('a results link opens with its own filters', () => {
  it('keeps the query from the link in the URL, the box and the request', async () => {
    mockNav.params = new URLSearchParams('q=makadi+atv');
    render(<SearchClient initialTours={[]} categories={[]} destinations={[]} />);
    await settle(500);

    // Every URL the page wrote still carries the query.
    for (const url of mockNav.replaceCalls) expect(url).toContain('q=makadi+atv');
    expect(mockNav.params.get('q')).toBe('makadi atv');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('makadi atv');
    const requested = (global.fetch as jest.Mock).mock.calls.map(([url]) => String(url));
    expect(requested.length).toBeGreaterThan(0);
    for (const url of requested) expect(url).toContain('q=makadi+atv');
  });

  it('keeps filters from the link too', async () => {
    mockNav.params = new URLSearchParams('q=luxor&categories=a,b&minPrice=10&maxPrice=90&ratings=4&sortBy=price-asc');
    render(<SearchClient initialTours={[]} categories={[]} destinations={[]} />);
    await settle(500);
    const url = new URLSearchParams(mockNav.params.toString());
    expect(url.get('q')).toBe('luxor');
    expect(url.get('categories')).toBe('a,b');
    expect(url.get('minPrice')).toBe('10');
    expect(url.get('maxPrice')).toBe('90');
    expect(url.get('ratings')).toBe('4');
    expect(url.get('sortBy')).toBe('price-asc');
  });

  it('a link without filters still opens the full list', async () => {
    mockNav.params = new URLSearchParams('');
    render(<SearchClient initialTours={[]} categories={[]} destinations={[]} />);
    await settle(200);
    expect(await screen.findByText('Giza Pyramids Tour')).toBeInTheDocument();
  });
});

describe('filtersFromParams', () => {
  it('reads every filter, and ignores a half price range', () => {
    expect(filtersFromParams(new URLSearchParams('q=a&categories=x,y&destinations=d&minPrice=5&maxPrice=50&durations=0-2&ratings=4,5&sortBy=rating'))).toEqual({
      q: 'a', categories: ['x', 'y'], destinations: ['d'], priceRange: [5, 50], durations: ['0-2'], ratings: [4, 5], sortBy: 'rating',
    });
    expect(filtersFromParams(new URLSearchParams('minPrice=5')).priceRange).toBeNull();
    expect(filtersFromParams(null)).toMatchObject({ q: '', categories: [], sortBy: 'relevance', priceRange: null });
  });
});

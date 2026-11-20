import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HOSTED_AI_SEARCH_OPEN_EVENT, HOSTED_AI_SEARCH_SCRIPT_ID } from '@/lib/hostedAISearch';

// The trip page's phone search only matched catalogue titles: a question or
// Arabic text ended at "No matching tours" and Enter did nothing. Both now hand
// the words to the AI trip search, in the page's language.

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/ar/some-trip',
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('next-intl', () => ({ useLocale: () => 'ar', useTranslations: () => (key: string) => key }));
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));
jest.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
jest.mock('@/hooks/useCart', () => ({ useCart: () => ({ openCart: jest.fn(), totalItems: 0 }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, logout: jest.fn() }) }));
jest.mock('@/contexts/WishlistContext', () => ({ useWishlist: () => ({ openWishlistSidebar: jest.fn(), wishlist: [] }) }));
jest.mock('@/contexts/NavDataContext', () => ({ useNavData: () => ({ destinations: [], categories: [] }) }));
jest.mock('@/components/shared/CurrencyLanguageSwitcher', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ThemeToggle', () => ({ __esModule: true, default: () => null }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Header2 = require('@/components/Header2').default as React.ComponentType<{ startSolid?: boolean }>;

describe('trip page phone search', () => {
  let requests: unknown[];
  const record = (event: Event) => requests.push((event as CustomEvent).detail);
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    requests = [];
    mockPush.mockClear();
    window.__foxesSearchPending = null;
    window.addEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, record);
    globalThis.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ success: true, data: [] }) })) as unknown as typeof fetch;
    const script = document.createElement('script');
    script.id = HOSTED_AI_SEARCH_SCRIPT_ID;
    document.body.appendChild(script);
  });

  afterEach(() => {
    window.removeEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, record);
    document.getElementById(HOSTED_AI_SEARCH_SCRIPT_ID)?.remove();
    window.__foxesSearchPending = null;
    globalThis.fetch = realFetch;
  });

  async function typeQuestion(question: string) {
    render(<Header2 startSolid />);
    fireEvent.click(screen.getByRole('button', { name: 'header.openSearch' }));
    const input = await screen.findByPlaceholderText('search.searchToursInEgypt');
    fireEvent.change(input, { target: { value: question } });
    return input;
  }

  it('offers the AI trip search when nothing matches, with the question and page language', async () => {
    await typeQuestion('رحلة إلى الأهرامات مع مرشد');
    const ask = await screen.findByRole('button', { name: 'search.askAISearch' }, { timeout: 2000 });
    expect(screen.getByText('search.noMatchingTours')).toBeInTheDocument();

    fireEvent.click(ask);

    expect(requests).toEqual([
      { query: 'رحلة إلى الأهرامات مع مرشد', mode: 'ai', locale: 'ar', destinationSlug: undefined },
    ]);
    await waitFor(() => expect(screen.queryByPlaceholderText('search.searchToursInEgypt')).not.toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('hands the question over on Enter', async () => {
    const input = await typeQuestion('Which pyramids tour has a guide?');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(requests).toEqual([
      { query: 'Which pyramids tour has a guide?', mode: 'ai', locale: 'ar', destinationSlug: undefined },
    ]);
  });

  it('carries the question to the search page when no launcher takes it', async () => {
    jest.useFakeTimers();
    try {
      document.getElementById(HOSTED_AI_SEARCH_SCRIPT_ID)?.remove();
      const input = await typeQuestion('Luxor balloon');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockPush).toHaveBeenCalledWith('/ar/search?q=Luxor%20balloon');
    } finally {
      act(() => { jest.runOnlyPendingTimers(); });
      jest.useRealTimers();
    }
  });

  it('does nothing on Enter for a single character or while composing', async () => {
    const input = await typeQuestion('a');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'Luxor' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(requests).toEqual([]);
  });

  it('labels the trending list from the message files', async () => {
    render(<Header2 startSolid />);
    fireEvent.click(screen.getByRole('button', { name: 'header.openSearch' }));
    expect(await screen.findByText('search.trendingTours')).toBeInTheDocument();
    expect(screen.queryByText('Trending Tours')).not.toBeInTheDocument();
  });
});

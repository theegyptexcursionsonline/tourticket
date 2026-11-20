import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '@/components/Header';
import { HOSTED_AI_SEARCH_OPEN_EVENT, HOSTED_AI_SEARCH_SCRIPT_ID } from '@/lib/hostedAISearch';

// The header search's "AI" button used to run its own chat against a retired
// agent and answered with an empty bubble. It now hands the visitor's words to
// the one hosted AI trip search.

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: jest.fn() }),
}));

// Live results stay in the panel; keep their search client off the network.
jest.mock('algoliasearch/lite', () => ({
  liteClient: () => ({
    search: jest.fn(async (arg: unknown) => {
      const requests = Array.isArray(arg) ? arg : ((arg as { requests?: unknown[] })?.requests ?? []);
      return {
        results: requests.map(() => ({
          hits: [], nbHits: 0, page: 0, nbPages: 0, hitsPerPage: 5,
          processingTimeMS: 1, exhaustiveNbHits: true, query: '', params: '',
        })),
      };
    }),
  }),
}));

describe('header search "AI"', () => {
  let requests: unknown[];
  const record = (event: Event) => requests.push((event as CustomEvent).detail);

  beforeEach(() => {
    requests = [];
    mockPush.mockClear();
    window.__foxesSearchPending = null;
    window.addEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, record);
  });

  afterEach(() => {
    window.removeEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, record);
    document.getElementById(HOSTED_AI_SEARCH_SCRIPT_ID)?.remove();
    window.__foxesSearchPending = null;
  });

  // Labels come from the message files (the test translator returns the key).
  async function typeInHeader(question: string) {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'header.openSearch' }));
    const input = await screen.findByPlaceholderText('search.searchToursInEgypt');
    fireEvent.change(input, { target: { value: question } });
    return input;
  }

  async function askFromHeader(question: string) {
    await typeInHeader(question);
    fireEvent.click(screen.getByRole('button', { name: 'search.askAISearch' }));
  }

  it('hands the typed question to the hosted AI trip search and closes the panel', async () => {
    const script = document.createElement('script');
    script.id = HOSTED_AI_SEARCH_SCRIPT_ID;
    document.body.appendChild(script);

    await askFromHeader('Which pyramids tour do you recommend?');

    expect(requests).toEqual([
      { query: 'Which pyramids tour do you recommend?', mode: 'ai', locale: 'en', destinationSlug: undefined },
    ]);
    await waitFor(() => expect(screen.queryByPlaceholderText('search.searchToursInEgypt')).not.toBeInTheDocument());
    expect(screen.queryByText(/AI Travel Assistant/i)).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('takes the question to the search page when this page runs no AI launcher', async () => {
    await askFromHeader('Best time to visit Luxor?');

    expect(mockPush).toHaveBeenCalledWith('/search?q=Best%20time%20to%20visit%20Luxor%3F');
    expect(window.__foxesSearchPending).toMatchObject({ query: 'Best time to visit Luxor?', mode: 'ai' });
  });

  it('hands the words to the AI trip search when the visitor presses Enter', async () => {
    const script = document.createElement('script');
    script.id = HOSTED_AI_SEARCH_SCRIPT_ID;
    document.body.appendChild(script);

    const input = await typeInHeader('رحلة إلى الأهرامات مع مرشد');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(requests).toEqual([
      { query: 'رحلة إلى الأهرامات مع مرشد', mode: 'ai', locale: 'en', destinationSlug: undefined },
    ]);
    await waitFor(() => expect(screen.queryByPlaceholderText('search.searchToursInEgypt')).not.toBeInTheDocument());
  });

  it('ignores Enter while text is still being composed or is too short', async () => {
    const input = await typeInHeader('a');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'Luxor' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(requests).toEqual([]);
    expect(screen.getByPlaceholderText('search.searchToursInEgypt')).toBeInTheDocument();
  });

  it('shows no hard-coded English in the panel', async () => {
    await typeInHeader('');
    expect(screen.queryByText('Trending Egypt Tours')).not.toBeInTheDocument();
    expect(screen.queryByText('Popular Searches')).not.toBeInTheDocument();
    expect(screen.getByText('search.trendingTours')).toBeInTheDocument();
    expect(screen.getByText('search.popularSearches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'header.closeSearch' })).toBeInTheDocument();
  });
});

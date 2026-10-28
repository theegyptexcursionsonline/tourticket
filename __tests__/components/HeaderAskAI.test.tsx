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

  async function askFromHeader(question: string) {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    const input = await screen.findByPlaceholderText('Search tours, destinations...');
    fireEvent.change(input, { target: { value: question } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask AI about Egypt tours' }));
  }

  it('hands the typed question to the hosted AI trip search and closes the panel', async () => {
    const script = document.createElement('script');
    script.id = HOSTED_AI_SEARCH_SCRIPT_ID;
    document.body.appendChild(script);

    await askFromHeader('Which pyramids tour do you recommend?');

    expect(requests).toEqual([
      { query: 'Which pyramids tour do you recommend?', mode: 'ai', locale: 'en', destinationSlug: undefined },
    ]);
    await waitFor(() => expect(screen.queryByPlaceholderText('Search tours, destinations...')).not.toBeInTheDocument());
    expect(screen.queryByText(/AI Travel Assistant/i)).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('takes the question to the search page when this page runs no AI launcher', async () => {
    await askFromHeader('Best time to visit Luxor?');

    expect(mockPush).toHaveBeenCalledWith('/search?q=Best%20time%20to%20visit%20Luxor%3F');
    expect(window.__foxesSearchPending).toMatchObject({ query: 'Best time to visit Luxor?', mode: 'ai' });
  });
});

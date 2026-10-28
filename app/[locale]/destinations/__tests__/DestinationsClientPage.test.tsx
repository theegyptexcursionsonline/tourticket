import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DestinationsClientPage from '../DestinationsClientPage';
import { HOSTED_AI_SEARCH_OPEN_EVENT, HOSTED_AI_SEARCH_SCRIPT_ID } from '@/lib/hostedAISearch';

// "Open AI Assistant" used to open this page's own chat against a retired agent
// (an empty reply). It now hands the question to the hosted AI trip search.

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/destinations',
  useSearchParams: () => new URLSearchParams(),
}));

const destinations = [
  { _id: 'd1', name: 'Luxor', slug: 'luxor', image: '/luxor.jpg', tourCount: 22, country: 'Egypt', description: 'Temples of Karnak' },
  { _id: 'd2', name: 'Aswan', slug: 'aswan', image: '/aswan.jpg', tourCount: 20, country: 'Egypt', description: 'Philae and the Nile' },
] as unknown as React.ComponentProps<typeof DestinationsClientPage>['destinations'];

describe('destinations page search', () => {
  let requests: unknown[];
  const record = (event: Event) => requests.push((event as CustomEvent).detail);

  beforeEach(() => {
    requests = [];
    mockPush.mockClear();
    window.__foxesSearchPending = null;
    window.addEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, record);
    const script = document.createElement('script');
    script.id = HOSTED_AI_SEARCH_SCRIPT_ID;
    document.body.appendChild(script);
  });

  afterEach(() => {
    window.removeEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, record);
    document.getElementById(HOSTED_AI_SEARCH_SCRIPT_ID)?.remove();
    window.__foxesSearchPending = null;
  });

  it('hands the typed question to the hosted AI trip search instead of its own chat', () => {
    render(<DestinationsClientPage destinations={destinations} />);
    const input = screen.getByPlaceholderText('Search destinations...');

    fireEvent.change(input, { target: { value: 'Best time to visit Luxor?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open AI Assistant' }));

    expect(requests).toEqual([
      { query: 'Best time to visit Luxor?', mode: 'ai', locale: 'en', destinationSlug: undefined },
    ]);
    expect(screen.queryByText('AI Travel Assistant')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.getByText('Luxor')).toBeInTheDocument();
    expect(screen.getByText('Aswan')).toBeInTheDocument();
  });

  it('still filters destinations as the visitor types', () => {
    render(<DestinationsClientPage destinations={destinations} />);

    fireEvent.change(screen.getByPlaceholderText('Search destinations...'), { target: { value: 'lux' } });

    expect(screen.getByText('Found 1 destination')).toBeInTheDocument();
    expect(screen.getByText('Luxor')).toBeInTheDocument();
    expect(screen.queryByText('Aswan')).not.toBeInTheDocument();
    expect(requests).toEqual([]);
  });
});

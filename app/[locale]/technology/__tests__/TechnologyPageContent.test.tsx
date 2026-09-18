import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TechnologyPageContent from '../TechnologyPageContent';
import { HOSTED_AI_SEARCH_OPEN_EVENT } from '@/lib/hostedAISearch';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/en/technology',
}));
jest.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

type Observation = { id: string; tier: 'accepted' | 'preview'; status: 'live' | 'unavailable'; checkedAt: string };

const checkedAt = '2026-09-18T10:00:00.000Z';
const payload = (overrides: Partial<Record<string, Observation['status']>> = {}) => ({
  checkedAt,
  expiresAt: '2026-09-18T10:01:00.000Z',
  capabilities: (
    [
      ['ai-voice', 'accepted'],
      ['ai-search', 'accepted'],
      ['online-booking', 'accepted'],
      ['mobile-apps', 'preview'],
    ] as const
  ).map(([id, tier]) => ({
    id,
    tier,
    status: tier === 'preview' ? 'unavailable' : (overrides[id] ?? 'live'),
    checkedAt,
  })),
});

function mockStatus(responder: () => Promise<Partial<Response>>) {
  globalThis.fetch = jest.fn(responder) as unknown as typeof fetch;
}

describe('TechnologyPageContent', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    cleanup();
    globalThis.fetch = realFetch;
    push.mockReset();
    window.__foxesSearchPending = null;
  });

  it.each([
    ['en', 'The technology behind your Egypt trip'],
    ['ar', 'التقنية التي تقف خلف رحلتك في مصر'],
    ['de', 'Die Technologie hinter Ihrer Ägyptenreise'],
    ['fr', 'La technologie derrière votre voyage en Égypte'],
    ['es', 'La tecnología detrás de tu viaje a Egipto'],
  ])('renders the %s hero and four capability cards', async (locale, title) => {
    mockStatus(async () => ({ ok: true, status: 200, json: async () => payload() }));
    render(<TechnologyPageContent locale={locale} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
    await waitFor(() => expect(screen.getAllByTestId('status-badge-live')).toHaveLength(3));
  });

  it('falls back to English for an unknown locale', async () => {
    mockStatus(async () => ({ ok: true, status: 200, json: async () => payload() }));
    render(<TechnologyPageContent locale="it" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The technology behind your Egypt trip');
    await waitFor(() => expect(screen.getAllByTestId('status-badge-live')).toHaveLength(3));
  });

  it('shows a checking state before the status answers, then Live / Preview from the payload', async () => {
    let resolve: (value: Partial<Response>) => void = () => {};
    mockStatus(() => new Promise<Partial<Response>>((r) => { resolve = r; }));
    render(<TechnologyPageContent locale="en" />);

    expect(screen.getAllByTestId('status-badge-checking')).toHaveLength(3);
    expect(screen.getAllByTestId('status-badge-preview')).toHaveLength(1);

    await act(async () => {
      resolve({ ok: true, status: 200, json: async () => payload() });
    });
    await waitFor(() => expect(screen.getAllByTestId('status-badge-live')).toHaveLength(3));
    expect(screen.queryByTestId('status-badge-checking')).toBeNull();
    // Preview is never promoted by health and has no call to action.
    const mobile = screen.getByTestId('capability-mobile-apps');
    expect(mobile).toHaveTextContent('Preview');
    expect(mobile.querySelector('a, button')).toBeNull();
  });

  it('renders an unavailable badge (never hidden) when a capability probe fails', async () => {
    mockStatus(async () => ({ ok: true, status: 200, json: async () => payload({ 'ai-voice': 'unavailable' }) }));
    render(<TechnologyPageContent locale="en" />);
    await waitFor(() => expect(screen.getAllByTestId('status-badge-live')).toHaveLength(2));
    const voice = screen.getByTestId('capability-ai-voice');
    expect(voice).toHaveTextContent('Status unavailable');
    expect(voice).toHaveTextContent('This service is not answering right now');
    // The ordinary destination link stays reachable.
    expect(voice.querySelector('a')).toHaveAttribute('href', '/ai-voice');
  });

  it('shows the designed error state and marks every accepted capability unavailable when the status route fails', async () => {
    mockStatus(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    render(<TechnologyPageContent locale="en" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getAllByTestId('status-badge-unavailable')).toHaveLength(3);
    expect(screen.getAllByTestId('status-badge-preview')).toHaveLength(1);
    expect(screen.queryByTestId('status-badge-live')).toBeNull();
  });

  it('treats a malformed status body as a failure, not as live', async () => {
    mockStatus(async () => ({ ok: true, status: 200, json: async () => ({ nope: true }) }));
    render(<TechnologyPageContent locale="en" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByTestId('status-badge-live')).toBeNull();
  });

  it('keeps the primary and secondary calls to action as real links', async () => {
    mockStatus(async () => ({ ok: true, status: 200, json: async () => payload() }));
    render(<TechnologyPageContent locale="en" />);
    await waitFor(() => expect(screen.getAllByTestId('status-badge-live')).toHaveLength(3));
    expect(screen.getByRole('link', { name: 'Explore tours' })).toHaveAttribute('href', '/tours');
    expect(screen.getByRole('link', { name: /try the voice concierge/i })).toHaveAttribute('href', '/ai-voice');
    expect(screen.getByRole('link', { name: 'Talk to Nile' })).toHaveAttribute('href', '/ai-voice');
    expect(screen.getByRole('link', { name: 'Browse tours' })).toHaveAttribute('href', '/tours');
  });

  it('wires the trip-search button to the hosted search, with a first-party fallback route', async () => {
    jest.useFakeTimers();
    try {
      mockStatus(async () => ({ ok: true, status: 200, json: async () => payload() }));
      const opened = jest.fn();
      window.addEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, opened);
      render(<TechnologyPageContent locale="en" />);
      // Let the mocked status fetch settle under fake timers.
      await act(async () => { await Promise.resolve(); });
      expect(screen.getAllByTestId('status-badge-live')).toHaveLength(3);

      fireEvent.click(screen.getByRole('button', { name: 'Ask the trip search' }));
      expect(opened).toHaveBeenCalledTimes(1);
      expect(window.__foxesSearchPending).toMatchObject({ mode: 'ai', locale: 'en' });

      // Nobody picked the request up → the visitor lands on the real search page.
      act(() => { jest.advanceTimersByTime(2_300); });
      expect(push).toHaveBeenCalledWith('/search');
      window.removeEventListener(HOSTED_AI_SEARCH_OPEN_EVENT, opened);
    } finally {
      jest.useRealTimers();
    }
  });
});

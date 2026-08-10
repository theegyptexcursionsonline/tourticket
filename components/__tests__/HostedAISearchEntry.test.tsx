import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HostedAISearchEntry from '@/components/HostedAISearchEntry';
import { buildHostedSearchFallbackHref } from '@/lib/hostedAISearch';

const push = jest.fn();
let locale = 'en';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
jest.mock('next-intl', () => ({
  useLocale: () => locale,
}));

describe('HostedAISearchEntry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    push.mockClear();
    locale = 'en';
    window.__foxesSearchPending = null;
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
    window.__foxesSearchPending = null;
  });

  it('opens the hosted launcher with bounded destination context', () => {
    const opened = jest.fn();
    window.addEventListener('foxes:search:open', opened, { once: true });
    render(
      <HostedAISearchEntry
        placeholder="Find Cairo tours"
        initialQuery={`${'x'.repeat(550)} Cairo`}
        destinationSlug="Cairo"
        tone="light"
      />,
    );

    fireEvent.click(screen.getByTestId('hosted-ai-search-entry'));

    const event = opened.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual(expect.objectContaining({
      mode: 'catalog',
      locale: 'en',
      destinationSlug: 'cairo',
    }));
    expect(event.detail.query).toHaveLength(500);
  });

  it('does not navigate after the hosted launcher accepts the request', () => {
    render(<HostedAISearchEntry placeholder="Find tours" initialQuery="Nile cruise" />);
    fireEvent.click(screen.getByTestId('hosted-ai-search-entry'));
    window.__foxesSearchPending = null;

    act(() => jest.advanceTimersByTime(2200));
    expect(push).not.toHaveBeenCalled();
  });

  it('uses the EEO blue brand family without legacy green accents', () => {
    render(<HostedAISearchEntry placeholder="Find tours" />);

    const entry = screen.getByTestId('hosted-ai-search-entry');
    expect(entry.className).toContain('focus-visible:ring-[#4385F6]/35');
    expect(entry.innerHTML).toContain('from-[#4385F6]');
    expect(entry.innerHTML).toContain('to-[#1D5FD0]');
    expect(entry.innerHTML).not.toMatch(/emerald|teal/i);
  });

  it('uses the localized first-party route when the hosted launcher fails', () => {
    locale = 'de';
    render(<HostedAISearchEntry placeholder="Touren suchen" initialQuery="Nilkreuzfahrt" />);
    fireEvent.click(screen.getByTestId('hosted-ai-search-entry'));

    expect(screen.getByText('KI-Reisesuche')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(2200));
    expect(push).toHaveBeenCalledWith('/de/search?q=Nilkreuzfahrt');
  });

  it('builds safe localized fallback links', () => {
    expect(buildHostedSearchFallbackHref('en', 'family tour')).toBe('/search?q=family%20tour');
    expect(buildHostedSearchFallbackHref('unsupported', '')).toBe('/search');
  });
});

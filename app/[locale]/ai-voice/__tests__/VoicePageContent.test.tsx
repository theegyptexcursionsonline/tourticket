import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import VoicePageContent from '../VoicePageContent';

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/en/ai-voice',
}));

describe('VoicePageContent', () => {
  afterEach(() => {
    cleanup();
    delete (window as { foxes?: unknown }).foxes;
    document.getElementById('eeo-voice-concierge-script')?.remove();
    document.getElementById('foxes-voice-widget-frame')?.remove();
  });

  it('renders localized hero copy and grounded feature claims', () => {
    render(<VoicePageContent locale="en" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Talk to Nile');
    expect(screen.getByText(/real Egypt Excursions Online catalog/i)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
  });

  it('renders Arabic copy for the ar locale', () => {
    render(<VoicePageContent locale="ar" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('نايل');
  });

  it('falls back to English for an unknown locale', () => {
    render(<VoicePageContent locale="it" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Talk to Nile');
  });

  it('wires the CTA to the hosted widget open command — no placeholder button', () => {
    const foxes = jest.fn();
    (window as unknown as { foxes: (command: string) => void }).foxes = foxes;

    render(<VoicePageContent locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: /start a voice chat/i }));
    expect(foxes).toHaveBeenCalledWith('open');
  });

  it('mounts the voice concierge loader on the page even while the site-wide launcher ships dark', async () => {
    delete process.env.NEXT_PUBLIC_VOICE_LAUNCHER_ENABLED;
    render(<VoicePageContent locale="en" />);
    await waitFor(() => expect(document.getElementById('eeo-voice-concierge-script')).not.toBeNull());
  });
});

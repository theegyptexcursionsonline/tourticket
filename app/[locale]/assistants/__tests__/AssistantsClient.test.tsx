import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import AssistantsClient from '../AssistantsClient';

const VOICE_SCRIPT_ID = 'eeo-assistants-voice-script';
const BOOKING_SCRIPT_ID = 'eeo-assistants-booking-script';
const VOICE_FRAME_ID = 'foxes-voice-widget-frame';

describe('AssistantsClient', () => {
  afterEach(() => {
    cleanup();
    document.getElementById(VOICE_SCRIPT_ID)?.remove();
    document.getElementById(BOOKING_SCRIPT_ID)?.remove();
    document.getElementById(VOICE_FRAME_ID)?.remove();
    document.getElementById('foxes-v2-sidebar')?.remove();
    delete process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID;
    jest.restoreAllMocks();
  });

  it('mounts the voice widget directly — the page is the opt-in, no global flag', () => {
    render(<AssistantsClient />);
    const script = document.getElementById(VOICE_SCRIPT_ID) as HTMLScriptElement;
    expect(script).toBeInTheDocument();
    expect(script.src).toContain('voice.foxestechnology.com/widget.js');
    expect(script.getAttribute('data-foxes-widget-id')).toBe('694c1a7a27cc23227da2ccdb');
    expect(script.getAttribute('data-foxes-position')).toBe('bottom-left');
    expect(screen.getByTestId('assistants-page')).toHaveClass('pb-40', 'sm:pb-16');
  });

  it('renders no booking section at all while the organization is unconfigured', () => {
    render(<AssistantsClient />);
    expect(document.getElementById(BOOKING_SCRIPT_ID)).toBeNull();
    expect(screen.queryByText('Book directly')).toBeNull();
  });

  it('cache-busts the configured booking release and keeps the public API contract', () => {
    process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID = 'qa-booking-org';
    render(<AssistantsClient />);

    const script = document.getElementById(BOOKING_SCRIPT_ID) as HTMLScriptElement;
    expect(script).toBeInTheDocument();
    expect(script.src).toBe(
      'https://booking.foxestechnology.com/widget/foxes-booking-v2.js?v=683bc4a',
    );
    expect(script.getAttribute('data-org-id')).toBe('qa-booking-org');
    expect(script.getAttribute('data-api-url')).toBe(
      'https://foxes-api-production.up.railway.app/api/v1',
    );
    expect(screen.getByText('Book directly')).toBeInTheDocument();
  });

  it('cleans both widgets up on unmount', () => {
    const { unmount } = render(<AssistantsClient />);
    expect(document.getElementById(VOICE_SCRIPT_ID)).not.toBeNull();
    unmount();
    expect(document.getElementById(VOICE_SCRIPT_ID)).toBeNull();
  });

  it('keeps the two collapsed launchers independently tappable on a phone', async () => {
    jest.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(max-width: 639px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID = 'qa-booking-org';
    render(<AssistantsClient />);

    const frame = document.createElement('iframe');
    frame.id = VOICE_FRAME_ID;
    jest.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
      x: 12,
      y: 740,
      width: 302,
      height: 92,
      top: 740,
      right: 314,
      bottom: 832,
      left: 12,
      toJSON: () => ({}),
    });
    await act(async () => {
      document.body.appendChild(frame);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    });

    expect(frame.style.bottom).toBe('72px');
    expect(frame.style.getPropertyPriority('bottom')).toBe('important');
  });

  it('removes the Voice launcher from the interaction layer while Booking is open', async () => {
    process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID = 'qa-booking-org';
    render(<AssistantsClient />);
    const frame = document.createElement('iframe');
    frame.id = VOICE_FRAME_ID;
    const bookingSidebar = document.createElement('div');
    bookingSidebar.id = 'foxes-v2-sidebar';
    bookingSidebar.setAttribute('role', 'dialog');
    bookingSidebar.setAttribute('aria-hidden', 'true');

    await act(async () => {
      document.body.append(frame, bookingSidebar);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      bookingSidebar.setAttribute('aria-hidden', 'false');
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    });

    expect(frame.style.visibility).toBe('hidden');
    expect(frame.style.pointerEvents).toBe('none');

    await act(async () => {
      bookingSidebar.setAttribute('aria-hidden', 'true');
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    });
    expect(frame.style.visibility).toBe('');
    expect(frame.style.pointerEvents).toBe('');
  });
});

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AssistantsClient from '../AssistantsClient';

let locale = 'en';

jest.mock('next-intl', () => ({
  useLocale: () => locale,
}));

const VOICE_SCRIPT_ID = 'eeo-assistants-voice-script';
const BOOKING_SCRIPT_ID = 'eeo-assistants-booking-script';
const VOICE_FRAME_ID = 'foxes-voice-widget-frame';
const SEARCH_HOST_ID = 'foxes-launcher-host';

function installMatchMedia(mobile = false) {
  jest.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: mobile && query === '(max-width: 639px)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

async function exposeReadyWidgets() {
  const searchHost = document.createElement('div');
  searchHost.id = SEARCH_HOST_ID;
  searchHost.attachShadow({ mode: 'open' });

  const voiceFrame = document.createElement('iframe');
  voiceFrame.id = VOICE_FRAME_ID;
  voiceFrame.style.display = 'block';
  voiceFrame.style.width = '112px';
  voiceFrame.style.height = '112px';

  const bookingRoot = document.createElement('div');
  bookingRoot.className = 'foxes-widget-v2';
  const bookingTrigger = document.createElement('button');
  bookingTrigger.id = 'foxes-v2-trigger';
  const bookingSidebar = document.createElement('div');
  bookingSidebar.id = 'foxes-v2-sidebar';
  bookingSidebar.setAttribute('aria-hidden', 'true');
  bookingSidebar.setAttribute('inert', '');
  const bookingStage = document.createElement('div');
  bookingStage.id = 'foxes-v2-stage';
  bookingStage.appendChild(document.createElement('article'));
  bookingRoot.append(bookingTrigger, bookingSidebar, bookingStage);

  await act(async () => {
    document.body.append(searchHost, voiceFrame, bookingRoot);
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  });

  await waitFor(() => {
    expect(screen.getByTestId('open-search-assistant')).toBeEnabled();
    expect(screen.getByTestId('open-voice-assistant')).toBeEnabled();
    expect(screen.getByTestId('open-booking-assistant')).toBeEnabled();
  });

  return { searchHost, voiceFrame, bookingTrigger };
}

describe('AssistantsClient', () => {
  beforeEach(() => {
    locale = 'en';
    process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID = 'qa-booking-org';
    installMatchMedia();
    window.foxes = jest.fn();
    window.openFoxesBooking = jest.fn(async () => undefined);
    window.closeFoxesBooking = jest.fn();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    document.head.querySelectorAll('style').forEach((style) => {
      if (style.textContent?.includes('.foxes-widget-v2')) style.remove();
    });
    delete process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID;
    delete window.foxes;
    delete window.openFoxesBooking;
    delete window.closeFoxesBooking;
    jest.restoreAllMocks();
  });

  it('mounts the real Voice and Booking embeds with the pinned production contracts', () => {
    render(<AssistantsClient />);

    const voiceScript = document.getElementById(VOICE_SCRIPT_ID) as HTMLScriptElement;
    expect(voiceScript.src).toContain('voice.foxestechnology.com/widget.js');
    expect(voiceScript.getAttribute('data-foxes-widget-id')).toBe('694c1a7a27cc23227da2ccdb');
    expect(voiceScript.getAttribute('data-foxes-position')).toBe('bottom-left');

    const bookingScript = document.getElementById(BOOKING_SCRIPT_ID) as HTMLScriptElement;
    expect(bookingScript.src).toBe(
      'https://booking.foxestechnology.com/widget/foxes-booking-v2.js?v=683bc4a',
    );
    expect(bookingScript.getAttribute('data-org-id')).toBe('qa-booking-org');
    expect(bookingScript.getAttribute('data-api-url')).toBe(
      'https://foxes-api-production.up.railway.app/api/v1',
    );
  });

  it('shows all three assistants with honest loading states before their runtimes are usable', () => {
    render(<AssistantsClient />);

    expect(screen.getByRole('heading', { name: 'AI trip search' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Voice concierge' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Booking preview' })).toBeInTheDocument();
    expect(screen.getAllByText('Connecting…')).toHaveLength(3);
    expect(screen.getByTestId('open-search-assistant')).toBeDisabled();
    expect(screen.getByText(/no payment is charged/i)).toBeInTheDocument();
  });

  it('enables real launch actions only after each rendered widget is usable', async () => {
    render(<AssistantsClient />);
    const { searchHost, voiceFrame, bookingTrigger } = await exposeReadyWidgets();

    expect(searchHost.shadowRoot?.getElementById('eeo-assistants-search-style')).toHaveTextContent(
      '.launcher{display:none!important}',
    );
    expect(voiceFrame.style.visibility).toBe('hidden');
    expect(voiceFrame.style.getPropertyPriority('visibility')).toBe('important');
    expect(bookingTrigger.style.display).toBe('none');
    expect(bookingTrigger.style.getPropertyPriority('display')).toBe('important');
    expect(screen.getAllByText('Ready')).toHaveLength(3);
  });

  it('opens one assistant at a time through the providers’ host APIs', async () => {
    render(<AssistantsClient />);
    await exposeReadyWidgets();
    const searchOpened = jest.fn();
    window.addEventListener('foxes:search:open', searchOpened);

    fireEvent.click(screen.getByTestId('open-booking-assistant'));
    expect(window.foxes).toHaveBeenCalledWith('close');
    expect(window.openFoxesBooking).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('open-voice-assistant'));
    expect(window.closeFoxesBooking).toHaveBeenCalled();
    await act(async () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())));
    expect(window.foxes).toHaveBeenCalledWith('open');

    fireEvent.click(screen.getByTestId('open-search-assistant'));
    await act(async () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())));
    expect(searchOpened).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ mode: 'catalog', locale: 'en' }) }),
    );
    expect(window.closeFoxesBooking).toHaveBeenCalled();
    expect(window.foxes).toHaveBeenCalledWith('close');

    window.removeEventListener('foxes:search:open', searchOpened);
  });

  it('marks a provider unavailable when its public script fails instead of claiming readiness', () => {
    render(<AssistantsClient />);

    fireEvent.error(document.getElementById(VOICE_SCRIPT_ID) as HTMLScriptElement);
    fireEvent.error(document.getElementById(BOOKING_SCRIPT_ID) as HTMLScriptElement);

    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
    expect(screen.getByTestId('open-voice-assistant')).toBeDisabled();
    expect(screen.getByTestId('open-booking-assistant')).toBeDisabled();
  });

  it('renders the complete RTL Arabic experience and mirrors the Voice launcher', () => {
    locale = 'ar';
    render(<AssistantsClient />);

    expect(screen.getByTestId('assistants-page')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('heading', { name: 'خطّط لرحلتك إلى مصر بالطريقة التي تناسبك.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'بحث الرحلات بالذكاء الاصطناعي' })).toBeInTheDocument();
    expect(document.getElementById(VOICE_SCRIPT_ID)).toHaveAttribute('data-foxes-position', 'bottom-right');
  });

  it('renders Booking as unavailable when the organization is not configured and never mounts a dead embed', () => {
    delete process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID;
    render(<AssistantsClient />);

    expect(document.getElementById(BOOKING_SCRIPT_ID)).toBeNull();
    expect(screen.getByTestId('open-booking-assistant')).toBeDisabled();
    expect(screen.getByText('Booking preview')).toBeInTheDocument();
  });

  it('cleans provider chrome and restores the host page on route exit', async () => {
    const { unmount } = render(<AssistantsClient />);
    const { searchHost } = await exposeReadyWidgets();
    const providerStyle = document.createElement('style');
    providerStyle.textContent = '.foxes-widget-v2{display:block}';
    document.head.appendChild(providerStyle);
    document.body.style.overflow = 'hidden';

    unmount();

    expect(document.getElementById(VOICE_SCRIPT_ID)).toBeNull();
    expect(document.getElementById(BOOKING_SCRIPT_ID)).toBeNull();
    expect(document.querySelector('.foxes-widget-v2')).toBeNull();
    expect(searchHost.shadowRoot?.getElementById('eeo-assistants-search-style')).toBeNull();
    expect(providerStyle).not.toBeInTheDocument();
    expect(window.foxes).toHaveBeenCalledWith('destroy');
    expect(document.body.style.overflow).toBe('');
  });
});

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import AssistantsClient from '../AssistantsClient';

const VOICE_SCRIPT_ID = 'eeo-assistants-voice-script';
const BOOKING_SCRIPT_ID = 'eeo-assistants-booking-script';

describe('AssistantsClient', () => {
  afterEach(() => {
    cleanup();
    document.getElementById(VOICE_SCRIPT_ID)?.remove();
    document.getElementById(BOOKING_SCRIPT_ID)?.remove();
    delete process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID;
  });

  it('mounts the voice widget directly — the page is the opt-in, no global flag', () => {
    render(<AssistantsClient />);
    const script = document.getElementById(VOICE_SCRIPT_ID) as HTMLScriptElement;
    expect(script).toBeInTheDocument();
    expect(script.src).toContain('voice.foxestechnology.com/widget.js');
    expect(script.getAttribute('data-foxes-widget-id')).toBe('694c1a7a27cc23227da2ccdb');
  });

  it('renders no booking section at all while the organization is unconfigured', () => {
    render(<AssistantsClient />);
    expect(document.getElementById(BOOKING_SCRIPT_ID)).toBeNull();
    expect(screen.queryByText('Book directly')).toBeNull();
  });

  it('cleans both widgets up on unmount', () => {
    const { unmount } = render(<AssistantsClient />);
    expect(document.getElementById(VOICE_SCRIPT_ID)).not.toBeNull();
    unmount();
    expect(document.getElementById(VOICE_SCRIPT_ID)).toBeNull();
  });
});

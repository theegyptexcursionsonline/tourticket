import React from 'react';
import { cleanup, render, act } from '@testing-library/react';
import EEOVoiceConcierge from '@/components/EEOVoiceConcierge';

let pathname = '/en';
let locale = 'en';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));
jest.mock('next-intl', () => ({
  useLocale: () => locale,
}));

const SCRIPT_ID = 'eeo-voice-concierge-script';
const FRAME_ID = 'foxes-voice-widget-frame';

function renderConcierge(flag: string | undefined) {
  if (flag === undefined) {
    delete process.env.NEXT_PUBLIC_VOICE_LAUNCHER_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_VOICE_LAUNCHER_ENABLED = flag;
  }
  return render(<EEOVoiceConcierge />);
}

describe('EEOVoiceConcierge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    pathname = '/en';
    locale = 'en';
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    document.getElementById(SCRIPT_ID)?.remove();
    document.getElementById(FRAME_ID)?.remove();
    document.querySelector('[data-page-type="tour"]')?.remove();
    delete process.env.NEXT_PUBLIC_VOICE_LAUNCHER_ENABLED;
  });

  it('ships dark: renders nothing at all without the explicit flag', () => {
    renderConcierge(undefined);
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(document.getElementById(SCRIPT_ID)).toBeNull();
  });

  it('injects the voice widget with the EEO widget id on the opposite corner from search', () => {
    renderConcierge('true');
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
    expect(script).toBeInTheDocument();
    expect(script.src).toContain('voice.foxestechnology.com/widget.js');
    expect(script.getAttribute('data-foxes-widget-id')).toBe('694c1a7a27cc23227da2ccdb');
    expect(script.getAttribute('data-foxes-position')).toBe('bottom-left');
  });

  it('mirrors to the other corner under RTL so the two assistants never stack', () => {
    pathname = '/ar';
    locale = 'ar';
    renderConcierge('true');
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
    expect(script.getAttribute('data-foxes-position')).toBe('bottom-right');
  });

  it('defers injection past first paint instead of competing with page content', () => {
    renderConcierge('true');
    expect(document.getElementById(SCRIPT_ID)).toBeNull();
    act(() => {
      jest.advanceTimersByTime(2_499);
    });
    expect(document.getElementById(SCRIPT_ID)).toBeNull();
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(document.getElementById(SCRIPT_ID)).not.toBeNull();
  });

  it.each(['/en/checkout', '/en/tour/giza-day-trip', '/ar/admin', '/en/offer/cairo', '/en/cart'])(
    'stays off funnel and account surfaces (%s)',
    (path) => {
      pathname = path;
      renderConcierge('true');
      act(() => {
        jest.advanceTimersByTime(10_000);
      });
      expect(document.getElementById(SCRIPT_ID)).toBeNull();
    },
  );

  it('suppresses the rendered frame on a page that declares itself a tour', () => {
    renderConcierge('true');
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    // widget.js creates the frame after the script loads; simulate that, then
    // let the resize-driven sync pass over it.
    const marker = document.createElement('div');
    marker.setAttribute('data-page-type', 'tour');
    document.body.appendChild(marker);
    const frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    document.body.appendChild(frame);
    act(() => {
      window.dispatchEvent(new Event('resize'));
      jest.advanceTimersByTime(50);
    });
    expect((document.getElementById(FRAME_ID) as HTMLElement).style.visibility).toBe('hidden');
  });

  it('removes its script when navigating into a hidden route', () => {
    const { rerender, unmount } = renderConcierge('true');
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    expect(document.getElementById(SCRIPT_ID)).not.toBeNull();
    unmount();
    expect(document.getElementById(SCRIPT_ID)).toBeNull();
    void rerender;
  });
});

/**
 * Measured live before this hook existed: the booking drawer let the page
 * scroll 600px behind it, never moved focus off <body>, and ignored Escape.
 * These cases pin all of that, plus the nesting case that naive scroll locks
 * get wrong.
 */
import React, { useRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useModalBehavior } from '@/hooks/useModalBehavior';

function Dialog({
  isOpen,
  onClose,
  lockScroll,
  closeOnEscape,
  label = 'panel',
}: {
  isOpen: boolean;
  onClose: () => void;
  lockScroll?: boolean;
  closeOnEscape?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalBehavior(ref, isOpen, onClose, { lockScroll, closeOnEscape });
  if (!isOpen) return null;
  return (
    <div ref={ref} role="dialog" aria-modal="true">
      <button>{`${label} first`}</button>
      <button>{`${label} last`}</button>
    </div>
  );
}

const flushFrame = async () => {
  await act(async () => {
    jest.advanceTimersByTime(20);
    await Promise.resolve();
  });
};

describe('useModalBehavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // jsdom has no rAF timing; run the callback on a timer instead.
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return window.setTimeout(() => cb(performance.now()), 0) as unknown as number;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      window.clearTimeout(id as unknown as NodeJS.Timeout);
    });
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('locks the page behind an open dialog and restores it on close', async () => {
    const { rerender } = render(<Dialog isOpen onClose={() => {}} />);
    await flushFrame();
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Dialog isOpen={false} onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('moves focus into the dialog instead of leaving it on the page', async () => {
    render(<Dialog isOpen onClose={() => {}} />);
    await flushFrame();
    expect(document.activeElement).toBe(screen.getByText('panel first'));
  });

  it('closes on Escape', async () => {
    const onClose = jest.fn();
    render(<Dialog isOpen onClose={onClose} />);
    await flushFrame();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('honours closeOnEscape: false for steps the customer must resolve', async () => {
    const onClose = jest.fn();
    render(<Dialog isOpen onClose={onClose} closeOnEscape={false} />);
    await flushFrame();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('wraps Tab from the last control back to the first', async () => {
    render(<Dialog isOpen onClose={() => {}} />);
    await flushFrame();
    const last = screen.getByText('panel last');
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByText('panel first'));
  });

  it('wraps Shift+Tab from the first control to the last', async () => {
    render(<Dialog isOpen onClose={() => {}} />);
    await flushFrame();
    screen.getByText('panel first').focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByText('panel last'));
  });

  it('returns focus to the control that opened the dialog', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Book now';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<Dialog isOpen onClose={() => {}} />);
    await flushFrame();
    expect(document.activeElement).not.toBe(trigger);

    rerender(<Dialog isOpen={false} onClose={() => {}} />);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('keeps the page locked until the LAST nested dialog closes', async () => {
    const { rerender } = render(
      <>
        <Dialog isOpen onClose={() => {}} label="outer" />
        <Dialog isOpen onClose={() => {}} label="inner" />
      </>,
    );
    await flushFrame();
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <>
        <Dialog isOpen onClose={() => {}} label="outer" />
        <Dialog isOpen={false} onClose={() => {}} label="inner" />
      </>,
    );
    // The outer dialog is still open — unlocking here would let the page
    // scroll behind it.
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <>
        <Dialog isOpen={false} onClose={() => {}} label="outer" />
        <Dialog isOpen={false} onClose={() => {}} label="inner" />
      </>,
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('does nothing at all while closed', async () => {
    const onClose = jest.fn();
    render(<Dialog isOpen={false} onClose={onClose} />);
    await flushFrame();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('');
  });

  it('can opt out of the scroll lock', async () => {
    render(<Dialog isOpen onClose={() => {}} lockScroll={false} />);
    await flushFrame();
    expect(document.body.style.overflow).toBe('');
  });
});

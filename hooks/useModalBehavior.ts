'use client';

import { useEffect, useRef } from 'react';

/**
 * The behaviour every dialog on the site is expected to have and none of them
 * had: Escape closes, the page behind stops scrolling, focus moves into the
 * panel and stays there while it is open, and the trigger gets focus back on
 * close. Measured live on the booking drawer before this existed — the page
 * scrolled 600px behind the open modal and focus never left <body>.
 *
 * Pass the element that wraps the dialog and the open flag; the hook is inert
 * while closed, so it is safe to call unconditionally.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Deliberately not `offsetParent !== null`: that reports null for any
// position:fixed element, and these panels pin their own close buttons, so it
// would drop them out of the tab cycle.
function isReachable(el: HTMLElement): boolean {
  if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

// Nested dialogs (booking drawer opening a confirmation) must not let the
// inner one unlock the page when it closes, so the lock is reference-counted.
let scrollLockDepth = 0;
let restoreBodyStyle: { overflow: string; paddingRight: string } | null = null;

function lockScroll() {
  if (typeof document === 'undefined') return;
  scrollLockDepth += 1;
  if (scrollLockDepth > 1) return;

  const { body } = document;
  restoreBodyStyle = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  // Replacing the scrollbar with padding keeps the page from jumping sideways
  // the moment a dialog opens.
  const gap = window.innerWidth - document.documentElement.clientWidth;
  if (gap > 0) {
    const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + gap}px`;
  }
  body.style.overflow = 'hidden';
}

function unlockScroll() {
  if (typeof document === 'undefined' || scrollLockDepth === 0) return;
  scrollLockDepth -= 1;
  if (scrollLockDepth > 0 || !restoreBodyStyle) return;

  document.body.style.overflow = restoreBodyStyle.overflow;
  document.body.style.paddingRight = restoreBodyStyle.paddingRight;
  restoreBodyStyle = null;
}

export interface ModalBehaviorOptions {
  /** Skip the page-scroll lock — for non-blocking panels that allow scrolling. */
  lockScroll?: boolean;
  /** Skip Escape-to-close, e.g. a step the customer must resolve explicitly. */
  closeOnEscape?: boolean;
}

export function useModalBehavior(
  containerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
  options: ModalBehaviorOptions = {},
) {
  const { lockScroll: shouldLockScroll = true, closeOnEscape = true } = options;
  // Keeping the callback in a ref lets callers pass an inline arrow without
  // tearing down the listeners on every render. Assigned in an effect, not
  // during render, so it stays a legal ref write.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (shouldLockScroll) lockScroll();

    // The panel usually animates in, so the first focusable element may not
    // exist on this tick.
    const focusFrame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container || container.contains(document.activeElement)) return;
      const first = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).find(isReachable);
      if (first) {
        first.focus();
      } else {
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isReachable);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Wrap at both ends, and pull focus back in if it has escaped the panel.
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown, true);
      if (shouldLockScroll) unlockScroll();
      // Returning the customer to the control they opened the panel from is
      // what makes keyboard navigation feel finished.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, containerRef, shouldLockScroll, closeOnEscape]);
}

export default useModalBehavior;

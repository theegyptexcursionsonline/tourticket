/**
 * A mounted modal is not necessarily open. Off-canvas drawers often keep a
 * measurable box in the DOM while closed, so geometry alone produces false
 * positives that hide unrelated fixed controls.
 */
export function isOpenBlockingModal(dialog: HTMLElement) {
  if (dialog.closest('.gm-style')) return false;
  if (dialog.hidden || dialog.getAttribute('aria-hidden') === 'true' || dialog.hasAttribute('inert')) {
    return false;
  }

  const style = window.getComputedStyle(dialog);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  return dialog.getClientRects().length > 0;
}

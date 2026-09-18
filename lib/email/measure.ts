// lib/email/measure.ts
//
// Real measurement of a rendered email at phone width, shared by the golden
// test suite and the preview harness so the budget the tests enforce and the
// number the harness prints are the same number.
//
// Measured, never estimated: the standard's budgets are pixel budgets on the
// rendered output, and a layout model in TypeScript would only ever agree with
// itself.

/** The phone the owner reads these on. */
export const MOBILE_WIDTH = 390;
/** Visible height of one screen at that width — the "first screen" budget. */
export const FIRST_SCREEN = 844;

export interface EmailMeasurement {
  /** Full scroll height of the message. */
  height: number;
  /** Distance from the top of the document to the top of the headline. */
  chrome: number;
  /** True when the page is wider than the viewport. */
  horizontalScroll: number;
}

export const BUDGETS = {
  chrome: 140,
  routineHeight: 1_700,
  bookingConfirmationHeight: 1_600,
} as const;

/**
 * Run inside the page. Kept as a standalone function so both callers evaluate
 * exactly the same script.
 */
export function measureInPage(): EmailMeasurement {
  const doc = document.documentElement;
  const headline = document.querySelector('h1');
  const chrome = headline ? headline.getBoundingClientRect().top + window.scrollY : -1;
  return {
    height: doc.scrollHeight,
    chrome: Math.round(chrome),
    horizontalScroll: doc.scrollWidth - window.innerWidth,
  };
}

/**
 * Make a rendered email measurable in a browser without lying about its size.
 *
 * The QR voucher is a `cid:` reference to an attachment on the message, which
 * no browser can resolve — it collapses to a broken-image box, so a naive
 * measurement reports an email ~130px shorter than the one the customer opens.
 * A 1x1 transparent PNG stands in: the img carries an explicit width and
 * `height:auto`, and a QR code is square, so the substitute occupies exactly
 * the box the real code will.
 */
const SQUARE_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export function measurableHtml(html: string): string {
  return html.replace(/src="cid:[^"]*"/g, `src="${SQUARE_PIXEL}"`);
}

/** The budget that applies to one template. */
export function heightBudget(type: string): number {
  return type === 'booking-confirmation'
    ? BUDGETS.bookingConfirmationHeight
    : BUDGETS.routineHeight;
}

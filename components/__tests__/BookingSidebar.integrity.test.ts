/**
 * The booking drawer is the money surface, and it used to invent things:
 * three demo add-ons that were genuinely charged, a "was" price and a saving
 * derived from arithmetic, a 4.5 star rating for unreviewed tours, and a
 * calendar that showed blocked dates as open whenever the stop-sale fetch
 * failed. Source-level assertions match this file's existing convention —
 * the component is far too large to mount here.
 */
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'BookingSidebar.tsx'),
  'utf8',
);

describe('BookingSidebar sells only what the operator configured', () => {
  it.each([
    'photo-package',
    'transport-premium',
    'refreshment-upgrade',
    'Professional Photography Package',
    'Premium Hotel Transfer Service',
    'Gourmet Refreshment Package',
  ])('does not ship the demo add-on %p', (needle) => {
    expect(source).not.toContain(needle);
  });

  it('falls back to no add-ons rather than a default catalogue', () => {
    expect(source).toMatch(/addOnsToUse\s*=\s*\[\];/);
    expect(source).not.toMatch(/addOnsToUse\s*=\s*addOnData\b/);
  });

  it('never derives an original price or a saving from the price', () => {
    expect(source).not.toMatch(/price\s*\*\s*1\.3/);
    expect(source).not.toMatch(/price\s*\*\s*0\.3/);
  });
});

describe('BookingSidebar states only what the data proves', () => {
  it('has no invented default rating', () => {
    expect(source).not.toMatch(/tour\.rating\s*\|\|\s*4\.5/);
  });

  it('resolves the option-card rating through the shared resolver', () => {
    expect(source).toContain('provableRating(tour.rating, tour.reviews)');
  });

  it('gates the "Highly rated" chip on a proven rating', () => {
    const marker = source.indexOf('Highly rated');
    expect(marker).toBeGreaterThan(-1);
    // The nearest preceding conditional must be the proven-rating guard.
    expect(source.slice(Math.max(0, marker - 320), marker)).toContain('provenRating');
  });

  it('does not tell the customer an unavailable date is available', () => {
    expect(source).not.toContain("toast('Tour available on this date.'");
    expect(source).toContain('This tour does not run on the selected date.');
  });
});

describe('BookingSidebar availability fails closed', () => {
  it('reports whether any stop-sale month failed to load', () => {
    expect(source).toMatch(/return \{ days: next, failed \}/);
    expect(source).toMatch(/failed: true/);
  });

  it('tracks the failure in state rather than swallowing it', () => {
    expect(source).toContain('setStopSaleLoadFailed');
    expect(source).toContain('stopSaleLoadFailed');
  });

  it('renders a designed error with a retry instead of an open calendar', () => {
    expect(source).toContain("We couldn&apos;t confirm live availability");
    expect(source).toContain('onRetryStopSales');
  });

  it('no longer claims the fetch failure is non-fatal', () => {
    expect(source).not.toContain('the calendar degrades to its pre-stop-sale behavior');
  });
});

describe('BookingSidebar dialog behaviour', () => {
  it('uses the shared modal behaviour hook', () => {
    expect(source).toContain("from '@/hooks/useModalBehavior'");
    expect(source).toMatch(/useModalBehavior\(dialogRef, isOpen, onClose\)/);
    expect(source).toContain('touch-pan-y');
    expect(source).toContain('[-webkit-overflow-scrolling:touch]');
  });

  it('attaches the dialog ref to the aria-modal container', () => {
    const dialogIndex = source.indexOf('role="dialog"');
    expect(dialogIndex).toBeGreaterThan(-1);
    expect(source.slice(Math.max(0, dialogIndex - 400), dialogIndex)).toContain('ref={dialogRef}');
  });
});

describe('BookingSidebar participant rows carry no static pricing claims', () => {
  // Client sheet row 51: guest prices come from the booking option/slot
  // (guestPrices.child / guestPrices.infant, with per-option fallbacks), so
  // fixed "Full price / 50% discount / Free" captions misstate the real
  // price whenever an operator configures their own rates. The rows keep
  // the age bands and nothing else.
  it.each(['• Full price', '• 50% discount', '• Free'])(
    'does not hardcode %p under the participants selector',
    (needle) => {
      expect(source).not.toContain(needle);
    },
  );

  it('still tells the customer which ages each category covers', () => {
    expect(source).toContain('Age 13+');
    expect(source).toContain('Age 4-12');
    expect(source).toContain('Age 0-3');
  });
});

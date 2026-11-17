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
    const marker = source.indexOf("t('booking.highlyRated')");
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
    expect(source).toMatch(/return \{ days: next, failed, requestId \}/);
    expect(source).toMatch(/failed: true/);
    expect(source).toContain('if (cancelled || requestId !== availabilityRequest.current) return;');
    expect(source).toContain('if (requestId !== availabilityRequest.current) return;');
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
    expect(source).toContain("t('booking.ageAdultRange')");
    expect(source).toContain("t('booking.ageChildRange')");
    expect(source).toContain("t('booking.ageInfantRange')");
    // Same age bands in every language the site offers.
    for (const locale of ['en', 'ar', 'de', 'fr', 'es']) {
      const booking = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', `${locale}.json`), 'utf8')).booking;
      expect(booking.ageAdultRange).toMatch(/13/);
      expect(booking.ageChildRange).toMatch(/4[^0-9]+12/);
      expect(booking.ageInfantRange).toMatch(/0[^0-9]+3/);
    }
    expect(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', 'en.json'), 'utf8')).booking.ageAdultRange).toBe('Age 13+');
  });
});

describe('BookingSidebar speaks the visitor language on every booking step', () => {
  const messages = Object.fromEntries(
    ['en', 'ar', 'de', 'fr', 'es'].map((locale) => [
      locale,
      JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', `${locale}.json`), 'utf8')).booking,
    ]),
  );

  it.each([
    ['selected!`', 'departure toast'],
    ['Per Adult:', 'adult rate'],
    ['Per Child:', 'child rate'],
    ['Per Infant:', 'infant rate'],
    ['>Age 13+<', 'adult age band'],
    ['{option.difficulty}</span>', 'difficulty'],
    ["{adults} Adult{adults > 1", 'guest summary'],
    ["Max ${tourDisplayData?.maxGroupSize || 15}", 'group size'],
  ])('has no fixed English %s (%s)', (fragment) => {
    // The group size strings were data passed along, never rendered; the
    // badge itself must come from the trip, not an invented 15.
    if (fragment.startsWith('Max ')) {
      expect(source).toContain("t('booking.maxGuests', { count: tour.maxGroupSize })");
      expect(source).not.toContain("{t('tourCard.max')} {tourDisplayData?.maxGroupSize || 15}");
      return;
    }
    expect(source).not.toContain(fragment);
  });

  it.each([
    'perAdultRate', 'perChildRate', 'perInfantRate', 'ageAdultRange', 'ageChildRange', 'ageInfantRange',
    'difficultyEasy', 'difficultyModerate', 'difficultyChallenging', 'difficultyDifficult', 'maxGuests', 'departureSelected',
  ])('has %s in every offered language, with its placeholders', (key) => {
    const placeholders = (value: string) => (value.match(/\{\w+\}/g) || []).sort().join(',');
    for (const locale of ['ar', 'de', 'fr', 'es']) {
      expect(typeof messages[locale][key]).toBe('string');
      expect(placeholders(messages[locale][key])).toBe(placeholders(messages.en[key]));
    }
    expect(messages.ar[key]).toMatch(/[؀-ۿ]/);
  });
});

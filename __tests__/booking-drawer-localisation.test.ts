export {};
// The booking drawer is the checkout funnel on a five-locale storefront
// (ar/de/en/es/fr). It shipped entirely in hardcoded English: a German or
// Arabic customer read "spots left", "Fully booked" and "Select the best
// option for your group of" in the middle of an otherwise translated page.
const fs = require('fs');
const path = require('path');
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const LOCALES = ['en', 'de', 'fr', 'es', 'ar'];
const SRC = 'components/BookingSidebar.tsx';

/** Keys the drawer asks for at runtime. */
function keysUsed(src: string): string[] {
  return [...new Set((src.match(/\bt\('([a-zA-Z][\w.]*)'/g) || []).map((m) => m.slice(3, -1)))];
}

function lookup(messages: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (cur, part) => (cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined),
    messages,
  );
}

describe('the booking drawer is translated, not hardcoded English', () => {
  it('asks for its copy through next-intl', () => {
    const src = read(SRC);
    expect(src).toContain("import { useTranslations } from 'next-intl';");
    // Every component in the file needs its own translator, not just the shell.
    expect((src.match(/const t = useTranslations\(\);/g) || []).length).toBeGreaterThanOrEqual(6);
    expect(keysUsed(src).length).toBeGreaterThan(30);
  });

  it.each(LOCALES)('%s defines every key the drawer asks for', (locale) => {
    const messages = JSON.parse(read(`messages/${locale}.json`));
    const missing = keysUsed(read(SRC)).filter((key) => typeof lookup(messages, key) !== 'string');
    expect(missing).toEqual([]);
  });

  it('leaves no English booking copy behind in the markup', () => {
    const src = read(SRC);
    const banned = [
      'spots left`', "'Fully booked'", "'Fully Booked'", 'times available`',
      "'Recommended'}", '>Instant confirmation<', '>Highly rated<',
      "'No date selected'", "'No time selected'", "'Choose a departure time'",
      "'Hide details'", "'View times'", "'Show less'", "'Read more'",
      "'Preparing your booking...'", "'Adding to cart...'",
      '>Choose your experience<', 'Select the best option for your group of {',
      'Save {option.discount}%', '>Max {maxParticipants}<', 'You Save {',
      "`${totalGuests} participant", "} adult${", "} child${", "} infant${",
    ];
    expect(banned.filter((phrase) => src.includes(phrase))).toEqual([]);
  });

  it('translates the German drawer for real, not by falling back to English', () => {
    const de = JSON.parse(read('messages/de.json'));
    expect(lookup(de, 'tour.spotsLeft')).toBe('Noch {count} Plätze frei');
    expect(lookup(de, 'tour.fullyBooked')).toBe('Ausgebucht');
    expect(lookup(de, 'booking.checkAvailability')).toBe('Verfügbarkeit prüfen');
    expect(lookup(de, 'booking.notAvailableForPartySize')).toBe('Für diese Gruppengröße nicht verfügbar');
    expect(lookup(de, 'booking.tourOptions')).toBe('Tour-Optionen');
    expect(lookup(de, 'price.totalPrice')).toBe('Gesamtpreis');
    // These two shipped without their umlauts.
    expect(lookup(de, 'booking.selectTime')).toBe('Zeit auswählen');
    expect(lookup(de, 'booking.selectDate')).toBe('Datum auswählen');
  });

  it('never promises free cancellation — the policy is tiered refunds', () => {
    const src = read(SRC);
    expect(src).toContain("t('tour.tieredRefunds')");
    for (const locale of LOCALES) {
      const messages = JSON.parse(read(`messages/${locale}.json`));
      expect(lookup(messages, 'tour.freeCancellationShort')).toBeUndefined();
      expect(typeof lookup(messages, 'tour.tieredRefunds')).toBe('string');
    }
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { formatDuration, formatLanguageList, formatLanguageName } from '@/lib/i18n/displayValues';

// Fails the moment an interface word of the booking journey would show in
// English on the Arabic site: every word the booking panel, the cart and the
// checkout ask for must exist in Arabic, in Arabic script, and differ from the
// English text. Values the operator types (durations, guide languages) are
// written from the visitor's language, not printed as stored.
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const en = JSON.parse(read('messages/en.json'));
const ar = JSON.parse(read('messages/ar.json'));
const lookup = (catalog: Record<string, any>, key: string) => key.split('.').reduce((node, part) => node?.[part], catalog);

const FILES = [
  'components/BookingSidebar.tsx',
  'components/CartSidebar.tsx',
  'app/[locale]/checkout/page.tsx',
  'app/[locale]/[slug]/TourDetailClientPage.tsx',
  'components/pricing/TourPriceDisplay.tsx',
];
const usedKeys = [...new Set(FILES.flatMap((file) => [...read(file).matchAll(/\bt\('((?:booking|checkout|cart|tour|tourPage)\.[A-Za-z.]+)'/g)].map((m) => m[1]).concat(
  // extra categories are looked up through a table, not a literal t('...') call
  [...read(file).matchAll(/'(booking\.addOnCategory[A-Za-z]+)'/g)].map((m) => m[1]),
)))];

describe('Arabic booking journey words', () => {
  it('finds the words the journey uses', () => {
    expect(usedKeys.length).toBeGreaterThan(160);
    expect(usedKeys).toEqual(expect.arrayContaining(['tourPage.tab.overview', 'tourPage.backToAllTours', 'booking.addedToCartMore', 'booking.addOnCategoryExperience']));
  });

  it.each(usedKeys)('%s is Arabic on the Arabic site', (key) => {
    const arabic = lookup(ar, key);
    expect(typeof arabic).toBe('string');
    expect(arabic).toMatch(/[؀-ۿ]/);
    expect(arabic).not.toBe(lookup(en, key));
  });
});

describe('values the operator types, written for the visitor', () => {
  it('writes durations in Arabic and drops a doubled "Duration" label', () => {
    expect(formatDuration('Duration 8 hours', 'ar')).toBe('8 ساعات');
    expect(formatDuration('8 hours', 'ar')).toBe('8 ساعات');
    expect(formatDuration('2 hours', 'ar')).toBe('ساعتان');
    expect(formatDuration('30 minutes', 'ar')).toBe('30 دقيقة');
    expect(formatDuration('Duration 8 hours', 'en')).toBe('8 hours');
    expect(formatDuration('8 hours', 'de')).toBe('8 Stunden');
    expect(formatDuration('Duration: 1.5 hours', 'fr')).toBe('1,5 heure');
    expect(formatDuration('Full day', 'ar')).toBe('Full day');
    expect(formatDuration('Duration Full day', 'en')).toBe('Full day');
    expect(formatDuration(undefined, 'ar')).toBe('');
  });

  it('names guide languages in the visitor language', () => {
    expect(formatLanguageName('English', 'ar')).toMatch(/[؀-ۿ]/);
    expect(formatLanguageName('English', 'en')).toBe('English');
    expect(formatLanguageName('English', 'de')).toBe('Englisch');
    expect(formatLanguageList(['English', 'Arabic'], 'ar')).toContain('، ');
    expect(formatLanguageName('Klingon', 'ar')).toBe('Klingon');
  });

  it('is used wherever the panel and trip page print those values', () => {
    const panel = read('components/BookingSidebar.tsx');
    const tour = read('app/[locale]/[slug]/TourDetailClientPage.tsx');
    expect(panel).not.toMatch(/\{(option|selectedOption)\.duration\}|\{tourDisplayData\.duration\}/);
    expect(panel).not.toMatch(/languages\.slice\(0, 2\)\.join\(', '\)/);
    expect(panel).not.toContain("{bookingData.selectedLanguage || 'English'}");
    expect(tour).not.toContain('Duration: {tour.duration}');
  });
});

describe('trip page and extras say only what is true, in the visitor language', () => {
  const tour = read('app/[locale]/[slug]/TourDetailClientPage.tsx');
  const panel = read('components/BookingSidebar.tsx');

  it('keeps no fixed English interface text on the trip page', () => {
    for (const english of ['Back to all tours', '>Back<', "label: 'Overview'", "label: 'Reviews'", '>Meeting point<',
      'Need help?', 'Ask AI about this tour', 'You might also like', 'Group size:', "rootLabel: 'Tours'"]) {
      expect(tour).not.toContain(english);
    }
  });

  it('drops claims that are not true of every tour', () => {
    for (const claim of ['Available daily', 'Average response time', 'Perfect for all group sizes', 'Multi-language', '>Multi<']) {
      expect(tour).not.toContain(claim);
    }
    expect(panel).not.toContain('Enhance your tour experience');
    expect(panel).not.toContain('Ready for more adventures');
  });

  it('shows an extra at the price checkout charges, and marks popular only when the business did', () => {
    expect(panel).not.toMatch(/price: addon\.price \|\| 15/);
    expect(panel).toContain('price: Number.isFinite(Number(addon.price)) ? Number(addon.price) : 0,');
    expect(panel).not.toContain('popular: addon.popular ?? index === 0');
  });

  it('names the home crumb in the visitor language', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { buildContentBreadcrumbs } = require('@/lib/content/breadcrumbs');
    expect(buildContentBreadcrumbs({ currentTitle: 'Trip', homeLabel: 'الرئيسية' })[0].label).toBe('الرئيسية');
    expect(buildContentBreadcrumbs({ currentTitle: 'Trip' })[0].label).toBe('Home');
  });
});

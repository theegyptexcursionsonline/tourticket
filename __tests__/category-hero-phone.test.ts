import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContentBreadcrumbs } from '@/lib/content/breadcrumbs';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const LOCALES = ['en', 'ar', 'de', 'fr', 'es'] as const;
const messages = Object.fromEntries(
  LOCALES.map((locale) => [locale, JSON.parse(read(`messages/${locale}.json`))]),
) as Record<(typeof LOCALES)[number], Record<string, Record<string, string>>>;

const category = read('app/[locale]/categories/[slug]/CategoryPageClient.tsx');
const destination = read('app/[locale]/destinations/[slug]/DestinationPageClient.tsx');

/** The JSX of one `<section ...>` opening tag that carries the given marker attribute. */
const sectionTag = (source: string, marker: string) => {
  const start = source.indexOf(`<section ${marker}`);
  expect(start).toBeGreaterThan(-1);
  return source.slice(start, source.indexOf('>', start) + 1);
};

/** Classes that make a hero fill the screen; on phones they must not apply. */
const FULL_HEIGHT = /(?:^|[\s'"`])(?:min-h-\[\d+(?:px|vh)\]|h-screen|h-\[\d+vh\]|max-h-\[\d+px\])/;

describe('Category and destination heroes on phones', () => {
  it('sizes the category hero by its content below lg for every template', () => {
    const map = category.slice(
      category.indexOf('const CATEGORY_HERO_HEIGHT'),
      category.indexOf('};', category.indexOf('const CATEGORY_HERO_HEIGHT')),
    );
    for (const template of ['immersive', 'editorial', 'classic']) {
      const line = map.split('\n').find((row) => row.trim().startsWith(`${template}:`));
      expect(line).toBeDefined();
      const classes = line!.slice(line!.indexOf("'") + 1, line!.lastIndexOf("'")).split(/\s+/);
      expect(classes.length).toBeGreaterThan(0);
      // Every height class is a large-screen class.
      for (const cls of classes) expect(cls.startsWith('lg:')).toBe(true);
    }
    // The large-screen design is unchanged.
    expect(map).toContain("immersive: 'lg:min-h-[760px] lg:h-screen lg:max-h-[980px]'");
    expect(map).toContain("editorial: 'lg:min-h-[600px] lg:h-[72vh] lg:max-h-[760px]'");
    expect(map).toContain("classic: 'lg:h-screen lg:max-h-[900px]'");

    const tag = sectionTag(category, 'data-category-hero');
    expect(tag).toContain('CATEGORY_HERO_HEIGHT[pageTemplate]');
    expect(tag).not.toMatch(FULL_HEIGHT);
    // Copy clears the header on phones; large screens keep their own spacing.
    expect(category).toContain("const CATEGORY_HERO_CONTENT_SPACING = 'pt-24 pb-8 sm:pt-28 sm:pb-10 lg:py-0';");
    // Immersive copy only hugs the bottom edge on large screens.
    expect(category).toContain("'lg:self-end lg:pb-20'");
    expect(category).not.toContain("'self-end pb-10 md:pb-20'");
  });

  it('moves the first trip list up to follow the hero on phones only', () => {
    expect(category).toContain("const PHONE_TRIPS_FIRST = 'order-first lg:order-none';");
    expect(category).toContain('className={`flex min-h-screen flex-col lg:block ${');
    expect(category).toContain('<TopPicksSection tours={topPicks} copy={copy} className={PHONE_TRIPS_FIRST} />');
    // With too few tours for Top picks, the full list takes that place.
    expect(category).toContain('<div className={topPicks.length === 0 ? PHONE_TRIPS_FIRST : undefined}>');
  });

  it('sizes the destination hero by its content below lg', () => {
    const tag = sectionTag(destination, 'data-destination-hero');
    expect(tag).toContain('lg:h-screen lg:max-h-[900px]');
    const unprefixed = tag
      .replace(/^.*className="/, '')
      .replace(/".*$/, '')
      .split(/\s+/)
      .filter((cls) => !cls.startsWith('lg:'));
    expect(unprefixed.join(' ')).not.toMatch(FULL_HEIGHT);
    expect(destination).not.toContain('min-h-[500px] h-[70vh]');
  });

  it('keeps long titles inside the screen', () => {
    for (const source of [category, destination]) {
      expect(source).toMatch(/<h1 className="[^"]*\[overflow-wrap:anywhere\]/);
    }
  });
});

describe('Hero breadcrumb in the visitor language', () => {
  it.each(LOCALES)('%s messages name the home, categories and destinations crumbs', (locale) => {
    const m = messages[locale];
    for (const value of [m.tourPage?.home, m.searchPage?.categories, m.searchPage?.destinations]) {
      expect(typeof value).toBe('string');
      expect(value!.trim().length).toBeGreaterThan(0);
    }
    const crumbs = buildContentBreadcrumbs({
      currentTitle: 'Aswan',
      homeLabel: m.tourPage.home,
      rootLabel: m.searchPage.categories,
      rootHref: '/categories',
    });
    expect(crumbs[0]).toEqual({ label: m.tourPage.home, href: '/' });
    expect(crumbs[1]).toEqual({ label: m.searchPage.categories, href: '/categories' });
    if (locale !== 'en') expect(crumbs[0].label).not.toBe('Home');
  });

  it('shows the Arabic home label on Arabic pages', () => {
    expect(messages.ar.tourPage.home).toBe('الرئيسية');
  });

  it('wires both hero breadcrumbs to the messages, not English literals', () => {
    for (const source of [category, destination]) {
      expect(source).toContain("homeLabel: t('tourPage.home'),");
      expect(source).not.toMatch(/rootLabel: '(Categories|Destinations)'/);
    }
    expect(category).toContain("rootLabel: t('searchPage.categories'),");
    expect(destination).toContain("rootLabel: t('searchPage.destinations'),");
  });
});

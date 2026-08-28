import fs from 'node:fs';
import path from 'node:path';
import {
  englishOnlyMetadataAlternates,
  explicitContentLocales,
  localeLessSeoPath,
  localePath,
  localizedDocumentMetadata,
  localizedLanguageAlternates,
  metadataAlternates,
  normalizedSiteUrl,
  openGraphLocale,
  sitemapAlternates,
} from '@/lib/i18n/seoAlternates';
import { localizedTourContentPath, tourContentPath } from '@/lib/content/contentUrl';

jest.mock('@/lib/dbConnect', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('mongoose', () => ({
  __esModule: true,
  default: { models: {} },
}));

import dbConnect from '@/lib/dbConnect';
import sitemap, {
  STATIC_SITEMAP_ROUTES,
  localizedDocumentSitemapEntries,
  localizedSitemapEntries,
  sourceLastModified,
} from '@/app/sitemap';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('shared localized canonical and hreflang contract', () => {
  it('emits an absolute self-canonical and one consistent language map', () => {
    const alternates = metadataAlternates('fr', '/tours');

    expect(alternates.canonical).toBe('https://egypt-excursionsonline.com/fr/tours');
    expect(alternates.languages).toEqual({
      en: 'https://egypt-excursionsonline.com/tours',
      ar: 'https://egypt-excursionsonline.com/ar/tours',
      es: 'https://egypt-excursionsonline.com/es/tours',
      fr: 'https://egypt-excursionsonline.com/fr/tours',
      de: 'https://egypt-excursionsonline.com/de/tours',
      'x-default': 'https://egypt-excursionsonline.com/tours',
    });
    expect(sitemapAlternates('/tours').languages).toEqual(alternates.languages);
    expect(localizedLanguageAlternates('/tours')).toEqual(alternates.languages);
  });

  it('normalizes harmless slashes but rejects cross-locale and non-path inputs', () => {
    expect(localeLessSeoPath('tours/')).toBe('/tours');
    expect(localePath('en', '/')).toBe('https://egypt-excursionsonline.com');
    expect(() => localeLessSeoPath('/de/tours')).toThrow('must not include a locale prefix');
    expect(() => localeLessSeoPath('https://example.com/tours')).toThrow('locale-less pathname');
    expect(() => localeLessSeoPath('/tours?q=nile')).toThrow('locale-less pathname');
    expect(() => localePath('it', '/tours')).toThrow('Unsupported SEO locale');
  });

  it('normalizes configured origins and maps every supported locale for Open Graph', () => {
    expect(normalizedSiteUrl('https://egypt-excursionsonline.com///'))
      .toBe('https://egypt-excursionsonline.com');
    expect(openGraphLocale('en')).toBe('en_US');
    expect(openGraphLocale('ar')).toBe('ar_EG');
    expect(openGraphLocale('de')).toBe('de_DE');
    expect(() => openGraphLocale('it')).toThrow('Unsupported SEO locale');
  });

  it('does not advertise untranslated locale variants for English-only routes', () => {
    expect(englishOnlyMetadataAlternates('/about')).toEqual({
      canonical: 'https://egypt-excursionsonline.com/about',
      languages: {
        en: 'https://egypt-excursionsonline.com/about',
        'x-default': 'https://egypt-excursionsonline.com/about',
      },
    });
  });

  it('canonicalizes a localized dynamic request to English until its translation is complete', () => {
    const availableLocales = explicitContentLocales(
      { translations: { de: { title: 'Nilkreuzfahrt', description: ' ' } } },
      ['title', 'description'],
    );

    expect(metadataAlternates('de', '/tour/nile-cruise', availableLocales)).toEqual({
      canonical: 'https://egypt-excursionsonline.com/tour/nile-cruise',
      languages: {
        en: 'https://egypt-excursionsonline.com/tour/nile-cruise',
        'x-default': 'https://egypt-excursionsonline.com/tour/nile-cruise',
      },
    });
  });

  it('noindexes a fallback locale while preserving English canonical discovery', () => {
    expect(localizedDocumentMetadata(
      'de',
      '/blog/cairo-guide',
      { translations: { de: { title: 'Kairo', excerpt: '', content: '' } } },
      ['title', 'excerpt', 'content'],
    )).toEqual({
      alternates: {
        canonical: 'https://egypt-excursionsonline.com/blog/cairo-guide',
        languages: {
          en: 'https://egypt-excursionsonline.com/blog/cairo-guide',
          'x-default': 'https://egypt-excursionsonline.com/blog/cairo-guide',
        },
      },
      robots: {
        index: false,
        follow: true,
        googleBot: { index: false, follow: true },
      },
    });
  });

  it('builds canonical content links from URL type, city, and parent evidence', () => {
    expect(tourContentPath({ slug: 'nile-cruise', urlType: 'tour' })).toBe('/tour/nile-cruise');
    expect(tourContentPath({
      slug: 'desert-safari',
      urlType: 'city',
      destination: { slug: 'hurghada' },
    })).toBe('/hurghada/desert-safari');
    expect(tourContentPath({
      slug: 'museum-entry',
      parentPage: { slug: 'cairo' },
    })).toBe('/cairo/museum-entry');
    expect(localizedTourContentPath({ slug: 'nile-cruise', urlType: 'tour' }, 'de'))
      .toBe('/de/tour/nile-cruise');
  });
});

describe('fail-closed deterministic sitemap contract', () => {
  it('keeps a deliberate real-route inventory and omits search/private/nonexistent indexes', () => {
    const paths = STATIC_SITEMAP_ROUTES.map((route) => route.path);

    expect(paths).toEqual(expect.arrayContaining([
      '/',
      '/tours',
      '/destinations',
      '/blog',
      '/interests',
      '/tools',
      '/tools/trip-cost-calculator',
      '/tools/visa-checker',
    ]));
    expect(paths).not.toEqual(expect.arrayContaining(['/search', '/categories', '/login', '/checkout']));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('includes untranslated static routes only once with truthful alternates', () => {
    const aboutRoute = STATIC_SITEMAP_ROUTES.find((route) => route.path === '/about');
    expect(aboutRoute).toBeDefined();
    const entries = localizedSitemapEntries(aboutRoute!);
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe('https://egypt-excursionsonline.com/about');
    expect(entries[0].alternates?.languages).toEqual({
      en: 'https://egypt-excursionsonline.com/about',
      'x-default': 'https://egypt-excursionsonline.com/about',
    });
  });

  it('omits unsupported timestamps and uses a stable source timestamp when present', () => {
    expect(sourceLastModified(undefined, null, '', 'not-a-date')).toBeUndefined();
    expect(sourceLastModified(undefined, '2026-08-01T12:00:00.000Z')?.toISOString())
      .toBe('2026-08-01T12:00:00.000Z');

    const staticEntries = localizedSitemapEntries(STATIC_SITEMAP_ROUTES[0]);
    expect(staticEntries).toHaveLength(5);
    for (const entry of staticEntries) {
      expect(entry).not.toHaveProperty('lastModified');
      expect(entry.alternates?.languages?.['x-default']).toBe('https://egypt-excursionsonline.com');
    }
  });

  it('never advertises non-English dynamic URLs for a source-only record', () => {
    const entries = localizedDocumentSitemapEntries(
      { slug: 'nile-cruise' },
      { path: '/tour/nile-cruise', changeFrequency: 'weekly', priority: 0.9 },
      ['title', 'description'],
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe('https://egypt-excursionsonline.com/tour/nile-cruise');
    expect(entries[0].alternates?.languages).toEqual({
      en: 'https://egypt-excursionsonline.com/tour/nile-cruise',
      'x-default': 'https://egypt-excursionsonline.com/tour/nile-cruise',
    });
  });

  it('advertises only supported locales with complete explicit core translations', () => {
    const record = {
      slug: 'nile-cruise',
      translations: new Map<string, Record<string, unknown>>([
        ['de', { title: 'Nilkreuzfahrt', description: '<p>Eine Reise auf dem Nil.</p>' }],
        ['fr', { title: 'Croisiere sur le Nil', description: '   ' }],
        ['it', { title: 'Crociera sul Nilo', description: 'Un viaggio sul Nilo.' }],
      ]),
    };

    expect(explicitContentLocales(record, ['title', 'description'])).toEqual(['en', 'de']);
    const entries = localizedDocumentSitemapEntries(
      record,
      { path: '/tour/nile-cruise', changeFrequency: 'weekly', priority: 0.9 },
      ['title', 'description'],
    );
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://egypt-excursionsonline.com/tour/nile-cruise',
      'https://egypt-excursionsonline.com/de/tour/nile-cruise',
    ]);
    expect(entries[0].alternates?.languages).toEqual({
      en: 'https://egypt-excursionsonline.com/tour/nile-cruise',
      de: 'https://egypt-excursionsonline.com/de/tour/nile-cruise',
      'x-default': 'https://egypt-excursionsonline.com/tour/nile-cruise',
    });
  });

  it('rejects the request when the catalogue cannot be loaded', async () => {
    jest.mocked(dbConnect).mockRejectedValueOnce(new Error('catalog offline'));
    await expect(sitemap()).rejects.toThrow('catalog offline');
  });

  it('uses strict public filters and contains no silent partial-success fallback', () => {
    const source = read('app/sitemap.ts');
    expect(source.match(/\.\.\.PUBLIC_CONTENT_FILTER/g)).toHaveLength(4);
    expect(source).toContain("{ status: 'published', ...DEFAULT_TENANT_FILTER }");
    expect(source).toContain("export const dynamic = 'force-dynamic'");
    expect(source).not.toContain('Return static pages only');
    expect(source).not.toContain('lastModified: new Date()');
  });
});

describe('migrated metadata and link consumers', () => {
  it('uses the shared alternates contract across the public route surface', () => {
    const files = [
      'app/[locale]/page.tsx',
      'app/[locale]/tours/page.tsx',
      'app/[locale]/destinations/page.tsx',
      'app/[locale]/blog/page.tsx',
      'app/[locale]/interests/page.tsx',
      'app/[locale]/interests/[slug]/page.tsx',
      'app/[locale]/attraction/[slug]/AttractionDetailContent.tsx',
      'app/[locale]/category/[category-name]/CataloguePageContent.tsx',
    ];
    for (const file of files) expect(read(file)).toContain('metadataAlternates');
    expect(fs.existsSync(path.join(process.cwd(), 'lib/seo.ts'))).toBe(false);
  });

  it('gates dynamic detail metadata on each document explicit translation set', () => {
    const files = [
      'app/[locale]/[slug]/TourDetailContent.tsx',
      'app/[locale]/destinations/[slug]/DestinationDetailContent.tsx',
      'app/[locale]/categories/[slug]/CategoryDetailContent.tsx',
      'app/[locale]/attraction/[slug]/AttractionDetailContent.tsx',
      'app/[locale]/category/[category-name]/CataloguePageContent.tsx',
    ];
    for (const file of files) expect(read(file)).toContain('explicitContentLocales');
    expect(read('app/[locale]/blog/[slug]/page.tsx')).toContain('localizedDocumentMetadata');
  });

  it('does not hardcode root-slug tour hrefs in migrated card consumers', () => {
    const files = [
      'components/FeaturedTours.tsx',
      'components/FeaturedToursServer.tsx',
      'components/InterestLandingPage.tsx',
      'components/AttractionPageTemplate.tsx',
      'app/[locale]/tours/ToursClientPage.tsx',
      'app/[locale]/destinations/DestinationsClientPage.tsx',
      'app/[locale]/destinations/[slug]/DestinationPageClient.tsx',
      'app/[locale]/categories/[slug]/CategoryPageClient.tsx',
      'app/[locale]/blog/[slug]/BlogPostClient.tsx',
      'components/AIAgentModal.tsx',
      'components/Header.tsx',
      'components/Header2.tsx',
      'components/Headersearch.tsx',
      'components/HeroSection.tsx',
      'components/DayTrips.tsx',
      'components/InterestGridServer.tsx',
      'components/WishlistSidebar.tsx',
      'components/user/TourCard.tsx',
      'components/search/FallbackSearch.tsx',
      'components/search/AlgoliaSearch.tsx',
      'components/search/AlgoliaChat.tsx',
      'components/landing/MasonryLandingPage.tsx',
      'components/landing/UniversalLandingPage.tsx',
      'components/shared/TourCard.tsx',
    ];
    for (const file of files) {
      expect(read(file)).not.toMatch(/(?:href|push)\s*(?:=|\()\s*\{?`\/\$\{(?:tour|trip|hit|item)\.slug/);
    }
  });

  it('keeps canonical routing evidence in search records and their index projection', () => {
    const algolia = read('lib/algolia.ts');
    expect(algolia).toContain("urlType: tour.urlType || 'default'");
    expect(algolia).toContain('parentPage: tour.parentPage || null');
    expect(algolia).toContain("slug: value.slug || ''");
    expect(read('lib/models/Tour.ts')).toContain("populate('destination', 'name slug')");
    expect(read('app/api/search/tours/route.ts')).not.toContain("populate('destination', 'name')");
  });

  it('redirects legacy interest slugs to the one canonical category route', () => {
    const interest = read('app/[locale]/interests/[slug]/page.tsx');
    expect(interest).toContain('permanentRedirect(');
    expect(interest).toContain("contentPath(\n        'category'");
    expect(interest).not.toContain("metadataAlternates(resolvedParams.locale, `/interests/");
    for (const file of [
      'components/PopularInterestsGrid.tsx',
      'components/RelatedInterests.tsx',
      'components/InterestGrid.tsx',
    ]) {
      expect(read(file)).not.toContain('`/interests/${interest.slug}`');
    }
  });

  it('keeps unsitemapped author profiles out of the index', () => {
    const author = read('app/[locale]/author/[slug]/page.tsx');
    expect(author).toContain('robots: { index: false, follow: true }');
    expect(author).not.toContain('metadataAlternates');
  });
});

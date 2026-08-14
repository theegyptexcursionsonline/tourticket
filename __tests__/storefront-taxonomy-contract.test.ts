import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('storefront taxonomy cleanup', () => {
  it.each([
    'components/Header.tsx',
    'components/Header2.tsx',
    'components/Headersearch.tsx',
    'components/Footer.tsx',
    'components/Destinations.tsx',
    'components/DestinationsServer.tsx',
    'components/InterestGridServer.tsx',
    'components/PopularInterest.tsx',
    'components/PopularInterestServer.tsx',
    'app/[locale]/destinations/DestinationsClientPage.tsx',
    'app/[locale]/destinations/[slug]/DestinationPageClient.tsx',
    'app/[locale]/categories/[slug]/CategoryPageClient.tsx',
  ])('%s builds public taxonomy links through the canonical URL helper', (file) => {
    const fileSource = source(file);
    expect(fileSource).toContain('contentPath');
    expect(fileSource).not.toMatch(/href=\{`\/(?:categories|destinations)\/\$\{/);
  });

  it('keeps archived and empty taxonomy records out of homepage navigation', () => {
    const home = source('app/[locale]/HomePageServer.tsx');
    const layout = source('app/[locale]/layout.tsx');
    expect(home).toContain('archivedAt: null');
    expect(home).toContain('.filter((category) => category.tourCount > 0)');
    expect(layout).toContain('filterVisibleTaxonomyEntries');
    expect(layout).toContain('{ requireTours: true }');
  });

  it('renders real category thumbnails and an attraction-page section on Egypt', () => {
    const egypt = source('app/[locale]/egypt/page.tsx');
    expect(egypt).toContain('Boolean(category.heroImage)');
    expect(egypt).toContain('src={category.heroImage');
    expect(egypt).toContain('Discover Top Attractions');
    expect(egypt).toContain("pageType: 'attraction'");
    expect(egypt).toContain('attractionPagePath(');
  });

  it('keeps the tours index tenant-scoped and excludes archived tours', () => {
    const tours = source('app/[locale]/tours/page.tsx');
    expect(tours.match(/archivedAt: null/g)?.length).toBeGreaterThanOrEqual(2);
    expect(tours.match(/\.\.\.DEFAULT_TENANT_FILTER/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps dark-mode practical-information text readable', () => {
    const css = source('app/globals.css');
    expect(css).toContain('[class~="text-gray-800"]');
    expect(css).toContain('[class~="text-gray-900"]');
    expect(css).toContain('[class~="text-slate-600"]');
    expect(css).toContain('color: #f8fafc !important;');
    expect(css).toContain('color: #cbd5e1 !important;');
  });
});

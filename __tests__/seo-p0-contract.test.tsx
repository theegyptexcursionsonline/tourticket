import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';
import OrganizationSchema from '@/components/schema/OrganizationSchema';
import BlogPostSchema from '@/components/schema/BlogPostSchema';
import CollectionSchema from '@/components/schema/CollectionSchema';
import DestinationSchema from '@/components/schema/DestinationSchema';
import ToursListSchema from '@/components/schema/ToursListSchema';
import WebSiteSchema from '@/components/schema/WebSiteSchema';
import { PRIVATE_ROUTE_METADATA } from '@/lib/seo/privateRouteMetadata';

jest.mock('next/server', () => ({
  NextResponse: class MockNextResponse {
    body: string;
    headers: Record<string, string>;

    constructor(body: string, init?: { headers?: Record<string, string> }) {
      this.body = body;
      this.headers = init?.headers || {};
    }
  },
}));

import { GET as getRobots } from '@/app/robots.txt/route';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

function renderedJsonLd(container: HTMLElement): Record<string, any> {
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  return JSON.parse(script!.textContent || '{}');
}

describe('P0 crawl and index controls', () => {
  it('allows Next rendering assets and blocks private routes in every locale', async () => {
    const response = await getRobots() as unknown as { body: string };
    const robots = response.body;

    expect(robots).not.toMatch(/Disallow:\s*\/_next(?:\/|\s|$)/);
    for (const locale of ['en', 'ar', 'es', 'fr', 'de']) {
      for (const route of ['/user', '/checkout', '/booking/verify', '/accept-invitation', '/offer', '/redirecting']) {
        expect(robots).toContain(`Disallow: /${locale}${route}`);
      }
    }

    const imageBotRules = robots.slice(
      robots.indexOf('User-agent: Googlebot-Image'),
      robots.indexOf('User-agent: Bingbot'),
    );
    expect(imageBotRules).toContain('Disallow: /ar/checkout');
    expect(imageBotRules).toContain('Disallow: /de/user');
  });

  it('uses one fail-closed robots contract for transactional route layouts', () => {
    expect(PRIVATE_ROUTE_METADATA.robots).toMatchObject({
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    });
    expect(PRIVATE_ROUTE_METADATA.alternates).toEqual({});
    expect(read('app/[locale]/layout.tsx')).not.toContain('metadataAlternates');
    expect(read('app/[locale]/page.tsx')).toContain("metadataAlternates(locale, '/')");

    for (const file of [
      'app/[locale]/accept-invitation/layout.tsx',
      'app/[locale]/booking/layout.tsx',
      'app/[locale]/checkout/layout.tsx',
      'app/[locale]/forgot/page.tsx',
      'app/[locale]/login/page.tsx',
      'app/[locale]/offer/[token]/page.tsx',
      'app/[locale]/redirecting/layout.tsx',
      'app/[locale]/reset-password/page.tsx',
      'app/[locale]/signup/page.tsx',
      'app/[locale]/user/layout.tsx',
    ]) {
      expect(read(file)).toContain('PRIVATE_ROUTE_METADATA');
    }
  });
});

describe('P0 public content visibility', () => {
  it('all changed detail and catalogue reads require published, non-archived content', () => {
    for (const file of [
      'app/[locale]/[slug]/TourDetailContent.tsx',
      'app/[locale]/attraction/[slug]/AttractionDetailContent.tsx',
      'app/[locale]/categories/[slug]/CategoryDetailContent.tsx',
      'app/[locale]/category/[category-name]/CataloguePageContent.tsx',
      'app/[locale]/category/[category-name]/page.tsx',
      'app/[locale]/destinations/[slug]/DestinationDetailContent.tsx',
      'lib/content/resolveContentBySlug.ts',
    ]) {
      expect(read(file)).toContain('PUBLIC_CONTENT_FILTER');
    }
  });

  it('scopes every primary and localized tour-detail query to the default tenant', () => {
    const source = read('app/[locale]/[slug]/TourDetailContent.tsx');
    expect(source.match(/\.\.\.DEFAULT_TENANT_FILTER/g)).toHaveLength(8);
    expect(source.match(/\.\.\.PUBLIC_CONTENT_FILTER/g)).toHaveLength(8);
  });
});

describe('P0 truthful structured data', () => {
  it('publishes only verified organization identity fields', () => {
    const { container } = render(<OrganizationSchema />);
    const serialized = JSON.stringify(renderedJsonLd(container));

    expect(serialized).toContain('Egypt Excursions Online');
    expect(serialized).toContain('/EEO-logo.png');
    for (const unsupported of [
      'telephone',
      'PostalAddress',
      'GeoCoordinates',
      'openingHoursSpecification',
      'sameAs',
      'aggregateRating',
      'makesOffer',
      'priceRange',
    ]) {
      expect(serialized).not.toContain(unsupported);
    }
  });

  it('omits offers and ratings when review evidence is absent', () => {
    const legacyTour = {
      title: 'Evidence-safe tour',
      slug: 'evidence-safe-tour',
      rating: 4.9,
      reviewCount: 0,
    } as unknown as React.ComponentProps<typeof ToursListSchema>['tours'][number];
    const { container } = render(
      <ToursListSchema
        listName="Visible tours"
        tours={[legacyTour]}
      />,
    );
    const item = renderedJsonLd(container).itemListElement[0].item;

    expect(item.offers).toBeUndefined();
    expect(item.aggregateRating).toBeUndefined();
  });

  it('suppresses prices, offers, ratings, and reviews without an approved projection contract', () => {
    const legacyTour = {
      title: 'Verified tour',
      slug: 'verified-tour',
      rating: 4.8,
      reviewCount: 12,
      discountPrice: 49,
      originalPrice: 59,
    } as unknown as React.ComponentProps<typeof ToursListSchema>['tours'][number];
    const { container } = render(
      <ToursListSchema
        listName="Visible tours"
        tours={[legacyTour]}
      />,
    );
    const item = renderedJsonLd(container).itemListElement[0].item;

    expect(item.offers).toBeUndefined();
    expect(item.aggregateRating).toBeUndefined();
    expect(JSON.stringify(item)).not.toMatch(/price|rating|review|availability/i);
  });

  it('aligns localized list and website schema URLs with the page canonical', () => {
    const list = render(
      <ToursListSchema
        locale="de"
        listName="Sichtbare Touren"
        tours={[{ title: 'Verified tour', slug: 'verified-tour', urlType: 'tour' }]}
      />,
    );
    expect(renderedJsonLd(list.container).itemListElement[0].url)
      .toBe('https://egypt-excursionsonline.com/de/tour/verified-tour');

    const website = render(<WebSiteSchema locale="ar" />);
    const graph = renderedJsonLd(website.container)['@graph'];
    const webPage = graph.find((entry: { '@type': string }) => entry['@type'] === 'WebPage');
    const webSite = graph.find((entry: { '@type': string }) => entry['@type'] === 'WebSite');
    expect(webPage).toMatchObject({
      url: 'https://egypt-excursionsonline.com/ar',
      inLanguage: 'ar',
    });
    expect(webSite.inLanguage).toEqual(['en', 'ar', 'es', 'fr', 'de']);
    expect(webSite.potentialAction).toMatchObject({
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://egypt-excursionsonline.com/ar/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    });
    expect(JSON.stringify(graph)).not.toContain('/day-trips');
    expect(JSON.stringify(graph)).not.toContain('"it"');
  });

  it('omits unsupported descriptions and invisible default breadcrumbs', () => {
    const website = render(<WebSiteSchema locale="en" pageName="Careers" pageUrl="/careers" />);
    const websiteGraph = renderedJsonLd(website.container)['@graph'];
    const webPage = websiteGraph.find((entry: { '@type': string }) => entry['@type'] === 'WebPage');
    expect(webPage.description).toBeUndefined();
    expect(websiteGraph.some((entry: { '@type': string }) => entry['@type'] === 'BreadcrumbList')).toBe(false);

    const collection = render(
      <CollectionSchema
        name="Visible collection"
        url="/destinations"
        items={[
          { name: 'Cairo', url: '/destinations/cairo' },
          { name: 'Cairo duplicate', url: '/destinations/cairo' },
          { name: '', url: '/destinations/invalid' },
        ]}
      />,
    );
    const collectionGraph = renderedJsonLd(collection.container)['@graph'];
    const collectionPage = collectionGraph.find((entry: { '@type': string }) => entry['@type'] === 'CollectionPage');
    const itemList = collectionGraph.find((entry: { '@type': string }) => entry['@type'] === 'ItemList');
    expect(collectionPage.description).toBeUndefined();
    expect(itemList.numberOfItems).toBe(1);
    expect(itemList.itemListElement).toHaveLength(1);
    expect(collectionGraph.some((entry: { '@type': string }) => entry['@type'] === 'BreadcrumbList')).toBe(false);
  });

  it('emits blog authors only when explicitly stored and never fabricates a breadcrumb', () => {
    const sourced = render(
      <BlogPostSchema title="Visible article" slug="visible-article" author="Stored Author" locale="fr" />,
    );
    const sourcedGraph = renderedJsonLd(sourced.container)['@graph'];
    expect(sourcedGraph[0].author).toEqual({ '@type': 'Person', name: 'Stored Author' });
    expect(sourcedGraph[0].url).toBe('https://egypt-excursionsonline.com/fr/blog/visible-article');
    expect(sourcedGraph.some((entry: { '@type': string }) => entry['@type'] === 'BreadcrumbList')).toBe(false);

    const absent = render(<BlogPostSchema title="Visible article" slug="visible-article" />);
    expect(renderedJsonLd(absent.container)['@graph'][0].author).toBeUndefined();
  });

  it('bounds and deduplicates destination list identity without synthetic destination claims', () => {
    const tours = Array.from({ length: 22 }, (_, index) => ({
      title: `Tour ${index}`,
      slug: index === 21 ? 'tour-0' : `tour-${index}`,
      urlType: 'tour',
    }));
    const { container } = render(
      <DestinationSchema
        name="Cairo"
        slug="cairo"
        locale="de"
        tours={tours}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Cairo', url: '/destinations/cairo' },
        ]}
      />,
    );
    const graph = renderedJsonLd(container)['@graph'];
    const destination = graph[0];
    const itemList = graph.find((entry: { '@type': string }) => entry['@type'] === 'ItemList');
    const breadcrumb = graph.find((entry: { '@type': string }) => entry['@type'] === 'BreadcrumbList');

    expect(destination.description).toBeUndefined();
    expect(destination.address).toBeUndefined();
    expect(destination.touristType).toBeUndefined();
    expect(itemList.numberOfItems).toBe(20);
    expect(itemList.itemListElement).toHaveLength(20);
    expect(breadcrumb.itemListElement[1].item).toBe('https://egypt-excursionsonline.com/de/destinations/cairo');
  });

  it('keeps all active schemas free of unsupported commerce and rich-result claims', () => {
    const schemas = [
      render(<OrganizationSchema />),
      render(<WebSiteSchema />),
      render(<BlogPostSchema title="Article" slug="article" />),
      render(<CollectionSchema name="Collection" url="/blog" items={[{ name: 'Article', url: '/blog/article' }]} />),
      render(<DestinationSchema name="Cairo" slug="cairo" tours={[{ title: 'Tour', slug: 'tour' }]} />),
      render(<ToursListSchema listName="Tours" tours={[{ title: 'Tour', slug: 'tour' }]} />),
    ];

    for (const schema of schemas) {
      const serialized = JSON.stringify(renderedJsonLd(schema.container));
      for (const unsupportedType of ['Product', 'Offer', 'AggregateRating', 'Review', 'FAQPage', 'Event']) {
        expect(serialized).not.toContain(`"@type":"${unsupportedType}"`);
      }
      expect(serialized).not.toMatch(/"price"|"priceCurrency"|"availability"/);
    }

    expect(read('components/tools/ToolsStructuredData.tsx')).not.toContain("'@type': 'Offer'");
    expect(read('components/tools/ToolsStructuredData.tsx')).not.toContain("'@type': 'BreadcrumbList'");
  });

  it('does not publish homepage FAQ claims that are absent from visible sourced content', () => {
    const homepage = read('app/[locale]/HomePageServer.tsx');
    expect(homepage).not.toContain('FAQSchema');
    expect(homepage).not.toContain('Open tickets, which do not require');
    expect(homepage).not.toContain('There are no hidden fees');
  });

  it('does not publish a separate FAQ layout schema that differs from visible FAQs', () => {
    expect(read('app/[locale]/faqs/layout.tsx')).not.toContain('FAQSchema');
  });

  it('does not publish blog FAQ rich results without matching visible FAQ content', () => {
    expect(read('app/[locale]/blog/[slug]/page.tsx')).not.toContain('FAQSchema');
  });

  it('does not call FAQ schema from any public route', () => {
    const publicAppFiles = fs.readdirSync(path.join(process.cwd(), 'app/[locale]'), { recursive: true })
      .filter((entry): entry is string => typeof entry === 'string' && /\.(tsx|ts)$/.test(entry));
    for (const file of publicAppFiles) {
      expect(read(path.join('app/[locale]', file))).not.toContain('<FAQSchema');
    }
  });

  it('cannot re-enable the synthetic review or dated event schemas', () => {
    for (const file of [
      'app/[locale]/HomePageServer.tsx',
      'app/[locale]/[slug]/TourDetailClientPage.tsx',
      'components/TourDetailPage.tsx',
    ]) {
      expect(read(file)).not.toContain('ReviewsStructuredData');
    }
    expect(fs.existsSync(path.join(process.cwd(), 'components/ReviewsStructuredData.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'components/schema/TourSchema.tsx'))).toBe(false);
  });

  it('uses the shared normalized site origin in robots and every touched schema', () => {
    for (const file of [
      'app/robots.txt/route.ts',
      'components/schema/BlogPostSchema.tsx',
      'components/schema/CollectionSchema.tsx',
      'components/schema/DestinationSchema.tsx',
      'components/schema/OrganizationSchema.tsx',
      'components/schema/ToursListSchema.tsx',
      'components/schema/WebSiteSchema.tsx',
    ]) {
      expect(read(file)).toContain('SEO_BASE_URL');
      expect(read(file)).not.toContain('NEXT_PUBLIC_BASE_URL');
    }
  });
});

import { cleanup, render, screen } from '@testing-library/react';

import ToolsIndexPage, { generateMetadata as generateCatalogMetadata } from '@/app/[locale]/tools/page';
import ToolPage, { generateMetadata as generateToolMetadata } from '@/app/[locale]/tools/[tool]/page';
import { OFFICIAL_TOOLS, STOREFRONT_TOOL_BRAND, type OfficialToolId } from '@/lib/tools/catalog';

const mockGetAuthorityToolState = jest.fn();

jest.mock('@/lib/tools/authority', () => ({
  getAuthorityToolState: (...args: unknown[]) => mockGetAuthorityToolState(...args),
}));

function readyState(tool: OfficialToolId) {
  return {
    ok: true as const,
    embedSrc: `https://authority.example${
      OFFICIAL_TOOLS.find((entry) => entry.id === tool)?.embedPath
    }?host=${STOREFRONT_TOOL_BRAND.host}`,
    source: {
      label: 'Official source',
      url: 'https://www.experienceegypt.eg/en/home/faq',
      reviewedAt: '2026-08-22',
      validUntil: '2026-08-23',
      confidence: 'Planning guidance',
    },
  };
}

describe('localized Authority tools storefront pages', () => {
  beforeEach(() => {
    mockGetAuthorityToolState.mockReset();
  });

  afterEach(() => {
    cleanup();
    delete process.env.AUTHORITY_PUBLISHER_TOKEN;
  });

  it('renders the shared ten-tool catalog with locale-preserving internal links', async () => {
    const { container } = render(await ToolsIndexPage({ params: Promise.resolve({ locale: 'fr' }) }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Free tools for a better Egypt trip');
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    for (const tool of OFFICIAL_TOOLS) {
      expect(container.querySelector(`a[href="/fr/tools/${tool.id}"]`)).toBeInTheDocument();
    }

    const jsonLd = container.querySelector('script[type="application/ld+json"]')?.textContent || '';
    const schema = JSON.parse(jsonLd);
    expect(schema['@type']).toBe('ItemList');
    expect(schema.numberOfItems).toBe(10);
    expect(schema.itemListElement).toHaveLength(10);
    expect(jsonLd).not.toMatch(/aggregateRating|ratingValue|reviewCount/i);
  });

  it('renders every official per-tool route from the same catalog and never honors forged host or brand values', async () => {
    const secret = 'server-only-proof-must-not-render';
    process.env.AUTHORITY_PUBLISHER_TOKEN = secret;

    for (const tool of OFFICIAL_TOOLS) {
      mockGetAuthorityToolState.mockResolvedValueOnce(readyState(tool.id));
      const element = await ToolPage({
        params: Promise.resolve({ locale: 'de', tool: tool.id }),
        searchParams: Promise.resolve({ host: 'evil.example', brand: 'Forged brand' }),
      } as unknown as Parameters<typeof ToolPage>[0]);
      const { container, unmount } = render(element);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(tool.name);
      expect(screen.getByTitle(tool.name)).toHaveAttribute(
        'src',
        `https://authority.example${tool.embedPath}?host=${STOREFRONT_TOOL_BRAND.host}`,
      );
      expect(screen.getByRole('link', { name: /all travel tools/i })).toHaveAttribute('href', '/de/tools');
      expect(mockGetAuthorityToolState).toHaveBeenLastCalledWith(tool.id);
      expect(container.innerHTML).not.toContain(secret);
      expect(container.innerHTML).not.toContain('evil.example');
      expect(container.innerHTML).not.toContain('Forged brand');

      unmount();
    }
  });

  it('renders truthful structured data only after Authority verification succeeds', async () => {
    mockGetAuthorityToolState.mockResolvedValueOnce(readyState('packing-list'));
    const ready = render(
      await ToolPage({ params: Promise.resolve({ locale: 'en', tool: 'packing-list' }) }),
    );
    const jsonLd = ready.container.querySelector('script[type="application/ld+json"]')?.textContent || '';
    const schema = JSON.parse(jsonLd);
    expect(schema['@graph'][0]).toMatchObject({
      '@type': 'WebApplication',
      name: 'Egypt Packing List Generator',
      isAccessibleForFree: true,
    });
    expect(schema['@graph'][0].offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'USD' });
    expect(jsonLd).not.toMatch(/aggregateRating|ratingValue|reviewCount/i);
    ready.unmount();

    mockGetAuthorityToolState.mockResolvedValueOnce({ ok: false, reason: 'not-configured' });
    const unavailable = render(
      await ToolPage({ params: Promise.resolve({ locale: 'en', tool: 'packing-list' }) }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(screen.queryByTitle('Egypt Packing List Generator')).not.toBeInTheDocument();
    expect(unavailable.container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('generates canonical and hreflang metadata for default and prefixed locale routes', async () => {
    const catalogEn = await generateCatalogMetadata({ params: Promise.resolve({ locale: 'en' }) });
    const catalogFr = await generateCatalogMetadata({ params: Promise.resolve({ locale: 'fr' }) });
    const visaDe = await generateToolMetadata({
      params: Promise.resolve({ locale: 'de', tool: 'visa-checker' }),
    });

    expect(catalogEn.alternates?.canonical).toBe(`${STOREFRONT_TOOL_BRAND.origin}/tools`);
    expect(catalogFr.alternates?.canonical).toBe(`${STOREFRONT_TOOL_BRAND.origin}/fr/tools`);
    expect(visaDe.alternates?.canonical).toBe(
      `${STOREFRONT_TOOL_BRAND.origin}/de/tools/visa-checker`,
    );
    expect(visaDe.alternates?.languages).toMatchObject({
      en: `${STOREFRONT_TOOL_BRAND.origin}/tools/visa-checker`,
      ar: `${STOREFRONT_TOOL_BRAND.origin}/ar/tools/visa-checker`,
      de: `${STOREFRONT_TOOL_BRAND.origin}/de/tools/visa-checker`,
      'x-default': `${STOREFRONT_TOOL_BRAND.origin}/tools/visa-checker`,
    });
  });
});

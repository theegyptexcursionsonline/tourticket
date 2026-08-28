import { cleanup, render, screen } from '@testing-library/react';

import ToolsIndexPage, { generateMetadata as generateCatalogMetadata } from '@/app/[locale]/tools/page';
import ToolPage, { generateMetadata as generateToolMetadata } from '@/app/[locale]/tools/[tool]/page';
import {
  AUTHORITY_PUBLIC_ORIGIN,
  OFFICIAL_TOOLS,
  STOREFRONT_TOOL_BRAND,
  absoluteToolUrl,
  customerToolHref,
  type OfficialToolId,
} from '@/lib/tools/catalog';

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

  it('keeps the English-only tools catalogue on its canonical customer URLs', async () => {
    const { container } = render(
      await ToolsIndexPage({ params: Promise.resolve({ locale: 'de' }) }),
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Free tools for a better Egypt trip');
    expect(screen.getByText('15 planning tools')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(15);

    for (const tool of OFFICIAL_TOOLS) {
      const href = customerToolHref('en', tool);
      const link = container.querySelector(`a[href="${href}"]`);
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent(tool.name);
      expect(link).toHaveAttribute('href', customerToolHref('en', tool));
    }

    expect(container.querySelector('a[href="/de/tools/packing-list"]')).not.toBeInTheDocument();
    expect(container.querySelector(`a[href^="${AUTHORITY_PUBLIC_ORIGIN}"]`)).toBeInTheDocument();

    const jsonLd = container.querySelector('script[type="application/ld+json"]')?.textContent || '';
    const schema = JSON.parse(jsonLd);
    expect(schema).toMatchObject({ '@type': 'ItemList', numberOfItems: 15 });
    expect(schema.itemListElement).toHaveLength(15);
    expect(
      schema.itemListElement.map((item: { url: string }) => item.url),
    ).toEqual(OFFICIAL_TOOLS.map((tool) => absoluteToolUrl('en', tool.id)));
    expect(
      schema.itemListElement.every(
        (item: { url: string }) => !/\/embed\/[a-z-]+\.html(?:[?#]|$)/.test(item.url),
      ),
    ).toBe(true);
  });

  it('renders the staged per-tool component from the official catalog and never honors forged host or brand values', async () => {
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

  it('suppresses structured data on noindex dynamic tool routes', async () => {
    mockGetAuthorityToolState.mockResolvedValueOnce(readyState('packing-list'));
    const ready = render(
      await ToolPage({ params: Promise.resolve({ locale: 'en', tool: 'packing-list' }) }),
    );
    expect(ready.container.querySelector('script[type="application/ld+json"]')).toBeNull();
    ready.unmount();

    mockGetAuthorityToolState.mockResolvedValueOnce({ ok: false, reason: 'not-configured' });
    const unavailable = render(
      await ToolPage({ params: Promise.resolve({ locale: 'en', tool: 'packing-list' }) }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(screen.queryByTitle('Egypt Packing List Generator')).not.toBeInTheDocument();
    expect(unavailable.container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('keeps the English-only catalog canonical and noindexes dynamic tool routes', async () => {
    const catalogEn = await generateCatalogMetadata({ params: Promise.resolve({ locale: 'en' }) });
    const visaDe = await generateToolMetadata({
      params: Promise.resolve({ locale: 'de', tool: 'visa-checker' }),
    });

    expect(catalogEn.alternates?.canonical).toBe(`${STOREFRONT_TOOL_BRAND.origin}/tools`);
    expect(visaDe.alternates).toBeUndefined();
    expect(visaDe.robots).toEqual({ index: false, follow: false });
  });
});

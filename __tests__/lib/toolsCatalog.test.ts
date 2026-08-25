import { locales } from '@/i18n/config';
import {
  AUTHORITY_PUBLIC_ORIGIN,
  OFFICIAL_TOOLS,
  STOREFRONT_TOOL_BRAND,
  absoluteCustomerToolUrl,
  absoluteToolUrl,
  customerToolHref,
  getOfficialTool,
  isNativeStorefrontTool,
  localizedStorefrontPath,
  localizedToolPath,
} from '@/lib/tools/catalog';

const EXPECTED_TOOL_IDS = [
  'trip-cost-calculator',
  'airport-transfer-fare',
  'best-time-to-visit',
  'visa-checker',
  'dive-site-finder',
  'currency-tipping-guide',
  'itinerary-planner',
  'nile-cruise-comparison',
  'packing-list',
  'tour-comparison',
];

describe('Authority storefront tool catalog', () => {
  it('contains exactly the ten official Authority tools with unique ids and embed pages', () => {
    expect(OFFICIAL_TOOLS).toHaveLength(10);
    expect(OFFICIAL_TOOLS.map((tool) => tool.id)).toEqual(EXPECTED_TOOL_IDS);
    expect(new Set(OFFICIAL_TOOLS.map((tool) => tool.id)).size).toBe(10);
    expect(new Set(OFFICIAL_TOOLS.map((tool) => tool.embedPath)).size).toBe(10);
    expect(OFFICIAL_TOOLS.every((tool) => /^\/embed\/[a-z-]+\.html$/.test(tool.embedPath))).toBe(true);
  });

  it('resolves only official ids', () => {
    for (const tool of OFFICIAL_TOOLS) expect(getOfficialTool(tool.id)).toBe(tool);
    expect(getOfficialTool('water-temp')).toBeNull();
    expect(getOfficialTool('../visa-checker')).toBeNull();
  });

  it('builds canonical internal URLs for every locale and every official tool', () => {
    for (const locale of locales) {
      const prefix = locale === 'en' ? '' : `/${locale}`;
      expect(localizedToolPath(locale)).toBe(`${prefix}/tools`);
      expect(localizedStorefrontPath(locale, '/contact')).toBe(`${prefix}/contact`);

      for (const tool of OFFICIAL_TOOLS) {
        expect(localizedToolPath(locale, tool.id)).toBe(`${prefix}/tools/${tool.id}`);
        expect(absoluteToolUrl(locale, tool.id)).toBe(
          `${STOREFRONT_TOOL_BRAND.origin}${prefix}/tools/${tool.id}`,
        );
      }
    }
  });

  it('never creates an /en prefix or duplicate locale prefix', () => {
    expect(localizedToolPath('en', 'visa-checker')).toBe('/tools/visa-checker');
    expect(localizedToolPath('de', 'visa-checker')).toBe('/de/tools/visa-checker');
    expect(localizedToolPath('unknown', 'visa-checker')).toBe('/tools/visa-checker');
    expect(localizedStorefrontPath('fr', '///tools///')).toBe('/fr/tools');
  });

  it('routes only the two established tools natively and every other official tool to the branded live host', () => {
    for (const tool of OFFICIAL_TOOLS) {
      const href = customerToolHref('de', tool);
      const absoluteUrl = absoluteCustomerToolUrl('de', tool);

      if (tool.id === 'trip-cost-calculator' || tool.id === 'visa-checker') {
        expect(isNativeStorefrontTool(tool.id)).toBe(true);
        expect(href).toBe(`/de/tools/${tool.id}`);
        expect(absoluteUrl).toBe(`${STOREFRONT_TOOL_BRAND.origin}${href}`);
      } else {
        expect(isNativeStorefrontTool(tool.id)).toBe(false);
        expect(href).toBe(`${AUTHORITY_PUBLIC_ORIGIN}${tool.embedPath}`);
        expect(absoluteUrl).toBe(href);
      }
    }
  });
});

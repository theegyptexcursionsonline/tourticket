import { defaultLocale, locales } from '@/i18n/config';

export const STOREFRONT_TOOL_BRAND = {
  name: 'Egypt Excursions Online',
  host: 'egypt-excursionsonline.com',
  origin: 'https://egypt-excursionsonline.com',
  logoUrl: '/EEO-mark.png',
  accent: '#E05D1A',
} as const;

/** Public, branded Authority host. This is customer navigation, never the private API host. */
export const AUTHORITY_PUBLIC_ORIGIN = 'https://tools.egypt-excursionsonline.com' as const;

export const OFFICIAL_TOOLS = [
  {
    id: 'trip-cost-calculator',
    name: 'Egypt Trip Cost Calculator',
    category: 'Budget',
    description: 'Build a realistic Egypt budget by travel style, region and season.',
    embedPath: '/embed/trip-cost.html',
    icon: 'calculator',
  },
  {
    id: 'airport-transfer-fare',
    name: 'Airport Transfer Fare Estimator',
    category: 'Transport',
    description: 'Estimate a private airport transfer with vehicle and trip extras.',
    embedPath: '/embed/airport-transfer.html',
    icon: 'car',
  },
  {
    id: 'best-time-to-visit',
    name: 'Best Time to Visit Egypt',
    category: 'Timing',
    description: 'Compare all 12 months for weather, crowds, prices and sea conditions.',
    embedPath: '/embed/best-time.html',
    icon: 'calendar',
  },
  {
    id: 'visa-checker',
    name: 'Egypt Visa & Entry Checker',
    category: 'Entry',
    description: 'Review current advisory entry steps by passport nationality.',
    embedPath: '/embed/visa-checker.html',
    icon: 'passport',
  },
  {
    id: 'dive-site-finder',
    name: 'Red Sea Dive-site Finder',
    category: 'Diving',
    description: 'Match Red Sea sites to your base, level and marine-life interests.',
    embedPath: '/embed/dive-finder.html',
    icon: 'waves',
  },
  {
    id: 'currency-tipping-guide',
    name: 'Currency Converter & Tipping Guide',
    category: 'Money',
    description: 'Convert reference rates and build a practical baksheesh budget.',
    embedPath: '/embed/currency-tipping.html',
    icon: 'coins',
  },
  {
    id: 'itinerary-planner',
    name: 'Day-by-day Egypt Itinerary Planner',
    category: 'Planning',
    description: 'Create a route-aware 3–14 day plan with pace and accessibility options.',
    embedPath: '/embed/itinerary-planner.html',
    icon: 'route',
  },
  {
    id: 'nile-cruise-comparison',
    name: 'Nile Cruise Comparison',
    category: 'Nile',
    description: 'Compare routes, nights, price bands, pace and inclusions.',
    embedPath: '/embed/nile-cruise.html',
    icon: 'ship',
  },
  {
    id: 'packing-list',
    name: 'Egypt Packing List Generator',
    category: 'Preparation',
    description: 'Create and save an Egypt-specific interactive checklist.',
    embedPath: '/embed/packing-list.html',
    icon: 'luggage',
  },
  {
    id: 'tour-comparison',
    name: 'Tour Price & Inclusions Comparison',
    category: 'Tours',
    description: 'Compare shared, small-group and private formats transparently.',
    embedPath: '/embed/tour-comparison.html',
    icon: 'compare',
  },
] as const;

export type OfficialTool = (typeof OFFICIAL_TOOLS)[number];
export type OfficialToolId = OfficialTool['id'];
export type ToolIconName = OfficialTool['icon'];

const NATIVE_STOREFRONT_TOOL_IDS = new Set<OfficialToolId>([
  'trip-cost-calculator',
  'visa-checker',
]);

const TOOL_BY_ID = new Map<OfficialToolId, OfficialTool>(
  OFFICIAL_TOOLS.map((tool) => [tool.id, tool]),
);

export function getOfficialTool(value: string): OfficialTool | null {
  return TOOL_BY_ID.get(value as OfficialToolId) ?? null;
}

export function isSupportedLocale(value: string): value is (typeof locales)[number] {
  return (locales as readonly string[]).includes(value);
}

/** Build a canonical in-app path without ever duplicating the default locale. */
export function localizedStorefrontPath(locale: string, path: string): string {
  const selectedLocale = isSupportedLocale(locale) ? locale : defaultLocale;
  const normalizedPath = path === '/' ? '' : `/${path.replace(/^\/+|\/+$/g, '')}`;
  const localePrefix = selectedLocale === defaultLocale ? '' : `/${selectedLocale}`;
  return `${localePrefix}${normalizedPath}` || '/';
}

export function localizedToolPath(locale: string, tool?: OfficialToolId): string {
  return localizedStorefrontPath(locale, tool ? `/tools/${tool}` : '/tools');
}

export function absoluteToolUrl(locale: string, tool?: OfficialToolId): string {
  return `${STOREFRONT_TOOL_BRAND.origin}${localizedToolPath(locale, tool)}`;
}

export function isNativeStorefrontTool(tool: OfficialToolId): boolean {
  return NATIVE_STOREFRONT_TOOL_IDS.has(tool);
}

/**
 * Route customers only to a surface that is already available.
 *
 * The two established tools remain native. The other official tools open on
 * the branded Authority host until their server-verified local embed routes
 * are explicitly configured and activated.
 */
export function customerToolHref(locale: string, tool: OfficialTool): string {
  return isNativeStorefrontTool(tool.id)
    ? localizedToolPath(locale, tool.id)
    : `${AUTHORITY_PUBLIC_ORIGIN}${tool.embedPath}`;
}

export function absoluteCustomerToolUrl(locale: string, tool: OfficialTool): string {
  const href = customerToolHref(locale, tool);
  return href.startsWith('/') ? `${STOREFRONT_TOOL_BRAND.origin}${href}` : href;
}

// Resolve a slug to the content item(s) that own it, across tours,
// destinations and categories. Detail routes use this to decide whether to
// render (the URL is the item's canonical path) or 301-redirect (the item
// lives at a different URL type now).

import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import {
  ContentType,
  UrlType,
  AttractionPageKind,
  normalizeUrlType,
  segmentFor,
  pageDefaultSegment,
  attractionPagePath,
  localizedContentPath,
  CITY_SEGMENT,
} from '@/lib/content/contentUrl';
import { defaultLocale } from '@/i18n/config';
import { legacyTenantTourUrl } from '@/lib/content/legacyTenantTourRedirect';

export interface ContentMatch {
  type: ContentType;
  slug: string;
  urlType: UrlType;
  segment: string; // effective URL segment ('' = root, CITY_SEGMENT = /{city}/)
  isPublished: boolean;
  citySlug?: string; // the owning destination's slug (tours only)
  pageKind?: AttractionPageKind; // 'page' matches: attraction vs catalogue
  parentSlug?: string;
  breadcrumbLabel?: string;
}

// Priority when a slug happens to exist in more than one collection.
const TYPE_PRIORITY: ContentType[] = ['tour', 'destination', 'category', 'page'];

interface ContentDocument {
  slug: string;
  urlType?: string;
  isPublished?: boolean;
  pageType?: string; // AttractionPage only: 'attraction' | 'category'
  destination?: { slug?: string } | null; // tours: required owning destination
  cityDestination?: { slug?: string } | null; // categories/pages: optional owning city
  parentPage?: { slug?: string; label?: string } | null;
  breadcrumbLabel?: string;
}

function citySlugOf(type: ContentType, doc: ContentDocument): string | undefined {
  const owner = type === 'tour' ? doc.destination : doc.cityDestination;
  return owner && typeof owner === 'object' ? owner.slug : undefined;
}

export async function resolveContentMatches(slug: string): Promise<ContentMatch[]> {
  await dbConnect();

  const [tour, destination, category, attractionPage] = await Promise.all([
    Tour.findOne({ slug, ...DEFAULT_TENANT_FILTER })
      .select('slug urlType isPublished destination parentPage breadcrumbLabel')
      .populate('destination', 'slug')
      .lean(),
    Destination.findOne({ slug, ...DEFAULT_TENANT_FILTER }).select('slug urlType isPublished parentPage breadcrumbLabel').lean(),
    Category.findOne({ slug, ...DEFAULT_TENANT_FILTER })
      .select('slug urlType isPublished cityDestination parentPage breadcrumbLabel')
      .populate('cityDestination', 'slug')
      .lean(),
    // Both attraction pages and catalogue pages participate in urlType routing.
    // A catalogue page's default shape is /category/{slug}, so its canonical
    // segment is derived from pageType, not the shared content-type default.
    AttractionPage.findOne({ slug, ...DEFAULT_TENANT_FILTER })
      .select('slug urlType isPublished pageType cityDestination parentPage breadcrumbLabel')
      .populate('cityDestination', 'slug')
      .lean(),
  ]);

  const matches: ContentMatch[] = [];
  const push = (type: ContentType, doc: ContentDocument | null) => {
    if (!doc) return;
    const urlType = normalizeUrlType(doc.urlType);
    const citySlug = citySlugOf(type, doc);
    const parentSlug = doc.parentPage?.slug;
    const pageKind: AttractionPageKind | undefined =
      type === 'page' ? (doc.pageType === 'category' ? 'category' : 'attraction') : undefined;
    const segment = parentSlug
      ? CITY_SEGMENT
      : type === 'page' && urlType === 'default'
        ? pageDefaultSegment(pageKind)
        : segmentFor(type, urlType);
    matches.push({
      type,
      slug: String(doc.slug),
      urlType,
      segment,
      isPublished: doc.isPublished !== false,
      ...(citySlug ? { citySlug } : {}),
      ...(parentSlug ? { parentSlug } : {}),
      ...(doc.breadcrumbLabel ? { breadcrumbLabel: doc.breadcrumbLabel } : {}),
      ...(pageKind ? { pageKind } : {}),
    });
  };

  push('tour', tour as ContentDocument | null);
  push('destination', destination as ContentDocument | null);
  push('category', category as ContentDocument | null);
  push('page', attractionPage as ContentDocument | null);

  return matches.sort(
    (a, b) => TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type)
  );
}

export type ResolveDecision =
  | { action: 'render'; match: ContentMatch }
  | { action: 'redirect'; to: string }
  | { action: 'notFound' };

// Locale-prefixed canonical path for a match. Attraction-page matches route
// through attractionPagePath so a default-shaped catalogue page canonicalizes
// to /category/{slug}, never the shared 'page' default of /attraction/{slug}.
function canonicalPathFor(match: ContentMatch, locale: string): string {
  if (match.type === 'page') {
    const path = attractionPagePath(match.slug, match.pageKind, match.urlType, match.citySlug, match.parentSlug);
    return locale && locale !== defaultLocale ? `/${locale}${path}` : path;
  }
  return localizedContentPath(match.type, match.slug, match.urlType, locale, match.citySlug, match.parentSlug);
}

// Decide what a detail route serving `expectedSegment` should do for `slug`.
// - render: an item whose canonical segment equals this route's segment.
// - redirect: the slug belongs to an item that now lives elsewhere → 301.
// - notFound: nothing owns this slug.
export async function decideForSegment(
  slug: string,
  expectedSegment: string,
  locale: string
): Promise<ResolveDecision> {
  // Known cross-tenant legacy URLs are static redirects. Resolve them before
  // touching MongoDB so an old shared link stays fast even during a DB cold
  // start or transient database outage.
  const legacyTenantUrl = legacyTenantTourUrl(slug, locale);
  if (legacyTenantUrl) return { action: 'redirect', to: legacyTenantUrl };

  const matches = await resolveContentMatches(slug);
  if (matches.length === 0) return { action: 'notFound' };

  const exact = matches.find((m) => m.segment === expectedSegment && m.isPublished)
    || matches.find((m) => m.segment === expectedSegment);
  if (exact) return { action: 'render', match: exact };

  // Slug exists but under a different URL type → send to its canonical path.
  const canonical = matches.find((m) => m.isPublished) || matches[0];
  return {
    action: 'redirect',
    to: canonicalPathFor(canonical, locale),
  };
}

// Decide what the city-nested route (/{city}/{slug}) should do. Tours nest
// under their required owning destination; categories and attraction pages
// under their optional `cityDestination`:
// - render: an item's urlType is `city` and {city} IS its owning city's slug.
// - redirect: the slug is real but lives elsewhere (or under a different city).
// - notFound: nothing owns this slug.
export async function decideForCityPath(
  citySlug: string,
  slug: string,
  locale: string
): Promise<ResolveDecision> {
  const matches = await resolveContentMatches(slug);
  if (matches.length === 0) return { action: 'notFound' };

  const exact = matches.find(
    (m) => (m.parentSlug === citySlug || (m.urlType === 'city' && m.citySlug === citySlug)) && m.isPublished
  ) || matches.find((m) => m.parentSlug === citySlug || (m.urlType === 'city' && m.citySlug === citySlug));
  if (exact) return { action: 'render', match: exact };

  // Real slug, wrong shape or wrong city → its canonical path, never a 404.
  const canonical = matches.find((m) => m.isPublished) || matches[0];
  return {
    action: 'redirect',
    to: canonicalPathFor(canonical, locale),
  };
}

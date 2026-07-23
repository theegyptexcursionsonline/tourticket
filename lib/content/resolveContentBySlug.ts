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
  normalizeUrlType,
  segmentFor,
  localizedContentPath,
} from '@/lib/content/contentUrl';

export interface ContentMatch {
  type: ContentType;
  slug: string;
  urlType: UrlType;
  segment: string; // effective URL segment ('' = root, CITY_SEGMENT = /{city}/)
  isPublished: boolean;
  citySlug?: string; // the owning destination's slug (tours only)
}

// Priority when a slug happens to exist in more than one collection.
const TYPE_PRIORITY: ContentType[] = ['tour', 'destination', 'category', 'page'];

interface ContentDocument {
  slug: string;
  urlType?: string;
  isPublished?: boolean;
  destination?: { slug?: string } | null; // tours: required owning destination
  cityDestination?: { slug?: string } | null; // categories/pages: optional owning city
}

function citySlugOf(type: ContentType, doc: ContentDocument): string | undefined {
  const owner = type === 'tour' ? doc.destination : doc.cityDestination;
  return owner && typeof owner === 'object' ? owner.slug : undefined;
}

export async function resolveContentMatches(slug: string): Promise<ContentMatch[]> {
  await dbConnect();

  const [tour, destination, category, attractionPage] = await Promise.all([
    Tour.findOne({ slug, ...DEFAULT_TENANT_FILTER })
      .select('slug urlType isPublished destination')
      .populate('destination', 'slug')
      .lean(),
    Destination.findOne({ slug, ...DEFAULT_TENANT_FILTER }).select('slug urlType isPublished').lean(),
    Category.findOne({ slug, ...DEFAULT_TENANT_FILTER })
      .select('slug urlType isPublished cityDestination')
      .populate('cityDestination', 'slug')
      .lean(),
    // Only attraction-type pages participate in urlType routing; category-landing
    // pages keep their fixed /category/{slug} path.
    AttractionPage.findOne({ slug, pageType: 'attraction', ...DEFAULT_TENANT_FILTER })
      .select('slug urlType isPublished cityDestination')
      .populate('cityDestination', 'slug')
      .lean(),
  ]);

  const matches: ContentMatch[] = [];
  const push = (type: ContentType, doc: ContentDocument | null) => {
    if (!doc) return;
    const urlType = normalizeUrlType(doc.urlType);
    const citySlug = citySlugOf(type, doc);
    matches.push({
      type,
      slug: String(doc.slug),
      urlType,
      segment: segmentFor(type, urlType),
      isPublished: doc.isPublished !== false,
      ...(citySlug ? { citySlug } : {}),
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

// Decide what a detail route serving `expectedSegment` should do for `slug`.
// - render: an item whose canonical segment equals this route's segment.
// - redirect: the slug belongs to an item that now lives elsewhere → 301.
// - notFound: nothing owns this slug.
export async function decideForSegment(
  slug: string,
  expectedSegment: string,
  locale: string
): Promise<ResolveDecision> {
  const matches = await resolveContentMatches(slug);
  if (matches.length === 0) return { action: 'notFound' };

  const exact = matches.find((m) => m.segment === expectedSegment && m.isPublished)
    || matches.find((m) => m.segment === expectedSegment);
  if (exact) return { action: 'render', match: exact };

  // Slug exists but under a different URL type → send to its canonical path.
  const canonical = matches.find((m) => m.isPublished) || matches[0];
  return {
    action: 'redirect',
    to: localizedContentPath(canonical.type, canonical.slug, canonical.urlType, locale, canonical.citySlug),
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
    (m) => m.urlType === 'city' && m.citySlug === citySlug && m.isPublished
  ) || matches.find((m) => m.urlType === 'city' && m.citySlug === citySlug);
  if (exact) return { action: 'render', match: exact };

  // Real slug, wrong shape or wrong city → its canonical path, never a 404.
  const canonical = matches.find((m) => m.isPublished) || matches[0];
  return {
    action: 'redirect',
    to: localizedContentPath(canonical.type, canonical.slug, canonical.urlType, locale, canonical.citySlug),
  };
}

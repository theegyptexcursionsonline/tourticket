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
  CITY_SEGMENT,
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
  destination?: { slug?: string } | null;
}

export async function resolveContentMatches(slug: string): Promise<ContentMatch[]> {
  await dbConnect();

  const [tour, destination, category, attractionPage] = await Promise.all([
    Tour.findOne({ slug, ...DEFAULT_TENANT_FILTER })
      .select('slug urlType isPublished destination')
      .populate('destination', 'slug')
      .lean(),
    Destination.findOne({ slug, ...DEFAULT_TENANT_FILTER }).select('slug urlType isPublished').lean(),
    Category.findOne({ slug, ...DEFAULT_TENANT_FILTER }).select('slug urlType isPublished').lean(),
    // Only attraction-type pages participate in urlType routing; category-landing
    // pages keep their fixed /category/{slug} path.
    AttractionPage.findOne({ slug, pageType: 'attraction', ...DEFAULT_TENANT_FILTER }).select('slug urlType isPublished').lean(),
  ]);

  const matches: ContentMatch[] = [];
  const push = (type: ContentType, doc: ContentDocument | null) => {
    if (!doc) return;
    const urlType = normalizeUrlType(doc.urlType);
    const citySlug =
      type === 'tour' && doc.destination && typeof doc.destination === 'object'
        ? doc.destination.slug
        : undefined;
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

// Decide what the city-nested route (/{city}/{slug}) should do. Only tours can
// live at a city path (they carry a required owning destination):
// - render: the tour's urlType is `city` and {city} IS its destination's slug.
// - redirect: the tour exists but lives elsewhere (or under a different city).
// - notFound: no tour owns this slug.
export async function decideForCityPath(
  citySlug: string,
  slug: string,
  locale: string
): Promise<ResolveDecision> {
  await dbConnect();

  const tour = await Tour.findOne({ slug, ...DEFAULT_TENANT_FILTER })
    .select('slug urlType isPublished destination')
    .populate('destination', 'slug')
    .lean<ContentDocument | null>();
  if (!tour) return { action: 'notFound' };

  const urlType = normalizeUrlType(tour.urlType);
  const tourCity =
    tour.destination && typeof tour.destination === 'object' ? tour.destination.slug : undefined;

  if (urlType === 'city' && tourCity && tourCity === citySlug) {
    return {
      action: 'render',
      match: {
        type: 'tour',
        slug: String(tour.slug),
        urlType,
        segment: CITY_SEGMENT,
        isPublished: tour.isPublished !== false,
        citySlug: tourCity,
      },
    };
  }

  // Real tour, wrong shape or wrong city → its canonical path, never a 404.
  return {
    action: 'redirect',
    to: localizedContentPath('tour', String(tour.slug), urlType, locale, tourCity),
  };
}

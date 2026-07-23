// Central URL-type helper for content (tours, destinations, categories, and
// attraction/landing pages).
//
// Admins can pick, per item, which URL shape it lives at via the `urlType`
// field. This module is the single source of truth mapping (content type +
// urlType) → public path, so routing, sitemap, canonical tags and internal
// links all agree.

import { defaultLocale } from '@/i18n/config';

export type ContentType = 'tour' | 'destination' | 'category' | 'page';

// The URL shapes an admin can choose from. `default` keeps the item on its
// historical path (tours at the root, destinations under /destinations, etc.)
// so existing URLs never move unless an admin opts in. `city` nests the item
// under its own destination's slug (/{city}/{slug}) — tours only, since only
// tours carry a required owning destination.
export type UrlType = 'default' | 'direct' | 'tour' | 'experience' | 'destination' | 'city';

export const URL_TYPES: UrlType[] = ['default', 'direct', 'tour', 'experience', 'destination', 'city'];

// Human labels for the admin dropdown.
export const URL_TYPE_LABELS: Record<UrlType, string> = {
  default: 'Default (current)',
  direct: 'Direct  /{slug}',
  tour: '/tour/{slug}',
  experience: '/experience/{slug}',
  destination: '/destination/{slug}',
  city: 'City  /{destination}/{slug}',
};

// Sentinel segment for the city shape — the real first segment is the item's
// destination slug, so it can never equal a fixed route segment.
export const CITY_SEGMENT = '{city}';

// The path segment each explicit urlType maps to. '' means the root ("direct").
const SEGMENT_FOR_URL_TYPE: Record<Exclude<UrlType, 'default'>, string> = {
  direct: '',
  tour: 'tour',
  experience: 'experience',
  destination: 'destination',
  city: CITY_SEGMENT,
};

// Backward-compatible segment per content type when urlType is `default` /
// unset — this is exactly how the site behaves today.
export const DEFAULT_SEGMENT: Record<ContentType, string> = {
  tour: '', // tours already live at the root: /{slug}
  destination: 'destinations',
  category: 'categories',
  page: 'attraction', // attraction/landing pages live under /attraction
};

// The set of segments that a request path can carry for a given content type.
// Used by the resolver to map an incoming URL segment back to a content type.
export function normalizeUrlType(urlType?: string | null): UrlType {
  return (urlType && (URL_TYPES as string[]).includes(urlType) ? urlType : 'default') as UrlType;
}

// The effective segment for an item ('' = root).
export function segmentFor(type: ContentType, urlType?: string | null): string {
  const t = normalizeUrlType(urlType);
  if (t === 'default') return DEFAULT_SEGMENT[type];
  return SEGMENT_FOR_URL_TYPE[t];
}

// Path relative to the locale root. Always a leading slash, never a locale.
// `citySlug` is the item's destination slug and only matters for the `city`
// urlType; without it the item safely falls back to its default shape.
export function contentPath(
  type: ContentType,
  slug: string,
  urlType?: string | null,
  citySlug?: string | null
): string {
  const t = normalizeUrlType(urlType);
  if (t === 'city') {
    if (citySlug) return `/${citySlug}/${slug}`;
    // No city known at this call site — link the default shape; the detail
    // route 301s to the city canonical.
    const seg = DEFAULT_SEGMENT[type];
    return seg ? `/${seg}/${slug}` : `/${slug}`;
  }
  const seg = segmentFor(type, urlType);
  return seg ? `/${seg}/${slug}` : `/${slug}`;
}

// Full public path including locale prefix. The default locale is un-prefixed
// (matches the sitemap + existing routing).
export function localizedContentPath(
  type: ContentType,
  slug: string,
  urlType: string | null | undefined,
  locale: string,
  citySlug?: string | null
): string {
  const path = contentPath(type, slug, urlType, citySlug);
  return locale && locale !== defaultLocale ? `/${locale}${path}` : path;
}

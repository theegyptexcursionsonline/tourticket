// Central URL-type helper for content (tours, destinations, categories).
//
// Admins can pick, per item, which URL shape it lives at via the `urlType`
// field. This module is the single source of truth mapping (content type +
// urlType) → public path, so routing, sitemap, canonical tags and internal
// links all agree.

import { defaultLocale } from '@/i18n/config';

export type ContentType = 'tour' | 'destination' | 'category';

// The URL shapes an admin can choose from. `default` keeps the item on its
// historical path (tours at the root, destinations under /destinations, etc.)
// so existing URLs never move unless an admin opts in.
export type UrlType = 'default' | 'direct' | 'tour' | 'experience' | 'destination';

export const URL_TYPES: UrlType[] = ['default', 'direct', 'tour', 'experience', 'destination'];

// Human labels for the admin dropdown.
export const URL_TYPE_LABELS: Record<UrlType, string> = {
  default: 'Default (current)',
  direct: 'Direct  /{slug}',
  tour: '/tour/{slug}',
  experience: '/experience/{slug}',
  destination: '/destination/{slug}',
};

// The path segment each explicit urlType maps to. '' means the root ("direct").
const SEGMENT_FOR_URL_TYPE: Record<Exclude<UrlType, 'default'>, string> = {
  direct: '',
  tour: 'tour',
  experience: 'experience',
  destination: 'destination',
};

// Backward-compatible segment per content type when urlType is `default` /
// unset — this is exactly how the site behaves today.
export const DEFAULT_SEGMENT: Record<ContentType, string> = {
  tour: '', // tours already live at the root: /{slug}
  destination: 'destinations',
  category: 'categories',
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
export function contentPath(type: ContentType, slug: string, urlType?: string | null): string {
  const seg = segmentFor(type, urlType);
  return seg ? `/${seg}/${slug}` : `/${slug}`;
}

// Full public path including locale prefix. The default locale is un-prefixed
// (matches the sitemap + existing routing).
export function localizedContentPath(
  type: ContentType,
  slug: string,
  urlType: string | null | undefined,
  locale: string
): string {
  const path = contentPath(type, slug, urlType);
  return locale && locale !== defaultLocale ? `/${locale}${path}` : path;
}

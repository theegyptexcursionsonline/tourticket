// Shared SEO utilities for consistent hreflang across all pages
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

/**
 * Returns the hreflang alternates object for Next.js metadata.
 * Use in every page's generateMetadata or static metadata that has its own
 * `alternates` key (otherwise the layout's alternates get overridden).
 */
export function getHreflangAlternates(path: string = '/') {
  const cleanPath = path === '/' ? '' : path;
  return {
    'en': `${BASE_URL}${cleanPath}`,
    'ar': `${BASE_URL}/ar${cleanPath}`,
    'es': `${BASE_URL}/es${cleanPath}`,
    'fr': `${BASE_URL}/fr${cleanPath}`,
    'de': `${BASE_URL}/de${cleanPath}`,
    'x-default': `${BASE_URL}${cleanPath}`,
  };
}

/**
 * Returns a complete alternates object with both canonical and hreflang.
 */
export function getSeoAlternates(path: string) {
  return {
    canonical: path,
    languages: getHreflangAlternates(path),
  };
}

// Per-page canonical + hreflang for localized detail pages.
//
// Without this, every detail page inherits the root layout's static
// `canonical: '/'`, so blog/tour/destination pages across all locales tell
// Google their canonical is the homepage — a duplicate-content signal. This
// emits a self-referencing canonical for the current locale plus a full
// hreflang set (every locale + x-default → default), matching the sitemap.

import { locales, defaultLocale } from "@/i18n/config";

const BASE_URL = "https://egypt-excursionsonline.com";

/** Absolute URL for `path` (locale-less, e.g. "/blog/x") under `locale`. */
export function localePath(locale: string, path: string): string {
  return `${BASE_URL}${locale === defaultLocale ? "" : "/" + locale}${path}`;
}

/**
 * Build Next.js metadata `alternates` for a localized page.
 * @param currentLocale the locale being rendered (self-canonical)
 * @param path locale-less path, e.g. `/blog/${slug}` or `/${slug}`
 */
export function metadataAlternates(currentLocale: string, path: string) {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = localePath(locale, path);
  languages["x-default"] = localePath(defaultLocale, path);
  return { canonical: localePath(currentLocale, path), languages };
}

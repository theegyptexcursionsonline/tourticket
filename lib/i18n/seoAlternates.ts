// Per-page canonical + hreflang for localized detail pages.
//
// Without this, every detail page inherits the root layout's static
// `canonical: '/'`, so blog/tour/destination pages across all locales tell
// Google their canonical is the homepage — a duplicate-content signal. This
// emits a self-referencing canonical for the current locale plus a full
// hreflang set (every locale + x-default → default), matching the sitemap.

import { locales, defaultLocale, type Locale } from '@/i18n/config';

export function normalizedSiteUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export const SEO_BASE_URL = normalizedSiteUrl(
  process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com',
);

const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  ar: 'ar_EG',
  es: 'es_ES',
  fr: 'fr_FR',
  de: 'de_DE',
};

/**
 * Canonical/hreflang callers must provide one locale-less pathname. Rejecting
 * a prefixed or absolute URL prevents accidental `/de/de/...` alternates and
 * cross-locale canonicals from being emitted silently.
 */
export function localeLessSeoPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.includes('?') || trimmed.includes('#')) {
    throw new Error(`SEO path must be a locale-less pathname: ${path}`);
  }

  const normalized = `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
  if (normalized === '/') return normalized;

  const firstSegment = normalized.split('/')[1];
  if ((locales as readonly string[]).includes(firstSegment)) {
    throw new Error(`SEO path must not include a locale prefix: ${path}`);
  }
  return normalized;
}

function supportedLocale(locale: string): Locale {
  if (!(locales as readonly string[]).includes(locale)) {
    throw new Error(`Unsupported SEO locale: ${locale}`);
  }
  return locale as Locale;
}

export function openGraphLocale(locale: string): string {
  return OPEN_GRAPH_LOCALE[supportedLocale(locale)];
}

const translationRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
};

const hasUsableTranslatedValue = (value: unknown): boolean => {
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, ' ').trim().length > 0;
  return Array.isArray(value) && value.some(hasUsableTranslatedValue);
};

/**
 * Dynamic documents are authored in English. A non-English URL is advertised
 * only when its stored translation bucket contains both the page identity and
 * primary body fields used by that document type. Partial/source fallbacks are
 * intentionally excluded from hreflang until locale completeness is explicit.
 */
export function explicitContentLocales(
  document: unknown,
  requiredFields: readonly string[],
): Locale[] {
  const translations = translationRecord(translationRecord(document)?.translations);

  return locales.filter((locale) => {
    if (locale === defaultLocale) return true;
    const bucket = translationRecord(translations?.[locale]);
    return Boolean(bucket && requiredFields.every((field) => hasUsableTranslatedValue(bucket[field])));
  });
}

/** Absolute URL for `path` (locale-less, e.g. "/blog/x") under `locale`. */
export function localePath(locale: string, path: string): string {
  const safeLocale = supportedLocale(locale);
  const safePath = localeLessSeoPath(path);
  return `${SEO_BASE_URL}${safeLocale === defaultLocale ? '' : `/${safeLocale}`}${safePath === '/' ? '' : safePath}`;
}

/** Resolve a locale-less internal path to its absolute localized URL. */
export function localizedAbsoluteUrl(locale: string, pathOrUrl: string): string {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : localePath(locale, pathOrUrl);
}

/** Absolute hreflang set shared by page metadata and sitemap entries. */
export function localizedLanguageAlternates(
  path: string,
  availableLocales: readonly string[] = locales,
): Record<string, string> {
  const safePath = localeLessSeoPath(path);
  const languages = Object.fromEntries(
    availableLocales.map((locale) => [supportedLocale(locale), localePath(locale, safePath)]),
  );
  return {
    ...languages,
    'x-default': localePath(defaultLocale, safePath),
  };
}

/** Next.js sitemap alternates wrapper. */
export function sitemapAlternates(path: string, availableLocales: readonly string[] = locales) {
  return { languages: localizedLanguageAlternates(path, availableLocales) };
}

/**
 * Build Next.js metadata `alternates` for a localized page.
 * @param currentLocale the locale being rendered (self-canonical)
 * @param path locale-less path, e.g. `/blog/${slug}` or `/${slug}`
 */
export function metadataAlternates(
  currentLocale: string,
  path: string,
  availableLocales: readonly string[] = locales,
) {
  const safePath = localeLessSeoPath(path);
  const requestedLocale = supportedLocale(currentLocale);
  const canonicalLocale = availableLocales.includes(requestedLocale) ? requestedLocale : defaultLocale;
  return {
    canonical: localePath(canonicalLocale, safePath),
    languages: localizedLanguageAlternates(safePath, availableLocales),
  };
}

/**
 * Metadata contract for a localized dynamic document. A locale may render an
 * English fallback for usability, but it must not be indexed until every core
 * field for that locale is explicitly authored. The canonical and hreflang set
 * use the same availability decision so search engines receive one consistent
 * signal instead of indexing fallback duplicates.
 */
export function localizedDocumentMetadata(
  currentLocale: string,
  path: string,
  document: unknown,
  requiredFields: readonly string[],
) {
  const availableLocales = explicitContentLocales(document, requiredFields);
  const requestedLocale = supportedLocale(currentLocale);
  const indexable = availableLocales.includes(requestedLocale);

  return {
    alternates: metadataAlternates(requestedLocale, path, availableLocales),
    ...(indexable ? {} : {
      robots: {
        index: false,
        follow: true,
        googleBot: { index: false, follow: true },
      },
    }),
  };
}

/** Truthful contract for a route whose authored copy currently exists only in English. */
export function englishOnlyMetadataAlternates(path: string) {
  return metadataAlternates(defaultLocale, path, [defaultLocale]);
}

// Display helpers shared by the blog list, the article page and the home blog
// section. Pure functions only: client components import this file, so it must
// never pull in a model or any other server module.

/** Every value the Blog model accepts for `category`; each has a name in every language. */
export const BLOG_CATEGORIES = [
  'travel-tips',
  'destination-guides',
  'food-culture',
  'adventure',
  'budget-travel',
  'luxury-travel',
  'solo-travel',
  'family-travel',
  'photography',
  'local-insights',
  'seasonal-travel',
  'transportation',
  'accommodation',
  'news-updates',
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export function isBlogCategory(value: unknown): value is BlogCategory {
  return typeof value === 'string' && (BLOG_CATEGORIES as readonly string[]).includes(value);
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The reader-facing category name. A value outside the model's list (an old
 * record, a hand edit) is spelled out from its stored value instead of being
 * printed raw, so "some-topic" never reaches the page as a code.
 */
export function blogCategoryLabel(t: Translate, category: unknown): string {
  if (isBlogCategory(category)) return t(`categories.${category}`);
  if (typeof category !== 'string' || !category.trim()) return '';
  return category
    .trim()
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  // Egyptian month names. The numbering system is pinned below, because ar-EG
  // alone prints Arabic-Indic digits while the rest of the Arabic site uses
  // Western digits.
  ar: 'ar-EG',
};

/**
 * `medium` is the article byline ("Nov 12, 2026", "12 نوفمبر 2026");
 * `numeric` is the compact card date in the locale's own order.
 * Always Western digits and always UTC, so the server render and the browser
 * agree on the day and one page never mixes two digit systems.
 */
export function formatBlogDate(
  date: string | Date | null | undefined,
  locale: string,
  style: 'medium' | 'numeric' = 'medium',
): string {
  if (!date) return '';
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const tag = DATE_LOCALES[locale] || DATE_LOCALES.en;
  const shape: Intl.DateTimeFormatOptions =
    style === 'medium'
      ? { year: 'numeric', month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'numeric', day: 'numeric' };
  return new Intl.DateTimeFormat(tag, { ...shape, numberingSystem: 'latn', timeZone: 'UTC' }).format(value);
}

/** A stored read time, or null when the post has none: no stand-in figure is shown. */
export function blogReadMinutes(readTime: unknown): number | null {
  const minutes = typeof readTime === 'number' ? readTime : Number.NaN;
  return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null;
}

/**
 * Values for a counted message. `count` picks the plural form; `n` is the
 * figure as printed, kept a plain string so every language shows Western
 * digits whatever the browser's own default for that language is.
 */
export function countValues(count: number): { count: number; n: string } {
  return { count, n: String(count) };
}

/** The real price of a linked tour, or null when the tour carries none. */
export function tourDisplayPrice(tour: { discountPrice?: unknown; price?: unknown } | null | undefined): number | null {
  for (const candidate of [tour?.discountPrice, tour?.price]) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) return candidate;
  }
  return null;
}

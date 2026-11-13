import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import type { ImageMetadata } from '@/lib/content/imageMetadata';
import { blogReadMinutes, formatBlogDate } from '@/lib/blog/blogDisplay';

/** The post fields a translation may replace on a card (English stays per field when one is blank). */
export const BLOG_CARD_LOCALIZED_FIELDS = ['title', 'excerpt'];

/**
 * What a blog card needs, and nothing else. The list page used to hand the
 * browser every post's full body and all of its translations; a card shows a
 * title, a summary and a few figures.
 */
export interface BlogCardData {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  imageMetadata?: ImageMetadata[];
  category: string;
  featured: boolean;
  author: string;
  readTime: number | null;
  views: number;
  likes: number;
  publishedDateText: string;
  tags: string[];
}

type PlainRecord = Record<string, unknown>;

// A lean() read can return the translations Map itself; JSON would turn it into {}.
function plainTranslations(value: unknown): PlainRecord | undefined {
  if (value instanceof Map) return Object.fromEntries(value) as PlainRecord;
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PlainRecord) : undefined;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

/** Overlay the visitor's language onto a post (English per missing field) and drop the translations. */
export function localizeBlogSummary<T extends PlainRecord>(
  post: T,
  locale: string,
  fields: string[] = BLOG_CARD_LOCALIZED_FIELDS,
): Omit<T, 'translations'> {
  const localized = localizeEntityFields(
    { ...post, translations: plainTranslations(post.translations) },
    locale,
    fields,
  ) as PlainRecord;
  delete localized.translations;
  return localized as Omit<T, 'translations'>;
}

export function toBlogCard(post: PlainRecord, locale: string): BlogCardData {
  const localized = localizeBlogSummary(post, locale) as PlainRecord;
  return {
    _id: String(post._id ?? post.slug ?? ''),
    slug: text(post.slug),
    title: text(localized.title),
    excerpt: text(localized.excerpt),
    featuredImage: text(post.featuredImage),
    imageMetadata: Array.isArray(post.imageMetadata) ? (post.imageMetadata as ImageMetadata[]) : undefined,
    category: text(post.category),
    featured: post.featured === true,
    author: text(post.author),
    readTime: blogReadMinutes(post.readTime),
    views: count(post.views),
    likes: count(post.likes),
    publishedDateText: formatBlogDate(post.publishedAt as string | Date | undefined, locale, 'numeric'),
    tags: Array.isArray(post.tags) ? post.tags.filter((tag): tag is string => typeof tag === 'string') : [],
  };
}

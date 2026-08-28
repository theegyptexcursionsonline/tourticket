import type { MetadataRoute } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { locales, defaultLocale } from '@/i18n/config';
import { contentPath, attractionPagePath } from '@/lib/content/contentUrl';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';
import { explicitContentLocales, localePath, sitemapAlternates } from '@/lib/i18n/seoAlternates';

// A catalogue outage must produce an observable sitemap failure at request
// time, never a successful but incomplete static-only sitemap.
export const dynamic = 'force-dynamic';

type SitemapEntry = MetadataRoute.Sitemap[number];
type SourceDate = Date | string | number | null | undefined;
type CatalogDocument = {
  slug: string;
  updatedAt?: SourceDate;
  createdAt?: SourceDate;
  publishedAt?: SourceDate;
  urlType?: string | null;
  pageType?: string | null;
  destination?: { slug?: string } | string | null;
  cityDestination?: { slug?: string } | string | null;
  parentPage?: { slug?: string } | null;
  translations?: unknown;
};

type SitemapRoute = {
  path: string;
  changeFrequency: NonNullable<SitemapEntry['changeFrequency']>;
  priority: number;
  localizedPriority?: number;
  availableLocales?: readonly string[];
};

/** Explicit inventory of indexable, real public listing/information routes. */
export const STATIC_SITEMAP_ROUTES: readonly SitemapRoute[] = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7, availableLocales: [defaultLocale] },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6, availableLocales: [defaultLocale] },
  { path: '/destinations', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/tours', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/egypt', changeFrequency: 'monthly', priority: 0.7, availableLocales: [defaultLocale] },
  { path: '/faqs', changeFrequency: 'monthly', priority: 0.5, availableLocales: [defaultLocale] },
  { path: '/interests', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/tools', changeFrequency: 'monthly', priority: 0.6, availableLocales: [defaultLocale] },
  { path: '/tools/trip-cost-calculator', changeFrequency: 'monthly', priority: 0.6, availableLocales: [defaultLocale] },
  { path: '/tools/visa-checker', changeFrequency: 'monthly', priority: 0.6, availableLocales: [defaultLocale] },
  { path: '/mobile-app', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/careers', changeFrequency: 'monthly', priority: 0.4, availableLocales: [defaultLocale] },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3, availableLocales: [defaultLocale] },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3, availableLocales: [defaultLocale] },
] as const;

/** Return the first valid source date; omit lastModified when none exists. */
export function sourceLastModified(...values: SourceDate[]): Date | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return undefined;
}

export function localizedSitemapEntries(
  route: SitemapRoute,
  lastModified?: Date,
): SitemapEntry[] {
  const availableLocales = route.availableLocales ?? locales;
  return availableLocales.map((locale) => ({
    url: localePath(locale, route.path),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: route.changeFrequency,
    priority: locale === defaultLocale
      ? route.priority
      : (route.localizedPriority ?? Math.max(0, route.priority - 0.05)),
    alternates: sitemapAlternates(route.path, availableLocales),
  }));
}

export function localizedDocumentSitemapEntries(
  document: CatalogDocument,
  route: SitemapRoute,
  requiredTranslationFields: readonly string[],
  lastModified?: Date,
): SitemapEntry[] {
  return localizedSitemapEntries(
    { ...route, availableLocales: explicitContentLocales(document, requiredTranslationFields) },
    lastModified,
  );
}

function requiredModel(name: string): mongoose.Model<CatalogDocument> {
  const model = mongoose.models[name] as mongoose.Model<CatalogDocument> | undefined;
  if (!model) throw new Error(`Sitemap catalog model is unavailable: ${name}`);
  return model;
}

function contentRoute(
  path: string,
  priority: number,
  changeFrequency: SitemapRoute['changeFrequency'],
): SitemapRoute {
  return { path, priority, localizedPriority: Math.max(0, priority - 0.05), changeFrequency };
}

function assertUniqueUrls(entries: MetadataRoute.Sitemap): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.url)) throw new Error(`Duplicate sitemap URL: ${entry.url}`);
    seen.add(entry.url);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await dbConnect();

  const Tour = requiredModel('Tour');
  const Destination = requiredModel('Destination');
  const Category = requiredModel('Category');
  const Blog = requiredModel('Blog');
  const AttractionPage = requiredModel('AttractionPage');

  // Every query is strict and awaited together: one failed collection makes
  // the sitemap fail closed instead of publishing a partial catalogue.
  const [tours, destinations, categories, posts, attractionPages] = await Promise.all([
    Tour.find(
      { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER },
      { slug: 1, updatedAt: 1, createdAt: 1, urlType: 1, destination: 1, parentPage: 1, translations: 1 },
    ).populate('destination', 'slug').sort({ slug: 1 }).lean<CatalogDocument[]>(),
    Destination.find(
      { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER },
      { slug: 1, updatedAt: 1, createdAt: 1, urlType: 1, parentPage: 1, translations: 1 },
    ).sort({ slug: 1 }).lean<CatalogDocument[]>(),
    Category.find(
      { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER },
      { slug: 1, updatedAt: 1, createdAt: 1, urlType: 1, cityDestination: 1, parentPage: 1, translations: 1 },
    ).populate('cityDestination', 'slug').sort({ slug: 1 }).lean<CatalogDocument[]>(),
    Blog.find(
      { status: 'published', ...DEFAULT_TENANT_FILTER },
      { slug: 1, updatedAt: 1, publishedAt: 1, createdAt: 1, translations: 1 },
    ).sort({ slug: 1 }).lean<CatalogDocument[]>(),
    AttractionPage.find(
      { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER },
      { slug: 1, updatedAt: 1, createdAt: 1, pageType: 1, urlType: 1, cityDestination: 1, parentPage: 1, translations: 1 },
    ).populate('cityDestination', 'slug').sort({ slug: 1 }).lean<CatalogDocument[]>(),
  ]);

  const entries: MetadataRoute.Sitemap = STATIC_SITEMAP_ROUTES.flatMap((route) =>
    localizedSitemapEntries(route),
  );

  for (const tour of tours) {
    const citySlug = typeof tour.destination === 'object' ? tour.destination?.slug : undefined;
    const path = contentPath('tour', tour.slug, tour.urlType, citySlug, tour.parentPage?.slug);
    entries.push(...localizedDocumentSitemapEntries(
      tour,
      contentRoute(path, 0.9, 'weekly'),
      ['title', 'description'],
      sourceLastModified(tour.updatedAt, tour.createdAt),
    ));
  }

  for (const destination of destinations) {
    const path = contentPath(
      'destination',
      destination.slug,
      destination.urlType,
      undefined,
      destination.parentPage?.slug,
    );
    entries.push(...localizedDocumentSitemapEntries(
      destination,
      contentRoute(path, 0.8, 'weekly'),
      ['name', 'description'],
      sourceLastModified(destination.updatedAt, destination.createdAt),
    ));
  }

  for (const category of categories) {
    const citySlug = typeof category.cityDestination === 'object' ? category.cityDestination?.slug : undefined;
    const path = contentPath('category', category.slug, category.urlType, citySlug, category.parentPage?.slug);
    entries.push(...localizedDocumentSitemapEntries(
      category,
      contentRoute(path, 0.7, 'weekly'),
      ['name', 'description'],
      sourceLastModified(category.updatedAt, category.createdAt),
    ));
  }

  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    entries.push(...localizedDocumentSitemapEntries(
      post,
      contentRoute(path, 0.7, 'monthly'),
      ['title', 'excerpt', 'content'],
      sourceLastModified(post.updatedAt, post.publishedAt, post.createdAt),
    ));
  }

  for (const page of attractionPages) {
    const citySlug = typeof page.cityDestination === 'object' ? page.cityDestination?.slug : undefined;
    const path = attractionPagePath(
      page.slug,
      page.pageType,
      page.urlType,
      citySlug,
      page.parentPage?.slug,
    );
    entries.push(...localizedDocumentSitemapEntries(
      page,
      contentRoute(path, 0.7, 'monthly'),
      ['title', 'description'],
      sourceLastModified(page.updatedAt, page.createdAt),
    ));
  }

  entries.sort((left, right) => left.url.localeCompare(right.url));
  assertUniqueUrls(entries);
  return entries;
}

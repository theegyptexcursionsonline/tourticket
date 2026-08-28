import path from 'node:path';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import {
  buildContentReadinessReport,
  requireContentReadinessDatabaseUri,
  renderContentReadinessJson,
  renderContentReadinessMarkdown,
  type ContentReadinessInput,
} from '@/lib/seo/contentReadiness';
import { explicitContentLocales } from '@/lib/i18n/seoAlternates';
import { CANCELLATION_POLICY_SUMMARY } from '@/lib/bookings/cancellationPolicy';

type RecordValue = Record<string, unknown>;
type OutputFormat = 'json' | 'markdown';

function outputFormat(args: readonly string[]): OutputFormat {
  const formatArg = args.find((arg) => arg.startsWith('--format='));
  const format = formatArg?.split('=')[1] || 'markdown';
  if (format !== 'json' && format !== 'markdown') {
    throw new Error('Unsupported --format. Use --format=json or --format=markdown.');
  }
  return format;
}

function recordId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  if ('_id' in value) return recordId((value as { _id?: unknown })._id);
  const rendered = String(value);
  return rendered === '[object Object]' ? '' : rendered;
}

function referenceIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(referenceIds).filter(Boolean);
  const id = recordId(value);
  return id ? [id] : [];
}

function countPublicReferences(value: unknown, publicIds: ReadonlySet<string>): number {
  return new Set(referenceIds(value).filter((id) => publicIds.has(id))).size;
}

function countRootRelativeLinks(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const hrefs = value.match(/href\s*=\s*["']\/(?!\/)[^"']*["']/gi) || [];
  return new Set(hrefs.map((href) => href.toLowerCase())).size;
}

function asRecords(value: unknown): RecordValue[] {
  return JSON.parse(JSON.stringify(value)) as RecordValue[];
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

  const format = outputFormat(process.argv.slice(2));
  const databaseUri = requireContentReadinessDatabaseUri(process.env);

  const [
    { DEFAULT_TENANT_FILTER },
    { PUBLIC_CONTENT_FILTER },
  ] = await Promise.all([
    import('@/lib/tenant/defaultTenantFilter'),
    import('@/lib/content/publicContentFilter'),
  ]);

  // Use the native driver without loading Mongoose models. This audit must
  // never compile schemas, create collections, build indexes, or run hooks.
  const client = new MongoClient(databaseUri, {
    appName: 'eeo-seo-content-readiness-audit',
    maxPoolSize: 1,
    minPoolSize: 0,
    readPreference: 'secondaryPreferred',
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
  });

  try {
    await client.connect();
    const database = client.db();
    const [tourRows, destinationRows, categoryRows, blogRows, attractionRows] = await Promise.all([
      database.collection('tours').find(
        { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER },
        { projection: { title: 1, slug: 1, description: 1, longDescription: 1, image: 1, images: 1, translations: 1, pricingSummary: 1, bookingOptions: 1, cancellationPolicy: 1, destination: 1, category: 1, attractions: 1, interests: 1 } },
      ).toArray(),
      database.collection('destinations').find(
        { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER },
        { projection: { name: 1, slug: 1, description: 1, longDescription: 1, image: 1, images: 1, translations: 1 } },
      ).toArray(),
      database.collection('categories').find(
        { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER },
        { projection: { name: 1, slug: 1, description: 1, longDescription: 1, heroImage: 1, images: 1, translations: 1, popularDestinationIds: 1, linkedPageIds: 1, linkedCategoryIds: 1 } },
      ).toArray(),
      database.collection('blogs').find(
        { ...DEFAULT_TENANT_FILTER, status: 'published' },
        { projection: { title: 1, slug: 1, excerpt: 1, content: 1, featuredImage: 1, images: 1, translations: 1, category: 1, relatedDestinations: 1, relatedTours: 1 } },
      ).toArray(),
      database.collection('attractionpages').find(
        { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER },
        { projection: { title: 1, slug: 1, description: 1, longDescription: 1, heroImage: 1, images: 1, translations: 1, linkedTourIds: 1, linkedPageIds: 1, linkedCategoryIds: 1 } },
      ).toArray(),
    ]);

    const tours = asRecords(tourRows);
    const destinations = asRecords(destinationRows);
    const categories = asRecords(categoryRows);
    const blogs = asRecords(blogRows);
    const attractionPages = asRecords(attractionRows);
    const tourIds = new Set(tours.map((record) => recordId(record._id)));
    const destinationIds = new Set(destinations.map((record) => recordId(record._id)));
    const categoryIds = new Set(categories.map((record) => recordId(record._id)));
    const attractionIds = new Set(attractionPages.map((record) => recordId(record._id)));

    const inputs: ContentReadinessInput[] = [
      ...tours.map((tour) => ({
        ...tour,
        id: recordId(tour._id),
        kind: 'tour' as const,
        effectiveCancellationPolicy: CANCELLATION_POLICY_SUMMARY,
        internalLinkCount:
          countPublicReferences(tour.destination, destinationIds)
          + countPublicReferences(tour.category, categoryIds)
          + countPublicReferences(tour.attractions, attractionIds)
          + countPublicReferences(tour.interests, attractionIds),
      })),
      ...destinations.map((destination) => ({
        ...destination,
        id: recordId(destination._id),
        kind: 'destination' as const,
        internalLinkCount: tours.filter((tour) => referenceIds(tour.destination).includes(recordId(destination._id))).length,
      })),
      ...categories.map((category) => ({
        ...category,
        id: recordId(category._id),
        kind: 'category' as const,
        internalLinkCount:
          tours.filter((tour) => referenceIds(tour.category).includes(recordId(category._id))).length
          + countPublicReferences(category.popularDestinationIds, destinationIds)
          + countPublicReferences(category.linkedPageIds, attractionIds)
          + countPublicReferences(category.linkedCategoryIds, categoryIds),
      })),
      ...blogs.map((blog) => ({
        ...blog,
        id: recordId(blog._id),
        kind: 'blog' as const,
        indexableLocales: explicitContentLocales(blog, ['title', 'excerpt', 'content']),
        internalLinkCount:
          countPublicReferences(blog.relatedDestinations, destinationIds)
          + countPublicReferences(blog.relatedTours, tourIds)
          + countRootRelativeLinks(blog.content)
          + blogs.filter((otherBlog) => (
            recordId(otherBlog._id) !== recordId(blog._id)
            && typeof blog.category === 'string'
            && blog.category.length > 0
            && otherBlog.category === blog.category
          )).length,
      })),
      ...attractionPages.map((page) => ({
        ...page,
        id: recordId(page._id),
        kind: 'attraction-page' as const,
        internalLinkCount:
          countPublicReferences(page.linkedTourIds, tourIds)
          + countPublicReferences(page.linkedPageIds, attractionIds)
          + countPublicReferences(page.linkedCategoryIds, categoryIds)
          + tours.filter((tour) => (
            referenceIds(tour.attractions).includes(recordId(page._id))
            || referenceIds(tour.interests).includes(recordId(page._id))
          )).length,
      })),
    ];

    const report = buildContentReadinessReport(inputs);
    process.stdout.write(
      format === 'json'
        ? renderContentReadinessJson(report)
        : renderContentReadinessMarkdown(report),
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Content readiness audit failed: ${message}\n`);
  process.exitCode = 2;
});

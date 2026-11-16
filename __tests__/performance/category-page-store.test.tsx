/** @jest-environment node */
/**
 * Owner decision 16 Nov 2026: category (list) pages may keep their data for
 * five minutes so they open within two seconds; the trip page, cart and
 * checkout stay live. These tests run the real category renderer against a
 * real in-memory MongoDB and a faithful stand-in for Next's data cache
 * (`unstable_cache` keyed by its key parts, expiring after `revalidate`
 * seconds, purged by `revalidateTag`), and prove:
 *   - a second visit within 300 s runs no queries;
 *   - another slug, language or site never receives a stored page;
 *   - admin saves for a trip, its booking option or the category purge it;
 *   - unpublished and other-site records never reach the page;
 *   - the trip page and the price-check paths do not use this store.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';

type CacheEntry = { value: string; tags: string[]; expiresAt: number };
const mockCache = {
  entries: new Map<string, CacheEntry>(),
  now: 0,
  keys: [] as string[][],
  purgedTags: [] as string[],
};

jest.mock('next/cache', () => ({
  unstable_cache:
    (fn: () => Promise<unknown>, keyParts: string[], options: { revalidate: number; tags: string[] }) =>
    async () => {
      mockCache.keys.push(keyParts);
      const key = JSON.stringify(keyParts);
      const hit = mockCache.entries.get(key);
      if (hit && hit.expiresAt > mockCache.now) return JSON.parse(hit.value);
      const value = JSON.stringify(await fn());
      mockCache.entries.set(key, { value, tags: options.tags, expiresAt: mockCache.now + options.revalidate * 1000 });
      return JSON.parse(value);
    },
  revalidateTag: (tag: string, profile: unknown) => {
    // Category pages must expire at once, not serve one more stale page.
    if (tag === 'category-pages' && JSON.stringify(profile) !== JSON.stringify({ expire: 0 })) return;
    mockCache.purgedTags.push(tag);
    for (const [key, entry] of mockCache.entries) if (entry.tags.includes(tag)) mockCache.entries.delete(key);
  },
  revalidatePath: () => undefined,
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: async () => ({ connection: mongoose.connection }) }));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler, registerAdminAuditDetail: jest.fn() }));
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: jest.fn(async () => ({ id: 'local-editor', email: '', name: 'Editor', role: 'admin' })) }));
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: jest.fn(async () => ({ userId: 'local-editor', email: '', name: 'Editor', role: 'admin' })) }));
jest.mock('@/lib/algolia', () => ({ syncTourToAlgolia: jest.fn(async () => undefined), deleteTourFromAlgolia: jest.fn(async () => undefined) }));
jest.mock('@/lib/i18n/autoTranslate', () => ({
  autoTranslateTour: jest.fn(async () => undefined),
  autoTranslateCategory: jest.fn(async () => undefined),
}));
jest.mock('@/app/[locale]/categories/[slug]/CategoryPageClient', () => ({
  __esModule: true,
  default: function CategoryPageClientStub() { return null; },
}));
jest.mock('@/components/schema/CollectionSchema', () => ({
  __esModule: true,
  default: function CollectionSchemaStub() { return null; },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const Tour = require('@/lib/models/Tour').default as typeof import('@/lib/models/Tour').default;
const Category = require('@/lib/models/Category').default as typeof import('@/lib/models/Category').default;
const Destination = require('@/lib/models/Destination').default as typeof import('@/lib/models/Destination').default;
const detail = require('@/app/[locale]/categories/[slug]/CategoryDetailContent') as typeof import('@/app/[locale]/categories/[slug]/CategoryDetailContent');
const { PUT: putCategory } = require('@/app/api/categories/[id]/route') as typeof import('@/app/api/categories/[id]/route');
const { PUT: putTour } = require('@/app/api/admin/tours/[id]/route') as typeof import('@/app/api/admin/tours/[id]/route');
const { PUT: putBookingOption } = require('@/app/api/tours/[tourId]/booking-options/route') as typeof import('@/app/api/tours/[tourId]/booking-options/route');
/* eslint-enable @typescript-eslint/no-require-imports */

type Doc = Record<string, unknown>;
type ClientProps = { category: Doc; categoryTours: Doc[]; relatedInterests: Doc[] };

let server: MongoMemoryServer;
let queryCount = 0;
const ids = {
  destination: new mongoose.Types.ObjectId(),
  category: new mongoose.Types.ObjectId(),
  otherSiteCategory: new mongoose.Types.ObjectId(),
  luxor: new mongoose.Types.ObjectId(),
  felucca: new mongoose.Types.ObjectId(),
  draft: new mongoose.Types.ObjectId(),
  otherSiteTour: new mongoose.Types.ObjectId(),
  otherSiteSameCategory: new mongoose.Types.ObjectId(),
  luxorTrip: new mongoose.Types.ObjectId(),
};

const trip = (id: mongoose.Types.ObjectId, overrides: Doc) => ({
  _id: id,
  slug: `trip-${id}`,
  title: `Trip ${id}`,
  description: 'Card copy for a day on the Nile',
  image: '/trip.jpg',
  price: 100,
  discountPrice: 90,
  duration: '6 hours',
  destination: ids.destination,
  category: [ids.category],
  isPublished: true,
  archivedAt: null,
  availability: { type: 'daily', slots: [{ time: '09:00', capacity: 10 }] },
  bookingOptions: [{ type: 'Per Person', label: 'Shared', price: 90 }],
  ...overrides,
});

async function seed() {
  await Promise.all([Tour.deleteMany({}), Category.deleteMany({}), Destination.deleteMany({})]);
  await Destination.collection.insertOne({ _id: ids.destination, name: 'Aswan', slug: 'aswan', isPublished: true, archivedAt: null });
  await Category.collection.insertMany([
    {
      _id: ids.category, name: 'Aswan Tours', slug: 'aswan-tours', description: 'Trips from Aswan', isPublished: true, archivedAt: null,
      translations: { ar: { name: 'رحلات أسوان', description: 'رحلات من أسوان' } },
    },
    // Another site's category with the same slug must never answer for this site.
    { _id: ids.otherSiteCategory, tenantId: 'other-site', name: 'Other site Aswan', slug: 'aswan-tours', description: 'Other site', isPublished: true, archivedAt: null },
    { _id: ids.luxor, name: 'Luxor Tours', slug: 'luxor-tours', description: 'Trips from Luxor', isPublished: true, archivedAt: null },
  ]);
  await Tour.collection.insertMany([
    trip(ids.felucca, { slug: 'felucca-sail', title: 'Felucca sail' }),
    trip(ids.draft, { slug: 'draft-trip', title: 'Draft trip', isPublished: false }),
    trip(ids.otherSiteTour, { slug: 'other-site-trip', title: 'Other site trip', tenantId: 'other-site' }),
    trip(ids.otherSiteSameCategory, { slug: 'other-site-category-trip', title: 'Other site category trip', tenantId: 'other-site', category: [ids.otherSiteCategory] }),
    trip(ids.luxorTrip, { slug: 'valley-of-the-kings', title: 'Valley of the Kings', category: [ids.luxor] }),
  ]);
}

async function visit(slug: string, locale = 'en') {
  const element = await detail.renderCategoryDetail(slug, locale);
  if (!element) return null;
  const [, client] = React.Children.toArray((element.props as { children: React.ReactNode }).children) as React.ReactElement[];
  return client.props as ClientProps;
}
const titles = (props: ClientProps | null) => (props?.categoryTours || []).map((tour) => String(tour.title));
const jsonRequest = (url: string, body: unknown) => new NextRequest(url, {
  method: 'PUT', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
});

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri('category_page_store'));
  const exec = mongoose.Query.prototype.exec;
  jest.spyOn(mongoose.Query.prototype, 'exec').mockImplementation(function counted(this: mongoose.Query<unknown, unknown>, ...args: unknown[]) {
    queryCount += 1;
    return (exec as (...a: unknown[]) => Promise<unknown>).apply(this, args);
  } as typeof exec);
  const aggregate = mongoose.Aggregate.prototype.exec;
  jest.spyOn(mongoose.Aggregate.prototype, 'exec').mockImplementation(function counted(this: mongoose.Aggregate<unknown>, ...args: unknown[]) {
    queryCount += 1;
    return (aggregate as (...a: unknown[]) => Promise<unknown>).apply(this, args);
  } as typeof aggregate);
}, 60_000);
afterAll(async () => {
  jest.restoreAllMocks();
  await mongoose.disconnect();
  await server.stop();
});
beforeEach(async () => {
  mockCache.entries.clear();
  mockCache.keys.length = 0;
  mockCache.purgedTags.length = 0;
  mockCache.now = 0;
  await seed();
  queryCount = 0;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('category page data is stored for five minutes', () => {
  it('runs no queries on a second visit within 300 s, and reads again after', async () => {
    const first = await visit('aswan-tours');
    const firstQueries = queryCount;
    expect(firstQueries).toBeGreaterThan(0);
    expect(titles(first)).toEqual(['Felucca sail']);

    queryCount = 0;
    mockCache.now = 299_000;
    const second = await visit('aswan-tours');
    expect(queryCount).toBe(0);
    expect(second).toEqual(first);

    mockCache.now = 301_000;
    await visit('aswan-tours');
    expect(queryCount).toBe(firstQueries);
  });

  it('stores the page for 300 s under the site, slug and language, tagged like the destination page', async () => {
    await visit('aswan-tours', 'ar');
    expect(mockCache.keys).toContainEqual(['category-page-data', 'default', 'aswan-tours', 'ar']);
    expect(detail.CATEGORY_PAGE_REVALIDATE_SECONDS).toBe(300);
    const [entry] = [...mockCache.entries.values()];
    expect(entry.tags).toEqual(['category-pages', 'category-page:aswan-tours']);
    expect(entry.expiresAt).toBe(300_000);
  });

  it('gives each slug and each language its own data', async () => {
    const english = await visit('aswan-tours', 'en');
    const arabic = await visit('aswan-tours', 'ar');
    const luxor = await visit('luxor-tours', 'en');
    expect(english?.category.name).toBe('Aswan Tours');
    expect(arabic?.category.name).toBe('رحلات أسوان');
    expect(titles(luxor)).toEqual(['Valley of the Kings']);
    expect(luxor?.category.name).toBe('Luxor Tours');
    expect(mockCache.entries.size).toBe(3);
  });

  it('never stores or shows another site\'s or an unpublished record', async () => {
    const page = await visit('aswan-tours');
    const stored = [...mockCache.entries.values()].map((entry) => entry.value).join('\n');
    for (const text of [page ? JSON.stringify(page) : '', stored]) {
      expect(text).not.toContain('Draft trip');
      expect(text).not.toContain('Other site');
    }
    expect(page?.category._id).toBe(String(ids.category));
  });

  it('never stores anything for one visitor: the loader reads no request, cookie or header', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/[locale]/categories/[slug]/CategoryDetailContent.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/next\/headers|cookies\(|headers\(|currency|wishlist|cart/i);
  });

  it('shows an admin trip save at once (unpublishing a trip removes it before 300 s)', async () => {
    expect(titles(await visit('aswan-tours'))).toEqual(['Felucca sail']);
    await Tour.collection.insertOne(trip(new mongoose.Types.ObjectId(), { slug: 'philae-temple', title: 'Philae temple' }));
    mockCache.now = 10_000;
    // A direct database write is not a save: the stored page stays until purged.
    expect(titles(await visit('aswan-tours'))).toEqual(['Felucca sail']);

    const response = await putTour(jsonRequest(`https://example.test/api/admin/tours/${ids.felucca}`, { isPublished: false }), {
      params: Promise.resolve({ id: String(ids.felucca) }),
    });
    expect(response.status).toBe(200);
    expect(mockCache.purgedTags).toContain('category-pages');
    expect(titles(await visit('aswan-tours'))).toEqual(['Philae temple']);
  });

  it('shows a saved booking-option price at once', async () => {
    const before = await visit('aswan-tours');
    expect((before?.categoryTours[0].bookingOptions as Doc[])[0].price).toBe(90);

    const response = await putBookingOption(jsonRequest(`https://example.test/api/tours/${ids.felucca}/booking-options`, {
      index: 0,
      option: { type: 'Per Person', label: 'Shared', price: 75 },
    }), { params: Promise.resolve({ tourId: String(ids.felucca) }) });
    expect(response.status).toBe(200);
    expect(mockCache.purgedTags).toContain('category-pages');
    const after = await visit('aswan-tours');
    expect((after?.categoryTours[0].bookingOptions as Doc[])[0].price).toBe(75);
  });

  it('shows an admin category save at once, in every language', async () => {
    await visit('aswan-tours', 'en');
    await visit('aswan-tours', 'ar');
    const response = await putCategory(jsonRequest(`https://example.test/api/categories/${ids.category}`, { description: 'Updated Aswan copy' }), {
      params: Promise.resolve({ id: String(ids.category) }),
    });
    expect(response.status).toBe(200);
    expect(mockCache.entries.size).toBe(0);
    expect((await visit('aswan-tours', 'en'))?.category.description).toBe('Updated Aswan copy');
  });

  it('stores the page head with the page body and purges both together', async () => {
    const metadata = await detail.getCategoryMetadata('aswan-tours', 'en', '/aswan-tours');
    expect(metadata?.title).toContain('Aswan Tours');
    expect(mockCache.keys).toContainEqual(['category-page-metadata', 'default', 'aswan-tours', 'en', '/aswan-tours']);
    queryCount = 0;
    await detail.getCategoryMetadata('aswan-tours', 'en', '/aswan-tours');
    expect(queryCount).toBe(0);
    const [entry] = [...mockCache.entries.values()];
    expect(entry.tags).toContain('category-pages');
  });
});

describe('the trip page and price checks stay live', () => {
  const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
  it('does not store trip page, cart, checkout, availability or price-check data', () => {
    for (const file of [
      'app/[locale]/[slug]/TourDetailContent.tsx',
      'app/api/checkout/route.ts',
      'app/api/admin/availability/route.ts',
      'app/api/tours/[tourId]/booking-options/route.ts',
    ]) {
      expect(read(file)).not.toContain('unstable_cache');
    }
    const tripRoute = read('app/[locale]/[slug]/page.tsx');
    expect(tripRoute).toContain("export const dynamic = 'force-dynamic'");
    expect(tripRoute).not.toContain('unstable_cache');
  });
});

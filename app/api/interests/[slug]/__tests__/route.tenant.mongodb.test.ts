/** @jest-environment node */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import { GET } from '../route';

// The flagship shares one database with the network sites: an interest lookup
// on the flagship must never return another site's category, trips or related
// categories (PLATFORM #513).
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));

let server: MongoMemoryServer;
beforeAll(async () => {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri(), { autoIndex: false });
});
afterAll(async () => { await mongoose.disconnect(); await server?.stop(); });
beforeEach(async () => {
  await Category.collection.deleteMany({});
  await Tour.collection.deleteMany({});
});

const call = async (slug: string) => {
  const res = await GET(new Request(`http://x/api/interests/${slug}`) as never, { params: Promise.resolve({ slug }) });
  return (await res.json()).data;
};

it('answers with the flagship category and trips only, never another site with the same slug', async () => {
  const flagCat = new mongoose.Types.ObjectId();
  const otherCat = new mongoose.Types.ObjectId();
  // The network site's record is inserted first, so an unscoped findOne would pick it.
  await Category.collection.insertMany([
    { _id: otherCat, name: 'Snorkeling', slug: 'snorkeling', tenantId: 'dahab-excursions', isPublished: true, archivedAt: null },
    { _id: flagCat, name: 'Snorkeling', slug: 'snorkeling', tenantId: 'default', isPublished: true, archivedAt: null },
    { name: 'Diving', slug: 'diving', tenantId: 'hurghada-excursions-online', isPublished: true, archivedAt: null },
    { name: 'Desert', slug: 'desert', isPublished: true, archivedAt: null },
  ]);
  await Tour.collection.insertMany([
    { title: 'Flagship reef trip', slug: 'flag-reef', category: [flagCat], tenantId: 'default', isPublished: true, archivedAt: null },
    { title: 'Dahab reef trip', slug: 'dahab-reef', category: [otherCat], tenantId: 'dahab-excursions', isPublished: true, archivedAt: null },
    { title: 'Flagship archived trip', slug: 'flag-old', category: [flagCat], tenantId: 'default', isPublished: true, archivedAt: new Date() },
  ]);

  const data = await call('snorkeling');
  expect(String(data.category._id)).toBe(String(flagCat));
  expect(data.tours.map((t: { slug: string }) => t.slug)).toEqual(['flag-reef']);
  expect(data.totalTours).toBe(1);
  expect(data.relatedCategories.map((c: { slug: string }) => c.slug)).toEqual(['desert']);
  expect(data.tours[0].rating).toBeUndefined();
});

it('keyword fallback stays inside the flagship', async () => {
  await Tour.collection.insertMany([
    { title: 'Pyramids day trip', slug: 'flag-pyramids', tenantId: 'default', isPublished: true, archivedAt: null },
    { title: 'Pyramiden Tagesausflug Pyramids', slug: 'de-pyramids', tenantId: 'cairo-ausfluege', isPublished: true, archivedAt: null },
    { title: 'Pyramids unpublished', slug: 'flag-draft', tenantId: 'default', isPublished: false, archivedAt: null },
  ]);
  const data = await call('pyramids');
  expect(data.tours.map((t: { slug: string }) => t.slug)).toEqual(['flag-pyramids']);
});

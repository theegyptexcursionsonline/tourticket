/** @jest-environment node */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest, NextResponse } from 'next/server';
import Blog from '@/lib/models/Blog';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { validDefaultBlogReferences, blogRelatedPopulations } from '@/lib/content/blogReferences';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
jest.mock('@/lib/algolia', () => ({ syncBlogToAlgolia: jest.fn(), deleteBlogFromAlgolia: jest.fn() }));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: jest.fn() }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: async () => ({ connection: mongoose.connection }) }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: jest.fn() }));
import { POST } from '@/app/api/admin/blog/route';
import { PUT } from '@/app/api/admin/blog/[id]/route';
let server: MongoMemoryServer;
const payload = () => ({ title: 'Local reference article', slug: 'local-reference-article', excerpt: 'Local reference boundary fixture.', content: 'Local reference content. '.repeat(8), category: 'travel-tips', featuredImage: 'https://example.test/image.jpg', author: 'Editorial team', readTime: 2, status: 'draft' });
const request = (method: string, body: unknown) => new NextRequest('https://example.test/api/admin/blog', { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const context = (id: unknown) => ({ params: Promise.resolve({ id: String(id) }) });
async function seedBlog(extra: Record<string, unknown> = {}) { const _id = new mongoose.Types.ObjectId(); await Blog.collection.insertOne({ ...payload(), _id, tenantId: 'default', __v: 0, ...extra }); return _id; }
async function seedRefs(tenant: string | null | undefined, extra: Record<string, unknown> = {}) {
  const d = new mongoose.Types.ObjectId(), t = new mongoose.Types.ObjectId();
  const common = { ...(tenant === undefined ? {} : { tenantId: tenant }), isPublished: true, archivedAt: null, ...extra };
  await Destination.collection.insertOne({ _id: d, name: 'Reference destination '+d, slug: 'destination-'+d, ...common });
  await Tour.collection.insertOne({ _id: t, title: 'Reference tour', slug: 'tour-'+t, destination: d, ...common });
  return { relatedDestinations: [String(d)], relatedTours: [String(t)] };
}
beforeAll(async () => { server = await MongoMemoryServer.create(); await mongoose.connect(server.getUri('blog_reference_boundary')); }, 60000);
afterAll(async () => { await mongoose.disconnect(); await server.stop(); });
beforeEach(async () => { await Promise.all([Blog.deleteMany({}), Destination.deleteMany({}), Tour.deleteMany({})]); jest.clearAllMocks(); jest.mocked(verifyAdmin).mockResolvedValue({ id: 'local-editor', name: 'Editor', email: '', role: 'content' }); });

it.each(['default', undefined, null, ''])('preserves default/legacy references for %s', async tenant => {
  const refs = await seedRefs(tenant);
  expect((await POST(request('POST', { ...payload(), ...refs }))).status).toBe(201);
  const blog = await Blog.findOne({}).lean();
  expect((await PUT(request('PUT', refs), context(blog!._id))).status).toBe(200);
  for (const surface of ['admin', 'list', 'detail'] as const) {
    const populated = await Blog.findById(blog!._id).populate(blogRelatedPopulations(surface)).lean();
    expect(populated!.relatedDestinations).toHaveLength(1); expect(populated!.relatedTours).toHaveLength(1);
  }
});
it('omitted fields preserve stored references, empty arrays clear them, duplicates remain compatible', async () => {
  const refs = await seedRefs('default'), id = await seedBlog(refs);
  expect((await PUT(request('PUT', { title: 'Changed title only' }), context(id))).status).toBe(200);
  expect((await Blog.findById(id))!.relatedTours!.map(String)).toEqual(refs.relatedTours);
  expect((await PUT(request('PUT', { relatedTours: [...refs.relatedTours, ...refs.relatedTours] }), context(id))).status).toBe(200);
  expect((await PUT(request('PUT', { relatedTours: [], relatedDestinations: [] }), context(id))).status).toBe(200);
  expect((await Blog.findById(id))!.relatedTours).toHaveLength(0);
  expect(await validDefaultBlogReferences({})).toBe(true);
});
it.each(['relatedDestinations', 'relatedTours'])('rejects foreign, missing and malformed %s with the same response and no mutation', async field => {
  const foreign = await seedRefs('foreign'), id = await seedBlog(), before = await Blog.collection.findOne({ _id: id });
  const values: unknown[] = [foreign[field as keyof typeof foreign], [String(new mongoose.Types.ObjectId())], null, 'not-an-array', [null], [{ $ne: null }], ['invalid'], [42]];
  for (const value of values) {
    for (const method of ['POST', 'PUT']) {
      const body = method === 'POST' ? { ...payload(), slug: 'new-article', [field]: value } : { [field]: value };
      const response = method === 'POST' ? await POST(request(method, body)) : await PUT(request(method, body), context(id));
      expect(response.status).toBe(400); expect(await response.json()).toEqual({ success: false, error: 'Invalid related content references' });
    }
    expect(await Blog.countDocuments({})).toBe(1); expect(await Blog.collection.findOne({ _id: id })).toEqual(before);
  }
});
it('mixed owned and foreign references fail atomically', async () => {
  const own = await seedRefs('default'), foreign = await seedRefs('foreign');
  const id = await seedBlog(own), before = await Blog.collection.findOne({ _id: id });
  expect((await PUT(request('PUT', { title: 'Must not apply', relatedDestinations: own.relatedDestinations, relatedTours: foreign.relatedTours }), context(id))).status).toBe(400);
  expect(await Blog.collection.findOne({ _id: id })).toEqual(before);
});
it('preexisting contamination and later reassignment cannot leak through any population profile', async () => {
  const own = await seedRefs('default'), foreign = await seedRefs('foreign'), id = await seedBlog({ relatedDestinations: [...own.relatedDestinations, ...foreign.relatedDestinations], relatedTours: [...own.relatedTours, ...foreign.relatedTours] });
  for (const surface of ['admin', 'list', 'detail'] as const) {
    const row = await Blog.findById(id).populate(blogRelatedPopulations(surface)).lean();
    expect(row!.relatedDestinations).toHaveLength(1); expect(row!.relatedTours).toHaveLength(1);
  }
  await Destination.collection.updateOne({ _id: new mongoose.Types.ObjectId(own.relatedDestinations[0]) }, { $set: { tenantId: 'foreign' } });
  const detail = await Blog.findById(id).populate(blogRelatedPopulations('detail')).lean();
  expect(detail!.relatedDestinations).toHaveLength(0);
  expect((detail!.relatedTours![0] as unknown as { destination: unknown }).destination).toBeNull();
  await Tour.collection.updateOne({ _id: new mongoose.Types.ObjectId(own.relatedTours[0]) }, { $set: { tenantId: 'foreign' } });
  for (const surface of ['admin', 'list', 'detail'] as const) {
    const row = await Blog.findById(id).populate(blogRelatedPopulations(surface)).lean();
    expect(row!.relatedDestinations).toHaveLength(0); expect(row!.relatedTours).toHaveLength(0);
  }
});
it.each([{ isPublished: false }, { isPublished: true, archivedAt: new Date('2026-01-01') }])('public profiles preserve publication/archive filtering %j while admins retain private own references', async state => {
  const refs = await seedRefs('default', state), id = await seedBlog(refs);
  expect((await Blog.findById(id).populate(blogRelatedPopulations('admin')).lean())!.relatedTours).toHaveLength(1);
  for (const surface of ['list', 'detail'] as const) expect((await Blog.findById(id).populate(blogRelatedPopulations(surface)).lean())!.relatedTours).toHaveLength(0);
});
it.each([401,403])('auth denial %s precedes reference lookup or writes', async status => {
  jest.mocked(verifyAdmin).mockResolvedValue(NextResponse.json({ error: 'Denied' }, { status }));
  const spy = jest.spyOn(Destination, 'countDocuments');
  try { expect((await POST(request('POST', { ...payload(), relatedDestinations: [String(new mongoose.Types.ObjectId())] }))).status).toBe(status); expect(spy).not.toHaveBeenCalled(); } finally { spy.mockRestore(); }
});
it('reference lookup failure fails closed without applying any update', async () => {
  const refs = await seedRefs('default'), id = await seedBlog(), before = await Blog.collection.findOne({ _id: id });
  const spy = jest.spyOn(Destination, 'countDocuments').mockImplementationOnce(() => { throw Error('local database failure'); });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try { expect((await PUT(request('PUT', { title: 'Must not apply', ...refs }), context(id))).status).toBe(500); expect(await Blog.collection.findOne({ _id: id })).toEqual(before); } finally { spy.mockRestore(); log.mockRestore(); }
});
it('demonstrates the former unscoped join against real MongoDB', async () => {
  const refs = await seedRefs('foreign', { isPublished: false }); await seedBlog(refs);
  const before = await Blog.findOne(DEFAULT_TENANT_FILTER).populate('relatedDestinations','name slug').populate('relatedTours','title slug').lean();
  expect(before!.relatedDestinations).toHaveLength(1); expect(before!.relatedTours).toHaveLength(1);
  const after = await Blog.findOne(DEFAULT_TENANT_FILTER).populate(blogRelatedPopulations('admin')).lean();
  expect(after!.relatedDestinations).toHaveLength(0); expect(after!.relatedTours).toHaveLength(0);
});
it.each([['app/admin/blog/page.tsx','admin',1],['app/[locale]/blog/page.tsx','list',2],['app/[locale]/blog/[slug]/page.tsx','detail',1]])('wires scoped population into %s', (file, surface, count) => {
  const source = fs.readFileSync(path.join(process.cwd(), String(file)), 'utf8');
  expect(source.split(`.populate(blogRelatedPopulations('${surface}'))`).length-1).toBe(count);
  expect(source).not.toMatch(/\.populate\([^\n]*related(?:Tours|Destinations)/);
});

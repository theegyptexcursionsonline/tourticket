/** @jest-environment node */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest, NextResponse } from 'next/server';
import Blog from '@/lib/models/Blog';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

jest.mock('@/lib/algolia', () => ({ syncBlogToAlgolia: jest.fn(), deleteBlogFromAlgolia: jest.fn() }));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: jest.fn() }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: async () => ({ connection: mongoose.connection }) }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: jest.fn() }));
import { POST, GET } from '@/app/api/admin/blog/route';
import { PUT, DELETE } from '@/app/api/admin/blog/[id]/route';

let server: MongoMemoryServer;
const payload = () => ({ title: 'Local editorial article', slug: 'local-editorial-article', excerpt: 'A local database isolation fixture.',
  content: 'Local article content. '.repeat(8), category: 'travel-tips', featuredImage: 'https://example.test/image.jpg', author: 'Editorial team', readTime: 2, status: 'draft' });
const request = (method: string, body?: unknown) => new NextRequest('https://example.test/api/admin/blog', { method,
  ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) });
const context = (id: unknown) => ({ params: Promise.resolve({ id: String(id) }) });
async function seed(tenant: string | null | undefined, extra: Record<string, unknown> = {}) {
  // Raw insert preserves legacy missing/null/empty values exactly as stored.
  const _id = new mongoose.Types.ObjectId();
  await Blog.collection.insertOne({ ...payload(), _id, __v: 0, ...(tenant === undefined ? {} : { tenantId: tenant }), ...extra });
  return _id;
}
beforeAll(async () => { server = await MongoMemoryServer.create(); await mongoose.connect(server.getUri('admin_blog_tenancy')); await Blog.syncIndexes(); }, 60_000);
afterAll(async () => { await mongoose.disconnect(); await server.stop(); });
beforeEach(async () => { await Blog.deleteMany({}); jest.clearAllMocks(); jest.mocked(verifyAdmin).mockResolvedValue({ id: 'local-editor', email: '', name: 'Editor', role: 'admin' }); });

it.each(['default', undefined, null, ''])('updates and deletes existing default/legacy tenant %s', async tenant => {
  const id = await seed(tenant);
  expect((await PUT(request('PUT', { title: 'Edited local article' }), context(id))).status).toBe(200);
  const saved = await Blog.collection.findOne({ _id: id });
  expect(saved?.title).toBe('Edited local article'); expect(saved?.__v).toBe(1);
  expect(saved?.tenantId).toBe(tenant);
  expect((await DELETE(request('DELETE'), context(id))).status).toBe(200);
  expect(await Blog.countDocuments({ _id: id })).toBe(0);
});
it.each([{}, { contentEnginePublishReceiptId: 'receipt-owned', contentEngineGrantId: 'foreign-grant' }, { archivedAt: new Date('2026-01-01') }])('foreign rows remain indistinguishable from missing rows', async extra => {
  const id = await seed('other-tenant', extra), before = await Blog.collection.findOne({ _id: id });
  expect((await PUT(request('PUT', { title: 'Must not change' }), context(id))).status).toBe(404);
  expect((await DELETE(request('DELETE'), context(id))).status).toBe(404);
  expect(await Blog.collection.findOne({ _id: id })).toEqual(before);
  expect(revalidateStorefrontContent).not.toHaveBeenCalled();
});
it('main list still excludes foreign and archived content', async () => {
  const id = await seed('default'); await seed('other-tenant');
  await seed('default', { slug: 'archived-local', archivedAt: new Date() });
  const result = await (await GET(request('GET'))).json();
  expect(result.data.map((x: { _id: string }) => x._id)).toEqual([String(id)]);
});
it.each([undefined, null, '', 'default'])('creates canonical default ownership from allowed input %s', async tenantId => {
  const response = await POST(request('POST', { ...payload(), ...(tenantId === undefined ? {} : { tenantId }) }));
  expect(response.status).toBe(201); expect((await Blog.findOne({}))?.tenantId).toBe('default');
});
it.each(['other-tenant', { $ne: 'default' }, ['default'], 1])('rejects foreign or non-scalar ownership %j without creating records', async tenantId => {
  expect((await POST(request('POST', { ...payload(), tenantId }))).status).toBe(400);
  expect(await Blog.countDocuments({})).toBe(0); expect(revalidateStorefrontContent).not.toHaveBeenCalled();
});
it.each(['contentEnginePublishReceiptId', 'contentEngineGrantId', 'archivedAt', '__v', '_id', '$set', 'tenantId.value'])('create cannot forge protected %s', async key => {
  expect((await POST(request('POST', { ...payload(), [key]: 'forged' }))).status).toBe(400);
  expect(await Blog.countDocuments({})).toBe(0);
});
it('preserves receipt ownership and prevents deleting owned or archived default records', async () => {
  const id = await seed('default', { contentEnginePublishReceiptId: 'receipt-owned', contentEngineGrantId: 'pilot' });
  expect((await PUT(request('PUT', { status: 'published' }), context(id))).status).toBe(200);
  expect((await Blog.collection.findOne({ _id: id }))?.contentEnginePublishReceiptId).toBe('receipt-owned');
  expect((await DELETE(request('DELETE'), context(id))).status).toBe(409);
  await Blog.collection.updateOne({ _id: id }, { $set: { archivedAt: new Date() } });
  expect((await PUT(request('PUT', { title: 'Must stay archived' }), context(id))).status).toBe(404);
  expect((await DELETE(request('DELETE'), context(id))).status).toBe(409);
  expect(await Blog.countDocuments({ _id: id })).toBe(1);
});
it('cannot move default content into a foreign tenant', async () => {
  const id = await seed('default');
  expect((await PUT(request('PUT', { tenantId: 'other-tenant' }), context(id))).status).toBe(400);
  expect((await Blog.findById(id))?.tenantId).toBe('default');
});
it.each([401, 403])('retains authentication and permission denial %s before all mutations', async status => {
  const id = await seed('default'), before = await Blog.collection.findOne({ _id: id });
  jest.mocked(verifyAdmin).mockResolvedValue(NextResponse.json({ error: 'Denied' }, { status }));
  expect((await POST(request('POST', { ...payload(), slug: 'second' }))).status).toBe(status);
  expect((await PUT(request('PUT', { title: 'Must not change' }), context(id))).status).toBe(status);
  expect((await DELETE(request('DELETE'), context(id))).status).toBe(status);
  expect(await Blog.countDocuments({})).toBe(1); expect(await Blog.collection.findOne({ _id: id })).toEqual(before);
});

it.each([null, [], 'text', 1])('rejects malformed create body %j', async body => {
  expect((await POST(request('POST', body))).status).toBe(400);
  expect(await Blog.countDocuments({})).toBe(0);
});
it('rejects invalid JSON without writing', async () => {
  expect((await POST(new NextRequest('https://example.test/api/admin/blog', { method: 'POST', body: '{' }))).status).toBe(400);
  expect(await Blog.countDocuments({})).toBe(0);
});

it('preserves normal image metadata while adding missing image captions', async () => {
  const data = { ...payload(), images: ['https://example.test/second.jpg'], imageMetadata: [{ url: payload().featuredImage, alt: 'Article landscape', title: 'Landscape' }] };
  expect((await POST(request('POST', data))).status).toBe(201);
  const saved = await Blog.findOne({}).lean();
  expect(saved?.imageMetadata).toEqual(expect.arrayContaining([
    expect.objectContaining(data.imageMetadata[0]),
    expect.objectContaining({ url: data.images[0] }),
  ]));
});

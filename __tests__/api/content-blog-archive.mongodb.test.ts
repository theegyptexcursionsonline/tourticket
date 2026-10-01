/** @jest-environment node */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import Blog from '@/lib/models/Blog';
import Receipt from '@/lib/models/ContentPublishReceipt';
jest.mock('@/lib/algolia', () => ({ syncBlogToAlgolia: jest.fn(), deleteBlogFromAlgolia: jest.fn() }));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler, registerAdminAuditActor: jest.fn() }));
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: async () => ({}) }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: async () => ({ connection: mongoose.connection }) }));
jest.mock('@/lib/content/receiverIndexReadiness', () => ({ contentReceiverIndexesReady: async () => true }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: jest.fn() }));
import { PATCH } from '@/app/api/admin/content/blog/archive/route';
import { PUT, DELETE } from '@/app/api/admin/blog/[id]/route';
import { GET as listBlogs } from '@/app/api/admin/blog/route';

let server: MongoMemoryServer;
const savedEnv = { ...process.env };
beforeAll(async () => {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri('receiver_archive_test'));
  await Promise.all([Blog.syncIndexes(), Receipt.syncIndexes()]);
}, 60_000);
afterAll(async () => { await mongoose.disconnect(); await server.stop(); process.env = savedEnv; });
beforeEach(async () => {
  await Promise.all([Blog.deleteMany({}), Receipt.deleteMany({})]);
  process.env.CONTENT_ENGINE_ALLOWED_TENANTS = 'default';
  process.env.CONTENT_ENGINE_API_KEY = 'test-draft-credential';
  process.env.CONTENT_ENGINE_API_KEY_NEXT = 'test-other-credential';
  process.env.CONTENT_ENGINE_RECEIVER_GRANTS_JSON = JSON.stringify({ version: 3, grants: ['first', 'second'].map((id, index) => ({ id, expiresAt: '2099-01-01T00:00:00.000Z',
    secretEnv: index ? 'CONTENT_ENGINE_API_KEY_NEXT' : 'CONTENT_ENGINE_API_KEY',
    targets: [{ method: 'PATCH', receiverType: 'blog', tenantId: 'default', locale: 'en', publicationMode: 'draft' }],
  })) });
});
async function seed() {
  return Blog.create({ title: 'Private acceptance draft', slug: 'private-acceptance-draft', excerpt: 'Private draft for a database lifecycle test.',
    content: 'Safe local content. '.repeat(15), category: 'travel-tips', featuredImage: 'https://example.test/image.jpg',
    author: 'Editorial team', readTime: 2, status: 'draft', tenantId: 'default',
    contentEnginePublishReceiptId: String(new mongoose.Types.ObjectId()), contentEngineGrantId: 'first' });
}
function archiveRequest(blog: Awaited<ReturnType<typeof seed>>, operation: string, token = 'test-draft-credential') {
  return new NextRequest('https://example.test/api/admin/content/blog/archive', { method: 'PATCH', headers: {
    authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': operation,
    'x-content-engine-receiver-type': 'blog', 'x-content-engine-tenant': 'default', 'x-content-engine-locale': 'en',
  }, body: JSON.stringify({ id: String(blog._id), publishReceiptId: blog.contentEnginePublishReceiptId,
    tenantId: 'default', defaultLocale: 'en', expectedRevision: blog.__v }) });
}
it('uses real atomic revisions so racing archive and admin edit cannot both win', async () => {
  const blog = await seed();
  const edit = new NextRequest('https://example.test/api/admin/blog/id', { method: 'PUT', body: JSON.stringify({ title: 'Edited before archive' }) });
  const results = await Promise.all([PATCH(archiveRequest(blog, randomUUID())), PUT(edit, { params: Promise.resolve({ id: String(blog._id) }) })]);
  expect(results.filter(result => result.status === 200)).toHaveLength(1);
  const saved = await Blog.findById(blog._id);
  expect(saved?.__v).toBe(1);
  expect(saved?.content).toBe(blog.content);
});
it('archives once under concurrent identical retries and preserves the record', async () => {
  const blog = await seed(); const op = randomUUID();
  const results = await Promise.all([PATCH(archiveRequest(blog, op)), PATCH(archiveRequest(blog, op))]);
  expect(results.some(result => result.status === 200)).toBe(true);
  expect(results.every(result => [200, 503].includes(result.status))).toBe(true);
  const replay = await PATCH(archiveRequest(blog, op));
  expect(replay.status).toBe(200);
  expect((await Blog.findById(blog._id))?.__v).toBe(1);
  expect(await Blog.countDocuments({})).toBe(1);
  expect(await Receipt.countDocuments({ contentType: 'blog:archive' })).toBe(1);
});
it('recovers after content write succeeds but receipt completion acknowledgment fails', async () => {
  const blog = await seed(); const op = randomUUID();
  const failedAck = jest.spyOn(Receipt, 'updateOne').mockRejectedValueOnce(new Error('lost acknowledgment'));
  expect((await PATCH(archiveRequest(blog, op))).status).toBe(503);
  failedAck.mockRestore();
  expect((await Blog.findById(blog._id))?.archivedAt).toBeTruthy();
  await Receipt.updateOne({ idempotencyKey: op }, { $set: { claimExpiresAt: new Date(0) } });
  const recovered = await PATCH(archiveRequest(blog, op));
  expect(recovered.status).toBe(200);
  expect((await recovered.json()).status).toBe('archived');
  expect((await Blog.findById(blog._id))?.__v).toBe(1);
  expect((await Receipt.findOne({ idempotencyKey: op }))?.state).toBe('completed');
});
it('refuses cross-grant replay and excludes archived content from active admin lists', async () => {
  const blog = await seed(); const op = randomUUID();
  expect((await PATCH(archiveRequest(blog, op))).status).toBe(200);
  expect((await PATCH(archiveRequest(blog, op, 'test-other-credential'))).status).toBe(409);
  const response = await listBlogs(new NextRequest('https://example.test/api/admin/blog'));
  expect((await response.json()).data).toEqual([]);
  expect(await Blog.countDocuments({ _id: blog._id })).toBe(1);
});

it('atomically refuses admin deletion racing archive and retains the owned tombstone', async () => {
  const blog = await seed();
  const deletion = new NextRequest('https://example.test/api/admin/blog/id', { method: 'DELETE' });
  const context = { params: Promise.resolve({ id: String(blog._id) }) };
  const [archive, remove] = await Promise.all([PATCH(archiveRequest(blog, randomUUID())), DELETE(deletion, context)]);
  expect(archive.status).toBe(200);
  expect(remove.status).toBe(409);
  expect((await Blog.findById(blog._id))?.archivedAt).toBeTruthy();
  expect((await DELETE(deletion, context)).status).toBe(409);
  expect(await Blog.countDocuments({ _id: blog._id })).toBe(1);
});
it('preserves ordinary unrelated deletion and missing-record behavior', async () => {
  const blog = await seed();
  await Blog.updateOne({ _id: blog._id }, { $unset: { contentEnginePublishReceiptId: 1, contentEngineGrantId: 1 } });
  const deletion = new NextRequest('https://example.test/api/admin/blog/id', { method: 'DELETE' });
  const context = { params: Promise.resolve({ id: String(blog._id) }) };
  expect((await DELETE(deletion, context)).status).toBe(200);
  expect(await Blog.countDocuments({ _id: blog._id })).toBe(0);
  expect((await DELETE(deletion, context)).status).toBe(404);
});

it('retains an archived row even if it has no receiver receipt', async () => {
  const blog = await seed();
  await Blog.updateOne({ _id: blog._id }, { $set: { archivedAt: new Date() }, $unset: { contentEnginePublishReceiptId: 1, contentEngineGrantId: 1 } });
  const response = await DELETE(new NextRequest('https://example.test/api/admin/blog/id', { method: 'DELETE' }), { params: Promise.resolve({ id: String(blog._id) }) });
  expect(response.status).toBe(409);
  expect(await Blog.countDocuments({ _id: blog._id })).toBe(1);
});

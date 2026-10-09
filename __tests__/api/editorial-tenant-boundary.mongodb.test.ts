/** @jest-environment node */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest, NextResponse } from 'next/server';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

const mockCreate = jest.fn();
jest.mock('@/lib/openai', () => ({ getOpenAIClient: () => ({ chat: { completions: { create: (...args: unknown[]) => mockCreate(...args) } } }) }));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler, registerAdminAuditDetail: jest.fn() }));
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: jest.fn() }));
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: jest.fn() }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: async () => ({ connection: mongoose.connection }) }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: jest.fn() }));
import { POST as translate } from '@/app/api/admin/translate/route';
import { POST as stream } from '@/app/api/admin/translate/stream/route';
import { PUT as updateCategory } from '@/app/api/categories/[id]/route';
import { PUT as updatePage } from '@/app/api/admin/attraction-pages/[id]/route';
import { autoTranslateCategory, autoTranslateAttractionPage } from '@/lib/i18n/autoTranslate';

const kinds = [
  { type: 'category', model: Category, update: updateCategory, auto: autoTranslateCategory, field: 'name' },
  { type: 'attraction-page', model: AttractionPage, update: updatePage, auto: autoTranslateAttractionPage, field: 'title' },
] as const;
const req = (body: unknown, method = 'POST') => new NextRequest('https://example.test/api/admin/translate', { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const ctx = (id: unknown) => ({ params: Promise.resolve({ id: String(id) }) });
let server: MongoMemoryServer;
async function seed(kind: typeof kinds[number], tenant: string | null | undefined) {
  const _id = new mongoose.Types.ObjectId();
  await kind.model.collection.insertOne({ _id, name: 'Local category', title: 'Local page', description: 'Local content', slug: `local-${_id}`, pageType: 'attraction', ...(tenant === undefined ? {} : { tenantId: tenant }) });
  return _id;
}
const translated = () => ({ choices: [{ message: { content: JSON.stringify({ name: 'Translated category', title: 'Translated page', description: 'Translated content' }) } }] });
beforeAll(async () => { server = await MongoMemoryServer.create(); await mongoose.connect(server.getUri('editorial_tenancy')); }, 60_000);
afterAll(async () => { await mongoose.disconnect(); await server.stop(); });
beforeEach(async () => {
  await Category.deleteMany({}); await AttractionPage.deleteMany({}); jest.clearAllMocks();
  jest.mocked(verifyAdmin).mockResolvedValue({ id: 'local-editor', email: '', name: 'Editor', role: 'admin' });
  jest.mocked(requireAdminAuth).mockResolvedValue({ userId: 'local-editor', email: '', name: 'Editor', role: 'admin' } as never);
  mockCreate.mockImplementation(async () => translated());
});

for (const kind of kinds) describe(kind.type, () => {
  it('rejects foreign IDs before translation/provider or update effects', async () => {
    const id = await seed(kind, 'foreign'), before = await kind.model.collection.findOne({ _id: id });
    expect((await translate(req({ modelType: kind.type, id: String(id) }))).status).toBe(404);
    const events = await (await stream(req({ modelType: kind.type, id: String(id) }))).text();
    expect(events).toContain('not found'); expect(events).not.toContain('locale_done');
    await expect(kind.auto(String(id))).rejects.toThrow('not found');
    expect((await kind.update(req({ [kind.field]: 'Forbidden' }, 'PUT'), ctx(id))).status).toBe(404);
    expect(mockCreate).not.toHaveBeenCalled(); expect(revalidateStorefrontContent).not.toHaveBeenCalled();
    expect(await kind.model.collection.findOne({ _id: id })).toEqual(before);
  });
  it.each(['default', undefined, null, ''])('preserves default and legacy %s in normal update and both translation paths', async tenant => {
    const id = await seed(kind, tenant);
    expect((await kind.update(req({ [kind.field]: 'Edited content', tenantId: 'ignored-client-value' }, 'PUT'), ctx(id))).status).toBe(200);
    expect((await translate(req({ modelType: kind.type, id: String(id) }))).status).toBe(200);
    const events = await (await stream(req({ modelType: kind.type, id: String(id) }))).text();
    expect(events).toContain('locale_done'); expect(events).not.toContain('locale_error');
    const saved = await kind.model.collection.findOne({ _id: id });
    expect(saved?.tenantId).toBe(tenant); expect(saved?.translations?.ar).toBeDefined();
    expect(mockCreate).toHaveBeenCalled();
  });
  it.each([{ $set: { tenantId: 'foreign' } }, { $unset: { tenantId: 1 } }, { 'tenantId.value': 'foreign' }, { 'translations.ar': {} }, { _id: 'forged' }, { __v: 99 }, null, [], 'text'])('refuses invalid/operator body %j without a write', async body => {
    const id = await seed(kind, 'default'), before = await kind.model.collection.findOne({ _id: id });
    expect((await kind.update(req(body, 'PUT'), ctx(id))).status).toBe(400);
    expect(await kind.model.collection.findOne({ _id: id })).toEqual(before);
    expect(revalidateStorefrontContent).not.toHaveBeenCalled(); expect(mockCreate).not.toHaveBeenCalled();
  });
  it('allows an explicit tenant library caller without leaking into the default tenant', async () => {
    const id = await seed(kind, 'foreign');
    await kind.auto(String(id), 'foreign');
    expect((await kind.model.collection.findOne({ _id: id }))?.translations?.ar).toBeDefined();
  });
  it('rejects a different explicitly requested tenant before provider work', async () => {
    const id = await seed(kind, 'foreign'), before = await kind.model.collection.findOne({ _id: id });
    await expect(kind.auto(String(id), 'another-tenant')).rejects.toThrow('not found');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(await kind.model.collection.findOne({ _id: id })).toEqual(before);
  });
  it.each(['direct', 'stream'])('rechecks ownership after provider work for %s', async mode => {
    const id = await seed(kind, 'default');
    mockCreate.mockImplementation(async () => {
      await kind.model.collection.updateOne({ _id: id }, { $set: { tenantId: 'foreign' } });
      return translated();
    });
    if (mode === 'direct') await expect(kind.auto(String(id))).rejects.toThrow('no longer belongs');
    else {
      const events = await (await stream(req({ modelType: kind.type, id: String(id) }))).text();
      expect(events).toContain('locale_error'); expect(events).not.toContain('locale_done');
    }
    const saved = await kind.model.collection.findOne({ _id: id });
    expect(saved?.tenantId).toBe('foreign'); expect(saved?.translations).toBeUndefined();
    expect(revalidateStorefrontContent).not.toHaveBeenCalled();
  });
  it.each([401, 403])('retains authentication denial %s', async status => {
    const id = await seed(kind, 'default'), before = await kind.model.collection.findOne({ _id: id });
    const denial = NextResponse.json({ error: 'Denied' }, { status });
    jest.mocked(verifyAdmin).mockResolvedValue(denial); jest.mocked(requireAdminAuth).mockResolvedValue(denial);
    expect((await kind.update(req({ [kind.field]: 'Forbidden' }, 'PUT'), ctx(id))).status).toBe(status);
    expect((await translate(req({ modelType: kind.type, id: String(id) }))).status).toBe(status);
    expect((await stream(req({ modelType: kind.type, id: String(id) }))).status).toBe(status);
    expect(mockCreate).not.toHaveBeenCalled(); expect(await kind.model.collection.findOne({ _id: id })).toEqual(before);
  });
});

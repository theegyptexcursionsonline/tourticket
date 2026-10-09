jest.mock('next/server', () => {
  class NextResponse {
    constructor(public body: unknown, public status = 200) {}
    static json(body: unknown, init?: { status?: number }) { return new NextResponse(body, init?.status); }
    async json() { return this.body; }
  }
  return { NextResponse };
});
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: async () => ({}) }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('mongoose', () => ({ __esModule: true, default: { Types: { ObjectId: { isValid: () => true } } } }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: jest.fn() }));
const mockUpdate = jest.fn();
jest.mock('@/lib/models/Blog', () => ({ __esModule: true, default: { findOneAndUpdate: (...args: unknown[]) => mockUpdate(...args) } }));
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUT } from '@/app/api/admin/blog/[id]/route';
const context = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
const request = (body: unknown) => ({ json: async () => body }) as never;
beforeEach(() => { mockUpdate.mockReset(); });
it.each([{ archivedAt: null }, { contentEngineGrantId: 'other' }, { $set: { status: 'published' } }, { 'contentEngineGrantId.x': 1 }, { tenantId: 'other' }, null])('refuses protected input %j', async body => {
  expect((await PUT(request(body), context)).status).toBe(400);
  expect(mockUpdate).not.toHaveBeenCalled();
});
it('cannot edit or resurrect an archived row', async () => {
  mockUpdate.mockResolvedValue(null);
  expect((await PUT(request({ status: 'published' }), context)).status).toBe(404);
  expect(mockUpdate).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439011', ...DEFAULT_TENANT_FILTER, archivedAt: null }, { $set: { status: 'published' }, $inc: { __v: 1 } }, expect.anything());
});
it('preserves ordinary edits', async () => {
  mockUpdate.mockResolvedValue({ title: 'Updated' });
  expect((await PUT(request({ title: 'Updated' }), context)).status).toBe(200);
});

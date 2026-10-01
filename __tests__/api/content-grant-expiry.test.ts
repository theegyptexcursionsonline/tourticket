/** @jest-environment node */
import { NextRequest } from 'next/server';
const mockConnect = jest.fn();
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: (...args: unknown[]) => mockConnect(...args) }));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler, registerAdminAuditActor: jest.fn() }));
import { POST } from '@/app/api/admin/content/blog/route';
import { PATCH } from '@/app/api/admin/content/blog/archive/route';
import { GET } from '@/app/api/admin/content/blog/[slug]/route';
const prior = { ...process.env };
const deadline = Date.parse('2050-01-01T00:00:00.000Z');
beforeEach(() => {
  jest.clearAllMocks();
  process.env.CONTENT_ENGINE_ALLOWED_TENANTS = 'default';
  process.env.CONTENT_ENGINE_API_KEY_NEXT = 'local-expiring-grant';
  process.env.CONTENT_ENGINE_RECEIVER_GRANTS_JSON = JSON.stringify({ version: 3, grants: [{
    id: 'private-review', secretEnv: 'CONTENT_ENGINE_API_KEY_NEXT', expiresAt: new Date(deadline).toISOString(),
    targets: ['POST', 'PATCH'].map(method => ({ method, receiverType: 'blog', tenantId: 'default', locale: 'en', publicationMode: 'draft' })),
  }] });
  jest.spyOn(Date, 'now').mockReturnValue(deadline);
});
afterEach(() => { jest.restoreAllMocks(); process.env = { ...prior }; });
it.each(['POST', 'PATCH', 'GET'])('rejects expired %s at the route before DB connection', async method => {
  const request = new NextRequest('https://example.test/api/admin/content/blog/private-review?tenantId=default', {
    method, headers: { authorization: 'Bearer local-expiring-grant' },
    ...(method === 'GET' ? {} : { body: '{}' }),
  });
  const response = method === 'POST' ? await POST(request) : method === 'PATCH' ? await PATCH(request) : await GET(request, { params: Promise.resolve({ slug: 'private-review' }) });
  expect(response.status).toBe(401);
  expect(mockConnect).not.toHaveBeenCalled();
});

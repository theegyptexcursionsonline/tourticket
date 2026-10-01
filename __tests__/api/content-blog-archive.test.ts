const mockArchiveClaim = jest.fn();
const mockComplete = jest.fn();
const mockRelease = jest.fn();
jest.mock('@/lib/models/ContentPublishReceipt', () => ({}));
jest.mock('@/lib/content/publishIdempotency', () => ({ ...jest.requireActual('@/lib/content/publishIdempotency'),
  beginPublish: (...args: unknown[]) => mockArchiveClaim(...args),
  completePublish: (...args: unknown[]) => mockComplete(...args),
  releasePublishClaim: (...args: unknown[]) => mockRelease(...args),
}));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }) } }));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
const mockConnect = jest.fn();
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: () => mockConnect() }));
const mockUpdate = jest.fn();
const mockFind = jest.fn();
jest.mock('@/lib/models/Blog', () => ({ __esModule: true, default: { findOneAndUpdate: (...args: unknown[]) => mockUpdate(...args), findOne: (...args: unknown[]) => ({ select: () => mockFind(...args) }) } }));
const mockIndexes = jest.fn();
jest.mock('@/lib/content/receiverIndexReadiness', () => ({ contentReceiverIndexesReady: () => mockIndexes() }));
const mockGrantId = { value: 'draft-canary' };
const mockTarget = jest.fn();
jest.mock('@/lib/auth/verifyContentEngine', () => ({
  authenticateContentEngineMutation: () => ({ ok: true, credential: { grantId: mockGrantId.value, targets: [{ method: 'PATCH', receiverType: 'blog', tenantId: 'default', locale: 'en', publicationMode: 'draft' }] } }),
  verifyContentEngineMutationTarget: (...args: unknown[]) => mockTarget(...args),
  verifyContentEngineTenant: () => ({ ok: true, tenantId: 'default' }),
}));
import { PATCH } from '@/app/api/admin/content/blog/archive/route';
import { hashPublishRequest } from '@/lib/content/publishIdempotency';
const operation = '9f7d2c8a-1234-4c5d-8e9f-000000000099';
const body = { id: '507f1f77bcf86cd799439011', publishReceiptId: '507f1f77bcf86cd799439012', tenantId: 'default', defaultLocale: 'en', expectedRevision: 2 };
const request = (value: unknown = body) => ({ json: async () => value, headers: { get: () => operation } }) as never;
beforeEach(() => { jest.clearAllMocks(); mockGrantId.value = 'draft-canary'; mockArchiveClaim.mockResolvedValue({ outcome: 'proceed', receiptId: 'archive-receipt', claimToken: 'claim', resumed: false }); mockComplete.mockResolvedValue(undefined); mockTarget.mockReturnValue(null); mockIndexes.mockResolvedValue(true); mockConnect.mockResolvedValue({ connection: { db: {} } }); mockUpdate.mockResolvedValue(null); mockFind.mockResolvedValue(null); });
it('archives only the exact owned, unchanged draft and retains its content', async () => {
  mockUpdate.mockResolvedValue({ _id: body.id, slug: 'qa-draft', __v: 3 });
  const result = await PATCH(request());
  expect(result.status).toBe(200);
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ _id: body.id, status: 'draft', archivedAt: null, __v: 2, contentEngineGrantId: 'draft-canary', contentEnginePublishReceiptId: body.publishReceiptId }),
    expect.objectContaining({ $set: expect.objectContaining({ archivedAt: expect.any(Date), contentEngineArchiveOperationId: operation }), $inc: { __v: 1 } }), expect.anything());
  expect(mockUpdate.mock.calls[0][1].$set).not.toHaveProperty('content');
});
it('replays a lost archive response only for the identical operation and input', async () => {
  const fingerprint = hashPublishRequest({ grantId: 'draft-canary', id: body.id, publishReceiptId: body.publishReceiptId, tenantId: 'default', locale: 'en', expectedRevision: 2 });
  mockFind.mockResolvedValue({ _id: body.id, slug: 'qa-draft', status: 'draft', archivedAt: new Date(), __v: 3, contentEngineArchiveOperationId: operation, contentEngineArchiveFingerprint: fingerprint });
  expect((await PATCH(request())).status).toBe(200);
  expect((await PATCH(request({ ...body, expectedRevision: 3 }))).status).toBe(409);
});
it.each(['published', 'draft'])('refuses changed or non-owned %s content', async status => {
  mockFind.mockResolvedValue({ status, __v: 5 });
  expect((await PATCH(request())).status).toBe(409);
});
it('returns not found without leaking another grant record', async () => { expect((await PATCH(request())).status).toBe(404); });
it('stops before DB when target denied', async () => { mockTarget.mockReturnValue({ status: 403 }); expect((await PATCH(request())).status).toBe(403); expect(mockConnect).not.toHaveBeenCalled(); });
it('rejects invalid revision before DB', async () => { expect((await PATCH(request({ ...body, expectedRevision: -1 }))).status).toBe(400); expect(mockConnect).not.toHaveBeenCalled(); });
it('returns a retryable failure after unavailable DB', async () => { mockConnect.mockRejectedValue(new Error('offline')); expect((await PATCH(request())).status).toBe(503); expect(mockUpdate).not.toHaveBeenCalled(); });

it('rejects operation-key reuse for a different archive input before content writes', async () => {
  mockArchiveClaim.mockResolvedValue({ outcome: 'error', status: 409, error: 'Idempotency input conflict' });
  expect((await PATCH(request())).status).toBe(409);
  expect(mockUpdate).not.toHaveBeenCalled();
});
it('replays a completed archive receipt without a second write', async () => {
  mockArchiveClaim.mockResolvedValue({ outcome: 'replay', status: 200, body: { status: 'archived', id: body.id } });
  expect((await PATCH(request())).status).toBe(200);
  expect(mockUpdate).not.toHaveBeenCalled();
});
it('retains the archive tombstone when receipt acknowledgment fails', async () => {
  mockUpdate.mockResolvedValue({ _id: body.id, slug: 'qa-draft', __v: 3 });
  mockComplete.mockRejectedValue(new Error('response lost'));
  expect((await PATCH(request())).status).toBe(503);
  expect(mockRelease).not.toHaveBeenCalled();
});

it('refuses archive before claiming a key when uniqueness indexes are absent', async () => {
  mockIndexes.mockResolvedValue(false);
  expect((await PATCH(request())).status).toBe(503);
  expect(mockArchiveClaim).not.toHaveBeenCalled();
  expect(mockUpdate).not.toHaveBeenCalled();
});

it('binds archive idempotency to the grant so another same-tenant grant cannot replay it', async () => {
  let hash: string | undefined;
  mockArchiveClaim.mockImplementation(async input => {
    if (hash && hash !== input.requestHash) return { outcome: 'error', status: 409, error: 'Idempotency input conflict' };
    hash = input.requestHash;
    return { outcome: 'proceed', receiptId: 'archive-receipt', claimToken: 'claim' };
  });
  mockUpdate.mockResolvedValue({ _id: body.id, slug: 'qa-draft', __v: 3 });
  expect((await PATCH(request())).status).toBe(200);
  mockGrantId.value = 'another-draft-grant';
  expect((await PATCH(request())).status).toBe(409);
  expect(mockUpdate).toHaveBeenCalledTimes(1);
});

/**
 * Content-engine destination adapter route tests.
 *
 * Verifies tenant-scoped slug/name dedupe on the POST bridge and the
 * tenant-aware [slug] GET lookup, with the database mocked out (same
 * pattern as content-blog-adapter.test.ts).
 */

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _data: unknown;

    constructor(init?: { status?: number }) {
      this.status = init?.status || 200;
    }

    async json() {
      return this._data;
    }

    static json(data: unknown, init?: { status?: number }) {
      const resp = new MockNextResponse(init);
      resp._data = data;
      return resp;
    }
  }

  return { NextResponse: MockNextResponse, NextRequest: jest.fn() };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/auth/verifyContentEngine', () => ({
  verifyContentEngine: jest.fn().mockReturnValue(null),
}));

const destinationFindOne = jest.fn();
const destinationCreate = jest.fn();
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => destinationFindOne(...args),
    create: (...args: unknown[]) => destinationCreate(...args),
  },
}));

// The real claim helper runs against an in-memory receipt store so replay
// behaviour is proven end-to-end rather than stubbed out.
const mockReceiptStore: { current: ReceiptStore | null } = { current: null };
jest.mock('@/lib/models/ContentPublishReceipt', () => ({
  __esModule: true,
  default: {
    create: (doc: never) => mockReceiptStore.current!.model.create(doc),
    findOne: (selector: never) => mockReceiptStore.current!.model.findOne(selector),
    findOneAndUpdate: (selector: never, update: never) =>
      mockReceiptStore.current!.model.findOneAndUpdate(selector, update),
    updateOne: (selector: never, update: never) =>
      mockReceiptStore.current!.model.updateOne(selector, update),
    deleteOne: (selector: never) => mockReceiptStore.current!.model.deleteOne(selector),
  },
}));

import { POST } from '@/app/api/admin/content/destination/route';
import { GET } from '@/app/api/admin/content/destination/[slug]/route';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { createReceiptStore, type ReceiptStore } from '@/__mocks__/contentPublishReceiptStore';

const validPayload = {
  name: 'Makadi Bay',
  slug: 'makadi-bay',
  description: 'Resort bay on the Red Sea coast south of Hurghada.',
};

function postReq(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    json: async () => body,
    headers: { get: (name: string) => normalized.get(name.toLowerCase()) ?? null },
  } as never;
}

beforeEach(() => {
  destinationFindOne.mockReset();
  destinationCreate.mockReset();
  mockReceiptStore.current = createReceiptStore();
});

describe('POST /api/admin/content/destination', () => {
  it('dedupes slug and name within the default tenant and stores no tenantId', async () => {
    destinationFindOne.mockResolvedValue(null);
    destinationCreate.mockResolvedValue({ _id: 'id1', slug: validPayload.slug });

    const res = await POST(postReq({ tenantId: 'default', payload: validPayload }));

    expect(res.status).toBe(201);
    expect(destinationFindOne).toHaveBeenNthCalledWith(1, {
      slug: validPayload.slug,
      ...DEFAULT_TENANT_FILTER,
    });
    expect(destinationFindOne).toHaveBeenNthCalledWith(2, {
      name: validPayload.name,
      ...DEFAULT_TENANT_FILTER,
    });
    expect(destinationCreate).toHaveBeenCalledWith(expect.objectContaining({ tenantId: undefined }));
  });

  it('scopes the dedupe checks per tenant and stores the tenantId', async () => {
    destinationFindOne.mockResolvedValue(null);
    destinationCreate.mockResolvedValue({ _id: 'id2', slug: validPayload.slug });

    const res = await POST(postReq({ tenantId: 'el-gouna', payload: validPayload }));

    expect(res.status).toBe(201);
    expect(destinationFindOne).toHaveBeenNthCalledWith(1, {
      slug: validPayload.slug,
      tenantId: 'el-gouna',
    });
    expect(destinationFindOne).toHaveBeenNthCalledWith(2, {
      name: validPayload.name,
      tenantId: 'el-gouna',
    });
    expect(destinationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'el-gouna' }),
    );
  });

  it('409s when the slug exists under the same tenant', async () => {
    destinationFindOne.mockResolvedValueOnce({ _id: 'dup', slug: validPayload.slug });

    const res = await POST(postReq({ tenantId: 'el-gouna', payload: validPayload }));

    expect(res.status).toBe(409);
    expect(destinationCreate).not.toHaveBeenCalled();
  });

  it('409s when the name exists under the same tenant', async () => {
    destinationFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 'dup', name: validPayload.name });

    const res = await POST(postReq({ tenantId: 'el-gouna', payload: validPayload }));

    expect(res.status).toBe(409);
    expect(destinationCreate).not.toHaveBeenCalled();
  });

  it('allows the same slug on another tenant (dedupe never queries globally)', async () => {
    destinationFindOne.mockResolvedValue(null);
    destinationCreate.mockResolvedValue({ _id: 'id3', slug: validPayload.slug });

    const res = await POST(postReq({ tenantId: 'makadi-bay', payload: validPayload }));

    expect(res.status).toBe(201);
    for (const call of destinationFindOne.mock.calls) {
      expect(call[0]).toMatchObject({ tenantId: 'makadi-bay' });
    }
  });

  it('drops unsupported-locale translations and reports them', async () => {
    destinationFindOne.mockResolvedValue(null);
    destinationCreate.mockResolvedValue({ _id: 'id4', slug: validPayload.slug });

    const res = await POST(
      postReq({
        payload: validPayload,
        translations: { de: { name: 'Makadi-Bucht' }, it: { name: 'Baia di Makadi' } },
      }),
    );

    expect(res.status).toBe(201);
    expect(destinationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ translations: { de: { name: 'Makadi-Bucht' } } }),
    );
    expect(await res.json()).toEqual(expect.objectContaining({ droppedLocales: ['it'] }));
  });

  it('rejects a defaultLocale this site does not serve', async () => {
    const res = await POST(postReq({ payload: validPayload, defaultLocale: 'it' }));

    expect(res.status).toBe(400);
    expect(destinationCreate).not.toHaveBeenCalled();
  });

  it('files a non-default base payload under its own language bucket', async () => {
    destinationFindOne.mockResolvedValue(null);
    destinationCreate.mockResolvedValue({ _id: 'id5', slug: validPayload.slug });

    const res = await POST(postReq({ payload: validPayload, defaultLocale: 'de' }));

    expect(res.status).toBe(201);
    expect(destinationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: expect.objectContaining({
          de: expect.objectContaining({ name: validPayload.name }),
        }),
      }),
    );
  });
});

describe('POST /api/admin/content/destination — Idempotency-Key', () => {
  const headers = { 'Idempotency-Key': '9f7d2c8a-1234-4c5d-8e9f-000000000002' };

  it('creates exactly one destination when the engine replays the same key', async () => {
    destinationFindOne.mockResolvedValue(null);
    destinationCreate.mockResolvedValue({ _id: 'dest-1', slug: validPayload.slug });

    const first = await POST(postReq({ payload: validPayload }, headers));
    const second = await POST(postReq({ payload: validPayload }, headers));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await second.json()).toEqual(await first.json());
    expect(destinationCreate).toHaveBeenCalledTimes(1);
  });

  it('releases the claim on a duplicate-name rejection', async () => {
    destinationFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 'dup', name: validPayload.name });

    const res = await POST(postReq({ payload: validPayload }, headers));

    expect(res.status).toBe(409);
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
  });
});

describe('GET /api/admin/content/destination/[slug]', () => {
  function getReq(tenantId?: string) {
    const searchParams = new Map(tenantId ? [['tenantId', tenantId]] : []);
    return { nextUrl: { searchParams } } as never;
  }

  it('defaults to the default-site namespace when no tenant param is given', async () => {
    const lean = jest.fn().mockResolvedValue(null);
    destinationFindOne.mockReturnValue({ lean });

    const res = await GET(getReq(), { params: Promise.resolve({ slug: 'some-slug' }) });

    expect(res.status).toBe(404);
    expect(destinationFindOne).toHaveBeenCalledWith({ slug: 'some-slug', ...DEFAULT_TENANT_FILTER });
  });

  it('scopes the lookup to the requested tenant', async () => {
    const lean = jest.fn().mockResolvedValue({
      _id: 'id5',
      slug: 'some-slug',
      name: 'Some Place',
      isPublished: true,
      tenantId: 'el-gouna',
      updatedAt: new Date(0),
    });
    destinationFindOne.mockReturnValue({ lean });

    const res = await GET(getReq('el-gouna'), { params: Promise.resolve({ slug: 'some-slug' }) });

    expect(res.status).toBe(200);
    expect(destinationFindOne).toHaveBeenCalledWith({ slug: 'some-slug', tenantId: 'el-gouna' });
    expect(await res.json()).toEqual(expect.objectContaining({ tenantId: 'el-gouna' }));
  });
});

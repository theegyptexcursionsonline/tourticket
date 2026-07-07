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

import { POST } from '@/app/api/admin/content/destination/route';
import { GET } from '@/app/api/admin/content/destination/[slug]/route';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const validPayload = {
  name: 'Makadi Bay',
  slug: 'makadi-bay',
  description: 'Resort bay on the Red Sea coast south of Hurghada.',
};

function postReq(body: Record<string, unknown>) {
  return { json: async () => body } as never;
}

beforeEach(() => {
  destinationFindOne.mockReset();
  destinationCreate.mockReset();
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

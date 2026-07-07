/**
 * Content-engine blog adapter route tests.
 *
 * Verifies tenant-scoped slug dedupe + the locale allow-list on the
 * POST/PUT bridge and the tenant-aware [slug] GET lookup, with the
 * database mocked out (same pattern as routes.test.ts).
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

const blogFindOne = jest.fn();
const blogCreate = jest.fn();
jest.mock('@/lib/models/Blog', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => blogFindOne(...args), create: (...args: unknown[]) => blogCreate(...args) },
}));

import { POST, PUT } from '@/app/api/admin/content/blog/route';
import { GET } from '@/app/api/admin/content/blog/[slug]/route';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const validPayload = {
  title: 'Red Sea Snorkeling Guide',
  slug: 'red-sea-snorkeling-guide',
  excerpt: 'Where to snorkel on the Red Sea coast.',
  content: 'x'.repeat(150),
  category: 'travel-tips',
};

function postReq(body: Record<string, unknown>) {
  return { json: async () => body } as never;
}

beforeEach(() => {
  blogFindOne.mockReset();
  blogCreate.mockReset();
});

describe('POST /api/admin/content/blog', () => {
  it('dedupes slugs within the default tenant and stores no tenantId', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'id1', slug: validPayload.slug });

    const res = await POST(postReq({ tenantId: 'default', payload: validPayload }));

    expect(res.status).toBe(201);
    expect(blogFindOne).toHaveBeenCalledWith({ slug: validPayload.slug, ...DEFAULT_TENANT_FILTER });
    expect(blogCreate).toHaveBeenCalledWith(expect.objectContaining({ tenantId: undefined }));
  });

  it('scopes the dedupe check per tenant and stores the tenantId', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'id2', slug: validPayload.slug });

    const res = await POST(
      postReq({ tenantId: 'makadi-bay', payload: validPayload }),
    );

    expect(res.status).toBe(201);
    expect(blogFindOne).toHaveBeenCalledWith({ slug: validPayload.slug, tenantId: 'makadi-bay' });
    expect(blogCreate).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'makadi-bay' }));
  });

  it('409s when the slug exists under the same tenant', async () => {
    blogFindOne.mockResolvedValue({ _id: 'dup', slug: validPayload.slug });

    const res = await POST(postReq({ tenantId: 'makadi-bay', payload: validPayload }));

    expect(res.status).toBe(409);
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it('drops unsupported-locale translations and reports them', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'id3', slug: validPayload.slug });

    const res = await POST(
      postReq({
        payload: validPayload,
        translations: { de: { title: 'Titel' }, it: { title: 'Titolo' } },
      }),
    );

    expect(res.status).toBe(201);
    expect(blogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ translations: { de: { title: 'Titel' } } }),
    );
    expect(await res.json()).toEqual(expect.objectContaining({ droppedLocales: ['it'] }));
  });
});

describe('PUT /api/admin/content/blog', () => {
  it('looks up the post within the payload tenant only', async () => {
    blogFindOne.mockResolvedValue(null);

    const res = await PUT(postReq({ tenantId: 'el-gouna', payload: validPayload }));

    expect(res.status).toBe(404);
    expect(blogFindOne).toHaveBeenCalledWith({ slug: validPayload.slug, tenantId: 'el-gouna' });
  });

  it('filters translations on update and reports dropped locales', async () => {
    const existing = {
      tags: [],
      save: jest.fn().mockResolvedValue(undefined),
      _id: 'id4',
      slug: validPayload.slug,
    } as Record<string, unknown> & { save: jest.Mock };
    blogFindOne.mockResolvedValue(existing);

    const res = await PUT(
      postReq({
        payload: validPayload,
        translations: { ar: { title: 'عنوان' }, ru: { title: 'Заголовок' } },
      }),
    );

    expect(res.status).toBe(200);
    expect(existing.translations).toEqual({ ar: { title: 'عنوان' } });
    expect(await res.json()).toEqual(expect.objectContaining({ droppedLocales: ['ru'] }));
  });
});

describe('GET /api/admin/content/blog/[slug]', () => {
  function getReq(tenantId?: string) {
    const searchParams = new Map(tenantId ? [['tenantId', tenantId]] : []);
    return { nextUrl: { searchParams } } as never;
  }

  it('defaults to the default-site namespace when no tenant param is given', async () => {
    const lean = jest.fn().mockResolvedValue(null);
    blogFindOne.mockReturnValue({ lean });

    const res = await GET(getReq(), { params: Promise.resolve({ slug: 'some-slug' }) });

    expect(res.status).toBe(404);
    expect(blogFindOne).toHaveBeenCalledWith({ slug: 'some-slug', ...DEFAULT_TENANT_FILTER });
  });

  it('scopes the lookup to the requested tenant', async () => {
    const lean = jest.fn().mockResolvedValue({
      _id: 'id5',
      slug: 'some-slug',
      title: 'T',
      status: 'published',
      tenantId: 'makadi-bay',
      updatedAt: new Date(0),
    });
    blogFindOne.mockReturnValue({ lean });

    const res = await GET(getReq('makadi-bay'), { params: Promise.resolve({ slug: 'some-slug' }) });

    expect(res.status).toBe(200);
    expect(blogFindOne).toHaveBeenCalledWith({ slug: 'some-slug', tenantId: 'makadi-bay' });
    expect(await res.json()).toEqual(expect.objectContaining({ tenantId: 'makadi-bay' }));
  });
});

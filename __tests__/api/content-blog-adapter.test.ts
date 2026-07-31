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

import { POST, PUT } from '@/app/api/admin/content/blog/route';
import { GET } from '@/app/api/admin/content/blog/[slug]/route';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { createReceiptStore, type ReceiptStore } from '@/__mocks__/contentPublishReceiptStore';

const validPayload = {
  title: 'Red Sea Snorkeling Guide',
  slug: 'red-sea-snorkeling-guide',
  excerpt: 'Where to snorkel on the Red Sea coast.',
  content: 'x'.repeat(150),
  category: 'travel-tips',
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
  blogFindOne.mockReset();
  blogCreate.mockReset();
  mockReceiptStore.current = createReceiptStore();
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

  it('lets a second tenant publish a slug the default site already uses', async () => {
    // The dedupe query is tenant-scoped, so the default-site post is invisible
    // to the tenant publish and the create still goes through.
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'tenant-copy', slug: validPayload.slug });

    const res = await POST(postReq({ tenantId: 'makadi-bay', payload: validPayload }));

    expect(res.status).toBe(201);
    expect(blogFindOne).toHaveBeenCalledWith({ slug: validPayload.slug, tenantId: 'makadi-bay' });
    expect(blogFindOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.anything() }),
    );
  });

  it('rejects a defaultLocale this site does not serve', async () => {
    const res = await POST(
      postReq({ payload: validPayload, defaultLocale: 'it' }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()) as { error: string }).toEqual(
      expect.objectContaining({ error: expect.stringContaining('not served by this site') }),
    );
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it('files a non-default base payload under its own language bucket', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'id-de', slug: validPayload.slug });

    const res = await POST(postReq({ payload: validPayload, defaultLocale: 'de' }));

    expect(res.status).toBe(201);
    expect(blogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: expect.objectContaining({
          de: expect.objectContaining({ title: validPayload.title, content: validPayload.content }),
        }),
      }),
    );
  });

  it('does not mirror the base payload when it is already in the site default', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'id-en', slug: validPayload.slug });

    await POST(postReq({ payload: validPayload, defaultLocale: 'en' }));

    expect(blogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ translations: {} }),
    );
  });
});

describe('POST /api/admin/content/blog — Idempotency-Key', () => {
  const headers = { 'Idempotency-Key': '9f7d2c8a-1234-4c5d-8e9f-000000000001' };

  it('creates exactly one post when the engine replays the same key', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'blog-1', slug: validPayload.slug });

    const first = await POST(postReq({ payload: validPayload }, headers));
    const second = await POST(postReq({ payload: validPayload }, headers));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await second.json()).toEqual(await first.json());
    // The decisive assertion: the retry did NOT publish a second post.
    expect(blogCreate).toHaveBeenCalledTimes(1);
  });

  it('keys replays per tenant so one tenant cannot read another tenant\'s result', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate
      .mockResolvedValueOnce({ _id: 'default-post', slug: validPayload.slug })
      .mockResolvedValueOnce({ _id: 'tenant-post', slug: validPayload.slug });

    const defaultRes = await POST(postReq({ payload: validPayload }, headers));
    const tenantRes = await POST(
      postReq({ tenantId: 'makadi-bay', payload: validPayload }, headers),
    );

    expect((await defaultRes.json()) as { id: string }).toEqual(
      expect.objectContaining({ id: 'default-post' }),
    );
    expect((await tenantRes.json()) as { id: string }).toEqual(
      expect.objectContaining({ id: 'tenant-post' }),
    );
    expect(blogCreate).toHaveBeenCalledTimes(2);
  });

  it('409s when the same key arrives bound to a different post', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'blog-1', slug: validPayload.slug });

    await POST(postReq({ payload: validPayload }, headers));
    const res = await POST(
      postReq({ payload: { ...validPayload, slug: 'a-different-slug' } }, headers),
    );

    expect(res.status).toBe(409);
    expect(blogCreate).toHaveBeenCalledTimes(1);
  });

  it('adopts the existing post when a crashed attempt is retried', async () => {
    // First attempt writes the post, then dies before marking the receipt
    // processed — the receipt is left `pending` with a lapsed claim.
    blogCreate.mockResolvedValue({ _id: 'blog-1', slug: validPayload.slug });
    blogFindOne.mockResolvedValue(null);
    await POST(postReq({ payload: validPayload }, headers));

    mockReceiptStore.current!.receipts.forEach((receipt) => {
      receipt.state = 'pending';
      receipt.claimToken = 'dead-attempt';
    });
    mockReceiptStore.current!.expireClaims();

    blogCreate.mockClear();
    blogFindOne.mockResolvedValue({ _id: 'blog-1', slug: validPayload.slug });

    const retry = await POST(postReq({ payload: validPayload }, headers));

    expect(retry.status).toBe(201);
    expect((await retry.json()) as { id: string }).toEqual(
      expect.objectContaining({ id: 'blog-1' }),
    );
    // No duplicate, and no misleading 409 for work the engine never repeated.
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it('still 409s a genuine duplicate slug when the key is new', async () => {
    blogFindOne.mockResolvedValue({ _id: 'existing', slug: validPayload.slug });

    const res = await POST(postReq({ payload: validPayload }, headers));

    expect(res.status).toBe(409);
    expect(blogCreate).not.toHaveBeenCalled();
    // The claim is released so a corrected retry is not blocked by the receipt.
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
  });

  it('releases the claim when the insert fails so the engine can retry', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockRejectedValue(new Error('insert exploded'));

    const res = await POST(postReq({ payload: validPayload }, headers));

    expect(res.status).toBe(500);
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
  });

  it('rejects a malformed Idempotency-Key', async () => {
    const res = await POST(
      postReq({ payload: validPayload }, { 'Idempotency-Key': 'x'.repeat(201) }),
    );

    expect(res.status).toBe(400);
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it('still publishes when no Idempotency-Key is sent', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'blog-nokey', slug: validPayload.slug });

    const res = await POST(postReq({ payload: validPayload }));

    expect(res.status).toBe(201);
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
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

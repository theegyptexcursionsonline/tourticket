/**
 * Flagship Content Engine blog receiver contract.
 *
 * The database is mocked; the real idempotency helper runs against an in-memory
 * unique receipt store so claim/replay/crash recovery ordering stays observable.
 */

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _data: unknown;

    constructor(init?: { status?: number }) {
      this.status = init?.status ?? 200;
    }

    async json() {
      return this._data;
    }

    static json(data: unknown, init?: { status?: number }) {
      const response = new MockNextResponse(init);
      response._data = data;
      return response;
    }
  }

  return { NextResponse: MockNextResponse, NextRequest: jest.fn() };
});
const mockDbConnect = jest.fn().mockResolvedValue({ connection: { db: {} } });
jest.mock('@/lib/dbConnect', () => (...args: unknown[]) => mockDbConnect(...args));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: jest.fn(),
}));

const receiverIndexesReady = jest.fn().mockResolvedValue(true);
jest.mock('@/lib/content/receiverIndexReadiness', () => ({
  contentReceiverIndexesReady: (...args: unknown[]) => receiverIndexesReady(...args),
}));

jest.mock('@/lib/auth/verifyContentEngine', () => ({
  verifyContentEngine: jest.fn().mockReturnValue(null),
  verifyContentEngineTenant: jest.fn(),
}));

const blogFindOne = jest.fn();
const blogCreate = jest.fn();
jest.mock('@/lib/models/Blog', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => blogFindOne(...args),
    create: (...args: unknown[]) => blogCreate(...args),
  },
}));

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
import { verifyContentEngineTenant } from '@/lib/auth/verifyContentEngine';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { createReceiptStore, type ReceiptStore } from '@/__mocks__/contentPublishReceiptStore';

const tenantVerifier = verifyContentEngineTenant as jest.MockedFunction<
  typeof verifyContentEngineTenant
>;
const IDEMPOTENCY_KEY = '9f7d2c8a-1234-4c5d-8e9f-000000000001';
const DEFAULT_HEADERS = { 'Idempotency-Key': IDEMPOTENCY_KEY };

const validPayload = {
  title: 'Red Sea Snorkeling Guide',
  slug: 'red-sea-snorkeling-guide',
  excerpt: 'Where to snorkel on the Red Sea coast.',
  content: 'x'.repeat(150),
  category: 'travel-tips',
  tags: ['red-sea', 'snorkeling', 'travel-guide'],
  metaTitle: 'Red Sea Snorkeling Guide',
  metaDescription: 'Plan a responsible Red Sea snorkeling trip with practical coastal guidance.',
  author: 'EEO Editorial Team',
  featuredImage: 'https://res.cloudinary.com/dm3sxllch/image/upload/example.jpg',
  readTime: 4,
  status: 'published',
  featured: false,
};

function tenantResult(input: unknown) {
  if (input === 'default') return { ok: true as const, tenantId: 'default' };
  return {
    ok: false as const,
    response: {
      status: 422,
      json: async () => ({ error: input ? 'Content tenant is not enabled' : 'Invalid tenantId' }),
    } as never,
  };
}

function request(
  body: Record<string, unknown>,
  headers: Record<string, string> = DEFAULT_HEADERS,
  injectTenant = true,
) {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const requestBody = injectTenant ? { tenantId: 'default', ...body } : body;
  return {
    json: async () => requestBody,
    headers: { get: (name: string) => normalized.get(name.toLowerCase()) ?? null },
  } as never;
}

function lookupRequest(tenantId?: string) {
  const searchParams = new Map(tenantId ? [['tenantId', tenantId]] : []);
  return { nextUrl: { searchParams } } as never;
}

beforeEach(() => {
  mockDbConnect.mockReset().mockResolvedValue({ connection: { db: {} } });
  blogFindOne.mockReset();
  blogCreate.mockReset();
  receiverIndexesReady.mockReset().mockResolvedValue(true);
  tenantVerifier.mockReset().mockImplementation(tenantResult);
  mockReceiptStore.current = createReceiptStore();
});

describe('POST /api/admin/content/blog', () => {
  it('rejects non-object bodies and non-string required fields', async () => {
    const nullBody = await POST({
      json: async () => null,
      headers: { get: () => null },
    } as never);
    const numericTitle = await POST(
      request({ payload: { ...validPayload, title: 42 } }),
    );

    expect(nullBody.status).toBe(400);
    expect(numericTitle.status).toBe(400);
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it.each([
    [{ payload: validPayload }, false],
    [{ tenantId: 'makadi-bay', payload: validPayload }, true],
  ] as const)('rejects missing or non-flagship tenant before database work', async (body, injectTenant) => {
    const response = await POST(request(body, DEFAULT_HEADERS, injectTenant));
    expect(response.status).toBe(422);
    expect(receiverIndexesReady).not.toHaveBeenCalled();
    expect(blogFindOne).not.toHaveBeenCalled();
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it.each([
    { ...validPayload, status: undefined },
    { ...validPayload, status: 'draft' },
    { ...validPayload, status: 'publshed' },
  ])('rejects a payload that is not explicitly published', async (payload) => {
    const response = await POST(request({ payload }));
    expect(response.status).toBe(400);
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it('requires an exact UUID idempotency key before database access', async () => {
    const missing = await POST(request({ payload: validPayload }, {}));
    const malformed = await POST(
      request({ payload: validPayload }, { 'Idempotency-Key': 'not-a-uuid' }),
    );

    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(receiverIndexesReady).not.toHaveBeenCalled();
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it('fails closed when live receiver indexes are incomplete', async () => {
    receiverIndexesReady.mockResolvedValue(false);
    const response = await POST(request({ payload: validPayload }));

    expect(response.status).toBe(503);
    expect(receiverIndexesReady).toHaveBeenCalledWith('blog', {});
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it('returns a retryable failure when the database connection is unavailable', async () => {
    mockDbConnect.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await POST(request({ payload: validPayload }));

    expect(response.status).toBe(503);
    expect(receiverIndexesReady).not.toHaveBeenCalled();
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it('creates one canonical default-site post with receipt provenance', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'blog-1', slug: validPayload.slug });

    const response = await POST(request({ payload: validPayload }));

    expect(response.status).toBe(201);
    expect(blogFindOne).toHaveBeenCalledWith({
      slug: validPayload.slug,
      ...DEFAULT_TENANT_FILTER,
    });
    expect(blogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'published',
        tenantId: 'default',
        contentEnginePublishReceiptId: expect.any(String),
      }),
    );
  });

  it('filters unsupported translations and builds the locale-correct live URL', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'blog-de', slug: validPayload.slug });

    const response = await POST(
      request({
        payload: validPayload,
        defaultLocale: 'de',
        translations: { de: { title: 'Titel' }, it: { title: 'Titolo' } },
      }),
    );

    expect(response.status).toBe(201);
    expect(blogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: expect.objectContaining({
          de: expect.objectContaining({ title: 'Titel' }),
        }),
      }),
    );
    expect(await response.json()).toEqual(
      expect.objectContaining({
        droppedLocales: ['it'],
        liveUrl: `https://www.egypt-excursionsonline.com/de/blog/${validPayload.slug}`,
      }),
    );
  });

  it('returns the original result without a second write when a key is replayed', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'blog-1', slug: validPayload.slug });

    const first = await POST(request({ payload: validPayload }));
    const replay = await POST(request({ payload: validPayload }));

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(await first.json());
    expect(blogCreate).toHaveBeenCalledTimes(1);
  });

  it('returns 409 when the same key is rebound to different content', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockResolvedValue({ _id: 'blog-1', slug: validPayload.slug });

    await POST(request({ payload: validPayload }));
    const response = await POST(
      request({ payload: { ...validPayload, slug: 'different-slug' } }),
    );

    expect(response.status).toBe(409);
    expect(blogCreate).toHaveBeenCalledTimes(1);
  });

  it('recovers only content carrying the exact stale receipt provenance', async () => {
    mockReceiptStore.current!.loseNextCompletion();
    blogFindOne.mockResolvedValueOnce(null);
    let committed: Record<string, unknown> | undefined;
    blogCreate.mockImplementation(async (doc: Record<string, unknown>) => {
      committed = doc;
      return { _id: 'blog-1', slug: validPayload.slug };
    });

    const interrupted = await POST(request({ payload: validPayload }));
    expect(interrupted.status).toBe(503);
    mockReceiptStore.current!.expireClaims();

    const existing = {
      _id: 'blog-1',
      slug: validPayload.slug,
      contentEnginePublishReceiptId: committed?.contentEnginePublishReceiptId,
    };
    blogFindOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    blogCreate.mockClear();

    const recovered = await POST(request({ payload: validPayload }));

    expect(recovered.status).toBe(201);
    expect(blogFindOne).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contentEnginePublishReceiptId: committed?.contentEnginePublishReceiptId,
      }),
    );
    expect(blogCreate).not.toHaveBeenCalled();
  });

  it('never adopts unrelated content that occupies the slug after a stale claim', async () => {
    mockReceiptStore.current!.loseNextCompletion();
    blogFindOne.mockResolvedValueOnce(null);
    blogCreate.mockResolvedValue({ _id: 'blog-1', slug: validPayload.slug });
    await POST(request({ payload: validPayload }));
    mockReceiptStore.current!.expireClaims();

    blogFindOne
      .mockResolvedValueOnce({ _id: 'manual-post', slug: validPayload.slug })
      .mockResolvedValueOnce(null);
    blogCreate.mockClear();

    const response = await POST(request({ payload: validPayload }));

    expect(response.status).toBe(409);
    expect(blogCreate).not.toHaveBeenCalled();
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
  });

  it('releases the claim after an insert failure but retains it after response loss', async () => {
    blogFindOne.mockResolvedValue(null);
    blogCreate.mockRejectedValueOnce(new Error('insert failed'));
    const insertFailure = await POST(request({ payload: validPayload }));
    expect(insertFailure.status).toBe(503);
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);

    mockReceiptStore.current = createReceiptStore();
    mockReceiptStore.current!.loseNextCompletion();
    blogCreate.mockResolvedValueOnce({ _id: 'blog-1', slug: validPayload.slug });
    const responseLoss = await POST(request({ payload: validPayload }));
    expect(responseLoss.status).toBe(503);
    expect(mockReceiptStore.current!.receipts).toHaveLength(1);
    expect(mockReceiptStore.current!.receipts[0]?.state).toBe('pending');
  });
});

describe('PUT /api/admin/content/blog', () => {
  it('rejects a non-object body before tenant or database work', async () => {
    const response = await PUT({
      json: async () => [],
      headers: { get: () => null },
    } as never);

    expect(response.status).toBe(400);
    expect(mockDbConnect).not.toHaveBeenCalled();
  });

  it('updates only an explicitly published default-site post', async () => {
    const existing = {
      tags: [],
      save: jest.fn().mockResolvedValue(undefined),
      _id: 'blog-1',
      slug: validPayload.slug,
    } as Record<string, unknown> & { save: jest.Mock };
    blogFindOne.mockResolvedValue(existing);

    const response = await PUT(
      request({
        payload: validPayload,
        translations: { ar: { title: 'عنوان' }, ru: { title: 'Заголовок' } },
      }),
    );

    expect(response.status).toBe(200);
    expect(blogFindOne).toHaveBeenCalledWith({
      slug: validPayload.slug,
      ...DEFAULT_TENANT_FILTER,
    });
    expect(existing.translations).toEqual({ ar: { title: 'عنوان' } });
    expect(await response.json()).toEqual(expect.objectContaining({ droppedLocales: ['ru'] }));
  });

  it('remains disabled until the exact receiver indexes are present', async () => {
    receiverIndexesReady.mockResolvedValue(false);

    const response = await PUT(request({ payload: validPayload }));

    expect(response.status).toBe(503);
    expect(blogFindOne).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/content/blog/[slug]', () => {
  it('requires the exact default tenant query parameter', async () => {
    const response = await GET(lookupRequest(), {
      params: Promise.resolve({ slug: 'some-slug' }),
    });
    expect(response.status).toBe(422);
    expect(blogFindOne).not.toHaveBeenCalled();
  });

  it('reads only the default-site namespace', async () => {
    const lean = jest.fn().mockResolvedValue({
      _id: 'blog-1',
      slug: 'some-slug',
      title: 'Title',
      status: 'published',
      updatedAt: new Date(0),
    });
    blogFindOne.mockReturnValue({ lean });

    const response = await GET(lookupRequest('default'), {
      params: Promise.resolve({ slug: 'some-slug' }),
    });

    expect(response.status).toBe(200);
    expect(blogFindOne).toHaveBeenCalledWith({
      slug: 'some-slug',
      ...DEFAULT_TENANT_FILTER,
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({ tenantId: null, status: 'published' }),
    );
  });

  it('returns a retryable response when the lookup database is unavailable', async () => {
    mockDbConnect.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await GET(lookupRequest('default'), {
      params: Promise.resolve({ slug: 'some-slug' }),
    });

    expect(response.status).toBe(503);
    expect(blogFindOne).not.toHaveBeenCalled();
  });
});

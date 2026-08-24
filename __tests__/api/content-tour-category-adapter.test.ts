/**
 * Flagship category receiver and fail-closed tour adapter contracts.
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

const categoryFindOne = jest.fn();
const categoryCreate = jest.fn();
const tourFindOne = jest.fn();
const tourCreate = jest.fn();
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => categoryFindOne(...args),
    create: (...args: unknown[]) => categoryCreate(...args),
  },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => tourFindOne(...args),
    create: (...args: unknown[]) => tourCreate(...args),
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

import { POST as postCategory, PUT as putCategory } from '@/app/api/admin/content/category/route';
import { GET as getCategory } from '@/app/api/admin/content/category/[slug]/route';
import { POST as postTour } from '@/app/api/admin/content/tour/route';
import { GET as getTour } from '@/app/api/admin/content/tour/[slug]/route';
import { verifyContentEngineTenant } from '@/lib/auth/verifyContentEngine';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { createReceiptStore, type ReceiptStore } from '@/__mocks__/contentPublishReceiptStore';

const tenantVerifier = verifyContentEngineTenant as jest.MockedFunction<
  typeof verifyContentEngineTenant
>;
const HEADERS = { 'Idempotency-Key': '9f7d2c8a-1234-4c5d-8e9f-000000000003' };
const validCategory = {
  name: 'Family Adventures',
  slug: 'family-adventures',
  description: 'Family-friendly guided activities across Egypt for a range of ages.',
  longDescription: 'Families can choose from guided cultural visits, calm water activities and flexible private outings across Egypt. Each experience is selected for clear logistics, practical pacing and straightforward booking information. Parents can compare the available tours and choose the format that best suits their group.',
  highlights: ['Guided cultural visits', 'Flexible private outings', 'Calm water activities', 'Age-aware trip planning'],
  features: ['Clear family booking information', 'Practical pacing for mixed ages', 'Guided options across Egypt'],
  keywords: ['family tours', 'egypt with children', 'family activities'],
  metaTitle: 'Family Adventures in Egypt',
  metaDescription: 'Compare family-friendly activities across Egypt with clear guidance, flexible formats and practical booking information.',
  featuredImage: 'https://res.cloudinary.com/dm3sxllch/image/upload/example.jpg',
  published: true,
  featured: false,
};
const validTour = {
  title: 'Full Day Red Sea Adventure',
  slug: 'full-day-red-sea-adventure',
  description: 'A complete day of guided Red Sea activities.',
  duration: '8 hours',
  published: true,
};

function tenantResult(input: unknown) {
  if (input === 'default') return { ok: true as const, tenantId: 'default' };
  return {
    ok: false as const,
    response: { status: 422, json: async () => ({ error: 'Invalid tenantId' }) } as never,
  };
}

function request(
  body: Record<string, unknown>,
  headers: Record<string, string> = HEADERS,
  injectTenant = true,
) {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    json: async () => (injectTenant ? { tenantId: 'default', ...body } : body),
    headers: { get: (name: string) => normalized.get(name.toLowerCase()) ?? null },
  } as never;
}

function lookupRequest(tenantId?: string) {
  return {
    nextUrl: { searchParams: new Map(tenantId ? [['tenantId', tenantId]] : []) },
  } as never;
}

beforeEach(() => {
  mockDbConnect.mockClear();
  categoryFindOne.mockReset();
  categoryCreate.mockReset();
  tourFindOne.mockReset();
  tourCreate.mockReset();
  receiverIndexesReady.mockReset().mockResolvedValue(true);
  tenantVerifier.mockReset().mockImplementation(tenantResult);
  mockReceiptStore.current = createReceiptStore();
});

describe('POST /api/admin/content/tour', () => {
  it('rejects a non-object body before tenant or database work', async () => {
    const response = await postTour({
      json: async () => null,
      headers: { get: () => null },
    } as never);

    expect(response.status).toBe(400);
    expect(mockDbConnect).not.toHaveBeenCalled();
  });

  it('rejects tour publication before every database or content write', async () => {
    const response = await postTour(request({ payload: validTour }));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual(
      expect.objectContaining({ code: 'CONTENT_RECEIVER_TOUR_UNSUPPORTED' }),
    );
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(tourFindOne).not.toHaveBeenCalled();
    expect(tourCreate).not.toHaveBeenCalled();
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
  });

  it('rejects a missing tenant before reporting unsupported capability', async () => {
    const response = await postTour(request({ payload: validTour }, HEADERS, false));
    expect(response.status).toBe(422);
    expect(mockDbConnect).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/content/category', () => {
  it('rejects non-object bodies and non-string required fields', async () => {
    const nullBody = await postCategory({
      json: async () => null,
      headers: { get: () => null },
    } as never);
    const numericDescription = await postCategory(
      request({ payload: { ...validCategory, description: 42 } }),
    );

    expect(nullBody.status).toBe(400);
    expect(numericDescription.status).toBe(400);
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(categoryCreate).not.toHaveBeenCalled();
  });

  it('requires exact tenant, strict published state, UUID and live indexes', async () => {
    const noTenant = await postCategory(
      request({ payload: validCategory }, HEADERS, false),
    );
    const badState = await postCategory(
      request({ payload: { ...validCategory, published: 'true' } }),
    );
    const noKey = await postCategory(request({ payload: validCategory }, {}));
    receiverIndexesReady.mockResolvedValue(false);
    const noIndexes = await postCategory(request({ payload: validCategory }));

    expect(noTenant.status).toBe(422);
    expect(badState.status).toBe(400);
    expect(noKey.status).toBe(400);
    expect(noIndexes.status).toBe(503);
    expect(categoryCreate).not.toHaveBeenCalled();
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
  });

  it('returns a retryable failure when the database connection is unavailable', async () => {
    mockDbConnect.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await postCategory(request({ payload: validCategory }));

    expect(response.status).toBe(503);
    expect(receiverIndexesReady).not.toHaveBeenCalled();
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
    expect(categoryCreate).not.toHaveBeenCalled();
  });

  it('creates a default category with receipt provenance and locale filtering', async () => {
    categoryFindOne.mockResolvedValue(null);
    categoryCreate.mockResolvedValue({ _id: 'category-1', slug: validCategory.slug });

    const response = await postCategory(
      request({
        payload: validCategory,
        translations: { de: { name: 'Familie' }, it: { name: 'Famiglia' } },
      }),
    );

    expect(response.status).toBe(201);
    expect(categoryFindOne).toHaveBeenCalledWith({
      $and: [
        { $or: [{ slug: validCategory.slug }, { name: validCategory.name }] },
        DEFAULT_TENANT_FILTER,
      ],
    });
    expect(categoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        isPublished: true,
        tenantId: 'default',
        contentEnginePublishReceiptId: expect.any(String),
        translations: { de: { name: 'Familie' } },
      }),
    );
    expect(await response.json()).toEqual(expect.objectContaining({ droppedLocales: ['it'] }));
  });

  it('replays one write and binds stale recovery to exact provenance', async () => {
    categoryFindOne.mockResolvedValue(null);
    let committed: Record<string, unknown> | undefined;
    categoryCreate.mockImplementation(async (doc: Record<string, unknown>) => {
      committed = doc;
      return { _id: 'category-1', slug: validCategory.slug };
    });

    const first = await postCategory(request({ payload: validCategory }));
    const replay = await postCategory(request({ payload: validCategory }));
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(categoryCreate).toHaveBeenCalledTimes(1);

    mockReceiptStore.current = createReceiptStore();
    mockReceiptStore.current!.loseNextCompletion();
    categoryFindOne.mockReset().mockResolvedValueOnce(null);
    categoryCreate.mockClear();
    const interrupted = await postCategory(request({ payload: validCategory }));
    expect(interrupted.status).toBe(503);
    mockReceiptStore.current!.expireClaims();

    const existing = {
      _id: 'category-2',
      slug: validCategory.slug,
      contentEnginePublishReceiptId: committed?.contentEnginePublishReceiptId,
    };
    categoryFindOne
      .mockReset()
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    categoryCreate.mockClear();

    const recovered = await postCategory(request({ payload: validCategory }));
    expect(recovered.status).toBe(201);
    expect(categoryFindOne).toHaveBeenLastCalledWith({
      $and: [
        {
          slug: validCategory.slug,
          contentEnginePublishReceiptId: expect.any(String),
        },
        DEFAULT_TENANT_FILTER,
      ],
    });
    expect(categoryCreate).not.toHaveBeenCalled();
  });

  it('returns 409 for unrelated existing content and releases the receipt', async () => {
    categoryFindOne.mockResolvedValue({
      _id: 'existing',
      slug: validCategory.slug,
      name: validCategory.name,
    });

    const response = await postCategory(request({ payload: validCategory }));

    expect(response.status).toBe(409);
    expect(categoryCreate).not.toHaveBeenCalled();
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
  });
});

describe('PUT /api/admin/content/category', () => {
  it('rejects a non-object body before tenant or database work', async () => {
    const response = await putCategory({
      json: async () => [],
      headers: { get: () => null },
    } as never);

    expect(response.status).toBe(400);
    expect(mockDbConnect).not.toHaveBeenCalled();
  });

  it('updates only an explicitly published default category', async () => {
    const existing = {
      _id: 'category-1',
      slug: validCategory.slug,
      save: jest.fn().mockResolvedValue(undefined),
    } as Record<string, unknown> & { save: jest.Mock };
    categoryFindOne.mockResolvedValue(existing);

    const response = await putCategory(request({ payload: validCategory }));

    expect(response.status).toBe(200);
    expect(categoryFindOne).toHaveBeenCalledWith({
      slug: validCategory.slug,
      ...DEFAULT_TENANT_FILTER,
    });
  });

  it('remains disabled until the exact receiver indexes are present', async () => {
    receiverIndexesReady.mockResolvedValue(false);

    const response = await putCategory(request({ payload: validCategory }));

    expect(response.status).toBe(503);
    expect(categoryFindOne).not.toHaveBeenCalled();
  });
});

describe('receiver lookup routes', () => {
  it('requires an exact tenant before database access', async () => {
    const categoryResponse = await getCategory(lookupRequest(), {
      params: Promise.resolve({ slug: validCategory.slug }),
    });
    const tourResponse = await getTour(lookupRequest(), {
      params: Promise.resolve({ slug: validTour.slug }),
    });

    expect(categoryResponse.status).toBe(422);
    expect(tourResponse.status).toBe(422);
    expect(mockDbConnect).not.toHaveBeenCalled();
  });

  it('reads default category and tour records without enabling tour writes', async () => {
    categoryFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'category-1',
        slug: validCategory.slug,
        name: validCategory.name,
        isPublished: true,
      }),
    });
    tourFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'tour-1',
        slug: validTour.slug,
        title: validTour.title,
        isPublished: true,
      }),
    });

    const categoryResponse = await getCategory(lookupRequest('default'), {
      params: Promise.resolve({ slug: validCategory.slug }),
    });
    const tourResponse = await getTour(lookupRequest('default'), {
      params: Promise.resolve({ slug: validTour.slug }),
    });

    expect(categoryResponse.status).toBe(200);
    expect(tourResponse.status).toBe(200);
    expect(categoryFindOne).toHaveBeenCalledWith({
      slug: validCategory.slug,
      ...DEFAULT_TENANT_FILTER,
    });
    expect(tourFindOne).toHaveBeenCalledWith({
      slug: validTour.slug,
      ...DEFAULT_TENANT_FILTER,
    });
  });

  it('returns retryable responses when either lookup cannot connect', async () => {
    mockDbConnect.mockRejectedValueOnce(new Error('database unavailable'));
    const categoryResponse = await getCategory(lookupRequest('default'), {
      params: Promise.resolve({ slug: validCategory.slug }),
    });

    mockDbConnect.mockRejectedValueOnce(new Error('database unavailable'));
    const tourResponse = await getTour(lookupRequest('default'), {
      params: Promise.resolve({ slug: validTour.slug }),
    });

    expect(categoryResponse.status).toBe(503);
    expect(tourResponse.status).toBe(503);
    expect(categoryFindOne).not.toHaveBeenCalled();
    expect(tourFindOne).not.toHaveBeenCalled();
  });
});

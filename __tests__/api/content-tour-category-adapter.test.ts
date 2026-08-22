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
      const response = new MockNextResponse(init);
      response._data = data;
      return response;
    }
  }

  return { NextResponse: MockNextResponse, NextRequest: jest.fn() };
});

jest.mock('@/lib/admin/adminAudit', () => ({
  withAdminAudit: (handler: unknown) => handler,
}));
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/auth/verifyContentEngine', () => ({
  verifyContentEngine: jest.fn().mockReturnValue(null),
  verifyContentEngineTenant: jest.fn((input: unknown) => ({
    ok: true,
    tenantId: typeof input === 'string' && input.trim() ? input.trim() : 'default',
  })),
}));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: jest.fn(),
}));

const tourFindOne = jest.fn();
const tourCreate = jest.fn();
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => tourFindOne(...args),
    create: (...args: unknown[]) => tourCreate(...args),
  },
}));

const destinationFindOne = jest.fn();
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => destinationFindOne(...args),
  },
}));

const categoryFindOne = jest.fn();
const categoryCreate = jest.fn();
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => categoryFindOne(...args),
    create: (...args: unknown[]) => categoryCreate(...args),
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

import { POST as postTour } from '@/app/api/admin/content/tour/route';
import { GET as getTour } from '@/app/api/admin/content/tour/[slug]/route';
import { POST as postCategory, PUT as putCategory } from '@/app/api/admin/content/category/route';
import { GET as getCategory } from '@/app/api/admin/content/category/[slug]/route';
import { verifyContentEngineTenant } from '@/lib/auth/verifyContentEngine';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { createReceiptStore, type ReceiptStore } from '@/__mocks__/contentPublishReceiptStore';

const tenantVerifier = verifyContentEngineTenant as jest.MockedFunction<typeof verifyContentEngineTenant>;

function allowTenant(input: unknown) {
  return {
    ok: true as const,
    tenantId: typeof input === 'string' && input.trim() ? input.trim() : 'default',
  };
}

function denyNextTenant() {
  tenantVerifier.mockReturnValueOnce({
    ok: false,
    response: { status: 422, json: async () => ({ error: 'Content tenant is not enabled' }) } as never,
  });
}

const validTour = {
  title: 'Cairo Museum and Old City Tour',
  slug: 'cairo-museum-old-city-tour',
  location: 'Cairo',
  duration: '8 hours',
  description: 'A complete guided day through Cairo museums and the historic old city.',
};

const validCategory = {
  name: 'Cairo Day Tours',
  slug: 'cairo-day-tours',
  description: 'Curated full-day and half-day tours across Cairo.',
};

function request(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    json: async () => body,
    headers: { get: (name: string) => normalized.get(name.toLowerCase()) ?? null },
  } as never;
}

function lookupRequest(tenantId?: string) {
  const searchParams = new Map(tenantId ? [['tenantId', tenantId]] : []);
  return { nextUrl: { searchParams } } as never;
}

function sorted(value: unknown) {
  return { sort: jest.fn().mockResolvedValue(value) };
}

beforeEach(() => {
  tourFindOne.mockReset();
  tourCreate.mockReset();
  destinationFindOne.mockReset();
  categoryFindOne.mockReset();
  categoryCreate.mockReset();
  tenantVerifier.mockImplementation(allowTenant);
  mockReceiptStore.current = createReceiptStore();
});

describe('Content Engine tour receiver', () => {
  it('rejects a non-allowlisted tenant before tour joins or writes', async () => {
    denyNextTenant();

    const response = await postTour(
      request({ tenantId: 'wrong-tenant', payload: validTour }),
    );

    expect(response.status).toBe(422);
    expect(tourFindOne).not.toHaveBeenCalled();
    expect(destinationFindOne).not.toHaveBeenCalled();
    expect(categoryFindOne).not.toHaveBeenCalled();
    expect(tourCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-allowlisted tenant before tour preflight lookup', async () => {
    denyNextTenant();

    const response = await getTour(lookupRequest('wrong-tenant'), {
      params: Promise.resolve({ slug: validTour.slug }),
    });

    expect(response.status).toBe(422);
    expect(tourFindOne).not.toHaveBeenCalled();
  });

  it('scopes slug, destination and category joins to the requested tenant', async () => {
    tourFindOne.mockResolvedValue(null);
    destinationFindOne.mockResolvedValue({ _id: 'destination-1' });
    categoryFindOne.mockReturnValue(sorted({ _id: 'category-1' }));
    tourCreate.mockResolvedValue({ _id: 'tour-1', slug: validTour.slug });

    const response = await postTour(
      request({
        tenantId: 'makadi-bay',
        defaultLocale: 'en',
        payload: validTour,
        translations: { de: { title: 'Kairo Museum Tour' }, it: { title: 'Cairo' } },
      }),
    );

    expect(response.status).toBe(201);
    expect(tourFindOne).toHaveBeenCalledWith({
      slug: validTour.slug,
      tenantId: 'makadi-bay',
    });
    expect(destinationFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'makadi-bay' }),
    );
    expect(categoryFindOne).toHaveBeenCalledWith({ tenantId: 'makadi-bay' });
    expect(tourCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'makadi-bay',
        isPublished: false,
        destination: 'destination-1',
        category: ['category-1'],
        translations: { de: { title: 'Kairo Museum Tour' } },
      }),
    );
    expect(await response.json()).toEqual(
      expect.objectContaining({
        liveUrl: `https://www.egypt-excursionsonline.com/${validTour.slug}`,
        droppedLocales: ['it'],
      }),
    );
  });

  it('returns the canonical localized URL for a non-default base locale', async () => {
    tourFindOne.mockResolvedValue(null);
    destinationFindOne.mockResolvedValue({ _id: 'destination-1' });
    categoryFindOne.mockReturnValue(sorted({ _id: 'category-1' }));
    tourCreate.mockResolvedValue({ _id: 'tour-1', slug: validTour.slug });

    const response = await postTour(
      request({ defaultLocale: 'de', payload: validTour }),
    );

    expect(await response.json()).toEqual(
      expect.objectContaining({
        liveUrl: `https://www.egypt-excursionsonline.com/de/${validTour.slug}`,
      }),
    );
  });

  it('uses the complete default-tenant namespace for joins and stores no tenant id', async () => {
    tourFindOne.mockResolvedValue(null);
    destinationFindOne.mockResolvedValue({ _id: 'destination-default' });
    categoryFindOne.mockReturnValue(sorted({ _id: 'category-default' }));
    tourCreate.mockResolvedValue({ _id: 'tour-default', slug: validTour.slug });

    await postTour(request({ tenantId: 'default', payload: validTour }));

    expect(tourFindOne).toHaveBeenCalledWith({
      slug: validTour.slug,
      ...DEFAULT_TENANT_FILTER,
    });
    expect(destinationFindOne).toHaveBeenCalledWith(
      expect.objectContaining(DEFAULT_TENANT_FILTER),
    );
    expect(categoryFindOne).toHaveBeenCalledWith(DEFAULT_TENANT_FILTER);
    expect(tourCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: undefined }),
    );
  });

  it('replays one durable receipt instead of creating a second tour', async () => {
    const headers = { 'Idempotency-Key': 'tour-publish-2026-08-22' };
    tourFindOne.mockResolvedValue(null);
    destinationFindOne.mockResolvedValue({ _id: 'destination-1' });
    categoryFindOne.mockReturnValue(sorted({ _id: 'category-1' }));
    tourCreate.mockResolvedValue({ _id: 'tour-1', slug: validTour.slug });

    const first = await postTour(request({ payload: validTour }, headers));
    const replay = await postTour(request({ payload: validTour }, headers));

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(await first.json());
    expect(tourCreate).toHaveBeenCalledTimes(1);
  });

  it('keeps a pending receipt when the tour commits but receipt completion is lost', async () => {
    const headers = { 'Idempotency-Key': 'tour-response-loss-2026-08-22' };
    tourFindOne.mockResolvedValue(null);
    destinationFindOne.mockResolvedValue({ _id: 'destination-1' });
    categoryFindOne.mockReturnValue(sorted({ _id: 'category-1' }));
    tourCreate.mockResolvedValue({ _id: 'tour-1', slug: validTour.slug });
    mockReceiptStore.current!.loseNextCompletion();

    const interrupted = await postTour(request({ payload: validTour }, headers));
    expect(interrupted.status).toBe(500);
    expect(mockReceiptStore.current!.receipts).toHaveLength(1);
    expect(mockReceiptStore.current!.receipts[0].state).toBe('pending');

    mockReceiptStore.current!.expireClaims();
    tourFindOne.mockResolvedValue({ _id: 'tour-1', slug: validTour.slug });
    tourCreate.mockClear();

    const recovered = await postTour(request({ payload: validTour }, headers));
    expect(recovered.status).toBe(201);
    expect(tourCreate).not.toHaveBeenCalled();
    expect(mockReceiptStore.current!.receipts[0].state).toBe('completed');
  });

  it('scopes duplicate preflight lookup by tenant', async () => {
    const lean = jest.fn().mockResolvedValue({
      _id: 'tour-1',
      slug: validTour.slug,
      title: validTour.title,
      tenantId: 'makadi-bay',
      isPublished: false,
    });
    tourFindOne.mockReturnValue({ lean });

    const response = await getTour(lookupRequest('makadi-bay'), {
      params: Promise.resolve({ slug: validTour.slug }),
    });

    expect(response.status).toBe(200);
    expect(tourFindOne).toHaveBeenCalledWith({
      slug: validTour.slug,
      tenantId: 'makadi-bay',
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({ tenantId: 'makadi-bay' }),
    );
  });
});

describe('Content Engine category receiver', () => {
  it('rejects a non-allowlisted tenant before category lookup or write', async () => {
    denyNextTenant();

    const response = await postCategory(
      request({ tenantId: 'wrong-tenant', payload: validCategory }),
    );

    expect(response.status).toBe(422);
    expect(categoryFindOne).not.toHaveBeenCalled();
    expect(categoryCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-allowlisted tenant before category preflight lookup', async () => {
    denyNextTenant();

    const response = await getCategory(lookupRequest('wrong-tenant'), {
      params: Promise.resolve({ slug: validCategory.slug }),
    });

    expect(response.status).toBe(422);
    expect(categoryFindOne).not.toHaveBeenCalled();
  });

  it('dedupes and creates inside one tenant namespace', async () => {
    categoryFindOne.mockResolvedValue(null);
    categoryCreate.mockResolvedValue({ _id: 'category-1', slug: validCategory.slug });

    const response = await postCategory(
      request({ tenantId: 'makadi-bay', payload: validCategory }),
    );

    expect(response.status).toBe(201);
    expect(categoryFindOne).toHaveBeenCalledWith({
      $and: [
        { $or: [{ slug: validCategory.slug }, { name: validCategory.name }] },
        { tenantId: 'makadi-bay' },
      ],
    });
    expect(categoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'makadi-bay' }),
    );
  });

  it('returns the canonical localized category URL', async () => {
    categoryFindOne.mockResolvedValue(null);
    categoryCreate.mockResolvedValue({ _id: 'category-1', slug: validCategory.slug });

    const response = await postCategory(
      request({ defaultLocale: 'de', payload: validCategory }),
    );

    expect(await response.json()).toEqual(
      expect.objectContaining({
        liveUrl: `https://www.egypt-excursionsonline.com/de/categories/${validCategory.slug}`,
      }),
    );
  });

  it('replays one durable receipt instead of creating a second category', async () => {
    const headers = { 'Idempotency-Key': 'category-publish-2026-08-22' };
    categoryFindOne.mockResolvedValue(null);
    categoryCreate.mockResolvedValue({ _id: 'category-1', slug: validCategory.slug });

    const first = await postCategory(request({ payload: validCategory }, headers));
    const replay = await postCategory(request({ payload: validCategory }, headers));

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(await first.json());
    expect(categoryCreate).toHaveBeenCalledTimes(1);
  });

  it('updates only the requested tenant category', async () => {
    const existing = {
      _id: 'category-1',
      slug: validCategory.slug,
      name: validCategory.name,
      description: validCategory.description,
      save: jest.fn().mockResolvedValue(undefined),
    };
    categoryFindOne.mockResolvedValue(existing);

    const response = await putCategory(
      request({ tenantId: 'makadi-bay', payload: validCategory }),
    );

    expect(response.status).toBe(200);
    expect(categoryFindOne).toHaveBeenCalledWith({
      slug: validCategory.slug,
      tenantId: 'makadi-bay',
    });
    expect(existing.save).toHaveBeenCalledTimes(1);
  });

  it('scopes duplicate preflight lookup by tenant', async () => {
    const lean = jest.fn().mockResolvedValue({
      _id: 'category-1',
      slug: validCategory.slug,
      name: validCategory.name,
      tenantId: 'makadi-bay',
      isPublished: true,
    });
    categoryFindOne.mockReturnValue({ lean });

    const response = await getCategory(lookupRequest('makadi-bay'), {
      params: Promise.resolve({ slug: validCategory.slug }),
    });

    expect(response.status).toBe(200);
    expect(categoryFindOne).toHaveBeenCalledWith({
      slug: validCategory.slug,
      tenantId: 'makadi-bay',
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({ tenantId: 'makadi-bay' }),
    );
  });
});

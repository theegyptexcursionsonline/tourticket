/**
 * Flagship Content Engine destination receiver contract.
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

const destinationFindOne = jest.fn();
const destinationCreate = jest.fn();
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => destinationFindOne(...args),
    create: (...args: unknown[]) => destinationCreate(...args),
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

import { POST } from '@/app/api/admin/content/destination/route';
import { GET } from '@/app/api/admin/content/destination/[slug]/route';
import { verifyContentEngineTenant } from '@/lib/auth/verifyContentEngine';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { createReceiptStore, type ReceiptStore } from '@/__mocks__/contentPublishReceiptStore';

const tenantVerifier = verifyContentEngineTenant as jest.MockedFunction<
  typeof verifyContentEngineTenant
>;
const HEADERS = { 'Idempotency-Key': '9f7d2c8a-1234-4c5d-8e9f-000000000002' };
const validPayload = {
  name: 'Makadi Bay',
  slug: 'makadi-bay',
  country: 'Egypt',
  region: 'Red Sea Coast',
  description: 'Makadi Bay is a resort destination on the Red Sea coast south of Hurghada.',
  longDescription: 'Makadi Bay is a purpose-built Red Sea destination with sheltered beaches and straightforward access to reef excursions. Its hotel zone gives travelers a calm base for boat trips, snorkeling and desert activities. The area is spread out, so planning airport transfers and local transport in advance makes a visit much easier.',
  highlights: ['Sheltered Red Sea beaches', 'Nearby coral reef trips', 'Desert activity access', 'Calm resort setting'],
  bestTimeToVisit: 'October through April offers mild daytime conditions.',
  gettingThere: 'Arrive through Hurghada International Airport and continue south by road.',
  gettingAround: 'Hotel shuttles and pre-booked transfers are the most practical local options.',
  tags: ['makadi-bay', 'red-sea', 'beach-resort'],
  metaTitle: 'Makadi Bay Travel Guide',
  metaDescription: 'Plan a Makadi Bay visit with practical guidance on seasons, transport, beaches and nearby Red Sea activities.',
  featuredImage: 'https://res.cloudinary.com/dm3sxllch/image/upload/makadi-bay.jpg',
  published: true,
  featured: false,
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
  destinationFindOne.mockReset();
  destinationCreate.mockReset();
  receiverIndexesReady.mockReset().mockResolvedValue(true);
  tenantVerifier.mockReset().mockImplementation(tenantResult);
  mockReceiptStore.current = createReceiptStore();
});

describe('POST /api/admin/content/destination', () => {
  it('rejects non-object bodies and non-string required fields', async () => {
    const nullBody = await POST({
      json: async () => null,
      headers: { get: () => null },
    } as never);
    const numericName = await POST(
      request({ payload: { ...validPayload, name: 42 } }),
    );

    expect(nullBody.status).toBe(400);
    expect(numericName.status).toBe(400);
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(destinationCreate).not.toHaveBeenCalled();
  });

  it('rejects missing/non-flagship tenants and non-boolean publication state', async () => {
    const missingTenant = await POST(request({ payload: validPayload }, HEADERS, false));
    const foreignTenant = await POST(
      request({ tenantId: 'el-gouna', payload: validPayload }),
    );
    const malformedState = await POST(
      request({ payload: { ...validPayload, published: 'true' } }),
    );

    expect(missingTenant.status).toBe(422);
    expect(foreignTenant.status).toBe(422);
    expect(malformedState.status).toBe(400);
    expect(destinationCreate).not.toHaveBeenCalled();
  });

  it('requires a UUID and exact live indexes before claiming a publish', async () => {
    const noKey = await POST(request({ payload: validPayload }, {}));
    receiverIndexesReady.mockResolvedValue(false);
    const noIndexes = await POST(request({ payload: validPayload }));

    expect(noKey.status).toBe(400);
    expect(noIndexes.status).toBe(503);
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
    expect(destinationCreate).not.toHaveBeenCalled();
  });

  it('returns a retryable failure when the database connection is unavailable', async () => {
    mockDbConnect.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await POST(request({ payload: validPayload }));

    expect(response.status).toBe(503);
    expect(receiverIndexesReady).not.toHaveBeenCalled();
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
    expect(destinationCreate).not.toHaveBeenCalled();
  });

  it('dedupes slug and name in the default namespace and stores provenance', async () => {
    destinationFindOne.mockResolvedValue(null);
    destinationCreate.mockResolvedValue({ _id: 'destination-1', slug: validPayload.slug });

    const response = await POST(request({ payload: validPayload }));

    expect(response.status).toBe(201);
    expect(destinationFindOne).toHaveBeenNthCalledWith(1, {
      slug: validPayload.slug,
      ...DEFAULT_TENANT_FILTER,
    });
    expect(destinationFindOne).toHaveBeenNthCalledWith(2, {
      name: validPayload.name,
      ...DEFAULT_TENANT_FILTER,
    });
    expect(destinationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        isPublished: true,
        region: validPayload.region,
        gettingThere: validPayload.gettingThere,
        gettingAround: validPayload.gettingAround,
        image: validPayload.featuredImage,
        tenantId: 'default',
        contentEnginePublishReceiptId: expect.any(String),
      }),
    );
    expect(destinationCreate.mock.calls[0]?.[0]).not.toHaveProperty('featuredImage');
  });

  it('returns 409 for an existing slug or name and releases the claim', async () => {
    destinationFindOne.mockResolvedValueOnce({
      _id: 'existing',
      slug: validPayload.slug,
    });
    const slugConflict = await POST(request({ payload: validPayload }));
    expect(slugConflict.status).toBe(409);
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);

    destinationFindOne
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 'existing-name', name: validPayload.name });
    const nameConflict = await POST(request({ payload: validPayload }));
    expect(nameConflict.status).toBe(409);
    expect(mockReceiptStore.current!.receipts).toHaveLength(0);
  });

  it('replays one write and recovers only exact receipt provenance', async () => {
    destinationFindOne.mockResolvedValue(null);
    let committed: Record<string, unknown> | undefined;
    destinationCreate.mockImplementation(async (doc: Record<string, unknown>) => {
      committed = doc;
      return { _id: 'destination-1', slug: validPayload.slug };
    });

    const first = await POST(request({ payload: validPayload }));
    const replay = await POST(request({ payload: validPayload }));
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(destinationCreate).toHaveBeenCalledTimes(1);

    mockReceiptStore.current = createReceiptStore();
    mockReceiptStore.current!.loseNextCompletion();
    destinationFindOne.mockReset().mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    destinationCreate.mockClear();
    const interrupted = await POST(request({ payload: validPayload }));
    expect(interrupted.status).toBe(503);
    mockReceiptStore.current!.expireClaims();

    const existing = {
      _id: 'destination-2',
      slug: validPayload.slug,
      contentEnginePublishReceiptId: committed?.contentEnginePublishReceiptId,
    };
    destinationFindOne
      .mockReset()
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    destinationCreate.mockClear();

    const recovered = await POST(request({ payload: validPayload }));
    expect(recovered.status).toBe(201);
    expect(destinationFindOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ contentEnginePublishReceiptId: expect.any(String) }),
    );
    expect(destinationCreate).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/content/destination/[slug]', () => {
  it('rejects a missing tenant before connecting', async () => {
    const response = await GET(lookupRequest(), {
      params: Promise.resolve({ slug: validPayload.slug }),
    });
    expect(response.status).toBe(422);
    expect(mockDbConnect).not.toHaveBeenCalled();
  });

  it('reads only the exact default namespace', async () => {
    destinationFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'destination-1',
        slug: validPayload.slug,
        name: validPayload.name,
        isPublished: true,
      }),
    });

    const response = await GET(lookupRequest('default'), {
      params: Promise.resolve({ slug: validPayload.slug }),
    });

    expect(response.status).toBe(200);
    expect(destinationFindOne).toHaveBeenCalledWith({
      slug: validPayload.slug,
      ...DEFAULT_TENANT_FILTER,
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({ tenantId: null, isPublished: true }),
    );
  });

  it('returns a retryable response when the lookup database is unavailable', async () => {
    mockDbConnect.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await GET(lookupRequest('default'), {
      params: Promise.resolve({ slug: validPayload.slug }),
    });

    expect(response.status).toBe(503);
    expect(destinationFindOne).not.toHaveBeenCalled();
  });
});

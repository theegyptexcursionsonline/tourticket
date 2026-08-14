const attractionAggregate = jest.fn();
const categoryAggregate = jest.fn();
const attractionCount = jest.fn();
const categoryCount = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: class MockNextResponse {
    status: number;
    body: unknown;
    constructor(body: unknown, status = 200) { this.body = body; this.status = status; }
    static json(body: unknown, init: { status?: number } = {}) { return new MockNextResponse(body, init.status || 200); }
    json() { return Promise.resolve(this.body); }
  },
}));

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: class ObjectIdMock {
      static isValid() { return true; }
      toString() { return '507f1f77bcf86cd799439011'; }
      getTimestamp() { return new Date('2026-08-14T00:00:00Z'); }
    },
  },
}));

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: jest.fn().mockResolvedValue({ id: 'admin' }) }));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: { aggregate: (...args: unknown[]) => attractionAggregate(...args), countDocuments: (...args: unknown[]) => attractionCount(...args) },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: { aggregate: (...args: unknown[]) => categoryAggregate(...args), countDocuments: (...args: unknown[]) => categoryCount(...args) },
}));

import { GET } from '@/app/api/admin/pages/route';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

describe('GET /api/admin/pages counters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    attractionAggregate.mockResolvedValue([]);
    categoryAggregate.mockResolvedValue([]);
    attractionCount.mockResolvedValueOnce(4).mockResolvedValueOnce(3);
    categoryCount.mockResolvedValue(5);
  });

  it('counts active pages only and excludes archived taxonomy', async () => {
    const response = await GET({ url: 'http://localhost/api/admin/pages' } as never);
    const payload = await response.json();

    expect(payload.counts).toEqual({ attraction: 4, 'category-landing': 3, category: 5, total: 12 });
    expect(attractionCount).toHaveBeenNthCalledWith(1, { $and: [DEFAULT_TENANT_FILTER, { pageType: 'attraction', archivedAt: null }] });
    expect(attractionCount).toHaveBeenNthCalledWith(2, { $and: [DEFAULT_TENANT_FILTER, { pageType: 'category', archivedAt: null }] });
    expect(categoryCount).toHaveBeenCalledWith({ $and: [DEFAULT_TENANT_FILTER, { archivedAt: null }] });
  });

  it('applies an escaped author/editor filter inside both tenant-scoped database streams', async () => {
    await GET({ url: 'http://localhost/api/admin/pages?editor=Sara%20Ops' } as never);

    for (const aggregate of [attractionAggregate, categoryAggregate]) {
      const pipeline = aggregate.mock.calls[0][0] as Array<{ $match?: { $and?: Array<Record<string, unknown>> } }>;
      const editorCondition = pipeline[0].$match?.$and?.[1] as { $or?: Array<Record<string, RegExp>> };
      expect(editorCondition.$or).toHaveLength(4);
      expect(editorCondition.$or?.[0]['createdBy.name']).toEqual(/Sara Ops/i);
      expect(editorCondition.$or?.[3]['updatedBy.email']).toEqual(/Sara Ops/i);
    }
  });
});

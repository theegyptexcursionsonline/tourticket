export {};

const mockVerifyAdmin = jest.fn();
const mockReviewFind = jest.fn();
const mockReviewCountDocuments = jest.fn();
const mockReviewAggregate = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;

    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status || 200;
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }

    async json() {
      return this.data;
    }
  }

  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: mockVerifyAdmin }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Review', () => ({
  __esModule: true,
  default: {
    find: mockReviewFind,
    countDocuments: mockReviewCountDocuments,
    aggregate: mockReviewAggregate,
  },
}));

type ReviewFixture = {
  _id: string;
  tenantId?: string | null;
  verified?: boolean;
  rating: number;
  createdAt: string;
};

const fixtures: ReviewFixture[] = [
  { _id: 'default-approved', tenantId: 'default', verified: true, rating: 5, createdAt: '2026-07-05' },
  { _id: 'legacy-missing', verified: false, rating: 3, createdAt: '2026-07-04' },
  { _id: 'legacy-null', tenantId: null, verified: true, rating: 4, createdAt: '2026-07-03' },
  { _id: 'legacy-empty', tenantId: '', verified: false, rating: 2, createdAt: '2026-07-02' },
  { _id: 'network-leak', tenantId: 'makadi-bay', verified: true, rating: 1, createdAt: '2026-07-01' },
];

function isMainReview(review: ReviewFixture) {
  return review.tenantId === 'default' || review.tenantId == null || review.tenantId === '';
}

function matchesFilter(review: ReviewFixture, filter: Record<string, unknown>) {
  if (!isMainReview(review)) return false;
  const verified = filter.verified as boolean | { $ne?: boolean } | undefined;
  if (verified === true) return review.verified === true;
  if (verified && typeof verified === 'object' && verified.$ne === true) {
    return review.verified !== true;
  }
  return true;
}

function installReviewModelMocks() {
  mockReviewFind.mockImplementation((filter: Record<string, unknown>) => {
    const rows = fixtures.filter((review) => matchesFilter(review, filter));
    let skip = 0;
    let limit = rows.length;
    const chain = {
      populate: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      lean: jest.fn(),
    };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockReturnValue(chain);
    chain.skip.mockImplementation((value: number) => {
      skip = value;
      return chain;
    });
    chain.limit.mockImplementation((value: number) => {
      limit = value;
      return chain;
    });
    chain.lean.mockImplementation(async () => rows.slice(skip, skip + limit));
    return chain;
  });

  mockReviewCountDocuments.mockImplementation(async (filter: Record<string, unknown>) =>
    fixtures.filter((review) => matchesFilter(review, filter)).length,
  );

  mockReviewAggregate.mockImplementation(async () => {
    const rows = fixtures.filter(isMainReview);
    const approved = rows.filter((review) => review.verified === true).length;
    return [{
      _id: null,
      total: rows.length,
      pending: rows.length - approved,
      approved,
      avgRating: rows.reduce((sum, review) => sum + review.rating, 0) / rows.length,
    }];
  });
}

function request(query = '') {
  return { url: `https://dashboard2.egypt-excursionsonline.com/api/admin/reviews${query}` } as never;
}

describe('GET /api/admin/reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ id: 'main-admin' });
    installReviewModelMocks();
  });

  it('excludes network reviews and returns aggregate stats for only main EEO', async () => {
    const { GET } = await import('@/app/api/admin/reviews/route');
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.map((review: ReviewFixture) => review._id)).not.toContain('network-leak');
    expect(body.stats).toEqual({ total: 4, pending: 2, approved: 2, avgRating: 3.5 });
    expect(mockReviewFind).toHaveBeenCalledWith(expect.objectContaining({
      $or: expect.arrayContaining([
        { tenantId: 'default' },
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' },
      ]),
    }));
  });

  it('paginates the selected status while keeping stats main-scoped', async () => {
    const { GET } = await import('@/app/api/admin/reviews/route');
    const response = await GET(request('?status=approved&page=1&limit=1'));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].verified).toBe(true);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
      hasPreviousPage: false,
      hasNextPage: true,
    });
    expect(body.stats.total).toBe(4);
  });

  it('bounds invalid page and oversized limit values', async () => {
    const { GET } = await import('@/app/api/admin/reviews/route');
    const response = await GET(request('?page=-8&limit=999'));
    const body = await response.json();

    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(100);
    expect(body.data).toHaveLength(4);
  });

  it('rejects unsupported status filters', async () => {
    const { GET } = await import('@/app/api/admin/reviews/route');
    const response = await GET(request('?status=deleted'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockReviewFind).not.toHaveBeenCalled();
  });
});

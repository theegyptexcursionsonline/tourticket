export {};

const mockRequireAdminAuth = jest.fn();
const mockTourCountDocuments = jest.fn();
const mockBookingCountDocuments = jest.fn();
const mockBookingDistinct = jest.fn();
const mockBookingAggregate = jest.fn();
const mockBookingFind = jest.fn();
const mockGetMonthlyRevenueSeries = jest.fn();

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
jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    Types: {
      ObjectId: {
        createFromTime: jest.fn(() => 'cutoff-object-id'),
      },
    },
  },
}));
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: mockRequireAdminAuth }));
jest.mock('@/lib/admin/monthlyRevenue', () => ({
  getMonthlyRevenueSeries: mockGetMonthlyRevenueSeries,
}));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { countDocuments: mockTourCountDocuments },
}));
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    countDocuments: mockBookingCountDocuments,
    distinct: mockBookingDistinct,
    aggregate: mockBookingAggregate,
    find: mockBookingFind,
  },
}));

describe('GET /api/admin/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ id: 'main-admin' });
    mockTourCountDocuments.mockResolvedValue(12);
    mockBookingCountDocuments.mockResolvedValue(20);
    mockBookingDistinct.mockResolvedValue(['user-1', 'user-2']);
    mockBookingAggregate.mockResolvedValue([{ _id: null, totalRevenue: 900 }]);
    mockGetMonthlyRevenueSeries.mockResolvedValue([
      { name: 'Jun 2026', revenue: 400 },
      { name: 'Jul 2026', revenue: 500 },
    ]);

    const recentQuery = {
      sort: jest.fn(),
      limit: jest.fn(),
      populate: jest.fn(),
      lean: jest.fn(),
    };
    recentQuery.sort.mockReturnValue(recentQuery);
    recentQuery.limit.mockReturnValue(recentQuery);
    recentQuery.populate.mockReturnValue(recentQuery);
    recentQuery.lean.mockResolvedValue([]);
    mockBookingFind.mockReturnValue(recentQuery);
  });

  it('returns chart data in the primary response so first paint needs one request', async () => {
    const { GET } = await import('@/app/api/admin/dashboard/route');
    const request = { url: 'https://dashboard2.egypt-excursionsonline.com/api/admin/dashboard' } as never;
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRequireAdminAuth).toHaveBeenCalledWith(request, {
      permissions: ['manageDashboard'],
      requireAll: false,
    });
    expect(mockGetMonthlyRevenueSeries).toHaveBeenCalledTimes(1);
    expect(body.success).toBe(true);
    expect(body.data.monthlyRevenue).toEqual([
      { name: 'Jun 2026', revenue: 400 },
      { name: 'Jul 2026', revenue: 500 },
    ]);
  });
});

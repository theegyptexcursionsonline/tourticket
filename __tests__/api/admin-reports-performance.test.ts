export {};

const mockVerifyAdmin = jest.fn();
const mockBookingAggregate = jest.fn();
const mockBookingCountDocuments = jest.fn();
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
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: mockVerifyAdmin }));
jest.mock('@/lib/admin/monthlyRevenue', () => ({
  getMonthlyRevenueSeries: mockGetMonthlyRevenueSeries,
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { collection: { name: 'tours' } },
}));
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    aggregate: mockBookingAggregate,
    countDocuments: mockBookingCountDocuments,
  },
}));

describe('GET /api/admin/reports query plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ id: 'main-admin' });
    mockGetMonthlyRevenueSeries.mockResolvedValue([{ name: 'Jul 2026', revenue: 500 }]);
    mockBookingAggregate
      .mockResolvedValueOnce([{ tourId: 'tour-1', title: 'Tour', totalBookings: 3, totalRevenue: 300 }])
      .mockResolvedValueOnce([{ _id: null, total: 500 }]);
    mockBookingCountDocuments.mockResolvedValue(5);
  });

  it('uses the grouped monthly query and starts only the two remaining aggregates', async () => {
    const { GET } = await import('@/app/api/admin/reports/route');
    const request = { url: 'https://dashboard2.egypt-excursionsonline.com/api/admin/reports' } as never;
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetMonthlyRevenueSeries).toHaveBeenCalledTimes(1);
    expect(mockBookingAggregate).toHaveBeenCalledTimes(2);
    expect(mockBookingCountDocuments).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      success: true,
      kpis: { totalRevenue: 500, totalBookings: 5, averageBookingValue: 100 },
      monthlyRevenue: [{ name: 'Jul 2026', revenue: 500 }],
      topTours: [{ tourId: 'tour-1', title: 'Tour', totalBookings: 3, totalRevenue: 300 }],
    });
  });
});

export {};

const mockBookingAggregate = jest.fn();

jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    aggregate: mockBookingAggregate,
  },
}));

describe('getMonthlyRevenueSeries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads six months with one main-tenant aggregation and fills missing months', async () => {
    mockBookingAggregate.mockResolvedValue([
      { _id: { year: 2026, month: 2 }, total: 120 },
      { _id: { year: 2026, month: 4 }, total: 340 },
      { _id: { year: 2026, month: 7 }, total: 560 },
    ]);

    const { getMonthlyRevenueSeries } = await import('@/lib/admin/monthlyRevenue');
    const result = await getMonthlyRevenueSeries(new Date(2026, 6, 15));

    expect(mockBookingAggregate).toHaveBeenCalledTimes(1);
    expect(mockBookingAggregate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        $match: expect.objectContaining({
          status: { $in: ['Confirmed', 'Pending'] },
          $or: expect.arrayContaining([
            { tenantId: 'default' },
            { tenantId: { $exists: false } },
            { tenantId: null },
            { tenantId: '' },
          ]),
        }),
      }),
      expect.objectContaining({
        $group: expect.objectContaining({
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
        }),
      }),
    ]));
    expect(result).toEqual([
      { name: 'Feb 2026', revenue: 120 },
      { name: 'Mar 2026', revenue: 0 },
      { name: 'Apr 2026', revenue: 340 },
      { name: 'May 2026', revenue: 0 },
      { name: 'Jun 2026', revenue: 0 },
      { name: 'Jul 2026', revenue: 560 },
    ]);
  });
});

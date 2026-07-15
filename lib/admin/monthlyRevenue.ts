import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import Booking from '@/lib/models/Booking';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export interface MonthlyRevenuePoint {
  name: string;
  revenue: number;
}

interface MonthlyRevenueAggregateRow {
  _id: {
    year: number;
    month: number;
  };
  total: number;
}

/**
 * Fetch all six dashboard months in one aggregation. The previous implementation
 * issued one database round-trip per month, serially, which made a cold dashboard
 * visit wait on six scans before it could render.
 */
export async function getMonthlyRevenueSeries(today = new Date()): Promise<MonthlyRevenuePoint[]> {
  const targetMonths = Array.from({ length: 6 }, (_, index) => subMonths(today, 5 - index));
  const rangeStart = startOfMonth(targetMonths[0]);
  const rangeEnd = endOfMonth(targetMonths[targetMonths.length - 1]);

  const rows = await Booking.aggregate<MonthlyRevenueAggregateRow>([
    {
      $match: {
        createdAt: { $gte: rangeStart, $lte: rangeEnd },
        status: { $in: ['Confirmed', 'Pending'] },
        ...DEFAULT_TENANT_FILTER,
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        total: { $sum: '$totalPrice' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const totalsByMonth = new Map(
    rows.map((row) => [`${row._id.year}-${row._id.month}`, row.total || 0]),
  );

  return targetMonths.map((targetDate) => ({
    name: format(targetDate, 'MMM yyyy'),
    revenue: totalsByMonth.get(`${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`) ?? 0,
  }));
}

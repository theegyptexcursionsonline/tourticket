// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { getMonthlyRevenueSeries } from '@/lib/admin/monthlyRevenue';

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    // Run all independent report queries together. Monthly revenue itself is a
    // single grouped aggregation (rather than six serial database round-trips).
    const monthlyRevenuePromise = getMonthlyRevenueSeries();
    const topToursPromise = Booking.aggregate([
      {
        $match: {
          status: { $in: ['Confirmed', 'Pending'] },
          ...DEFAULT_TENANT_FILTER,
        }
      },
      {
        $group: {
          _id: '$tour',
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: Tour.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'tourDetails',
        },
      },
      {
        $unwind: {
          path: '$tourDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          tourId: '$_id',
          title: { $ifNull: ['$tourDetails.title', 'Unknown Tour'] },
          totalBookings: '$totalBookings',
          totalRevenue: '$totalRevenue',
        }
      }
    ]);

    // --- 3. Key Performance Indicators (KPIs) ---
    const totalRevenuePromise = Booking.aggregate([
      {
        $match: {
          status: { $in: ['Confirmed', 'Pending'] },
          ...DEFAULT_TENANT_FILTER,
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const totalBookingsPromise = Booking.countDocuments({
      status: { $in: ['Confirmed', 'Pending'] },
      ...DEFAULT_TENANT_FILTER,
    });

    const [monthlyRevenueData, topToursData, totalRevenueResult, totalBookings] = await Promise.all([
      monthlyRevenuePromise,
      topToursPromise,
      totalRevenuePromise,
      totalBookingsPromise,
    ]);

    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const kpis = {
      totalRevenue,
      totalBookings,
      averageBookingValue: Math.round(averageBookingValue * 100) / 100, // Round to 2 decimals
    };

    return NextResponse.json({
      success: true,
      kpis,
      monthlyRevenue: monthlyRevenueData,
      topTours: topToursData,
    });
  } catch (error) {
    console.error('Failed to generate report data:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate report data', 
        error: (error as Error).message 
      }, 
      { status: 500 }
    );
  }
}

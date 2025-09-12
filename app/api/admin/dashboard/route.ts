// app/api/admin/dashboard/route.ts
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { NextResponse } from 'next/server';

export async function GET() {
  await dbConnect();

  try {
    // --- Existing Calculations (No Changes) ---
    const totalBookings = await Booking.countDocuments();
    const revenueStats = await Booking.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const topTourStats = await Tour.find().sort({ bookings: -1 }).limit(1);
    const topTour = topTourStats[0] ? topTourStats[0].title : 'N/A';
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentBookingsCount = await Booking.countDocuments({
      createdAt: { $gte: twentyFourHoursAgo },
    });
    const recentActivities = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('tour', 'title');

    // --- NEW: Calculate Sales Trend Data for the Chart (Last 12 months) ---
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const salesTrendData = await Booking.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          totalRevenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          revenue: '$totalRevenue',
        },
      },
    ]);

    // Format the data to be chart-friendly (e.g., "Sep '25")
    const formattedSalesData = salesTrendData.map(item => ({
      month: new Date(item.year, item.month - 1).toLocaleString('default', { month: 'short' }) + ` '${String(item.year).slice(2)}`,
      revenue: item.revenue
    }));

    // --- Return all data in the response ---
    return NextResponse.json({
      success: true,
      data: {
        totalBookings,
        totalRevenue,
        topTour,
        recentBookingsCount,
        recentActivities: recentActivities.map(act => ({
          id: act._id,
          text: `New booking for "${act.tour?.title || 'a deleted tour'}"`
        })),
        salesTrendData: formattedSalesData, // Add the new chart data here
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
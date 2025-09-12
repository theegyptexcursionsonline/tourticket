// app/api/admin/reports/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export async function GET() {
  await dbConnect();

  try {
    // --- 1. Monthly Revenue for the Last 6 Months ---
    const monthlyRevenueData = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const targetDate = subMonths(today, i);
      const monthStart = startOfMonth(targetDate);
      const monthEnd = endOfMonth(targetDate);

      const result = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart, $lte: monthEnd },
            // Optional: Add a status filter if you only want to count 'Confirmed' bookings
            // status: 'Confirmed' 
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalPrice' },
          },
        },
      ]);
      
      monthlyRevenueData.push({
        name: format(targetDate, 'MMM'), // e.g., "Jan", "Feb"
        revenue: result.length > 0 ? result[0].total : 0,
      });
    }


    // --- 2. Top 5 Best-Selling Tours ---
    const topToursData = await Booking.aggregate([
      {
        $group: {
          _id: '$tour', // Group by tour ID
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
        $unwind: '$tourDetails',
      },
      {
        $project: {
            _id: 0,
            tourId: '$_id',
            title: '$tourDetails.title',
            totalBookings: '$totalBookings',
            totalRevenue: '$totalRevenue',
        }
      }
    ]);

    // --- 3. Key Performance Indicators (KPIs) ---
    const totalRevenueResult = await Booking.aggregate([
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
    const totalBookings = await Booking.countDocuments();
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const kpis = {
        totalRevenue,
        totalBookings,
        averageBookingValue,
    };

    return NextResponse.json({
      kpis,
      monthlyRevenue: monthlyRevenueData,
      topTours: topToursData,
    });

  } catch (error) {
    console.error('Failed to generate report data:', error);
    return NextResponse.json({ message: 'Failed to generate report data', error: (error as Error).message }, { status: 500 });
  }
}
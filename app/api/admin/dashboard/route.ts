// app/api/admin/dashboard/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';

export async function GET() {
  await dbConnect();

  try {
    // --- Main Stats ---
    const totalTours = await Tour.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalUsers = await User.countDocuments();

    // --- Revenue ---
    const revenueResult = await Booking.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // --- Recent Bookings (last 24 hours) ---
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
    const recentBookingsCount = await Booking.countDocuments({
      createdAt: { $gte: twentyFourHoursAgo },
    });
    
    // --- Recent Activities ---
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'tour', model: Tour, select: 'title' })
      .populate({ path: 'user', model: User, select: 'name' });

    const recentActivities = recentBookings.map(booking => ({
        id: booking._id.toString(),
        text: `New booking for "${booking.tour.title}" by ${booking.user.name}.`
    }));

    const responseData = {
      totalTours,
      totalBookings,
      totalUsers,
      totalRevenue,
      recentBookingsCount,
      recentActivities,
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
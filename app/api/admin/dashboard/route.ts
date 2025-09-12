// app/api/admin/dashboard/route.ts
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    // Basic auth check for demo purposes
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer secret-auth-token-for-admin-access`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  
    await dbConnect();

    try {
        const totalBookings = await Booking.countDocuments();

        const revenueStats = await Booking.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
        ]);
        const totalRevenue = revenueStats[0]?.totalRevenue || 0;

        // **NEW: Get total number of tours**
        const totalTours = await Tour.countDocuments();
        
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentBookingsCount = await Booking.countDocuments({
            createdAt: { $gte: twentyFourHoursAgo },
        });

        const recentActivities = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('tour', 'title');

        // Note: The 'topTour' and 'salesTrendData' logic was removed for brevity in this example
        // as they were part of a previous step. You can merge them back in if needed.

        return NextResponse.json({
            success: true,
            data: {
                totalBookings,
                totalRevenue,
                totalTours, // <-- Add new data to the response
                recentBookingsCount,
                recentActivities: recentActivities.map(act => ({
                    id: act._id.toString(),
                    text: `New booking for "${act.tour?.title || 'a deleted tour'}"`
                })),
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
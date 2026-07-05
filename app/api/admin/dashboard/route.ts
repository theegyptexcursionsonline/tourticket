// app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminAuth(request, {
      permissions: ['manageDashboard'],
      requireAll: false
    });
    
    // If auth failed, authResult is a NextResponse error
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Connect to database with timeout
    const dbConnection = await Promise.race([
      dbConnect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 10000))
    ]);

    // Fire the month-over-month trend queries concurrently with the main stats
    // batch (one DB round-trip instead of two). Docs are dated by their _id.
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const cutoffId = mongoose.Types.ObjectId.createFromTime(Math.floor(oneMonthAgo.getTime() / 1000));
    const revStatusFilter = { $nin: ['cancelled', 'Cancelled', 'refunded', 'Refunded', 'partial_refunded'] };
    const trendsPromise = Promise.all([
      Booking.countDocuments({ ...DEFAULT_TENANT_FILTER, _id: { $lt: cutoffId } }),
      Booking.aggregate([
        { $match: { ...DEFAULT_TENANT_FILTER, status: revStatusFilter, _id: { $lt: cutoffId } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
      ]),
      Tour.countDocuments({ isPublished: true, ...DEFAULT_TENANT_FILTER, _id: { $lt: cutoffId } }),
      User.countDocuments({ _id: { $lt: cutoffId } }),
    ]).catch(() => [0, [] as any[], 0, 0] as const);

    // Fetch all stats in parallel with error handling for each
    const [
      totalTours,
      totalBookings,
      totalUsers,
      revenueResult,
      recentBookingsCount,
      recentBookings
    ] = await Promise.allSettled([
      Tour.countDocuments({ isPublished: true, ...DEFAULT_TENANT_FILTER }),
      // Bookings/revenue are scoped to this (default/EEO) site, like tours —
      // never count the white-label brands' bookings here. Revenue is collected
      // money only (cancelled/refunded excluded). Users register on this
      // flagship site, so Total Users stays the full registered count.
      Booking.countDocuments(DEFAULT_TENANT_FILTER),
      User.countDocuments(),
      Booking.aggregate([
        { $match: { ...DEFAULT_TENANT_FILTER, status: { $nin: ['cancelled', 'Cancelled', 'refunded', 'Refunded', 'partial_refunded'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
      ]),
      (async () => {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
        return await Booking.countDocuments({
          createdAt: { $gte: twentyFourHoursAgo },
          ...DEFAULT_TENANT_FILTER,
        });
      })(),
      Booking.find(DEFAULT_TENANT_FILTER)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({ path: 'tour', model: Tour, select: 'title' })
        .populate({ path: 'user', model: User, select: 'firstName lastName email' })
        .lean()
    ]);

    // Extract values with fallbacks
    const stats = {
      totalTours: totalTours.status === 'fulfilled' ? totalTours.value : 0,
      totalBookings: totalBookings.status === 'fulfilled' ? totalBookings.value : 0,
      totalUsers: totalUsers.status === 'fulfilled' ? totalUsers.value : 0,
      totalRevenue: revenueResult.status === 'fulfilled' && revenueResult.value.length > 0 
        ? revenueResult.value[0].totalRevenue || 0 
        : 0,
      recentBookingsCount: recentBookingsCount.status === 'fulfilled' ? recentBookingsCount.value : 0,
    };

    // Process recent activities with error handling
    const recentActivities = recentBookings.status === 'fulfilled'
      ? recentBookings.value
          .filter((booking: any) => booking && booking.tour && booking.user) // Filter out null references
          .map((booking: any) => {
            try {
              const tourTitle = booking.tour?.title || 'Unknown Tour';
              const userName = booking.user 
                ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || booking.user.email || 'Unknown User'
                : 'Unknown User';
              
              return {
                id: booking._id.toString(),
                text: `New booking for "${tourTitle}" by ${userName}`,
              };
            } catch (err) {
              console.error('Error processing booking activity:', err);
              return {
                id: booking._id.toString(),
                text: 'New booking received',
              };
            }
          })
      : [];

    // Trend queries were fired concurrently above — resolve them now.
    const [prevBookings, prevRevenueAgg, prevTours, prevUsers] = await trendsPromise;
    const prevRevenue = Array.isArray(prevRevenueAgg) && prevRevenueAgg[0] ? (prevRevenueAgg[0].totalRevenue || 0) : 0;
    const trendOf = (cur: number, prev: number) => ({
      value: Math.round(prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0)),
      isPositive: cur >= prev,
    });
    const trends = {
      bookings: trendOf(stats.totalBookings, prevBookings as number),
      revenue: trendOf(stats.totalRevenue, prevRevenue),
      tours: trendOf(stats.totalTours, prevTours as number),
      users: trendOf(stats.totalUsers, prevUsers as number),
    };

    const responseData = {
      ...stats,
      trends,
      recentActivities,
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Dashboard API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
    
    // Return partial data instead of complete failure
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      data: {
        totalTours: 0,
        totalBookings: 0,
        totalUsers: 0,
        totalRevenue: 0,
        recentBookingsCount: 0,
        recentActivities: []
      }
    }, { status: 500 });
  }
}
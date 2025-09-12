// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import Booking from '@/lib/models/Booking';

// GET all users with their booking count
export async function GET() {
  await dbConnect();
  try {
    // Fetch all users
    const users = await User.find({}).select('name email createdAt').lean();

    // For each user, count their bookings.
    // This is done in a loop for simplicity; for very large user bases,
    // a more optimized aggregation pipeline would be better.
    const usersWithBookingCounts = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await Booking.countDocuments({ user: user._id });
        return {
          ...user,
          bookingCount,
        };
      })
    );

    return NextResponse.json(usersWithBookingCounts);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch users', error: (error as Error).message }, { status: 500 });
  }
}
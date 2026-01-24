// app/api/admin/manifests/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

export async function GET(request: Request) {
  // Verify admin authentication
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId');
    const date = searchParams.get('date');

    if (!tourId || !date) {
      return NextResponse.json({ message: 'Tour ID and date are required' }, { status: 400 });
    }

    // The date comes in as a string 'YYYY-MM-DD'. We need to find all bookings for that entire day.
    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setUTCHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      tour: tourId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .populate({
        path: 'user',
        model: User,
        select: 'name email', // Select the fields you need from the User model
    })
    .sort({ time: 1 }); // Sort by the booking time for an organized list

    // Also fetch the tour details to display on the manifest header
    const tour = await Tour.findById(tourId).select('title');

    if (!tour) {
        return NextResponse.json({ message: 'Tour not found' }, { status: 404 });
    }

    return NextResponse.json({
        tour,
        date: startDate.toISOString().split('T')[0], // Return the queried date
        bookings,
    });

  } catch (error) {
    console.error('Failed to generate manifest:', error);
    return NextResponse.json({ message: 'Failed to generate manifest', error: (error as Error).message }, { status: 500 });
  }
}
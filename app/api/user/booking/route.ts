// app/api/user/bookings/route.ts
import { getSession } from '@auth0/nextjs-auth0';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await dbConnect();

    // Find the internal user document using the Auth0 user ID (sub)
    // This assumes the Auth0 'sub' is stored in the 'providerId' field of your User model.
    const internalUser = await User.findOne({ email: user.email });

    if (!internalUser) {
      // This might happen if a user logs in via a social provider for the first time
      // and a local user record hasn't been created yet. A robust implementation
      // would find or create a user here. For now, we return not found.
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const bookings = await Booking.find({ user: internalUser._id })
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration', // Select only the fields needed for the dashboard
      })
      .sort({ date: 'desc' }); // Sort by the tour date

    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Failed to fetch user bookings:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: 'Failed to fetch bookings', details: errorMessage }, { status: 500 });
  }
}

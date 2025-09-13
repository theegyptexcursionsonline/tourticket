import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
// app/api/user/bookings/route.ts
import Booking from '@/lib/models/Booking'; // Corrected import
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';
import { verifyToken } from '@/lib/jwt'; // Using your JWT verification

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // 1. Get and validate the JWT from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedPayload = await verifyToken(token);

    if (!decodedPayload || !decodedPayload.sub) {
      return NextResponse.json({ error: 'Not authenticated: Invalid token' }, { status: 401 });
    }

    const userId = decodedPayload.sub as string;

    // 2. Find the user in your database
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Fetch bookings for that specific user
    const bookings = await Booking.find({ user: user._id })
      .populate({
        path: 'tour',
        model: Tour,
        populate: {
            path: 'destination',
            model: 'Destination'
        }
      })
      .sort({ date: 'desc' });

    return NextResponse.json({ success: true, data: bookings });

  } catch (error) {
    console.error('Failed to fetch user bookings:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: 'Failed to fetch bookings', details: errorMessage }, { status: 500 });
  }
}

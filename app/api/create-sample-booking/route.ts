import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get user from token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedPayload = await verifyToken(token);

    if (!decodedPayload || !decodedPayload.sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedPayload.sub as string;
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get first available tour
    const tour = await Tour.findOne({});
    if (!tour) {
      return NextResponse.json({ error: 'No tours available' }, { status: 404 });
    }

    // Create sample booking
    const sampleBooking = new Booking({
      tour: tour._id,
      user: user._id,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      time: '10:00',
      guests: 2,
      totalPrice: 75.00,
      status: 'Confirmed'
    });

    await sampleBooking.save();

    return NextResponse.json({
      success: true,
      message: 'Sample booking created',
      booking: sampleBooking
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
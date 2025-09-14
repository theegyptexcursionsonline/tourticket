// app/api/admin/bookings/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';

export async function GET() {
  await dbConnect();

  try {
    const bookings = await Booking.find({})
      .populate({ path: 'tour', model: Tour, select: 'title' })
      .populate({ path: 'user', model: User, select: 'name email' })
      .sort({ createdAt: -1 });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings' }, { status: 500 });
  }
}
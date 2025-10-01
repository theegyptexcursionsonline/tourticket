// app/api/admin/bookings/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Destination from '@/lib/models/Destination';

export async function GET() {
  await dbConnect();

  try {
    const bookings = await Booking.find({})
      .populate({ 
        path: 'tour', 
        model: Tour, 
        select: 'title image duration destination',
        populate: {
          path: 'destination',
          model: Destination,
          select: 'name slug',
        }
      })
      .populate({ 
        path: 'user', 
        model: User, 
        select: 'name email firstName lastName' 
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out bookings with null tours (deleted tours)
    const validBookings = bookings.filter(booking => booking.tour !== null);

    return NextResponse.json(validBookings);
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings' }, { status: 500 });
  }
}
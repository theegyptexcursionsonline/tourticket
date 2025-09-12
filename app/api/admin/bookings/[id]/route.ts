// app/api/admin/bookings/[id]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await dbConnect();

  try {
    const booking = await Booking.findById(id)
      .populate({ 
        path: 'tour', 
        model: Tour 
      })
      .populate({ 
        path: 'user', 
        model: User, 
        select: 'name email' 
      });

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Failed to fetch booking:', error);
    return NextResponse.json({ message: 'Failed to fetch booking details', error: (error as Error).message }, { status: 500 });
  }
}
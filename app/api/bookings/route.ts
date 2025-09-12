import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import { NextResponse } from 'next/server';

// GET all bookings for a user
export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
  }
  try {
    const bookings = await Booking.find({ userId: userId }).populate('tourId');
    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

// POST a new booking
export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const booking = await Booking.create(body);
    return NextResponse.json({ success: true, data: booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
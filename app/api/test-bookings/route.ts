import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Check all collections
    const userCount = await User.countDocuments();
    const tourCount = await Tour.countDocuments();
    const bookingCount = await Booking.countDocuments();
    
    // Get all bookings
    const allBookings = await Booking.find({}).populate('tour').populate('user');
    
    // Get all users
    const allUsers = await User.find({}).select('firstName lastName email');
    
    return NextResponse.json({
      counts: {
        users: userCount,
        tours: tourCount,
        bookings: bookingCount
      },
      bookings: allBookings,
      users: allUsers
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
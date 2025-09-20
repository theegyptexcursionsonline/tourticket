import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting bookings fetch...');
    
    // 1. Connect to database
    await dbConnect();
    console.log('✅ Database connected');

    // 2. Get and validate the JWT from the Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('📋 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid auth header');
      return NextResponse.json({ error: 'Not authenticated: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('🎫 Token extracted:', token.substring(0, 20) + '...');

    // 3. Verify token
    const decodedPayload = await verifyToken(token);
    console.log('🔐 Token decoded:', decodedPayload ? 'Success' : 'Failed');

    if (!decodedPayload || !decodedPayload.sub) {
      console.log('❌ Invalid token payload');
      return NextResponse.json({ error: 'Not authenticated: Invalid token' }, { status: 401 });
    }

    const userId = decodedPayload.sub as string;
    console.log('👤 User ID from token:', userId);

    // 4. Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('❌ Invalid MongoDB ObjectId format:', userId);
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    // 5. Find the user in database
    const user = await User.findById(userId);
    console.log('👤 User found:', user ? `${user.firstName} ${user.lastName}` : 'Not found');
    
    if (!user) {
      console.log('❌ User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 6. Check if Booking model is available
    console.log('📚 Booking model:', Booking.modelName);

    // 7. Fetch bookings count first
    const bookingCount = await Booking.countDocuments({ user: userId });
    console.log('📊 Total bookings for user:', bookingCount);

    // 8. Fetch bookings with detailed logging
    console.log('🔍 Fetching bookings...');
    const bookings = await Booking.find({ user: userId })
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating discountPrice',
        populate: {
          path: 'destination',
          model: 'Destination',
          select: 'name slug'
        }
      })
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    console.log('📦 Raw bookings fetched:', bookings.length);
    console.log('📋 First booking sample:', bookings[0] ? {
      id: bookings[0]._id,
      tourTitle: bookings[0].tour?.title || 'No tour',
      date: bookings[0].date,
      time: bookings[0].time,
      guests: bookings[0].guests
    } : 'No bookings');

    // 9. Transform bookings for frontend consistency
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      id: booking._id?.toString() || '',
      bookingDate: booking.date,
      bookingTime: booking.time,
      participants: booking.guests,
      tour: booking.tour ? {
        ...booking.tour,
        id: booking.tour._id?.toString() || '',
      } : null,
    }));

    // 10. Return the data
    return NextResponse.json({ 
      success: true, 
      data: transformedBookings,
      meta: {
        total: bookings.length,
        userId: userId,
        userEmail: user.email
      }
    });

  } catch (error) {
    console.error('💥 DETAILED ERROR in bookings fetch:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch bookings', 
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: process.env.NODE_ENV === 'development' ? {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      } : undefined
    }, { status: 500 });
  }
}
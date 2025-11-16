import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import Booking from '@/lib/models/Booking';
import Review from '@/lib/models/Review';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id: userId } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID'
      }, { status: 400 });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Delete all related data
    // 1. Delete user's bookings
    await Booking.deleteMany({ user: userId });

    // 2. Delete user's reviews
    await Review.deleteMany({ user: userId });

    // 3. Finally delete the user
    await User.findByIdAndDelete(userId);

    return NextResponse.json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete user'
    }, { status: 500 });
  }
}
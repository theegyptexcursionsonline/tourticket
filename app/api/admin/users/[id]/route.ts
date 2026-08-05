import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import Booking from '@/lib/models/Booking';
import mongoose from 'mongoose';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
    if (auth instanceof NextResponse) {
      return auth;
    }

    await dbConnect();

    const { id: userId } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID'
      }, { status: 400 });
    }

    if (userId === auth.userId) {
      return NextResponse.json({
        success: false,
        code: 'SELF_DEACTIVATION_BLOCKED',
        error: 'You cannot deactivate your own active admin session.'
      }, { status: 409 });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }
    if (!user.isActive) {
      return NextResponse.json({
        success: true,
        replayed: true,
        message: 'User is already inactive; booking and review records remain preserved.'
      });
    }
    if (user.role === 'super_admin' && await User.countDocuments({ role: 'super_admin', isActive: true }) <= 1) {
      return NextResponse.json({
        success: false,
        code: 'LAST_SUPER_ADMIN',
        error: 'The last active super administrator cannot be deactivated.'
      }, { status: 409 });
    }

    const bookingCount = await Booking.countDocuments({ user: userId });
    const deactivatedAt = new Date();
    await User.updateOne(
      { _id: userId, isActive: true },
      {
        $set: {
          isActive: false,
          deactivatedAt,
          deactivatedBy: auth.userId,
          cart: [],
          wishlist: [],
        },
        $unset: {
          password: 1,
          invitationToken: 1,
          invitationExpires: 1,
          adminLockUntil: 1,
        },
      },
    );

    return NextResponse.json({
      success: true,
      message: 'User deactivated. Financial bookings and review history were preserved.',
      data: { id: userId, isActive: false, deactivatedAt, preservedBookingCount: bookingCount },
    });

  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to deactivate user'
    }, { status: 500 });
  }
}

export const DELETE = withAdminAudit(DELETEHandler);

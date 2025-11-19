import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

/**
 * Cleanup endpoint to remove inactive demo/test team members
 * Keeps only the first 2 inactive users as examples
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  await dbConnect();

  try {
    // Find all inactive admin/team users (not customers)
    const inactiveUsers = await User.find({
      role: { $ne: 'customer' },
      isActive: false,
    })
      .sort({ createdAt: 1 })
      .lean();

    if (inactiveUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No inactive team members to clean up',
        deleted: 0,
      });
    }

    // Keep the first 2 as demo examples, delete the rest
    const usersToKeep = inactiveUsers.slice(0, 2);
    const usersToDelete = inactiveUsers.slice(2);

    if (usersToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Only ${usersToKeep.length} inactive members found, nothing to delete`,
        deleted: 0,
      });
    }

    // Delete the excess inactive users
    const idsToDelete = usersToDelete.map((u) => u._id);
    const result = await User.deleteMany({
      _id: { $in: idsToDelete },
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} inactive team members`,
      deleted: result.deletedCount,
      kept: usersToKeep.length,
      keptUsers: usersToKeep.map((u) => ({
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
      })),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup team members',
      },
      { status: 500 },
    );
  }
}


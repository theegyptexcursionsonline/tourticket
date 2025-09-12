import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { NextResponse } from 'next/server';

// PUT (update) a user's profile
export async function PUT(request: Request) {
  await dbConnect();
  try {
    const { userId, ...updateData } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
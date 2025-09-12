// app/api/admin/reviews/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';

// GET all reviews for the admin panel
export async function GET() {
  await dbConnect();
  try {
    const reviews = await Review.find({})
      .populate({
        path: 'user',
        model: User,
        select: 'name email', // Select fields from the User model
      })
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title', // Select fields from the Tour model
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch reviews', error: (error as Error).message }, { status: 500 });
  }
}
// app/api/tours/[tourId]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user'; // Assuming you have a User model
import { getToken } from 'next-auth/jwt';

// GET reviews for a tour
export async function GET(request: NextRequest, { params }: { params: { tourId: string } }) {
  await dbConnect();

  try {
    const reviews = await Review.find({ tour: params.tourId }).populate({
      path: 'user',
      model: User,
      select: 'name picture', // Select user fields you want to show
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json({ message: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST a new review for a tour
export async function POST(request: NextRequest, { params }: { params: { tourId: string } }) {
  await dbConnect();
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rating, comment } = await request.json();

    // --- Basic Validation ---
    if (!rating || !comment) {
      return NextResponse.json({ error: 'Rating and comment are required' }, { status: 400 });
    }

    const newReview = new Review({
      tour: params.tourId,
      user: token.sub, // 'sub' usually holds the user ID
      rating,
      comment,
    });

    await newReview.save();

    // --- Recalculate average rating for the tour ---
    const stats = await Review.aggregate([
      { $match: { tour: newReview.tour } },
      { $group: { _id: '$tour', avgRating: { $avg: '$rating' } } }
    ]);

    if (stats.length > 0) {
      await Tour.findByIdAndUpdate(params.tourId, {
        rating: stats[0].avgRating.toFixed(1),
      });
    }


    const populatedReview = await Review.findById(newReview._id).populate({
      path: 'user',
      model: User,
      select: 'name picture',
    });


    return NextResponse.json(populatedReview, { status: 201 });
  } catch (error: any) {
    console.error('Review submission error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
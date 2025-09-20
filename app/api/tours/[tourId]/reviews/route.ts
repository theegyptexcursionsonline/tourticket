// app/api/tours/[tourId]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { jwtVerify, JWTPayload } from 'jose';
import mongoose from 'mongoose';

const getTokenFromRequest = (request: NextRequest): string | null => {
  const auth = request.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.split(' ')[1];
  }
  try {
    const cookieCandidates = [
      'token', 'jwt', 'next-auth.session-token',
      '__Secure-next-auth.session-token', 'session', 'sessionToken',
    ];
    for (const name of cookieCandidates) {
      // @ts-ignore
      const c1 = typeof request.cookies?.get === 'function' ? request.cookies.get(name) : undefined;
      if (c1 && typeof c1.value === 'string') return c1.value;
      // @ts-ignore
      const c2 = request.cookies?.[name];
      if (c2 && typeof c2 === 'string') return c2;
    }
  } catch (err) {
    // Ignore cookie parsing differences
  }
  return null;
};

const verifyJwt = async (token: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured in environment');
  }
  const key = new TextEncoder().encode(secret);
  const verified = await jwtVerify(token, key);
  return verified.payload as JWTPayload;
};

// GET reviews for a tour
export async function GET(request: NextRequest, { params }: { params: { tourId: string } }) {
  await dbConnect();
  try {
    // Use the correct field name 'tour' instead of 'tourId'
    const reviews = await Review.find({ tour: params.tourId, isApproved: true })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName name picture',
      })
      .sort({ createdAt: -1 });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json({ message: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST a new review for a tour
export async function POST(request: NextRequest, { params }: { params: { tourId: string } }) {
  await dbConnect();

  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized: no token provided' }, { status: 401 });
  }

  let payload: JWTPayload;
  try {
    payload = await verifyJwt(token);
  } catch (err: any) {
    console.error('JWT verification failed:', err?.message || err);
    return NextResponse.json({ message: 'Unauthorized: invalid token' }, { status: 401 });
  }

  const userId = String(payload.sub || '');
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized: token missing user id' }, { status: 401 });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const { tourId } = params;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return NextResponse.json({ error: 'Invalid Tour ID' }, { status: 400 });
    }

    const body = await request.json();
    const { rating, comment, title } = body;

    if (!rating || !comment) {
      return NextResponse.json({ error: 'Rating and comment are required' }, { status: 400 });
    }

    // Check if user has already reviewed this tour - using correct field names
    const existingReview = await Review.findOne({ tour: tourId, user: userId });
    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this tour' }, { status: 400 });
    }

    // Create review with correct field names matching the model
    const newReview = new Review({
      tour: new mongoose.Types.ObjectId(tourId),
      user: new mongoose.Types.ObjectId(userId),
      rating,
      comment,
      isApproved: false, // Reviews need approval
    });

    await newReview.save();

    // Update tour's average rating
    const stats = await Review.aggregate([
      { $match: { tour: new mongoose.Types.ObjectId(tourId) } },
      { $group: { _id: '$tour', avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
    ]);

    if (stats.length > 0) {
      await Tour.findByIdAndUpdate(tourId, {
        rating: Number(stats[0].avgRating.toFixed(1)),
      });
    }

    // Populate the review before returning
    const populatedReview = await Review.findById(newReview._id).populate({
      path: 'user',
      model: User,
      select: 'firstName lastName name picture',
    });

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully!',
      data: populatedReview
    }, { status: 201 });
  } catch (error: any) {
    console.error('Review submission error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred.',
      details: error.message 
    }, { status: 500 });
  }
}
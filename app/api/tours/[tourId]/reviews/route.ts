// app/api/tours/[tourId]/reviews/route.ts
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

interface Params {
  tourId: string;
}

// POST - Create a new review
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<Params> }
) {
  await dbConnect();
  
  try {
    // Await params in NextJS 15
    const { tourId } = await params;
    
    // Validate tourId
    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return NextResponse.json({ error: 'Invalid Tour ID' }, { status: 400 });
    }

    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const userId = payload.sub as string;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
    }

    // Check if tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { rating, comment, title } = body;

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Valid rating (1-5) is required' }, { status: 400 });
    }

    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'Review comment is required' }, { status: 400 });
    }

    if (comment.trim().length < 10) {
      return NextResponse.json({ error: 'Review comment must be at least 10 characters' }, { status: 400 });
    }

    // Check if user already reviewed this tour
    const existingReview = await Review.findOne({ 
      tour: new mongoose.Types.ObjectId(tourId), 
      user: new mongoose.Types.ObjectId(userId) 
    });

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this tour' }, { status: 409 });
    }

    // Create the review
    const review = await Review.create({
      tour: new mongoose.Types.ObjectId(tourId),
      user: new mongoose.Types.ObjectId(userId),
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      rating: Number(rating),
      title: title?.trim() || 'Great experience!',
      comment: comment.trim(),
      verified: false,
      helpful: 0
    });

    // Populate user data for response
    const populatedReview = await Review.findById(review._id)
      .populate({
        path: 'user',
        model: 'User',
        select: 'firstName lastName email'
      });

    // Update tour's average rating (optional - you might want to do this in background)
    try {
      const reviewStats = await Review.aggregate([
        { $match: { tour: new mongoose.Types.ObjectId(tourId) } },
        { $group: { 
          _id: null, 
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }}
      ]);

      if (reviewStats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
          rating: Math.round(reviewStats[0].avgRating * 10) / 10
        });
      }
    } catch (updateError) {
      console.error('Error updating tour rating:', updateError);
      // Don't fail the review creation if rating update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully!',
      data: {
        _id: populatedReview._id,
        rating: populatedReview.rating,
        title: populatedReview.title,
        comment: populatedReview.comment,
        createdAt: populatedReview.createdAt,
        user: {
          _id: populatedReview.user._id,
          name: populatedReview.userName,
          email: populatedReview.userEmail
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Review submission error:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return NextResponse.json({ 
        error: 'You have already reviewed this tour' 
      }, { status: 409 });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ 
        error: `Validation failed: ${messages.join(', ')}` 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to submit review. Please try again.' 
    }, { status: 500 });
  }
}

// GET - Get reviews for a specific tour
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  await dbConnect();
  
  try {
    const { tourId } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return NextResponse.json({ error: 'Invalid Tour ID' }, { status: 400 });
    }

    const reviews = await Review.find({ tour: tourId })
      .populate({
        path: 'user',
        model: 'User',
        select: 'firstName lastName email'
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform the data for frontend consumption
    const transformedReviews = reviews.map(review => ({
      _id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      user: {
        _id: review.user._id,
        name: review.userName,
        email: review.userEmail
      }
    }));

    return NextResponse.json({
      success: true,
      data: transformedReviews
    });

  } catch (error: any) {
    console.error('Get reviews error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch reviews' 
    }, { status: 500 });
  }
}
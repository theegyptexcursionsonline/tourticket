import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

interface Params {
  id: string;
}

// GET a single review by ID
export async function GET(request: Request, { params }: { params: Params }) {
    await dbConnect();
    try {
        const review = await Review.findById(params.id).populate('user', 'firstName lastName name picture');
        if (!review) {
            return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: review });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
    }
}

// PUT (update) a review - only by review owner
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  await dbConnect();
  
  // Get token from request
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.sub as string;
    const body = await request.json();
    const { rating, comment } = body;

    if (!rating || !comment?.trim()) {
      return NextResponse.json({ error: 'Rating and comment are required' }, { status: 400 });
    }

    // Find the review and check ownership
    const review = await Review.findById(params.id);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user owns this review
    if (review.user.toString() !== userId) {
      return NextResponse.json({ error: 'Not authorized to edit this review' }, { status: 403 });
    }

    // Update the review
    const updatedReview = await Review.findByIdAndUpdate(
      params.id,
      { rating, comment: comment.trim() },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName name picture');

    return NextResponse.json({ success: true, data: updatedReview });
  } catch (error) {
    console.error('Update review error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

// DELETE a review - only by review owner
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  await dbConnect();
  
  // Get token from request
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.sub as string;

    // Find the review and check ownership
    const review = await Review.findById(params.id);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if user owns this review
    if (review.user.toString() !== userId) {
      return NextResponse.json({ error: 'Not authorized to delete this review' }, { status: 403 });
    }

    // Delete the review
    await Review.deleteOne({ _id: params.id });
    
    return NextResponse.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
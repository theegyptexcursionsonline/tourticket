// app/api/tours/[tourId]/reviews/check/route.ts
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import mongoose from 'mongoose';

interface Params {
  tourId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  await dbConnect();
  
  try {
    const { tourId } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return NextResponse.json({ hasReview: false });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ hasReview: false });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ hasReview: false });
    }

    const userId = payload.sub as string;

    const existingReview = await Review.findOne({ 
      tour: new mongoose.Types.ObjectId(tourId), 
      user: new mongoose.Types.ObjectId(userId) 
    });

    if (existingReview) {
      return NextResponse.json({
        hasReview: true,
        review: {
          _id: existingReview._id,
          rating: existingReview.rating,
          title: existingReview.title,
          comment: existingReview.comment,
          createdAt: existingReview.createdAt
        }
      });
    }

    return NextResponse.json({ hasReview: false });

  } catch (error: any) {
    console.error('Check existing review error:', error);
    return NextResponse.json({ hasReview: false });
  }
}
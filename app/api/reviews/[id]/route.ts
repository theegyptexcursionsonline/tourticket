import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import { NextResponse } from 'next/server';

interface Params {
  id: string;
}

// GET a single review by ID
export async function GET(request: Request, { params }: { params: Params }) {
    await dbConnect();
    try {
        const review = await Review.findById(params.id);
        if (!review) {
            return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: review });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
    }
}

// PUT (update) a review
export async function PUT(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const body = await request.json();
    const review = await Review.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

// DELETE a review
export async function DELETE(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const deletedReview = await Review.deleteOne({ _id: params.id });
    if (deletedReview.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
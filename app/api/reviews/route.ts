import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import { NextResponse } from 'next/server';

// POST a new review
export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const review = await Review.create(body);
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

// GET reviews for a specific tour
export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const tourId = searchParams.get('tourId');
  if (!tourId) {
    return NextResponse.json({ success: false, message: 'Tour ID is required' }, { status: 400 });
  }
  try {
    const reviews = await Review.find({ tourId: tourId }).sort({ date: -1 });
    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
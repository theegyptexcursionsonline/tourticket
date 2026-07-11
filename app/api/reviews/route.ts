import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import { NextResponse } from 'next/server';

// Reviews must be created through /api/tours/[tourId]/reviews, which verifies
// the customer and an eligible completed booking.
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Use the verified tour review endpoint.' },
    { status: 405, headers: { Allow: 'GET' } },
  );
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
    const reviews = await Review.find({ tour: tourId })
      .select('rating title comment userName verified helpful createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: reviews });
    } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextResponse } from 'next/server';

async function fetchToursWithPopulate() {
  // Try normal populate first (matches your schema: `category`, singular).
  try {
    return await Tour.find({})
      .populate('category')      // singular as per your schema
      .populate('destination')
      .populate('reviews')       // optional: only if reviews ref exists
      .lean();
  } catch (err) {
    // If populate fails (e.g., different environments), retry with strictPopulate:false
    console.warn('Populate failed, retrying with strictPopulate:false', err);
    return await Tour.find({})
      .populate({ path: 'category', strictPopulate: false })
      .populate({ path: 'destination', strictPopulate: false })
      .populate({ path: 'reviews', strictPopulate: false })
      .lean();
  }
}

// GET all tours
export async function GET() {
  await dbConnect();
  try {
    const tours = await fetchToursWithPopulate();
    return NextResponse.json({ success: true, data: tours }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tours:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST a new tour
export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const tour = await Tour.create(body);

    // After creating, you may want to return the created doc with populated refs.
    // We'll populate the created tour similarly (best-effort).
    let populated = tour;
    try {
      populated = await Tour.findById(tour._id)
        .populate('category')
        .populate('destination')
        .populate('reviews')
        .lean();
    } catch (popErr) {
      console.warn('Populate after create failed, returning raw tour', popErr);
    }

    return NextResponse.json({ success: true, data: populated ?? tour }, { status: 201 });
  } catch (error) {
    console.error('Error creating tour:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get('q');

    if (!searchQuery) {
      return NextResponse.json({ success: false, message: 'Query parameter is missing' }, { status: 400 });
    }

    const tours = await Tour.find({
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { tags: { $regex: searchQuery, $options: 'i' } }
      ],
    })
    .select('title slug image rating reviews destination') // Selects all necessary fields for the card
    .populate('destination', 'name')
    .limit(10)
    .lean();

    return NextResponse.json({ success: true, data: tours });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message: 'Server Error', error: errorMessage }, { status: 500 });
  }
}
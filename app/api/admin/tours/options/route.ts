// app/api/admin/tours/options/route.ts
// Lightweight endpoint returning only tour id + title for filter dropdowns
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const tours = await Tour.find({})
      .select('title bookingOptions')
      .sort({ title: 1 })
      .lean();

    const data = tours.map((t) => ({
      _id: String(t._id),
      id: String(t._id),
      title: t.title,
      bookingOptions: t.bookingOptions || [],
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch tour options:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tour options' }, { status: 500 });
  }
}

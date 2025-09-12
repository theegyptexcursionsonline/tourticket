import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextResponse } from 'next/server';

// GET all tours
export async function GET() {
  await dbConnect();
  try {
    const tours = await Tour.find({}).populate('destination').populate('categories');
    return NextResponse.json({ success: true, data: tours });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

// POST a new tour
export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const tour = await Tour.create(body);
    return NextResponse.json({ success: true, data: tour }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
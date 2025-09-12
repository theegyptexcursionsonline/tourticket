import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextResponse } from 'next/server';

interface Params {
  id: string;
}

// GET a single tour by ID
export async function GET(request: Request, { params }: { params: Params }) {
    await dbConnect();
    try {
        const tour = await Tour.findById(params.id).populate('destination').populate('categories');
        if (!tour) {
            return NextResponse.json({ success: false, message: 'Tour not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: tour });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
    }
}

// PUT (update) a tour
export async function PUT(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const body = await request.json();
    const tour = await Tour.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!tour) {
      return NextResponse.json({ success: false, message: 'Tour not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: tour });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

// DELETE a tour
export async function DELETE(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const deletedTour = await Tour.deleteOne({ _id: params.id });
    if (deletedTour.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Tour not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
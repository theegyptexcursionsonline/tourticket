// app/api/admin/destinations/[id]/route.ts
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import { NextResponse } from 'next/server';

interface Params { id: string }

export async function PUT(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const body = await request.json();
    if (!body.name || !body.slug || !body.image) {
        return NextResponse.json({ success: false, error: "Name, slug, and image are required" }, { status: 400 });
    }
    const destination = await Destination.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!destination) {
      return NextResponse.json({ success: false, message: 'Destination not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: destination });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const deleted = await Destination.deleteOne({ _id: params.id });
    if (deleted.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Destination not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
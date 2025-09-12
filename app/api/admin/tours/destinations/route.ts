// app/api/admin/destinations/route.ts
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import { NextResponse } from 'next/server';

export async function GET() {
  await dbConnect();
  try {
    const destinations = await Destination.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: destinations });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    if (!body.name || !body.slug || !body.image) {
        return NextResponse.json({ success: false, error: "Name, slug, and image are required" }, { status: 400 });
    }
    const destination = await Destination.create(body);
    return NextResponse.json({ success: true, data: destination }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
// app/api/admin/tours/destinations/route.ts
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour'; // Import the Tour model
import { NextResponse } from 'next/server';
import { MongoError } from 'mongodb';

export async function GET() {
  await dbConnect();
  try {
    // Fetch all destinations
    const destinations = await Destination.find({}).sort({ name: 1 }).lean();

    // For each destination, count the number of associated tours
    const destinationsWithCounts = await Promise.all(
      destinations.map(async (dest) => {
        const tourCount = await Tour.countDocuments({ destination: dest._id });
        return {
          ...dest,
          tourCount, // Add the tourCount to the object
        };
      })
    );

    return NextResponse.json({ success: true, data: destinationsWithCounts });
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
    // Return the new destination with a tourCount of 0
    const destinationWithCount = { ...destination.toObject(), tourCount: 0 };
    return NextResponse.json({ success: true, data: destinationWithCount }, { status: 201 });
  } catch (error) {
    if ((error as MongoError).code === 11000) {
        const field = Object.keys((error as any).keyValue)[0];
        return NextResponse.json({ success: false, error: `Destination with this ${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
// app/api/admin/destinations/route.ts
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import { NextResponse } from 'next/server';
import { MongoError } from 'mongodb';

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
   
    // Only name and description are required
    const requiredFields = ['name', 'description'];
    const missingFields = requiredFields.filter(field => !body[field]?.trim?.());
   
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }
   
    // Auto-generate slug if not provided
    if (!body.slug && body.name) {
      body.slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
   
    // Clean up coordinates if they're empty strings
    if (body.coordinates) {
      if (!body.coordinates.lat || body.coordinates.lat === '') {
        delete body.coordinates.lat;
      } else {
        body.coordinates.lat = parseFloat(body.coordinates.lat);
      }
      
      if (!body.coordinates.lng || body.coordinates.lng === '') {
        delete body.coordinates.lng;
      } else {
        body.coordinates.lng = parseFloat(body.coordinates.lng);
      }
      
      // Remove coordinates object if both lat and lng are missing
      if (!body.coordinates.lat && !body.coordinates.lng) {
        delete body.coordinates;
      }
    }
   
    // Filter out empty array items and empty strings
    const arrayFields = ['highlights', 'thingsToDo', 'localCustoms', 'languagesSpoken', 'weatherWarnings', 'tags'];
    arrayFields.forEach(field => {
      if (body[field]) {
        body[field] = body[field].filter((item: string) => item && item.trim());
      }
    });
   
    const destination = await Destination.create(body);
    return NextResponse.json({ success: true, data: destination }, { status: 201 });
   
  } catch (error) {
    if ((error as MongoError).code === 11000) {
      const field = Object.keys((error as any).keyValue)[0];
      return NextResponse.json({ success: false, error: `Destination with this ${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
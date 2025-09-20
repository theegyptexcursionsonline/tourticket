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
    
    // For POST (creation), we still need required fields
    const requiredFields = ['name', 'country', 'description', 'image'];
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
    
    // Set default values for required fields if not provided
    if (!body.currency) body.currency = 'USD';
    if (!body.timezone) body.timezone = 'UTC';
    if (!body.bestTimeToVisit) body.bestTimeToVisit = 'Year-round';
    if (!body.coordinates) {
      body.coordinates = { lat: 0, lng: 0 }; // Default coordinates
    }
    
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
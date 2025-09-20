// app/api/destinations/route.ts (PUBLIC API)
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import { NextResponse } from 'next/server';

export async function GET() {
  await dbConnect();
  try {
    // Only return public fields for customer-facing API
    const destinations = await Destination.find(
      { isActive: true }, // Only active destinations
      { 
        name: 1, 
        slug: 1, 
        country: 1, 
        image: 1, 
        description: 1,
        _id: 1 
      }
    ).sort({ name: 1 });
    
    const response = NextResponse.json({ 
      success: true, 
      data: destinations 
    });
    
    // Aggressive caching for public API
    response.headers.set(
      'Cache-Control', 
      'public, max-age=3600, stale-while-revalidate=86400'
    );
    
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch destinations' }, 
      { status: 500 }
    );
  }
}
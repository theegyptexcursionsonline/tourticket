// app/api/tours/public/route.ts (PUBLIC API)
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextResponse } from 'next/server';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';

export async function GET() {
  await dbConnect();
  try {
    // Only return public tour data
    // Only show tours from the default tenant (exclude German/other tenant tours)
    const tours = await Tour.find(
      {
        ...PUBLIC_CONTENT_FILTER,
        $and: [
          {
            $or: [
              { isActive: true },
              { isActive: { $exists: false } },
            ],
          },
          DEFAULT_TENANT_FILTER,
        ],
      },
      { 
        destination: 1, 
        title: 1, 
        price: 1, 
        duration: 1,
        _id: 1 
      }
    ).populate('destination', 'name slug');
    
    const response = NextResponse.json({
      success: true,
      data: tours
    });

    // NO CACHING - Real-time data from admin panel
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0'
    );

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tours' }, 
      { status: 500 }
    );
  }
}

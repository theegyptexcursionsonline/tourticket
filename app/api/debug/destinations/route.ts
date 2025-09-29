import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';

export async function GET() {
  try {
    await dbConnect();

    // Get ALL destinations
    const allDestinations = await Destination.find({})
      .select('_id name slug country image featured isPublished')
      .lean();

    // Get tour counts
    const tours = await Tour.find({ isPublished: true })
      .select('destination')
      .lean();

    const tourCounts: Record<string, number> = {};
    tours.forEach(tour => {
      const destId = tour.destination?.toString();
      if (destId) {
        tourCounts[destId] = (tourCounts[destId] || 0) + 1;
      }
    });

    // Analyze destinations
    const analysis = {
      total: allDestinations.length,
      published: allDestinations.filter(d => d.isPublished).length,
      unpublished: allDestinations.filter(d => !d.isPublished).length,
      featured: allDestinations.filter(d => d.featured).length,
      featuredPublished: allDestinations.filter(d => d.featured && d.isPublished).length,
      featuredWithTours: allDestinations.filter(d => d.featured && tourCounts[d._id.toString()] > 0).length,
      featuredWithoutTours: allDestinations.filter(d => d.featured && !tourCounts[d._id.toString()]).length,
      
      destinations: allDestinations.map(dest => ({
        _id: dest._id.toString(),
        name: dest.name,
        slug: dest.slug,
        country: dest.country,
        featured: dest.featured,
        isPublished: dest.isPublished,
        tourCount: tourCounts[dest._id.toString()] || 0,
        hasImage: !!dest.image,
        // Status indicators
        visibleOnFrontend: dest.isPublished && tourCounts[dest._id.toString()] > 0,
        reason: !dest.isPublished 
          ? '❌ Not Published' 
          : !tourCounts[dest._id.toString()] 
            ? '❌ No Tours Assigned' 
            : '✅ Visible'
      }))
      .sort((a, b) => {
        // Featured first
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      })
    };

    return NextResponse.json({
      success: true,
      analysis,
      message: 'Debug data retrieved successfully'
    });

  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json(
      {
        success: false,default
        error: 'Failed to fetch debug data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
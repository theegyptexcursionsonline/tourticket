// app/api/attractions-interests/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import { getCachedData, cacheConfig } from '@/lib/redis';

export async function GET() {
  try {
    await dbConnect();

    const data = await getCachedData(
      'attractions-interests:all',
      async () => {
        // Fetch all attraction pages
        const pages = await AttractionPage.find({ isPublished: true })
          .select('_id title slug pageType')
          .sort({ title: 1 })
          .lean();

        // Separate into attractions and interests
        const attractions = pages.filter(p => p.pageType === 'attraction');
        const interests = pages.filter(p => p.pageType === 'category');

        return { attractions, interests };
      },
      cacheConfig.MEDIUM // Cache for 5 minutes
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching attractions/interests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch attractions and interests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

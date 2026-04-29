// app/api/destinations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { selectLocalizedTaxonomyEntries } from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = new URL(request.url).searchParams;
    const featuredOnly = searchParams.get('featured') !== 'false';
    const locale = searchParams.get('locale') || 'en';
    const destinations = await Destination.find({
      isPublished: true,
      ...(featuredOnly ? { featured: true } : {}),
    })
      .select('_id name slug country image description featured tourCount')
      .sort({ featured: -1, tourCount: -1, name: 1 })
      .lean();

    const tours = await Tour.find({ isPublished: true, ...DEFAULT_TENANT_FILTER })
      .select('destination')
      .lean();

    // Count tours per destination
    const tourCounts: Record<string, number> = {};
    tours.forEach(tour => {
      const destId = tour.destination?.toString();
      if (destId) {
        tourCounts[destId] = (tourCounts[destId] || 0) + 1;
      }
    });

    // Add tour counts to destinations
    const destinationsWithCountsData = destinations.map((dest: any) => ({
      ...dest,
      tourCount: tourCounts[dest._id.toString()] || 0,
    }));

    const localizedDestinations = selectLocalizedTaxonomyEntries(
      JSON.parse(JSON.stringify(destinationsWithCountsData)),
      locale,
      ['name', 'country', 'description', 'longDescription', 'highlights', 'thingsToDo', 'metaTitle', 'metaDescription']
    ).map((destination: Record<string, unknown>) =>
      localizeEntityFields(destination, locale, [
        'name',
        'country',
        'description',
        'longDescription',
        'highlights',
        'thingsToDo',
        'metaTitle',
        'metaDescription',
      ])
    );

    const destinationsWithCounts = filterVisibleTaxonomyEntries(localizedDestinations)
      .filter((dest: any) => (dest.tourCount || 0) > 0 || dest.featured)
      .sort((a: any, b: any) => {
        // Featured first
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        // Then by tour count
        return b.tourCount - a.tourCount;
      });

    return NextResponse.json({
      success: true,
      data: destinationsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch destinations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

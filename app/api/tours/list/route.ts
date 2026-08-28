import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';

interface PopulatedTaxonomy {
  _id?: { toString(): string } | string;
  name?: string;
  slug?: string;
}

export async function GET() {
  try {
    await dbConnect();

    // Fetch tours from default tenant only (exclude German/other tenant tours)
    const tours = await Tour.find({ ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER })
      .populate('destination', 'name slug')
      .populate('category', 'name slug')
      .select('title slug urlType parentPage description price discountPrice duration difficulty isPublished isFeatured image')
      .lean()
      .sort({ createdAt: -1 });

    // Format the response
    const formattedTours = tours.map((tour) => {
      const destination = tour.destination as unknown as PopulatedTaxonomy | null;
      const categoryValue = Array.isArray(tour.category) ? tour.category[0] : tour.category;
      const category = categoryValue as unknown as PopulatedTaxonomy | null;
      return ({
      id: tour._id.toString(),
      title: tour.title,
      slug: tour.slug,
      urlType: tour.urlType,
      parentPage: tour.parentPage,
      description: tour.description,
      price: tour.price,
      discountPrice: tour.discountPrice,
      duration: tour.duration,
      difficulty: tour.difficulty,
      isPublished: tour.isPublished,
      isFeatured: tour.isFeatured,
      image: tour.image,
      destination: destination ? {
        id: destination._id?.toString(),
        name: destination.name,
        slug: destination.slug
      } : null,
      category: category ? {
        id: category._id?.toString(),
        name: category.name,
        slug: category.slug
      } : null
      });
    });

    return NextResponse.json({
      success: true,
      count: formattedTours.length,
      tours: formattedTours
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching tours list:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message || 'Failed to fetch tours',
    }, { status: 500 });
  }
}

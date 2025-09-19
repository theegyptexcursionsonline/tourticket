import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    // Get search parameters
    const query = searchParams.get('q') || '';
    const destination = searchParams.get('destination');
    const category = searchParams.get('category');
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    const rating = searchParams.get('rating');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    // Build the filter object
    const filter: any = {
      isPublished: true, // Only show published tours
    };

    // Text search
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { longDescription: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }

    // Destination filter
    if (destination) {
      filter.destination = destination;
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Price range filter
    if (priceMin || priceMax) {
      filter.discountPrice = {};
      if (priceMin) filter.discountPrice.$gte = parseFloat(priceMin);
      if (priceMax) filter.discountPrice.$lte = parseFloat(priceMax);
    }

    // Rating filter
    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute search query with population
    const [tours, total] = await Promise.all([
      Tour.find(filter)
        .populate({
          path: 'destination',
          model: Destination,
          select: 'name slug'
        })
        .populate({
          path: 'category',
          model: Category,
          select: 'name slug'
        })
        .sort({ isFeatured: -1, createdAt: -1 }) // Featured tours first, then newest
        .skip(skip)
        .limit(limit)
        .lean(),
      Tour.countDocuments(filter)
    ]);

    return NextResponse.json({
      success: true,
      tours,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Search tours error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search tours' },
      { status: 500 }
    );
  }
}
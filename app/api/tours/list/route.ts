import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';

export async function GET() {
  try {
    await dbConnect();

    // Fetch all tours with populated destination and category
    const tours = await Tour.find({})
      .populate('destination', 'name slug')
      .populate('category', 'name slug')
      .select('title slug description price discountPrice duration difficulty isPublished isFeatured image')
      .lean()
      .sort({ createdAt: -1 });

    // Format the response
    const formattedTours = tours.map((tour: any) => ({
      id: tour._id.toString(),
      title: tour.title,
      slug: tour.slug,
      description: tour.description,
      price: tour.price,
      discountPrice: tour.discountPrice,
      duration: tour.duration,
      difficulty: tour.difficulty,
      isPublished: tour.isPublished,
      isFeatured: tour.isFeatured,
      image: tour.image,
      destination: tour.destination ? {
        id: tour.destination._id?.toString(),
        name: tour.destination.name,
        slug: tour.destination.slug
      } : null,
      category: tour.category ? {
        id: tour.category._id?.toString(),
        name: tour.category.name,
        slug: tour.category.slug
      } : null
    }));

    return NextResponse.json({
      success: true,
      count: formattedTours.length,
      tours: formattedTours
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error: any) {
    console.error('Error fetching tours list:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch tours',
    }, { status: 500 });
  }
}

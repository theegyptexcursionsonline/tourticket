// app/api/tours/[tourId]/options/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

// Helper function to check if string is a valid MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params;

  if (!tourId) {
    return NextResponse.json({ message: 'Tour ID is required' }, { status: 400 });
  }

  try {
    await dbConnect();

    let tour = null;

    // Check if tourId is an ObjectId or a slug
    if (isValidObjectId(tourId)) {
      tour = await Tour.findById(tourId).lean();
    } else {
      tour = await Tour.findOne({ slug: tourId }).lean();
    }

    if (!tour) {
      return NextResponse.json({ message: 'Tour not found' }, { status: 404 });
    }

    // Generate tour options based on tour data
    const tourOptions = [
      {
        id: 'standard-default',
        title: `${tour.title} - Standard Experience`,
        price: tour.discountPrice,
        originalPrice: tour.originalPrice,
        duration: tour.duration || '3 hours',
        languages: tour.languages || ['English'],
        description: tour.description || 'Complete tour experience with all essential features and expert guidance.',
        timeSlots: [
          { id: 'slot-1', time: '09:00', available: 12, price: tour.discountPrice, isPopular: false },
          { id: 'slot-2', time: '11:00', available: 8, price: tour.discountPrice, isPopular: true },
          { id: 'slot-3', time: '14:00', available: 15, price: tour.discountPrice, isPopular: false },
          { id: 'slot-4', time: '16:00', available: 3, price: tour.discountPrice, isPopular: false },
        ],
        highlights: tour.highlights?.slice(0, 3) || ['Expert guide included', 'Small group experience', 'Photo opportunities'],
        groupSize: `Max ${tour.maxGroupSize || 15} people`,
        difficulty: 'Easy',
        badge: 'Most Popular',
        isRecommended: true,
      }
    ];

    return NextResponse.json(tourOptions);

  } catch (error) {
    console.error('Failed to fetch tour options:', error);
    return NextResponse.json({ message: 'An error occurred while fetching tour options.' }, { status: 500 });
  }
}
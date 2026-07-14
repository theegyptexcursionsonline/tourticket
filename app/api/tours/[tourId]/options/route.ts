// app/api/tours/[tourId]/options/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';

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
      tour = await Tour.findOne({ _id: tourId, ...DEFAULT_TENANT_FILTER }).lean();
    } else {
      tour = await Tour.findOne({ slug: tourId, ...DEFAULT_TENANT_FILTER }).lean();
    }

    if (!tour) {
      return NextResponse.json({ message: 'Tour not found' }, { status: 404 });
    }

    // Every booking surface must offer the catalogue's real departure times.
    // Fabricated time slots let an operator select a departure that checkout
    // will (correctly) reject, so derive this list from authoritative
    // availability instead.
    const availabilitySlots = (tour.availability?.slots || []).map((slot, index: number) => ({
      id: `slot-${index + 1}`,
      time: slot.time,
      available: slot.capacity,
    }));

    // Return actual booking options from database, or generate fallback if none exist
    let tourOptions;

    if (tour.bookingOptions && tour.bookingOptions.length > 0) {
      // Use real booking options from database
      tourOptions = tour.bookingOptions.map((option, index: number) => ({
        id: option._id?.toString() || `option-${index}`,
        pricingKey: option.pricingKey || null,
        title: option.label || `${tour.title} - ${option.type}`,
        type: option.type || 'Per Person',
        price: option.price ?? tour.discountPrice,
        guestPrices: explicitCatalogueGuestPrices(Number(option.price ?? tour.discountPrice), option.guestPrices).prices,
        originalPrice: option.originalPrice || tour.originalPrice,
        duration: option.duration || tour.duration || '3 hours',
        languages: option.languages || tour.languages || ['English'],
        description: option.description || tour.description || 'Complete tour experience',
        timeSlots: availabilitySlots.map((slot) => ({
          ...slot,
          price: option.price ?? tour.discountPrice,
          originalPrice: option.originalPrice,
          isPopular: false,
        })),
        highlights: option.highlights || tour.highlights?.slice(0, 3) || ['Expert guide included'],
        groupSize: option.groupSize || `Max ${tour.maxGroupSize || 15} people`,
        difficulty: option.difficulty || tour.difficulty || 'Easy',
        badge: option.badge || (option.isRecommended ? 'Recommended' : undefined),
        discount: option.discount,
        isRecommended: option.isRecommended || false,
      }));
    } else {
      // Fallback: Generate default option if no booking options exist
      tourOptions = [
        {
          id: 'standard-default',
          pricingKey: 'standard',
          title: `${tour.title} - Standard Experience`,
          price: tour.discountPrice,
          guestPrices: explicitCatalogueGuestPrices(Number(tour.discountPrice), tour.revenueGuestPrices).prices,
          originalPrice: tour.originalPrice,
          duration: tour.duration || '3 hours',
          languages: tour.languages || ['English'],
          description: tour.description || 'Complete tour experience with all essential features and expert guidance.',
          timeSlots: availabilitySlots.map((slot) => ({
            ...slot,
            price: tour.discountPrice,
            originalPrice: tour.originalPrice,
            isPopular: false,
          })),
          highlights: tour.highlights?.slice(0, 3) || ['Expert guide included', 'Small group experience', 'Photo opportunities'],
          groupSize: `Max ${tour.maxGroupSize || 15} people`,
          difficulty: 'Easy',
          badge: 'Most Popular',
          isRecommended: true,
        }
      ];
    }

    return NextResponse.json(tourOptions);

  } catch (error) {
    console.error('Failed to fetch tour options:', error);
    return NextResponse.json({ message: 'An error occurred while fetching tour options.' }, { status: 500 });
  }
}

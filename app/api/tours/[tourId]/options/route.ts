import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { Tour as TourType, BookingOption as BookingOptionType, TimeSlot, TourOption } from '@/types/index';

// Helper function to generate time slots.
// You can move this to a shared utility file if needed elsewhere.
const generateTimeSlotsFromAvailability = (tourData: TourType, price: number, isPremium: boolean = false): TimeSlot[] => {
  if (tourData.availability && tourData.availability.slots) {
    return tourData.availability.slots.map((slot, index) => ({
      id: `slot-${isPremium ? 'premium-' : ''}${index}`,
      time: slot.time,
      available: isPremium ? Math.min(slot.capacity || 15, 8) : (slot.capacity || 15),
      originalAvailable: isPremium ? 8 : (slot.capacity || 15),
      price: price,
      isPopular: index === 0 && !isPremium,
    }));
  }

  const baseSlots = [
    { time: '09:00', capacity: 15 },
    { time: '11:00', capacity: 15 },
    { time: '14:00', capacity: 15 },
  ];

  if (isPremium) {
    return [
      { id: 'premium-slot-1', time: '10:00', available: 6, originalAvailable: 8, price: price },
      { id: 'premium-slot-2', time: '15:00', available: 4, originalAvailable: 8, price: price, isPopular: true },
    ];
  }

  return baseSlots.map((slot, index) => ({
    id: `slot-${index}`,
    time: slot.time,
    available: Math.floor(Math.random() * slot.capacity) + 1,
    originalAvailable: slot.capacity,
    price: price,
    isPopular: index === 1,
  }));
};


export async function GET(
  request: Request,
  { params }: { params: { tourId: string } }
) {
  const { tourId } = params;

  if (!tourId) {
    return NextResponse.json({ message: 'Tour ID is required' }, { status: 400 });
  }

  try {
    await dbConnect();

    const tour: TourType | null = await Tour.findById(tourId).lean();

    if (!tour) {
      return NextResponse.json({ message: 'Tour not found' }, { status: 404 });
    }

    let tourOptions: TourOption[] = [];

    // Check for booking options defined in the admin panel
    if (tour.bookingOptions && tour.bookingOptions.length > 0) {
      tourOptions = tour.bookingOptions.map((opt: BookingOptionType, index: number) => ({
        id: `bo-${opt.id || index}`,
        title: opt.label,
        price: opt.price,
        originalPrice: opt.originalPrice || tour.originalPrice,
        duration: opt.duration || tour.duration || 'N/A',
        languages: opt.languages || tour.languages || ['English'],
        description: opt.description || tour.description || '',
        timeSlots: generateTimeSlotsFromAvailability(tour, opt.price),
        highlights: opt.highlights || tour.highlights,
        groupSize: opt.groupSize || `Max ${tour.maxGroupSize || 15} people`,
        difficulty: opt.difficulty || tour.difficulty || 'Easy',
        badge: opt.badge || (index === 0 ? 'Most Popular' : 'Standard'),
        isRecommended: opt.isRecommended || index === 0,
      }));
    } else {
      // If no booking options, generate fallback options based on the tour itself
      const basePrice = tour.discountPrice;

      // Fallback Standard Option
      tourOptions.push({
        id: 'standard-fallback',
        title: `${tour.title} - Standard Experience`,
        price: basePrice,
        originalPrice: tour.originalPrice,
        duration: tour.duration || '75 minutes',
        languages: tour.languages || ['English'],
        description: tour.description || 'Experience this amazing tour with our standard package.',
        timeSlots: generateTimeSlotsFromAvailability(tour, basePrice),
        highlights: tour.highlights?.slice(0, 4) || [],
        groupSize: `Max ${tour.maxGroupSize || 15} people`,
        difficulty: tour.difficulty || 'Easy',
        badge: 'Most Popular',
        isRecommended: true,
      });
    }

    return NextResponse.json(tourOptions);

  } catch (error) {
    console.error('Failed to fetch tour options:', error);
    return NextResponse.json({ message: 'An error occurred while fetching tour options.' }, { status: 500 });
  }
}
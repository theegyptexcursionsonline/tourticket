import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { Tour as TourType, BookingOption as BookingOptionType, TimeSlot, TourOption } from '@/types/index';

// Helper function to generate time slots from availability
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

  // Default slots if no availability data
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
  // Generate 3 fallback options when no booking options are configured
  const basePrice = tour.discountPrice;
  const originalPrice = tour.originalPrice;

  // 1. Budget Option
  const budgetPrice = Math.round(basePrice * 0.8);
  tourOptions.push({
    id: 'budget-fallback',
    title: `${tour.title} - Essential Experience`,
    price: budgetPrice,
    originalPrice: basePrice,
    duration: tour.duration || '60 minutes',
    languages: ['English'],
    description: 'Great value option covering all the main highlights with professional guidance.',
    timeSlots: generateTimeSlotsFromAvailability(tour, budgetPrice),
    highlights: tour.highlights?.slice(0, 3) || [
      'Professional guide',
      'Main attractions',
      'Safety equipment'
    ],
    groupSize: `Max ${tour.maxGroupSize || 20} people`,
    difficulty: tour.difficulty || 'Easy',
    badge: 'Best Value',
    isRecommended: false,
  });

  // 2. Standard Option (Most Popular)
  tourOptions.push({
    id: 'standard-fallback',
    title: `${tour.title} - Standard Experience`,
    price: basePrice,
    originalPrice: originalPrice,
    duration: tour.duration || '75 minutes',
    languages: tour.languages || ['English'],
    description: tour.description || 'Complete tour experience with all essential features and expert guidance.',
    timeSlots: generateTimeSlotsFromAvailability(tour, basePrice),
    highlights: tour.highlights?.slice(0, 4) || [
      'Professional guide',
      'All main attractions',
      'Safety equipment',
      'Small group experience'
    ],
    groupSize: `Max ${tour.maxGroupSize || 15} people`,
    difficulty: tour.difficulty || 'Easy',
    badge: 'Most Popular',
    isRecommended: true,
  });

  // 3. Premium Option
  const premiumPrice = Math.round(basePrice * 1.4);
  tourOptions.push({
    id: 'premium-fallback',
    title: `${tour.title} - Premium Experience`,
    price: premiumPrice,
    originalPrice: originalPrice ? Math.round(originalPrice * 1.4) : Math.round(premiumPrice * 1.2),
    duration: tour.duration?.replace(/\d+/, (match) => (parseInt(match) + 30).toString()) || '90 minutes',
    languages: tour.languages || ['English', 'Spanish'],
    description: 'Enhanced experience with premium amenities, smaller groups, and exclusive access for a luxury adventure.',
    timeSlots: generateTimeSlotsFromAvailability(tour, premiumPrice, true),
    highlights: [
      ...(tour.highlights?.slice(0, 3) || ['Professional guide', 'Premium service', 'Exclusive access']),
      'Small group (max 8)',
      'Premium refreshments',
      'Priority access',
      'Professional photos'
    ],
    groupSize: `Max 8 people`,
    difficulty: tour.difficulty || 'Easy',
    badge: 'Premium',
    isRecommended: false,
  });
}

    return NextResponse.json(tourOptions);

  } catch (error) {
    console.error('Failed to fetch tour options:', error);
    return NextResponse.json({ message: 'An error occurred while fetching tour options.' }, { status: 500 });
  }
}
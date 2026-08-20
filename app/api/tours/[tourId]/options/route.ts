// app/api/tours/[tourId]/options/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { effectiveSlotGuestPrices, explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
import { effectiveOptionPrice, effectiveTourPrice, percentageOff } from '@/lib/pricing/effectivePrice';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';
import { effectiveMaxCapacity, effectiveMinCapacity } from '@/lib/bookings/unitPricing';

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
      tourOptions = tour.bookingOptions.map((option, index: number) => {
        // Same helper the server charges with, so the quoted option price and
        // the charged price cannot drift apart.
        const pricing = effectiveOptionPrice(tour, option);
        const universalCapacityByTime = new Map(
          (tour.availability?.slots || []).map((slot) => [slot.time, slot.capacity]),
        );
        // An option with configured slots serves those; otherwise it uses the
        // universal slots at its own effective price (the charge for an option
        // never falls back to a universal slot price — only the standard
        // no-option path does).
        const optionSlots = Array.isArray(option.timeSlots) && option.timeSlots.length > 0
          ? option.timeSlots.map((slot, slotIndex: number) => {
              const slotPricing = effectiveOptionPrice(tour, option, slot);
              return {
                id: `slot-${slotIndex + 1}`,
                time: slot.time,
                available: slot.capacity ?? universalCapacityByTime.get(slot.time) ?? 15,
                price: slotPricing.price,
                guestPrices: effectiveSlotGuestPrices({
                  adult: slotPricing.price,
                  base: option.guestPrices,
                  slot,
                  discountPercent: tour.discountPercent,
                  applyDiscount: Boolean(option.applyTourDiscount),
                }),
                originalPrice: slotPricing.discountApplied ? slotPricing.originalPrice : undefined,
                isPopular: false,
              };
            })
          : availabilitySlots.map((slot) => ({
              ...slot,
              price: pricing.price,
              guestPrices: effectiveSlotGuestPrices({
                adult: pricing.price,
                base: option.guestPrices,
                discountPercent: tour.discountPercent,
                applyDiscount: Boolean(option.applyTourDiscount),
              }),
              originalPrice: pricing.discountApplied ? pricing.originalPrice : option.originalPrice,
              isPopular: false,
            }));
        return {
          id: option._id?.toString() || `option-${index}`,
          pricingKey: option.pricingKey || null,
          title: option.label || `${tour.title} - ${option.type}`,
          type: option.type || 'Per Person',
          // Effective capacity gates (type defaults applied) so the booking
          // surface can disable the option and step prices in whole units.
          minCapacity: effectiveMinCapacity(option),
          maxCapacity: effectiveMaxCapacity(option),
          price: pricing.price,
          guestPrices: explicitCatalogueGuestPrices(pricing.price, option.guestPrices).prices,
          originalPrice: pricing.discountApplied
            ? pricing.originalPrice
            : (option.originalPrice || tour.originalPrice),
          // Empty stays empty — the booking surface hides the chip rather
          // than quoting a duration nobody configured.
          duration: option.duration || tour.duration || '',
          languages: option.languages || tour.languages || ['English'],
          description: option.description || tour.description || 'Complete tour experience',
          timeSlots: optionSlots,
          highlights: option.highlights || tour.highlights?.slice(0, 3) || ['Expert guide included'],
          groupSize: option.groupSize || `Max ${tour.maxGroupSize || 15} people`,
          difficulty: option.difficulty || tour.difficulty || 'Easy',
          badge: option.badge || (option.isRecommended ? 'Recommended' : undefined),
          discount: pricing.discountApplied
            ? percentageOff(pricing.originalPrice, pricing.price)
            : option.discount,
          isRecommended: option.isRecommended || false,
        };
      });
    } else {
      // Fallback: Generate default option if no booking options exist
      const tourPricing = effectiveTourPrice(tour);
      tourOptions = [
        {
          id: 'standard-default',
          pricingKey: 'standard',
          title: `${tour.title} - Standard Experience`,
          type: 'Per Person',
          minCapacity: null,
          maxCapacity: null,
          price: tourPricing.price,
          guestPrices: explicitCatalogueGuestPrices(tourPricing.price, tour.revenueGuestPrices).prices,
          originalPrice: tourPricing.discountApplied ? tourPricing.originalPrice : tour.originalPrice,
          duration: tour.duration || '',
          languages: tour.languages || ['English'],
          description: tour.description || 'Complete tour experience with all essential features and expert guidance.',
          // The standard no-option path honours a universal slot price, so
          // quote each slot exactly the way checkout will charge it.
          timeSlots: availabilitySlots.map((slot, index: number) => {
            const storedSlot = tour.availability?.slots?.[index];
            const slotPricing = effectiveTourPrice(tour, storedSlot);
            const adult = authoritativeBasePrice(tour, { selectedBookingOption: null, selectedTime: slot.time });
            return {
              ...slot,
              price: adult,
              guestPrices: effectiveSlotGuestPrices({
                adult,
                base: tour.revenueGuestPrices,
                slot: storedSlot,
                discountPercent: tour.discountPercent,
                applyDiscount: true,
              }),
              originalPrice: slotPricing.discountApplied ? slotPricing.originalPrice : tour.originalPrice,
              isPopular: false,
            };
          }),
          highlights: tour.highlights?.slice(0, 3) || ['Expert guide included', 'Small group experience', 'Photo opportunities'],
          groupSize: `Max ${tour.maxGroupSize || 15} people`,
          difficulty: 'Easy',
          badge: 'Most Popular',
          discount: percentageOff(tourPricing.originalPrice, tourPricing.price) || undefined,
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

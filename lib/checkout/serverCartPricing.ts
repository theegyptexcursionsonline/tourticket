import mongoose from 'mongoose';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { resolveEffectivePrice, STANDARD_OPTION_KEY } from '@/lib/revenue/pricingResolver';

export class PriceChangedError extends Error {
  code = 'PRICE_CHANGED';
  quote: any;
  constructor(quote: any) {
    super('The selected price changed. Review the new quote before continuing.');
    this.quote = quote;
  }
}

const FALLBACK_ADDONS = [
  { id: 'photo-package-fallback', title: 'Professional Photography Package', price: 35, category: 'Photography', perGuest: false },
  { id: 'transport-premium-fallback', title: 'Premium Hotel Transfer Service', price: 15, category: 'Transport', perGuest: false },
  { id: 'refreshment-upgrade-fallback', title: 'Gourmet Refreshment Package', price: 12, category: 'Food', perGuest: true },
  { id: 'guide-upgrade-fallback', title: 'Private Guide Enhancement', price: 45, category: 'Experience', perGuest: false },
];

function quantity(value: unknown, fallback: number, minimum = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(50, Math.max(minimum, Math.floor(parsed)));
}

export async function secureCartPricing(input: unknown): Promise<any[]> {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) {
    throw new Error('Invalid cart');
  }

  return Promise.all(input.map(async (rawItem: any) => {
    const tourId = String(rawItem?._id || rawItem?.id || '');
    if (!mongoose.Types.ObjectId.isValid(tourId)) throw new Error('Invalid tour');

    const tour: any = await Tour.findOne({
      _id: tourId,
      isPublished: true,
      ...DEFAULT_TENANT_FILTER,
    }).select('_id title discountPrice originalPrice bookingOptions addOns').lean();
    if (!tour) throw new Error('Tour unavailable');

    const optionId = rawItem?.selectedBookingOption?.id
      ? String(rawItem.selectedBookingOption.id)
      : '';
    const requestedPricingKey = rawItem?.selectedBookingOption?.pricingKey ? String(rawItem.selectedBookingOption.pricingKey) : '';
    let option: any;
    if (optionId && optionId !== 'standard-default') {
      const match = optionId.match(/^option-(\d+)$/);
      const optionIndex = requestedPricingKey
        ? tour.bookingOptions?.findIndex((candidate: any) => candidate?.pricingKey === requestedPricingKey)
        : match ? Number(match[1]) : tour.bookingOptions?.findIndex((candidate: any) => String(candidate?._id || '') === optionId);
      if (optionIndex === undefined || optionIndex < 0 || !tour.bookingOptions?.[optionIndex]) {
        throw new Error('Invalid booking option');
      }
      const dbOption = tour.bookingOptions[optionIndex];
      option = {
        id: optionId,
        pricingKey: dbOption.pricingKey,
        title: dbOption.label || `${tour.title} - ${dbOption.type}`,
        price: Number(dbOption.price),
        originalPrice: Number(dbOption.originalPrice || tour.originalPrice || dbOption.price),
        duration: dbOption.duration,
        badge: dbOption.badge,
      };
    } else {
      option = {
        id: 'standard-default',
        pricingKey: STANDARD_OPTION_KEY,
        title: `${tour.title} - Standard Experience`,
        price: Number(tour.discountPrice),
        originalPrice: Number(tour.originalPrice || tour.discountPrice),
      };
    }

    if (!Number.isFinite(option.price) || option.price < 0) throw new Error('Invalid catalogue price');

    let quote: any = null;
    if (rawItem?.selectedDate && rawItem?.selectedTime) {
      quote = await resolveEffectivePrice({
        tourId,
        optionKey: option.pricingKey || STANDARD_OPTION_KEY,
        date: String(rawItem.selectedDate).slice(0, 10),
        time: String(rawItem.selectedTime),
      });
      if ((process.env.REVENUEPILOT_PRICING_API_ENABLED === 'true' && rawItem?.priceVersion === undefined) || (rawItem?.priceVersion !== undefined && Number(rawItem.priceVersion) !== quote.version)) {
        throw new PriceChangedError(quote);
      }
      option.price = quote.prices.adult;
    }

    const catalogueAddons = tour.addOns?.length
      ? tour.addOns.map((addon: any, index: number) => ({
          id: String(addon?._id || `addon-${index}`),
          title: addon.name,
          price: Number(addon.price),
          category: addon.category || 'Experience',
          perGuest: addon.category === 'Food',
        }))
      : FALLBACK_ADDONS;

    const selectedAddOns: Record<string, number> = {};
    const selectedAddOnDetails: Record<string, any> = {};
    const requested = rawItem?.selectedAddOns;
    const entries: Array<[string, unknown]> = Array.isArray(requested)
      ? requested.map((addon: any) => [String(addon?.id || ''), addon?.quantity])
      : requested && typeof requested === 'object'
        ? Object.entries(requested)
        : [];

    for (const [id, rawQuantity] of entries) {
      const count = quantity(rawQuantity && typeof rawQuantity === 'object'
        ? (rawQuantity as any).quantity
        : rawQuantity, 0);
      if (count === 0) continue;
      const addon = catalogueAddons.find((candidate: any) => String(candidate.id) === id);
      if (!addon || !Number.isFinite(addon.price) || addon.price < 0) {
        throw new Error('Invalid add-on');
      }
      selectedAddOns[id] = count;
      selectedAddOnDetails[id] = addon;
    }

    return {
      ...rawItem,
      _id: tour._id.toString(),
      id: tour._id.toString(),
      title: tour.title,
      quantity: quantity(rawItem?.quantity, 1, 1),
      childQuantity: quantity(rawItem?.childQuantity, 0),
      infantQuantity: quantity(rawItem?.infantQuantity, 0),
      price: option.price,
      discountPrice: option.price,
      originalPrice: option.originalPrice,
      selectedBookingOption: option,
      guestPrices: quote?.prices || { adult: option.price, child: Math.round(option.price * 50) / 100, infant: 0 },
      priceVersion: quote?.version || 0,
      priceExecutionId: quote?.executionId || null,
      priceOverrideId: quote?.overrideId || null,
      selectedAddOns,
      selectedAddOnDetails,
    };
  }));
}

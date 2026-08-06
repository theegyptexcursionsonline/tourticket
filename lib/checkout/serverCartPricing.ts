import mongoose from 'mongoose';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { resolveEffectivePrice, STANDARD_OPTION_KEY } from '@/lib/revenue/pricingResolver';
import { isPerPersonAddOn } from '@/lib/checkout/addOnPricing';
import { effectiveOptionPrice, effectiveTourPrice } from '@/lib/pricing/effectivePrice';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';

type EffectivePriceQuote = Awaited<ReturnType<typeof resolveEffectivePrice>>;

interface RawBookingOption {
  id?: unknown;
  pricingKey?: unknown;
}

interface RawCartItem extends Record<string, unknown> {
  _id?: unknown;
  id?: unknown;
  selectedBookingOption?: RawBookingOption;
  selectedDate?: unknown;
  selectedTime?: unknown;
  priceVersion?: unknown;
  priceSourceVersion?: unknown;
  quantity?: unknown;
  childQuantity?: unknown;
  infantQuantity?: unknown;
  selectedAddOns?: unknown;
}

interface LeanBookingOption {
  _id?: mongoose.Types.ObjectId;
  pricingKey?: string;
  label?: string;
  type: string;
  price: number;
  originalPrice?: number;
  duration?: string;
  badge?: string;
  applyTourDiscount?: boolean;
  timeSlots?: Array<{ time?: string; capacity?: number; price?: number }>;
}

interface LeanAddOn {
  _id?: mongoose.Types.ObjectId;
  name: string;
  price: number;
  category?: string;
  pricingMethod?: 'per_unit' | 'per_person';
}

interface LeanTour {
  _id: mongoose.Types.ObjectId;
  title: string;
  discountPrice: number;
  discountPercent?: number;
  originalPrice?: number;
  bookingOptions?: LeanBookingOption[];
  addOns?: LeanAddOn[];
  availability?: { slots?: Array<{ time?: string; capacity?: number; price?: number }> };
}

export interface SecureBookingOption {
  id: string;
  pricingKey: string;
  title: string;
  price: number;
  originalPrice: number;
  duration?: string;
  badge?: string;
}

export interface SecureAddOnDetail {
  id: string;
  title: string;
  price: number;
  category: string;
  perGuest: boolean;
}

export interface SecureCartItem extends Record<string, unknown> {
  _id: string;
  id: string;
  title: string;
  image?: string;
  images?: string[];
  quantity: number;
  childQuantity: number;
  infantQuantity: number;
  selectedDate?: string;
  selectedTime?: string;
  price: number;
  discountPrice: number;
  originalPrice: number;
  selectedBookingOption: SecureBookingOption;
  guestPrices: { adult: number; child: number; infant: number };
  priceVersion: number;
  priceSourceVersion: string | null;
  priceExecutionId: string | null;
  priceOverrideId: string | null;
  priceSource: 'catalogue' | 'override';
  selectedAddOns: Record<string, number>;
  selectedAddOnDetails: Record<string, SecureAddOnDetail>;
  availableAddOns: SecureAddOnDetail[];
}

export class PriceChangedError extends Error {
  code = 'PRICE_CHANGED';
  quote: EffectivePriceQuote;
  constructor(quote: EffectivePriceQuote) {
    super('The selected price changed. Review the new quote before continuing.');
    this.quote = quote;
  }
}

function quantity(value: unknown, fallback: number, minimum = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(50, Math.max(minimum, Math.floor(parsed)));
}

export async function secureCartPricing(
  input: unknown,
  options: { allowUnversionedQuote?: boolean } = {},
): Promise<SecureCartItem[]> {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) {
    throw new Error('Invalid cart');
  }

  return Promise.all(input.map(async (rawValue) => {
    const rawItem = rawValue as RawCartItem;
    const tourId = String(rawItem?._id || rawItem?.id || '');
    if (!mongoose.Types.ObjectId.isValid(tourId)) throw new Error('Invalid tour');

    const tour = await Tour.findOne({
      _id: tourId,
      isPublished: true,
      ...DEFAULT_TENANT_FILTER,
    }).select('_id title discountPrice discountPercent originalPrice bookingOptions addOns availability').lean() as unknown as LeanTour | null;
    if (!tour) throw new Error('Tour unavailable');

    const optionId = rawItem?.selectedBookingOption?.id
      ? String(rawItem.selectedBookingOption.id)
      : '';
    const requestedPricingKey = rawItem?.selectedBookingOption?.pricingKey ? String(rawItem.selectedBookingOption.pricingKey) : '';
    const optionIdIsStandard = !optionId || optionId === 'standard-default';
    const pricingKeyIsStandard = !requestedPricingKey || requestedPricingKey === STANDARD_OPTION_KEY;
    if (optionId && requestedPricingKey && optionIdIsStandard !== pricingKeyIsStandard) {
      throw new Error('Invalid booking option');
    }

    let option: SecureBookingOption;
    if (!optionIdIsStandard || !pricingKeyIsStandard) {
      const match = optionId.match(/^option-(\d+)$/);
      const pricingKeyIndex = requestedPricingKey
        ? tour.bookingOptions?.findIndex((candidate) => candidate?.pricingKey === requestedPricingKey)
        : undefined;
      const optionIdIndex = match
        ? Number(match[1])
        : optionId ? tour.bookingOptions?.findIndex((candidate) => String(candidate?._id || '') === optionId) : undefined;
      if (pricingKeyIndex !== undefined && optionIdIndex !== undefined && pricingKeyIndex !== optionIdIndex) {
        throw new Error('Invalid booking option');
      }
      const optionIndex = pricingKeyIndex ?? optionIdIndex;
      if (optionIndex === undefined || optionIndex < 0 || !tour.bookingOptions?.[optionIndex]) {
        throw new Error('Invalid booking option');
      }
      const dbOption = tour.bookingOptions[optionIndex];
      if (!dbOption.pricingKey) {
        throw new Error('Booking option pricing key is not configured');
      }
      // A stored option with no usable price must throw, never silently
      // price at 0 — check the raw number before the discount helper runs.
      if (!Number.isFinite(Number(dbOption.price)) || Number(dbOption.price) < 0) {
        throw new Error('Invalid catalogue price');
      }
      // Priced by the same helper as the resolver and the sidebar quote, so
      // the tour's percentage discount and per-slot overrides reach every
      // charge. Only identifiers are read from the cart — never a price.
      const requestedTime = rawItem?.selectedTime ? String(rawItem.selectedTime) : null;
      const slot = Array.isArray(dbOption.timeSlots) && requestedTime
        ? dbOption.timeSlots.find((entry) => entry.time === requestedTime)
        : undefined;
      const pricing = effectiveOptionPrice(tour, dbOption, slot);
      option = {
        id: `option-${optionIndex}`,
        pricingKey: dbOption.pricingKey,
        title: dbOption.label || `${tour.title} - ${dbOption.type}`,
        price: pricing.price,
        originalPrice: pricing.discountApplied
          ? pricing.originalPrice
          : Number(dbOption.originalPrice || tour.originalPrice || dbOption.price),
        duration: dbOption.duration,
        badge: dbOption.badge,
      };
    } else {
      if (!Number.isFinite(Number(tour.discountPrice)) || Number(tour.discountPrice) < 0) {
        throw new Error('Invalid catalogue price');
      }
      const requestedTime = rawItem?.selectedTime ? String(rawItem.selectedTime) : null;
      const selectedSlot = Array.isArray(tour.availability?.slots) && requestedTime
        ? tour.availability.slots.find((entry) => entry.time === requestedTime)
        : undefined;
      const pricing = effectiveTourPrice(tour, selectedSlot);
      option = {
        id: 'standard-default',
        pricingKey: STANDARD_OPTION_KEY,
        title: `${tour.title} - Standard Experience`,
        // The standard path honours a universal availability-slot price for
        // the selected time, exactly like the resolver's catalogue baseline.
        price: authoritativeBasePrice(tour, {
          selectedBookingOption: null,
          selectedTime: requestedTime,
        }),
        originalPrice: pricing.discountApplied
          ? pricing.originalPrice
          : Number(tour.originalPrice || tour.discountPrice),
      };
    }

    if (!Number.isFinite(option.price) || option.price < 0) throw new Error('Invalid catalogue price');

    let quote: EffectivePriceQuote | null = null;
    if (rawItem?.selectedDate && rawItem?.selectedTime) {
      quote = await resolveEffectivePrice({
        tourId,
        optionKey: option.pricingKey || STANDARD_OPTION_KEY,
        date: String(rawItem.selectedDate).slice(0, 10),
        time: String(rawItem.selectedTime),
      });
      if ((!options.allowUnversionedQuote && process.env.REVENUEPILOT_PRICING_API_ENABLED === 'true' && rawItem?.priceVersion === undefined) || (rawItem?.priceVersion !== undefined && Number(rawItem.priceVersion) !== quote.version)) {
        throw new PriceChangedError(quote);
      }
      if (rawItem?.priceSourceVersion !== undefined && String(rawItem.priceSourceVersion) !== quote.sourceVersion) {
        throw new PriceChangedError(quote);
      }
      option.price = quote.prices.adult;
    }

    // Checkout may only sell add-ons authored on the tour. Invented fallbacks
    // are not a pricing authority and must never appear in a mobile quote.
    const catalogueAddons = (tour.addOns || [])
      .map((addon) => ({
          id: addon?._id ? String(addon._id) : '',
          title: addon.name,
          price: Number(addon.price),
          category: addon.category || 'Experience',
          perGuest: isPerPersonAddOn(addon),
        }))
      .filter((addon) => Boolean(addon.id && addon.title) && Number.isFinite(addon.price) && addon.price >= 0);

    const selectedAddOns: Record<string, number> = {};
    const selectedAddOnDetails: Record<string, SecureAddOnDetail> = {};
    const requested = rawItem?.selectedAddOns;
    const entries: Array<[string, unknown]> = Array.isArray(requested)
      ? requested.map((addon) => [String(addon?.id || ''), addon?.quantity])
      : requested && typeof requested === 'object'
        ? Object.entries(requested)
        : [];

    for (const [id, rawQuantity] of entries) {
      const count = quantity(rawQuantity && typeof rawQuantity === 'object' && 'quantity' in rawQuantity
        ? rawQuantity.quantity
        : rawQuantity, 0);
      if (count === 0) continue;
      const addon = catalogueAddons.find((candidate) => String(candidate.id) === id);
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
      selectedDate: rawItem.selectedDate ? String(rawItem.selectedDate).slice(0, 10) : undefined,
      selectedTime: rawItem.selectedTime ? String(rawItem.selectedTime) : undefined,
      quantity: quantity(rawItem?.quantity, 1, 1),
      childQuantity: quantity(rawItem?.childQuantity, 0),
      infantQuantity: quantity(rawItem?.infantQuantity, 0),
      price: option.price,
      discountPrice: option.price,
      originalPrice: option.originalPrice,
      selectedBookingOption: option,
      guestPrices: quote?.prices || { adult: option.price, child: Math.round(option.price * 50) / 100, infant: 0 },
      priceVersion: quote?.version || 0,
      priceSourceVersion: quote?.sourceVersion || null,
      priceExecutionId: quote?.executionId || null,
      priceOverrideId: quote?.overrideId || null,
      priceSource: quote?.source === 'override' ? 'override' : 'catalogue',
      selectedAddOns,
      selectedAddOnDetails,
      availableAddOns: catalogueAddons,
    };
  }));
}

import { effectiveOptionPrice, effectiveTourPrice } from './effectivePrice';

interface StoredBookingOption {
  id?: string;
  _id?: unknown;
  pricingKey?: string;
  label?: string;
  price?: number;
  applyTourDiscount?: boolean;
  timeSlots?: Array<{ time?: string; price?: number }>;
}

interface StoredTour {
  discountPercent?: number;
  discountPrice?: number;
  price?: number;
  bookingOptions?: StoredBookingOption[];
  availability?: { slots?: Array<{ time?: string; price?: number }> };
}

interface CartItemLike {
  selectedBookingOption?: { id?: string; pricingKey?: string; price?: number } | null;
  selectedTime?: string | null;
  discountPrice?: number;
  price?: number;
}

export class AuthoritativePriceError extends Error {
  constructor(message: 'Pricing option unavailable' | 'Invalid catalogue price') {
    super(message);
    this.name = 'AuthoritativePriceError';
  }
}

/**
 * The price the customer may be charged for one guest of a cart item.
 *
 * Derived from the tour as stored, never from the cart the browser submitted:
 * a cart is user-supplied data, and the tour discount only exists server-side
 * as a percentage. Missing catalogue data fails closed instead of trusting a
 * price supplied by the customer.
 */
export function authoritativeBasePrice(
  tour: StoredTour | null | undefined,
  cartItem: CartItemLike | null | undefined,
): number {
  const requestedOptionId = cartItem?.selectedBookingOption?.id;
  // EEO booking options persist neither `id` nor `_id`; their stable identity
  // is the immutable `pricingKey`, so match on it first.
  const requestedPricingKey = cartItem?.selectedBookingOption?.pricingKey;
  const options = Array.isArray(tour?.bookingOptions) ? tour!.bookingOptions! : [];

  const option = (requestedPricingKey
    ? options.find((candidate) => String(candidate.pricingKey ?? '') === String(requestedPricingKey))
    : undefined)
    ?? (requestedOptionId
      ? options.find((candidate) => String(candidate.id ?? candidate._id ?? '') === String(requestedOptionId))
      : undefined);

  if ((requestedPricingKey || requestedOptionId) && !option) {
    throw new AuthoritativePriceError('Pricing option unavailable');
  }

  if (option) {
    const slot = Array.isArray(option.timeSlots) && cartItem?.selectedTime
      ? option.timeSlots.find((entry) => entry.time === cartItem.selectedTime)
      : undefined;
    return effectiveOptionPrice(tour, option, slot).price;
  }

  const universalSlot = Array.isArray(tour?.availability?.slots) && cartItem?.selectedTime
    ? tour.availability.slots.find((entry) => entry.time === cartItem.selectedTime)
    : undefined;
  if (typeof universalSlot?.price === 'number' && Number.isFinite(universalSlot.price)) {
    return effectiveTourPrice(tour, universalSlot).price;
  }

  // No option selected: apply the tour percentage to its own base price.
  const tourPrice = tour?.discountPrice ?? tour?.price;
  if (typeof tourPrice === 'number' && Number.isFinite(tourPrice)) {
    return effectiveTourPrice(tour).price;
  }

  throw new AuthoritativePriceError('Invalid catalogue price');
}

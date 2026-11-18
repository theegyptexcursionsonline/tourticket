/**
 * One place that decides what a booking option actually costs.
 *
 * A tour carries a discount as a percentage. Each booking option opts in to it
 * with `applyTourDiscount`, so an operator can discount some options and leave
 * others at full price. A time slot may override the option's base price, and
 * inherits it when left blank.
 *
 * Every surface that shows or charges a price must call this — the storefront
 * so the customer sees the right number, and the server so the customer is
 * charged that same number. Duplicating the arithmetic is how a quote and a
 * charge drift apart.
 */

export interface DiscountablePricing {
  /** Whole-number percentage off, e.g. 15 for 15%. */
  discountPercent?: number | null;
}

export interface PricedTour extends DiscountablePricing {
  price?: number | null;
  discountPrice?: number | null;
  originalPrice?: number | null;
}

export interface PricedOption {
  price?: number | null;
  applyTourDiscount?: boolean | null;
}

export interface PricedTimeSlot {
  time?: string | null;
  price?: number | null;
}

/** Round to cents so repeated percentage maths cannot drift. */
const toMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * A price a guest can actually be charged: a finite amount above zero.
 *
 * The catalogue has no free products, and card payment cannot take $0, so a
 * 0 or blank price is "not priced yet", never "free". An option with a 0 base
 * that prices each start time is priced by those times; an option with a 0
 * base and no start-time price has no price at all.
 */
export function isRealPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** The first candidate that is a real price, or null when none is. */
export function firstRealPrice(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (isRealPrice(candidate)) return candidate;
  }
  return null;
}

export function normalizeDiscountPercent(percent?: number | null): number {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return 0;
  if (percent <= 0) return 0;
  return Math.min(percent, 100);
}

export function applyDiscountPercent(amount: number, percent?: number | null): number {
  const pct = normalizeDiscountPercent(percent);
  if (pct === 0) return toMoney(amount);
  return toMoney(amount * (1 - pct / 100));
}

export function percentageOff(originalPrice?: number | null, price?: number | null): number {
  if (
    typeof originalPrice !== 'number'
    || !Number.isFinite(originalPrice)
    || originalPrice <= 0
    || typeof price !== 'number'
    || !Number.isFinite(price)
    || price >= originalPrice
  ) return 0;

  return Math.max(1, Math.min(100, Math.round(((originalPrice - price) / originalPrice) * 100)));
}

/**
 * What the tour's own base price costs. The editor stores the pre-discount
 * amount in the legacy `discountPrice` field; when a percentage is present,
 * it is the only discount input and is applied automatically. Existing tours
 * without a percentage retain their legacy original/discounted pair.
 */
export function effectiveTourPrice(
  tour: PricedTour | null | undefined,
  timeSlot?: PricedTimeSlot | null,
): { price: number; originalPrice: number; discountApplied: boolean } {
  const slotPrice = typeof timeSlot?.price === 'number' && Number.isFinite(timeSlot.price)
    ? timeSlot.price
    : null;
  const storedBase = typeof tour?.discountPrice === 'number' && Number.isFinite(tour.discountPrice)
    ? tour.discountPrice
    : (typeof tour?.price === 'number' && Number.isFinite(tour.price) ? tour.price : 0);
  const base = toMoney(Math.max(slotPrice ?? storedBase, 0));
  const discounted = applyDiscountPercent(base, tour?.discountPercent);

  if (discounted < base) {
    return { price: discounted, originalPrice: base, discountApplied: true };
  }

  const legacyOriginal = typeof tour?.originalPrice === 'number'
    && Number.isFinite(tour.originalPrice)
    && tour.originalPrice > base
    ? toMoney(tour.originalPrice)
    : base;
  return {
    price: base,
    originalPrice: legacyOriginal,
    discountApplied: legacyOriginal > base,
  };
}

/**
 * What this option costs, for a specific time slot when one is given.
 * Returns both the charged price and the pre-discount price, so a strikethrough
 * only ever renders when there is a real reduction to show.
 */
export function effectiveOptionPrice(
  tour: DiscountablePricing | null | undefined,
  option: PricedOption | null | undefined,
  timeSlot?: PricedTimeSlot | null,
): { price: number; originalPrice: number; discountApplied: boolean } {
  const slotPrice = typeof timeSlot?.price === 'number' && Number.isFinite(timeSlot.price)
    ? timeSlot.price
    : null;
  const base = slotPrice ?? (typeof option?.price === 'number' ? option.price : 0);
  const originalPrice = toMoney(Math.max(base, 0));

  if (!option?.applyTourDiscount) {
    return { price: originalPrice, originalPrice, discountApplied: false };
  }

  const price = applyDiscountPercent(originalPrice, tour?.discountPercent);
  return { price, originalPrice, discountApplied: price < originalPrice };
}

export interface PricedBookingOption extends PricedOption {
  /** "Per Person", "Per Group", "Per Family", "Per Couple"; missing means per person. */
  type?: string | null;
  timeSlots?: PricedTimeSlot[] | null;
}

const isPerPersonOption = (option: PricedBookingOption) => !option.type || /person/i.test(option.type);

/**
 * The cheapest price one guest can actually book: the lowest per-person option
 * (each time slot that sets its own price counts), through the same rule the
 * booking panel charges. The trip page headline showed the tour's base price
 * (e.g. $69.00) while every option, the cards and the cart charged $69.17;
 * headline, sticky bar and panel now all start from this number. Group,
 * family and couple options are not per-person prices and are left out.
 * A 0 quote is not a price (an option with a 0 base priced only per start
 * time, or one priced nowhere, showed the whole trip at $0.00), so it never
 * counts as the lowest.
 * Returns null when the tour has no priced per-person option (callers keep the base).
 */
export function lowestPerPersonPrice(
  tour: (PricedTour & { bookingOptions?: PricedBookingOption[] | null }) | null | undefined,
): { price: number; originalPrice: number; discountApplied: boolean } | null {
  const options = Array.isArray(tour?.bookingOptions)
    ? tour!.bookingOptions!.filter((option) => isPerPersonOption(option)
      && typeof option.price === 'number' && Number.isFinite(option.price) && option.price >= 0)
    : [];
  let best: { price: number; originalPrice: number; discountApplied: boolean } | null = null;
  for (const option of options) {
    const slots = Array.isArray(option.timeSlots) && option.timeSlots.length > 0 ? option.timeSlots : [undefined];
    for (const slot of slots) {
      const quote = effectiveOptionPrice(tour, option, slot);
      if (!isRealPrice(quote.price)) continue;
      if (!best || quote.price < best.price) best = quote;
    }
  }
  return best;
}

/**
 * The per-person price the trip page, the booking panel and the phone bar
 * show: the bookable minimum, else the tour's own base price — or null when
 * neither is a real price, so the page shows "price on request" instead of
 * advertising $0.00.
 */
export function bookableTripPrice(
  tour: (PricedTour & { bookingOptions?: PricedBookingOption[] | null }) | null | undefined,
): { price: number; originalPrice: number; discountApplied: boolean } | null {
  const lowest = lowestPerPersonPrice(tour);
  if (lowest) return lowest;
  const base = effectiveTourPrice(tour);
  return isRealPrice(base.price) ? base : null;
}

/**
 * A tour card's "from" price: the stored listing summary, else the tour's own
 * prices, skipping any that are 0 or blank. A summary built before 0 quotes
 * were excluded still holds 0 for a tour whose options price only some start
 * times; that is never the price to advertise. Null means no real price.
 */
export function listingFromPrice(tour: {
  pricingSummary?: { fromPrice?: number | null } | null;
  discountPrice?: number | null;
  originalPrice?: number | null;
} | null | undefined): number | null {
  return firstRealPrice(tour?.pricingSummary?.fromPrice, tour?.discountPrice, tour?.originalPrice);
}

/** What the trip page shows as its per-person price: the bookable minimum, else the base price. */
export function displayedTripPrice(
  tour: (PricedTour & { bookingOptions?: PricedBookingOption[] | null }) | null | undefined,
): { price: number; originalPrice: number; discountApplied: boolean } {
  return lowestPerPersonPrice(tour) ?? effectiveTourPrice(tour);
}

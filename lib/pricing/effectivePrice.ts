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

export interface PricingSummaryLike {
  /** Server projection: lowest catalogue price, or a lower price set for upcoming dates. */
  fromPrice?: number | null;
  /** Above 0 when date-specific prices fed the summary. */
  version?: number | null;
  /** Last date a date-specific price applies to. */
  validThrough?: Date | string | null;
}

export type CustomerPricedTour = PricedTour & {
  bookingOptions?: PricedBookingOption[] | null;
  pricingSummary?: PricingSummaryLike | null;
};

/**
 * A date-specific price below the catalogue that a customer can still book:
 * the server summary includes only active prices for upcoming dates that are
 * not stopped or sold out (refreshTourPricingSummary). Ignored once its last
 * date has passed, or when the summary was not built from such prices.
 */
function upcomingDatePrice(summary: PricingSummaryLike | null | undefined, now: Date): number | null {
  if (!summary || !(Number(summary.version) > 0) || !isRealPrice(summary.fromPrice)) return null;
  if (summary.validThrough) {
    const last = new Date(summary.validThrough);
    const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
    if (Number.isFinite(last.getTime()) && last.getTime() < today.getTime()) return null;
  }
  return summary.fromPrice;
}

/**
 * THE price a customer sees before choosing a date, everywhere: listing and
 * search cards, the trip page heading, the phone bar and the first step of the
 * booking panel. "From" the lowest per-person price that can actually be
 * booked: the cheapest bookable option or start time, or a lower price set for
 * an upcoming bookable date. Display only; checkout prices every booking on
 * the server. Null when nothing on the trip is priced ("price on request").
 *
 * Payloads without the booking options (most listing queries) use the server
 * summary, which is built from the same options; the stored base price is used
 * only when neither is available, because on 70 of 217 live tours it was a
 * figure no option sells at (19 Nov 2026: a $16.00 card for a $21.66 trip).
 */
export function customerFromPrice(
  tour: CustomerPricedTour | null | undefined,
  now: Date = new Date(),
): { price: number; originalPrice: number; discountApplied: boolean } | null {
  if (!tour) return null;
  const hasOptions = Array.isArray(tour.bookingOptions) && tour.bookingOptions.length > 0;
  let catalogue: { price: number; originalPrice: number; discountApplied: boolean } | null;
  if (hasOptions) {
    catalogue = lowestPerPersonPrice(tour);
    if (!catalogue && isRealPrice(tour.pricingSummary?.fromPrice)) {
      // Only whole-group options are priced: the summary holds their lowest.
      const summary = tour.pricingSummary!.fromPrice as number;
      catalogue = { price: summary, originalPrice: summary, discountApplied: false };
    }
    if (!catalogue) {
      const base = effectiveTourPrice(tour);
      catalogue = isRealPrice(base.price) ? base : null;
    }
  } else if (isRealPrice(tour.pricingSummary?.fromPrice)) {
    const summary = tour.pricingSummary!.fromPrice as number;
    catalogue = { price: summary, originalPrice: summary, discountApplied: false };
  } else {
    const base = effectiveTourPrice(tour);
    catalogue = isRealPrice(base.price) ? base : null;
  }
  const dated = upcomingDatePrice(tour.pricingSummary, now);
  if (dated !== null && (!catalogue || dated < catalogue.price)) {
    return { price: dated, originalPrice: dated, discountApplied: false };
  }
  return catalogue;
}

/**
 * The per-person price the trip page, the booking panel and the phone bar
 * show: the customer "from" price (customerFromPrice), or null when nothing is
 * a real price, so the page shows "price on request" instead of $0.00.
 */
export function bookableTripPrice(
  tour: CustomerPricedTour | null | undefined,
): { price: number; originalPrice: number; discountApplied: boolean } | null {
  return customerFromPrice(tour);
}

/**
 * A tour card's "from" price: the same rule as the trip page heading
 * (customerFromPrice). Null means no real price ("price on request").
 */
export function listingFromPrice(tour: CustomerPricedTour | null | undefined): number | null {
  return customerFromPrice(tour)?.price ?? null;
}

/**
 * The struck-through "was" price a listing card may show beside the customer
 * price: only a real reduction of the price actually shown (a discounted
 * option, or the stored base pair when the base is what is shown). A stored
 * original price beside a different, option-derived price is not a discount.
 */
export function listingCompareAtPrice(tour: CustomerPricedTour | null | undefined): number | null {
  const shown = customerFromPrice(tour);
  if (!shown) return null;
  if (shown.discountApplied && shown.originalPrice > shown.price) return shown.originalPrice;
  const base = effectiveTourPrice(tour);
  if (Math.abs(base.price - shown.price) < 0.005 && base.discountApplied && base.originalPrice > shown.price) {
    return base.originalPrice;
  }
  return null;
}

/** What the trip page shows as its per-person price: the bookable minimum, else the base price. */
export function displayedTripPrice(
  tour: (PricedTour & { bookingOptions?: PricedBookingOption[] | null }) | null | undefined,
): { price: number; originalPrice: number; discountApplied: boolean } {
  return lowestPerPersonPrice(tour) ?? effectiveTourPrice(tour);
}

/**
 * The few option fields customerFromPrice reads (price, type, discount opt-in
 * and start-time prices), for listing payloads that do not carry full options.
 * With them a card computes exactly the figure the trip page heading shows.
 */
export const OPTION_PRICE_FIELDS = [
  'bookingOptions.price', 'bookingOptions.type', 'bookingOptions.applyTourDiscount', 'bookingOptions.timeSlots.price',
] as const;

export function compactPriceOptions(options: unknown): PricedBookingOption[] | undefined {
  if (!Array.isArray(options)) return undefined;
  return options.map((option) => {
    const record = (option ?? {}) as Record<string, unknown>;
    const slots = Array.isArray(record.timeSlots) ? record.timeSlots : [];
    return {
      price: typeof record.price === 'number' ? record.price : null,
      type: typeof record.type === 'string' ? record.type : null,
      applyTourDiscount: record.applyTourDiscount === true,
      timeSlots: slots.map((slot) => ({ price: typeof (slot as Record<string, unknown>)?.price === 'number' ? (slot as Record<string, number>).price : null })),
    };
  });
}

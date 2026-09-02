export type AddOnPricingMethod = 'per_unit' | 'per_person';

export const ADD_ON_PRICING_METHODS: AddOnPricingMethod[] = ['per_unit', 'per_person'];
/**
 * Cart-line contract for manually chosen per-person add-on units. A missing
 * marker is the legacy contract where selecting a per-person add-on stored
 * quantity=1 as a boolean toggle and billed the whole paying party.
 */
export const ADD_ON_QUANTITY_VERSION = 1 as const;

export function hasChosenAddOnQuantities(value: unknown): boolean {
  return value === ADD_ON_QUANTITY_VERSION;
}

type AddOnLike = {
  pricingMethod?: string | null;
  perGuest?: boolean | null;
  category?: string | null;
};

/**
 * Whether an add-on is priced per person (the customer chooses up to one
 * unit per paying participant) or per unit.
 *
 * Precedence: explicit pricingMethod (admin-set) > explicit perGuest flag
 * (carried on cart/booking details) > legacy rule where only the Food
 * category was treated as per-person.
 */
export function isPerPersonAddOn(addOn: AddOnLike): boolean {
  if (addOn.pricingMethod === 'per_person') return true;
  if (addOn.pricingMethod === 'per_unit') return false;
  if (typeof addOn.perGuest === 'boolean') return addOn.perGuest;
  return addOn.category === 'Food';
}

export function resolveAddOnPricingMethod(addOn: AddOnLike): AddOnPricingMethod {
  return isPerPersonAddOn(addOn) ? 'per_person' : 'per_unit';
}

type StoredAddOnDetail = {
  perGuest?: boolean | null;
  /** Units the server billed for a per-person add-on (recorded since 2026-09). */
  quantity?: unknown;
};

const positiveInt = (value: unknown): number => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Units a stored add-on line was billed for, used by every surface that
 * re-renders a booking or order after the fact (booking detail pages,
 * receipts). Per-unit add-ons are the stored quantity. Per-person add-ons are
 * the quantity the guest chose (recorded on the detail by the server since the
 * client-sheet change of 2026-09). That recorded figure is the historical
 * source of truth and must not be re-derived from mutable guest fields. A
 * booking made before that change carries no recorded quantity and was billed
 * for the whole party, so it keeps rendering that way — never re-priced.
 */
export function storedAddOnUnits(
  detail: StoredAddOnDetail | null | undefined,
  storedQuantity: unknown,
  adults: number,
  children: number,
): number {
  const quantity = positiveInt(storedQuantity);
  if (!detail?.perGuest) return quantity;
  const recorded = positiveInt(detail.quantity);
  if (recorded > 0) return recorded;
  return positiveInt(adults) + positiveInt(children);
}

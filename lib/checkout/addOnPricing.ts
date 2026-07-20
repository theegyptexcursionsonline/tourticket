export type AddOnPricingMethod = 'per_unit' | 'per_person';

export const ADD_ON_PRICING_METHODS: AddOnPricingMethod[] = ['per_unit', 'per_person'];

type AddOnLike = {
  pricingMethod?: string | null;
  perGuest?: boolean | null;
  category?: string | null;
};

/**
 * Whether an add-on is priced per person (multiplied by paying guests)
 * or per unit (one flat price for the booking).
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

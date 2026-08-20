export type CheckoutGuestPrices = {
  adult: number;
  child: number;
  infant: number;
};

export type CheckoutAddOnDetail = {
  price: number;
  perGuest?: boolean;
};

/**
 * Present when the booking option prices per couple/family/group: one unit's
 * price and the participants it covers. `unitSize: 0` is the legacy
 * whole-booking group contract — one unit regardless of participants.
 */
export type CheckoutUnitPricing = {
  unitSize: number;
  unitPrice: number;
};

export type CheckoutPricedItem = {
  quantity?: number;
  childQuantity?: number;
  infantQuantity?: number;
  guestPrices: CheckoutGuestPrices;
  unitPricing?: CheckoutUnitPricing | null;
  selectedAddOns?: Record<string, unknown>;
  selectedAddOnDetails?: Record<string, CheckoutAddOnDetail>;
};

export type RecoveryPricedItem = {
  a?: number;
  c?: number;
  n?: number;
  bp?: number;
  gp?: Partial<CheckoutGuestPrices>;
  /** Unit size / unit price for unit-priced options (us may be 0 = whole booking). */
  us?: number;
  up?: number;
  ao?: Array<{ id?: string; q?: number; p?: number; pg?: boolean }>;
};

const finiteQuantity = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function checkoutGuestCount(item: CheckoutPricedItem) {
  return finiteQuantity(item.quantity)
    + finiteQuantity(item.childQuantity)
    + finiteQuantity(item.infantQuantity);
}

/** Paying guests for per-person add-on pricing: adults + children. Infants are free. */
export function checkoutAddOnGuestCount(item: CheckoutPricedItem) {
  return finiteQuantity(item.quantity) + finiteQuantity(item.childQuantity);
}

export function checkoutAddOnsTotal(item: CheckoutPricedItem) {
  let total = 0;
  const guestCount = checkoutAddOnGuestCount(item);
  for (const [addOnId, rawQuantity] of Object.entries(item.selectedAddOns || {})) {
    const quantity = finiteQuantity(
      rawQuantity && typeof rawQuantity === 'object' && 'quantity' in rawQuantity
        ? (rawQuantity as { quantity?: unknown }).quantity
        : rawQuantity,
    );
    const detail = item.selectedAddOnDetails?.[addOnId];
    if (!detail || quantity === 0 || !Number.isFinite(Number(detail.price)) || detail.price < 0) continue;
    // Per-person add-ons are a selection toggle: charge price × paying guests,
    // never × the stored quantity as well (older carts stored the guest count
    // there, which double-multiplied the charge).
    const units = detail.perGuest ? guestCount : quantity;
    total += detail.price * units;
  }
  return roundMoney(total);
}

/**
 * The tour part of an item's price, before add-ons. Unit-priced options
 * (per couple/family/group) charge whole units rounded UP over the total
 * participant count — 3 people on a per-couple option are 2 couples. A unit
 * size of 0 is the legacy whole-booking group: exactly one unit.
 */
export function checkoutTourSubtotal(item: CheckoutPricedItem) {
  const unit = item.unitPricing;
  if (unit && Number.isFinite(Number(unit.unitPrice)) && Number(unit.unitPrice) >= 0
    && Number.isFinite(Number(unit.unitSize)) && Number(unit.unitSize) >= 0) {
    const participants = Math.max(1, checkoutGuestCount(item));
    const units = unit.unitSize >= 1 ? Math.ceil(participants / unit.unitSize) : 1;
    return roundMoney(units * unit.unitPrice);
  }
  const adultTotal = item.guestPrices.adult * finiteQuantity(item.quantity);
  const childTotal = item.guestPrices.child * finiteQuantity(item.childQuantity);
  const infantTotal = item.guestPrices.infant * finiteQuantity(item.infantQuantity);
  return roundMoney(adultTotal + childTotal + infantTotal);
}

export function checkoutItemSubtotal(item: CheckoutPricedItem) {
  return roundMoney(checkoutTourSubtotal(item) + checkoutAddOnsTotal(item));
}

export function checkoutCartSubtotal(items: CheckoutPricedItem[]) {
  return roundMoney(items.reduce((total, item) => total + checkoutItemSubtotal(item), 0));
}

/** Convert the compact, server-created Stripe recovery record to the same
 * authoritative calculation used by normal checkout. */
export function recoveryCartItemSubtotal(item: RecoveryPricedItem) {
  const adult = Number(item.gp?.adult ?? item.bp ?? 0);
  const child = Number(item.gp?.child ?? adult / 2);
  const infant = Number(item.gp?.infant ?? 0);
  const selectedAddOns: Record<string, number> = {};
  const selectedAddOnDetails: Record<string, CheckoutAddOnDetail> = {};
  for (const [index, addOn] of (item.ao || []).entries()) {
    const id = addOn.id || `addon-${index}`;
    selectedAddOns[id] = finiteQuantity(addOn.q);
    selectedAddOnDetails[id] = {
      price: Number(addOn.p ?? 0),
      perGuest: Boolean(addOn.pg),
    };
  }
  return checkoutItemSubtotal({
    quantity: finiteQuantity(item.a),
    childQuantity: finiteQuantity(item.c),
    infantQuantity: finiteQuantity(item.n),
    guestPrices: { adult, child, infant },
    unitPricing: item.us !== undefined && Number.isFinite(Number(item.up))
      ? { unitSize: Number(item.us), unitPrice: Number(item.up) }
      : null,
    selectedAddOns,
    selectedAddOnDetails,
  });
}

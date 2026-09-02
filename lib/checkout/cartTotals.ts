import { clampAddOnQuantity, perPersonAddOnLimit } from '@/lib/bookings/bookingSelection';
import { hasChosenAddOnQuantities } from '@/lib/checkout/addOnPricing';

export type CheckoutGuestPrices = {
  adult: number;
  child: number;
  infant: number;
};

export type CheckoutAddOnDetail = {
  price: number;
  perGuest?: boolean;
  /** Units billed for a per-person add-on (recorded by the server). */
  quantity?: number;
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
  /** Server-priced carts carry all three values. Older browser carts may not. */
  guestPrices?: CheckoutGuestPrices;
  selectedBookingOption?: { price?: number } | null;
  discountPrice?: number;
  price?: number;
  unitPricing?: CheckoutUnitPricing | null;
  selectedAddOns?: Record<string, unknown>;
  selectedAddOnDetails?: Record<string, CheckoutAddOnDetail>;
  addOnQuantityVersion?: number;
};

export type RecoveryPricedItem = {
  /** Add-on quantity contract. 1 = q is the chosen/billed unit count; missing = legacy whole paying party. */
  aqv?: number;
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
  for (const [addOnId, rawQuantity] of Object.entries(item.selectedAddOns || {})) {
    const quantity = finiteQuantity(
      rawQuantity && typeof rawQuantity === 'object' && 'quantity' in rawQuantity
        ? (rawQuantity as { quantity?: unknown }).quantity
        : rawQuantity,
    );
    const detail = item.selectedAddOnDetails?.[addOnId];
    if (!detail || quantity === 0 || !Number.isFinite(Number(detail.price)) || detail.price < 0) continue;
    // A per-person add-on is billed for the units the guest chose, capped at
    // one per paying participant (adults + children) — never multiplied by
    // the party size on the guest's behalf, never above the party size, and
    // never for infants (client sheet EEO 24 Aug / MT 31 Aug). Older carts
    // that stored the guest count there land on the same cap.
    const units = checkoutAddOnUnits(item, addOnId);
    total += detail.price * units;
  }
  return roundMoney(total);
}

/**
 * Resolve one cart add-on without changing the meaning of pre-release carts.
 * New lines carry addOnQuantityVersion=1 and q is the chosen unit count;
 * unversioned per-person lines stored q=1 as a toggle and therefore retain
 * their original whole-paying-party charge.
 */
export function checkoutAddOnUnits(item: CheckoutPricedItem, addOnId: string) {
  const rawQuantity = item.selectedAddOns?.[addOnId];
  const quantity = finiteQuantity(
    rawQuantity && typeof rawQuantity === 'object' && 'quantity' in rawQuantity
      ? (rawQuantity as { quantity?: unknown }).quantity
      : rawQuantity,
  );
  const detail = item.selectedAddOnDetails?.[addOnId];
  if (!detail || quantity === 0) return 0;
  if (!detail.perGuest) return quantity;
  const payingParty = perPersonAddOnLimit(
    finiteQuantity(item.quantity),
    finiteQuantity(item.childQuantity),
  );
  return hasChosenAddOnQuantities(item.addOnQuantityVersion)
    ? clampAddOnQuantity(quantity, payingParty)
    : payingParty;
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
  // Current server-priced rows carry explicit prices. Preserve pre-migration
  // carts by falling back to the same catalogue base that their old UI used;
  // this fallback is display-only and checkout still re-prices from the DB.
  const basePrice = Number(
    item.guestPrices?.adult
      ?? item.selectedBookingOption?.price
      ?? item.discountPrice
      ?? item.price
      ?? 0,
  );
  const adultPrice = Number(item.guestPrices?.adult ?? basePrice);
  const childPrice = Number(item.guestPrices?.child ?? basePrice / 2);
  const infantPrice = Number(item.guestPrices?.infant ?? 0);
  const adultTotal = adultPrice * finiteQuantity(item.quantity);
  const childTotal = childPrice * finiteQuantity(item.childQuantity);
  const infantTotal = infantPrice * finiteQuantity(item.infantQuantity);
  return roundMoney(adultTotal + childTotal + infantTotal);
}

export function checkoutItemSubtotal(item: CheckoutPricedItem) {
  return roundMoney(checkoutTourSubtotal(item) + checkoutAddOnsTotal(item));
}

export function checkoutCartSubtotal(items: CheckoutPricedItem[]) {
  return roundMoney(items.reduce((total, item) => total + checkoutItemSubtotal(item), 0));
}

/**
 * Recover the billed units across the add-on rule migration. Payments already
 * in flight when the chosen-quantity release lands have no aqv marker and
 * must retain the old whole-paying-party charge. New quotes mark aqv=1 and
 * carry the exact server-billed chosen units in q.
 */
export function recoveryAddOnUnits(
  item: RecoveryPricedItem,
  addOn: { q?: number; pg?: boolean },
): number {
  const requested = finiteQuantity(addOn.q);
  if (!addOn.pg || requested === 0) return requested;
  if (item.aqv === 1) {
    return clampAddOnQuantity(requested, perPersonAddOnLimit(finiteQuantity(item.a), finiteQuantity(item.c)));
  }
  return Math.max(1, finiteQuantity(item.a) + finiteQuantity(item.c));
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
    selectedAddOns[id] = recoveryAddOnUnits(item, addOn);
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
    addOnQuantityVersion: item.aqv === 1 ? 1 : undefined,
    selectedAddOns,
    selectedAddOnDetails,
  });
}

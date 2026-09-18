import { clampAddOnQuantity, perPersonAddOnLimit } from '@/lib/bookings/bookingSelection';
import { hasChosenAddOnQuantities } from '@/lib/checkout/addOnPricing';
import { unitCountLabel } from '@/lib/bookings/unitPricing';

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
  /** `type` is the authored pricing type ("Per Person", "Per Group", ...); it only words a unit row, never prices it. */
  selectedBookingOption?: { price?: number; type?: string | null } | null;
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
 * One priced line of an item. The rows of an item ALWAYS add up to that
 * item's subtotal — that is the invariant, not a convention a consumer is
 * expected to re-derive. A per-group option therefore publishes a single
 * `units` row ("1 group x $650"), never adult/child rows: its price does not
 * scale with headcount, so there is no per-adult rate that could reproduce
 * the charge at any other party size.
 */
export type PriceBreakdownRowKind = 'adults' | 'children' | 'infants' | 'units' | 'addOns';

export interface PriceBreakdownRow {
  kind: PriceBreakdownRowKind;
  /** Guests on a guest row, whole units on a unit row, 0 on the aggregated add-ons row. */
  count: number;
  /** What one guest or one unit is charged. 0 on the add-ons row, which covers several lines. */
  unitPrice: number;
  amount: number;
  /** Customer wording for a unit row ("2 couples", "1 group"); absent on guest and add-on rows. */
  label?: string;
}

/** A breakdown that does not add up is a money defect, so it fails closed. */
export class PriceBreakdownMismatchError extends Error {
  code = 'PRICE_BREAKDOWN_MISMATCH';
  rows: PriceBreakdownRow[];
  subtotal: number;
  constructor(rows: PriceBreakdownRow[], subtotal: number) {
    const sum = roundMoney(rows.reduce((total, row) => total + row.amount, 0));
    super(`Price breakdown rows total ${sum} but the subtotal is ${roundMoney(subtotal)}.`);
    this.name = 'PriceBreakdownMismatchError';
    this.rows = rows;
    this.subtotal = subtotal;
  }
}

/** A total that is not its own subtotal plus fees/tax minus discount is a money defect. */
export class OrderTotalMismatchError extends Error {
  code = 'ORDER_TOTAL_MISMATCH';
  constructor(expected: number, actual: number) {
    super(`Order total ${roundMoney(actual)} does not reconcile to the expected ${roundMoney(expected)}.`);
    this.name = 'OrderTotalMismatchError';
  }
}

const usableUnitPricing = (unit?: CheckoutUnitPricing | null): unit is CheckoutUnitPricing =>
  Boolean(unit)
  && Number.isFinite(Number(unit!.unitPrice)) && Number(unit!.unitPrice) >= 0
  && Number.isFinite(Number(unit!.unitSize)) && Number(unit!.unitSize) >= 0;

/**
 * Whole units charged for a unit-priced item, rounded UP over the total
 * participant count — 3 people on a per-couple option are 2 couples. A unit
 * size of 0 is the legacy whole-booking group: exactly one unit. Returns 0
 * when the item is priced per guest.
 */
export function checkoutUnitCount(item: CheckoutPricedItem) {
  const unit = item.unitPricing;
  if (!usableUnitPricing(unit)) return 0;
  const participants = Math.max(1, checkoutGuestCount(item));
  return Number(unit.unitSize) >= 1 ? Math.ceil(participants / Number(unit.unitSize)) : 1;
}

/**
 * The single derivation of an item's tour charge. Everything that shows a
 * breakdown and everything that computes a subtotal reads these same rows,
 * so the two can never disagree.
 *
 * Amounts here are deliberately UNROUNDED: the subtotal rounds once, at the
 * item boundary, exactly as it did before rows existed.
 */
function rawTourRows(item: CheckoutPricedItem): PriceBreakdownRow[] {
  const unit = item.unitPricing;
  if (usableUnitPricing(unit)) {
    const units = checkoutUnitCount(item);
    return [{
      kind: 'units',
      count: units,
      unitPrice: Number(unit.unitPrice),
      amount: units * Number(unit.unitPrice),
      label: unitCountLabel(item.selectedBookingOption?.type, units),
    }];
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
  const prices: Array<[PriceBreakdownRowKind, number, number]> = [
    ['adults', finiteQuantity(item.quantity), Number(item.guestPrices?.adult ?? basePrice)],
    ['children', finiteQuantity(item.childQuantity), Number(item.guestPrices?.child ?? basePrice / 2)],
    ['infants', finiteQuantity(item.infantQuantity), Number(item.guestPrices?.infant ?? 0)],
  ];
  // A zero-AMOUNT row still belongs in the breakdown (free infants are a line
  // the customer entered); a zero-COUNT row does not.
  return prices
    .filter(([, count]) => count > 0)
    .map(([kind, count, unitPrice]) => ({ kind, count, unitPrice, amount: unitPrice * count }));
}

/**
 * The tour part of an item's price, before add-ons — the sum of its rows.
 */
export function checkoutTourSubtotal(item: CheckoutPricedItem) {
  return roundMoney(rawTourRows(item).reduce((total, row) => total + row.amount, 0));
}

export function checkoutItemSubtotal(item: CheckoutPricedItem) {
  return roundMoney(checkoutTourSubtotal(item) + checkoutAddOnsTotal(item));
}

/**
 * Every priced line of one item, add-ons included, guaranteed to add up to
 * `checkoutItemSubtotal(item)`. This is what any consumer that shows a
 * breakdown must render; none of them may multiply a guest price by a guest
 * count themselves, because that is wrong for every unit-priced option.
 */
export function checkoutItemBreakdown(item: CheckoutPricedItem): PriceBreakdownRow[] {
  const rows: PriceBreakdownRow[] = rawTourRows(item).map((row) => ({
    ...row,
    unitPrice: roundMoney(row.unitPrice),
    amount: roundMoney(row.amount),
  }));
  const addOnsTotal = checkoutAddOnsTotal(item);
  if (addOnsTotal > 0) {
    rows.push({ kind: 'addOns', count: 0, unitPrice: 0, amount: addOnsTotal });
  }
  const subtotal = checkoutItemSubtotal(item);
  const reconciled = allocateRoundingResidual(rows, subtotal);
  assertBreakdownReconciles(reconciled, subtotal);
  return reconciled;
}

/**
 * Rounding each row can leave the rows a cent or two away from a subtotal
 * that rounds once. That residual belongs on the largest line so the rows
 * still add up to the amount that is charged. Anything larger than per-row
 * rounding noise is a structural break, not rounding, and fails closed.
 */
function allocateRoundingResidual(rows: PriceBreakdownRow[], subtotal: number): PriceBreakdownRow[] {
  if (rows.length === 0) return rows;
  const residual = roundMoney(roundMoney(subtotal) - rows.reduce((total, row) => total + row.amount, 0));
  if (residual === 0) return rows;
  if (Math.abs(residual) > roundMoney(0.01 * rows.length)) {
    throw new PriceBreakdownMismatchError(rows, subtotal);
  }
  let target = 0;
  rows.forEach((row, index) => {
    if (Math.abs(row.amount) > Math.abs(rows[target].amount)) target = index;
  });
  return rows.map((row, index) => (
    index === target ? { ...row, amount: roundMoney(row.amount + residual) } : row
  ));
}

/** Breakdown rows must add up to the subtotal. Throws when they do not. */
export function assertBreakdownReconciles(rows: PriceBreakdownRow[], subtotal: number): void {
  const sum = roundMoney(rows.reduce((total, row) => total + row.amount, 0));
  if (sum !== roundMoney(subtotal)) {
    throw new PriceBreakdownMismatchError(rows, subtotal);
  }
}

/**
 * The order total must be its own subtotal plus fees and tax, minus the
 * discount, floored at zero (a discount larger than the order does not
 * create a refund). Throws when it does not. Call this wherever a total is
 * computed for a charge, so a future pricing change cannot quietly ship a
 * total that contradicts the breakdown the customer was shown.
 */
export function assertOrderTotalReconciles(pricing: {
  subtotal: number;
  serviceFee?: number;
  tax?: number;
  discount?: number;
  total: number;
}): void {
  const value = (candidate: unknown) => {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const expected = roundMoney(Math.max(0, roundMoney(
    value(pricing.subtotal) + value(pricing.serviceFee) + value(pricing.tax) - value(pricing.discount),
  )));
  if (roundMoney(value(pricing.total)) !== expected) {
    throw new OrderTotalMismatchError(expected, value(pricing.total));
  }
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

export type CheckoutGuestPrices = {
  adult: number;
  child: number;
  infant: number;
};

export type CheckoutAddOnDetail = {
  price: number;
  perGuest?: boolean;
};

export type CheckoutPricedItem = {
  quantity?: number;
  childQuantity?: number;
  infantQuantity?: number;
  guestPrices: CheckoutGuestPrices;
  selectedAddOns?: Record<string, unknown>;
  selectedAddOnDetails?: Record<string, CheckoutAddOnDetail>;
};

export type RecoveryPricedItem = {
  a?: number;
  c?: number;
  n?: number;
  bp?: number;
  gp?: Partial<CheckoutGuestPrices>;
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

export function checkoutAddOnsTotal(item: CheckoutPricedItem) {
  let total = 0;
  const guestCount = checkoutGuestCount(item);
  for (const [addOnId, rawQuantity] of Object.entries(item.selectedAddOns || {})) {
    const quantity = finiteQuantity(
      rawQuantity && typeof rawQuantity === 'object' && 'quantity' in rawQuantity
        ? (rawQuantity as { quantity?: unknown }).quantity
        : rawQuantity,
    );
    const detail = item.selectedAddOnDetails?.[addOnId];
    if (!detail || quantity === 0 || !Number.isFinite(Number(detail.price)) || detail.price < 0) continue;
    total += detail.price * quantity * (detail.perGuest ? guestCount : 1);
  }
  return roundMoney(total);
}

export function checkoutItemSubtotal(item: CheckoutPricedItem) {
  const adultTotal = item.guestPrices.adult * finiteQuantity(item.quantity);
  const childTotal = item.guestPrices.child * finiteQuantity(item.childQuantity);
  const infantTotal = item.guestPrices.infant * finiteQuantity(item.infantQuantity);
  return roundMoney(adultTotal + childTotal + infantTotal + checkoutAddOnsTotal(item));
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
    selectedAddOns,
    selectedAddOnDetails,
  });
}

import { applyDiscountPercent } from '@/lib/pricing/effectivePrice';

export type ComparableGuestPrices = { adult: number; child: number; infant: number };

export function guestPricesEqual(left: unknown, right: unknown) {
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  return (['adult', 'child', 'infant'] as const).every((guest) => {
    const first = Number((left as Record<string, unknown>)[guest]);
    const second = Number((right as Record<string, unknown>)[guest]);
    return Number.isFinite(first) && Number.isFinite(second) && first === second;
  });
}

export function explicitCatalogueGuestPrices(adult: number, explicit?: Partial<ComparableGuestPrices> | null) {
  const candidate = { adult: Number(explicit?.adult), child: Number(explicit?.child), infant: Number(explicit?.infant) };
  const verified = (['adult', 'child', 'infant'] as const).every((guest) => Number.isFinite(candidate[guest]) && candidate[guest] >= 0)
    && candidate.adult === adult;
  return { prices: verified ? candidate : { adult, child: Math.round(adult * 50) / 100, infant: 0 }, verified };
}

const finiteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Resolve a slot's customer prices from stored catalogue values. Slot child
 * and infant prices are independent optional overrides; a blank value inherits
 * the option/tour guest price. The same percentage that changes the adult slot
 * price is applied to every explicit guest price, preventing display/checkout
 * drift.
 */
export function effectiveSlotGuestPrices(input: {
  adult: number;
  base?: Partial<ComparableGuestPrices> | null;
  slot?: { guestPrices?: { child?: number; infant?: number } } | null;
  discountPercent?: number | null;
  applyDiscount?: boolean;
}): ComparableGuestPrices {
  const price = (value: number) => input.applyDiscount
    ? applyDiscountPercent(value, input.discountPercent)
    : Math.round(value * 100) / 100;
  const childSource = finiteNonNegative(input.slot?.guestPrices?.child)
    ? input.slot!.guestPrices!.child!
    : (finiteNonNegative(input.base?.child) ? input.base!.child! : null);
  const infantSource = finiteNonNegative(input.slot?.guestPrices?.infant)
    ? input.slot!.guestPrices!.infant!
    : (finiteNonNegative(input.base?.infant) ? input.base!.infant! : null);
  return {
    adult: input.adult,
    child: childSource === null ? Math.round(input.adult * 50) / 100 : price(childSource),
    infant: infantSource === null ? 0 : price(infantSource),
  };
}

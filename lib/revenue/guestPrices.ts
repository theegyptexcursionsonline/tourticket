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

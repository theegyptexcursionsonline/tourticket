export interface OptionBoundTimeSlot {
  id: string;
  optionId?: string;
}

export interface BookingOptionWithSlots<TSlot extends OptionBoundTimeSlot = OptionBoundTimeSlot> {
  id: string;
  timeSlots?: TSlot[];
}

/**
 * Slot ids commonly repeat between booking options (for example both options
 * may offer a `10:00` slot). Bind the owning option so UI state and checkout
 * can identify the selected price unambiguously.
 */
export function bindTimeSlotsToOption<TSlot extends OptionBoundTimeSlot>(
  optionId: string,
  timeSlots: TSlot[],
): Array<TSlot & { optionId: string }> {
  return timeSlots.map((slot) => ({ ...slot, optionId }));
}

export function isSelectedTimeSlot(
  selected: OptionBoundTimeSlot | null | undefined,
  optionId: string,
  slotId: string,
): boolean {
  if (!selected) return false;
  return selected.optionId === optionId && selected.id === slotId;
}

export function findSelectedBookingOption<
  TSlot extends OptionBoundTimeSlot,
  TOption extends BookingOptionWithSlots<TSlot>,
>(options: TOption[] | null | undefined, selected: TSlot | null | undefined): TOption | undefined {
  if (!selected || !options) return undefined;

  if (selected.optionId) {
    return options.find((option) => option.id === selected.optionId);
  }

  // Backward-compatible fallback for any selection restored from older cart
  // state. New selections always carry optionId.
  return options.find((option) => option.timeSlots?.some((slot) => slot.id === selected.id));
}

/** A card click toggles storage state: off → one unit, on → off. Per-person add-ons then step 1..N via the card's stepper. */
export function nextAddOnSelectionQuantity(currentQuantity: number): number {
  return currentQuantity > 0 ? 0 : 1;
}

/**
 * Highest number of units a guest may add of a per-person add-on: one per
 * paying participant (adults + children). Per-unit add-ons are governed by
 * their own maxQuantity. Client sheet (EEO 24 Aug / MT 31 Aug): a per-person
 * add-on must be chosen 1..N by the guest, never auto-multiplied.
 */
export function perPersonAddOnLimit(adults: number, children: number): number {
  const paying = Math.max(0, Math.floor(Number(adults) || 0)) + Math.max(0, Math.floor(Number(children) || 0));
  return Math.max(1, paying);
}

/** Clamp a requested add-on quantity into [1, limit]; invalid input counts as 1. */
export function clampAddOnQuantity(requested: number, limit: number): number {
  const q = Math.floor(Number(requested));
  if (!Number.isFinite(q) || q < 1) return 1;
  return Math.min(q, Math.max(1, Math.floor(limit)));
}

/**
 * Keep cart state aligned with what the UI shows and the server will bill
 * after a participant count changes. Entries at zero stay off; per-unit
 * quantities are left for their own catalogue limits.
 */
export function clampSelectedPerPersonAddOns(
  selected: Record<string, number>,
  addOns: Array<{ id: string; perGuest?: boolean }>,
  adults: number,
  children: number,
): Record<string, number> {
  const perPersonIds = new Set(addOns.filter((addOn) => addOn.perGuest).map((addOn) => addOn.id));
  const limit = perPersonAddOnLimit(adults, children);

  return Object.fromEntries(Object.entries(selected).map(([id, quantity]) => [
    id,
    perPersonIds.has(id) && Number(quantity) > 0
      ? clampAddOnQuantity(quantity, limit)
      : quantity,
  ]));
}

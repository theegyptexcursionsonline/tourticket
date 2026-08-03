interface TimeSlotLike {
  time?: string | null;
}

interface BookingOptionLike<TSlot extends TimeSlotLike = TimeSlotLike> {
  timeSlots?: TSlot[] | null;
}

function configuredTimes(availabilitySlots: readonly TimeSlotLike[] | null | undefined): Set<string> {
  return new Set(
    (availabilitySlots || [])
      .map((slot) => slot?.time)
      .filter((time): time is string => typeof time === 'string' && time.length > 0),
  );
}

/**
 * Keep option-specific slots inside the tour's universal availability set.
 * An empty option slot array retains its existing meaning: inherit all
 * universal slots.
 */
export function pruneBookingOptionTimeSlots<
  TSlot extends TimeSlotLike,
  TOption extends BookingOptionLike<TSlot>,
>(
  bookingOptions: readonly TOption[] | null | undefined,
  availabilitySlots: readonly TimeSlotLike[] | null | undefined,
): TOption[] {
  const allowed = configuredTimes(availabilitySlots);
  return (bookingOptions || []).map((option) => {
    if (!Array.isArray(option.timeSlots)) return option;
    return {
      ...option,
      timeSlots: option.timeSlots.filter((slot) => typeof slot.time === 'string' && allowed.has(slot.time)),
    };
  });
}

/** API guard used before persisting one option directly. */
export function hasOnlyConfiguredTimeSlots(
  optionSlots: readonly TimeSlotLike[] | null | undefined,
  availabilitySlots: readonly TimeSlotLike[] | null | undefined,
): boolean {
  if (!Array.isArray(optionSlots) || optionSlots.length === 0) return true;
  const allowed = configuredTimes(availabilitySlots);
  return optionSlots.every((slot) => typeof slot.time === 'string' && allowed.has(slot.time));
}

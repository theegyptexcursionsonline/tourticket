export type AssignedAddOn = {
  bookingOptionKeys?: unknown;
};

export function normalizedBookingOptionKeys(addOn: AssignedAddOn): string[] {
  if (!Array.isArray(addOn.bookingOptionKeys)) return [];
  return Array.from(new Set(addOn.bookingOptionKeys
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)));
}

/** Legacy/empty assignments deliberately mean "all booking options". */
export function isAddOnAvailableForOption(addOn: AssignedAddOn, optionKey?: string | null): boolean {
  const keys = normalizedBookingOptionKeys(addOn);
  if (keys.length === 0) return true;
  return Boolean(optionKey && keys.includes(optionKey));
}

export function groupAvailableAddOns<T extends AssignedAddOn & { groupKey?: string; groupTitle?: string }>(
  addOns: T[],
): Array<{ key: string; title: string; addOns: T[] }> {
  const groups = new Map<string, { key: string; title: string; addOns: T[] }>();

  addOns.forEach((addOn) => {
    const key = addOn.groupKey?.trim() || 'ungrouped';
    const group = groups.get(key) || {
      key,
      title: addOn.groupTitle?.trim() || '',
      addOns: [],
    };
    group.addOns.push(addOn);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

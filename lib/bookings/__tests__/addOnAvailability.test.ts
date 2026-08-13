import { groupAvailableAddOns, isAddOnAvailableForOption, normalizedBookingOptionKeys } from '@/lib/bookings/addOnAvailability';

describe('add-on booking-option assignments', () => {
  it('keeps legacy and explicitly universal add-ons available', () => {
    expect(isAddOnAvailableForOption({}, 'option-a')).toBe(true);
    expect(isAddOnAvailableForOption({ bookingOptionKeys: [] }, 'option-a')).toBe(true);
  });

  it('only exposes assigned add-ons to the matching durable option key', () => {
    const addOn = { bookingOptionKeys: [' option-a ', 'option-a', 'option-b'] };
    expect(normalizedBookingOptionKeys(addOn)).toEqual(['option-a', 'option-b']);
    expect(isAddOnAvailableForOption(addOn, 'option-a')).toBe(true);
    expect(isAddOnAvailableForOption(addOn, 'option-c')).toBe(false);
    expect(isAddOnAvailableForOption(addOn, null)).toBe(false);
  });

  it('preserves authored group order and optional titles for checkout rendering', () => {
    const groups = groupAvailableAddOns([
      { id: 'meal', groupKey: 'food', groupTitle: 'Food & Drink' },
      { id: 'photo', groupKey: 'media', groupTitle: '' },
      { id: 'dessert', groupKey: 'food', groupTitle: 'Food & Drink' },
    ]);

    expect(groups).toEqual([
      { key: 'food', title: 'Food & Drink', addOns: [expect.objectContaining({ id: 'meal' }), expect.objectContaining({ id: 'dessert' })] },
      { key: 'media', title: '', addOns: [expect.objectContaining({ id: 'photo' })] },
    ]);
  });
});

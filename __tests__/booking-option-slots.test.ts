import {
  hasOnlyConfiguredTimeSlots,
  pruneBookingOptionTimeSlots,
} from '@/lib/pricing/bookingOptionSlots';

describe('booking option slots stay inside universal availability', () => {
  const availability = [
    { time: '09:00', capacity: 10 },
    { time: '14:00', capacity: 5 },
  ];

  it('prunes a removed universal slot without changing valid slot prices', () => {
    expect(pruneBookingOptionTimeSlots([
      {
        label: 'Private',
        timeSlots: [
          { time: '09:00', price: 80 },
          { time: '12:00', price: 120 },
        ],
      },
    ], availability)).toEqual([
      { label: 'Private', timeSlots: [{ time: '09:00', price: 80 }] },
    ]);
  });

  it('preserves an empty slot array as the inherit-all representation', () => {
    expect(pruneBookingOptionTimeSlots([{ label: 'Group', timeSlots: [] }], availability))
      .toEqual([{ label: 'Group', timeSlots: [] }]);
  });

  it('rejects orphaned option slots at the API boundary', () => {
    expect(hasOnlyConfiguredTimeSlots([{ time: '09:00' }], availability)).toBe(true);
    expect(hasOnlyConfiguredTimeSlots([{ time: '12:00' }], availability)).toBe(false);
  });
});

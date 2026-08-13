import { finalizeAddOnAssignments, stripBookingOptionClientKeys } from '@/lib/admin/addOnAssignments';

describe('finalizeAddOnAssignments', () => {
  const options = [
    { clientKey: 'draft-one', pricingKey: 'standard-tour-a1b2c3d4e5f6', label: 'Standard' },
    { clientKey: 'draft-two', pricingKey: 'private-tour-f6e5d4c3b2a1', label: 'Private' },
  ];

  it('converts draft aliases to durable pricing keys and drops stale targets', () => {
    expect(finalizeAddOnAssignments([
      { name: 'Lunch', bookingOptionKeys: ['draft-two', 'deleted-option'] },
    ], options)).toEqual([
      { name: 'Lunch', bookingOptionKeys: ['private-tour-f6e5d4c3b2a1'] },
    ]);
  });

  it('preserves the empty-list all-options contract', () => {
    expect(finalizeAddOnAssignments([{ name: 'Photos' }], options)[0].bookingOptionKeys).toEqual([]);
  });

  it('never persists editor-only client identities', () => {
    expect(stripBookingOptionClientKeys(options)).toEqual([
      { pricingKey: 'standard-tour-a1b2c3d4e5f6', label: 'Standard' },
      { pricingKey: 'private-tour-f6e5d4c3b2a1', label: 'Private' },
    ]);
  });
});

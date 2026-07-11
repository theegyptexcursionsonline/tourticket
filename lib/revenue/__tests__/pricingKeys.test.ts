import { ensureBookingOptionPricingKeys } from '@/lib/revenue/pricingKeys';

describe('immutable pricing keys', () => {
  it('preserves existing keys and deterministically fills missing keys', () => {
    const options = [{ label: 'Premium Boat', type: 'Per Person' }, { label: 'Private', type: 'Group', pricingKey: 'private_locked' }];
    const first = ensureBookingOptionPricingKeys('507f1f77bcf86cd799439011', options)!;
    const reordered = ensureBookingOptionPricingKeys('507f1f77bcf86cd799439011', [first[1], first[0]])!;
    expect(first[1].pricingKey).toBe('private_locked');
    expect(reordered.map((option) => option.pricingKey)).toContain(first[0].pricingKey);
  });
});

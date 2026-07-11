import { buildQuoteBinding } from '../quoteBinding';

const input = {
  cart: [{ id: 'tour-1', selectedDate: '2026-08-01', selectedTime: '10:00', quantity: 2 }],
  customerEmail: 'Guest@Example.com',
  currency: 'USD',
  amountMinor: 12345,
};

describe('buildQuoteBinding', () => {
  it('is deterministic for the same authoritative quote', () => {
    expect(buildQuoteBinding(input)).toBe(buildQuoteBinding({ ...input, customerEmail: 'guest@example.com' }));
  });

  it('changes when identity, amount, currency, or cart changes', () => {
    const baseline = buildQuoteBinding(input);
    expect(buildQuoteBinding({ ...input, customerEmail: 'attacker@example.com' })).not.toBe(baseline);
    expect(buildQuoteBinding({ ...input, amountMinor: 12346 })).not.toBe(baseline);
    expect(buildQuoteBinding({ ...input, currency: 'EUR' })).not.toBe(baseline);
    expect(buildQuoteBinding({ ...input, cart: [{ ...input.cart[0], quantity: 3 }] })).not.toBe(baseline);
  });
});

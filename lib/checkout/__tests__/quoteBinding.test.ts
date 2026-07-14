import { buildQuoteBinding } from '../quoteBinding';

const input = {
  cart: [{ id: 'tour-1', selectedDate: '2026-08-01', selectedTime: '10:00', quantity: 2 }],
  customerEmail: 'Guest@Example.com',
  currency: 'USD',
  amountMinor: 12345,
  checkoutAttemptId: '11111111-1111-4111-8111-111111111111',
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

  it('reuses a binding for a retry but creates a new binding for a new purchase attempt', () => {
    const baseline = buildQuoteBinding(input);
    expect(buildQuoteBinding({ ...input })).toBe(baseline);
    expect(buildQuoteBinding({
      ...input,
      checkoutAttemptId: '22222222-2222-4222-8222-222222222222',
    })).not.toBe(baseline);
  });
});

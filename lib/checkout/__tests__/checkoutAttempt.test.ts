import {
  buildCheckoutPaymentIdempotencyKey,
  CHECKOUT_ATTEMPT_STORAGE_KEY,
  completeCheckoutAttempt,
  getOrCreateCheckoutAttemptId,
  normalizeCheckoutAttemptId,
} from '../checkoutAttempt';
import { buildQuoteBinding } from '../quoteBinding';

const firstAttempt = '11111111-1111-4111-8111-111111111111';
const secondAttempt = '22222222-2222-4222-8222-222222222222';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

const quote = (checkoutAttemptId: string) => buildQuoteBinding({
  cart: [{ id: 'tour-1', selectedDate: '2026-08-01', selectedTime: '10:00', quantity: 2 }],
  customerEmail: 'guest@example.com',
  currency: 'USD',
  amountMinor: 12345,
  checkoutAttemptId,
});

describe('checkout attempt identity', () => {
  afterEach(() => completeCheckoutAttempt(null));

  it('accepts only strict UUID v4 identifiers', () => {
    expect(normalizeCheckoutAttemptId(` ${firstAttempt.toUpperCase()} `)).toBe(firstAttempt);
    expect(normalizeCheckoutAttemptId('11111111-1111-1111-8111-111111111111')).toBeNull();
    expect(normalizeCheckoutAttemptId('not-a-checkout-attempt')).toBeNull();
  });

  it('preserves one identifier across retries and remounts', () => {
    const storage = memoryStorage();
    expect(getOrCreateCheckoutAttemptId(storage, () => firstAttempt)).toBe(firstAttempt);
    expect(storage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY)).toBe(firstAttempt);
    expect(getOrCreateCheckoutAttemptId(storage, () => secondAttempt)).toBe(firstAttempt);
  });

  it('regenerates the identifier after a completed purchase', () => {
    const storage = memoryStorage();
    expect(getOrCreateCheckoutAttemptId(storage, () => firstAttempt)).toBe(firstAttempt);
    completeCheckoutAttempt(storage);
    expect(storage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY)).toBeNull();
    expect(getOrCreateCheckoutAttemptId(storage, () => secondAttempt)).toBe(secondAttempt);
  });

  it('reuses a PaymentIntent idempotency key for retries but not a new purchase', () => {
    const firstKey = buildCheckoutPaymentIdempotencyKey(quote(firstAttempt));
    expect(buildCheckoutPaymentIdempotencyKey(quote(firstAttempt))).toBe(firstKey);
    expect(buildCheckoutPaymentIdempotencyKey(quote(secondAttempt))).not.toBe(firstKey);
  });
});

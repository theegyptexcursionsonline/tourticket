/**
 * @jest-environment node
 */
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';

describe('CheckoutPaymentQuote indexes', () => {
  it('indexes the checkout attempt lookup made on every hosted checkout request', () => {
    const indexes = CheckoutPaymentQuote.schema.indexes().map(([fields]) => fields);
    expect(indexes).toContainEqual({ tenantId: 1, checkoutAttemptId: 1, createdAt: -1 });
  });
});

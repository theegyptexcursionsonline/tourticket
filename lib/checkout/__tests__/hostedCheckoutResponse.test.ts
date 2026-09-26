import { paidCheckoutReturnPath } from '@/lib/checkout/hostedCheckoutResponse';

describe('paidCheckoutReturnPath', () => {
  it('sends a guest who already paid to the booking return page', () => {
    expect(paidCheckoutReturnPath(409, { code: 'CHECKOUT_ALREADY_PAID', sessionId: 'cs_test_abc123' }, 'de'))
      .toBe('/de/checkout/return?session_id=cs_test_abc123');
  });

  it('shows the message when the paid page is not identified', () => {
    expect(paidCheckoutReturnPath(409, { code: 'CHECKOUT_ALREADY_PAID' }, 'en')).toBeNull();
  });

  it('never builds a return link from an unexpected id', () => {
    expect(paidCheckoutReturnPath(409, { code: 'CHECKOUT_ALREADY_PAID', sessionId: 'https://evil.example' }, 'en')).toBeNull();
  });

  it('ignores every other response', () => {
    expect(paidCheckoutReturnPath(409, { code: 'PRICE_CHANGED', sessionId: 'cs_test_abc123' }, 'en')).toBeNull();
    expect(paidCheckoutReturnPath(200, { code: 'CHECKOUT_ALREADY_PAID', sessionId: 'cs_test_abc123' }, 'en')).toBeNull();
  });
});

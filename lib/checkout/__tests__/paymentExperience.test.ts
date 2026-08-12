import {
  DEFAULT_PAYMENT_EXPERIENCE,
  isPaymentExperience,
  paymentExperienceForEndpoint,
  paymentExperienceOrDefault,
} from '@/lib/checkout/paymentExperience';

describe('checkout payment experience', () => {
  it.each(['inline', 'modal', 'hosted'])('accepts the supported %s experience', (value) => {
    expect(isPaymentExperience(value)).toBe(true);
    expect(paymentExperienceOrDefault(value)).toBe(value);
  });

  it.each([undefined, null, '', 'redirect', 'card', 1])('fails closed to the recommended modal for %p', (value) => {
    expect(isPaymentExperience(value)).toBe(false);
    expect(paymentExperienceOrDefault(value)).toBe(DEFAULT_PAYMENT_EXPERIENCE);
  });

  it('keeps hosted lifecycle selection server-owned', () => {
    expect(paymentExperienceForEndpoint('inline', 'hosted')).toBe('hosted');
    expect(paymentExperienceForEndpoint('modal', 'hosted')).toBe('hosted');
    expect(paymentExperienceForEndpoint('hosted', 'modal')).toBe('modal');
  });

  it('allows only the two Payment Element presentations on the intent endpoint', () => {
    expect(paymentExperienceForEndpoint('inline', 'modal')).toBe('inline');
    expect(paymentExperienceForEndpoint('modal', 'modal')).toBe('modal');
    expect(paymentExperienceForEndpoint('unknown', 'modal')).toBe('modal');
  });
});

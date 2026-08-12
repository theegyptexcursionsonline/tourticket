export const PAYMENT_EXPERIENCES = ['inline', 'modal', 'hosted'] as const;

export type PaymentExperience = (typeof PAYMENT_EXPERIENCES)[number];

export const DEFAULT_PAYMENT_EXPERIENCE: PaymentExperience = 'modal';

export function isPaymentExperience(value: unknown): value is PaymentExperience {
  return typeof value === 'string'
    && PAYMENT_EXPERIENCES.includes(value as PaymentExperience);
}

export function paymentExperienceOrDefault(value: unknown): PaymentExperience {
  return isPaymentExperience(value) ? value : DEFAULT_PAYMENT_EXPERIENCE;
}

/**
 * The route, not the browser, owns the payment lifecycle. Hosted Checkout has
 * different quote adoption and inventory semantics, so a caller must never be
 * able to opt into or out of it by changing the request body.
 */
export function paymentExperienceForEndpoint(
  requested: unknown,
  endpointExperience: PaymentExperience,
): PaymentExperience {
  if (endpointExperience === 'hosted') return 'hosted';
  return requested === 'inline' ? 'inline' : 'modal';
}

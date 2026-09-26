/**
 * Where the browser goes after asking for a hosted Stripe page. A checkout the
 * guest already paid is not an error: it opens the booking's return page.
 */
export function paidCheckoutReturnPath(
  status: number,
  payload: { code?: unknown; sessionId?: unknown },
  locale: string,
): string | null {
  if (
    status === 409
    && payload.code === 'CHECKOUT_ALREADY_PAID'
    && typeof payload.sessionId === 'string'
    && /^cs_(test|live)_[A-Za-z0-9]+$/.test(payload.sessionId)
  ) {
    return `/${locale}/checkout/return?session_id=${encodeURIComponent(payload.sessionId)}`;
  }
  return null;
}

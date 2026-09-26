import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';

export type PersistedWebhookQuote = {
  _id: unknown;
  paymentIntentId: string;
  checkoutSessionId?: string;
  quoteBinding: string;
  checkoutAttemptId?: string;
  paymentExperience?: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    emergencyContact?: string;
    hotelPickupDetails?: string;
    hotelPickupLocation?: { lat: number; lng: number; name?: string; address?: string; placeId?: string };
    specialRequests?: string;
  };
  cartSummary: unknown[];
  pricing: { subtotal: number; serviceFee: number; tax: number; discount: number; total: number; currency: string };
  discountCode?: string;
  inventoryState?: string;
};

export async function loadWebhookPaymentQuote(input: {
  paymentIntentId: string;
  tenantId: string;
  metadata: Record<string, string>;
}): Promise<PersistedWebhookQuote | null> {
  const direct = await CheckoutPaymentQuote.findOne({
    paymentIntentId: input.paymentIntentId,
    tenantId: input.tenantId,
  }).lean<PersistedWebhookQuote | null>();
  if (direct || input.metadata.checkout_experience !== 'hosted') return direct;

  const hostedQuote = await CheckoutPaymentQuote.findOne({
    tenantId: input.tenantId,
    paymentExperience: 'hosted',
    quoteBinding: input.metadata.quote_binding,
    checkoutAttemptId: input.metadata.checkout_attempt_id,
    checkoutSessionId: { $exists: true },
  }).lean<PersistedWebhookQuote | null>();
  if (!hostedQuote?.checkoutSessionId || hostedQuote.paymentIntentId !== hostedQuote.checkoutSessionId) {
    return null;
  }

  const adopted = await CheckoutPaymentQuote.findOneAndUpdate(
    {
      _id: hostedQuote._id,
      tenantId: input.tenantId,
      paymentIntentId: hostedQuote.checkoutSessionId,
    },
    { $set: { paymentIntentId: input.paymentIntentId } },
    { new: true },
  ).lean<PersistedWebhookQuote | null>();
  if (adopted) return adopted;

  // Stripe can deliver the same event concurrently. If another worker won the
  // compare-and-swap above, adopt its result instead of treating a valid paid
  // quote as missing and refunding it.
  return CheckoutPaymentQuote.findOne({
    paymentIntentId: input.paymentIntentId,
    tenantId: input.tenantId,
  }).lean<PersistedWebhookQuote | null>();
}

export type RecordedHostedCheckout = {
  checkoutSessionId: string;
  quoteBinding: string;
};

/**
 * Every Stripe page this checkout attempt opened that Stripe has not confirmed
 * closed, newest first. A page marked replaced stays listed until the close is
 * confirmed, so a request that died mid-replacement is finished by the next
 * one. Paid pages are included so a return to checkout sees them.
 */
export async function listHostedCheckoutsForAttempt(input: {
  checkoutAttemptId: string;
  tenantId?: string;
}): Promise<RecordedHostedCheckout[]> {
  const rows = await CheckoutPaymentQuote.find({
    tenantId: input.tenantId || 'default',
    paymentExperience: 'hosted',
    checkoutAttemptId: input.checkoutAttemptId,
    checkoutSessionId: { $exists: true },
    checkoutClosedAt: { $exists: false },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select({ checkoutSessionId: 1, quoteBinding: 1 })
    .lean<Array<{ checkoutSessionId?: string; quoteBinding: string }>>();
  return rows
    .filter((row): row is RecordedHostedCheckout => typeof row.checkoutSessionId === 'string')
    .map((row) => ({ checkoutSessionId: row.checkoutSessionId, quoteBinding: row.quoteBinding }));
}

export async function markHostedCheckoutSuperseded(checkoutSessionId: string, tenantId = 'default') {
  await CheckoutPaymentQuote.updateOne(
    { tenantId, checkoutSessionId, checkoutSupersededAt: { $exists: false } },
    { $set: { checkoutSupersededAt: new Date() } },
  );
}

/** A replaced page's expiry must not end the hold its replacement now uses. */
export async function isHostedCheckoutSuperseded(checkoutSessionId: string, tenantId = 'default') {
  return Boolean(await CheckoutPaymentQuote.exists({
    tenantId,
    checkoutSessionId,
    checkoutSupersededAt: { $exists: true },
  }));
}

export async function markHostedCheckoutClosed(checkoutSessionId: string, tenantId = 'default') {
  await CheckoutPaymentQuote.updateOne(
    { tenantId, checkoutSessionId },
    { $set: { checkoutClosedAt: new Date() } },
  );
}

/** Whether any payment of this checkout attempt, through any experience, became a booking. */
export async function hasPaidCheckoutForAttempt(input: { checkoutAttemptId: string; tenantId?: string }) {
  return Boolean(await CheckoutPaymentQuote.exists({
    tenantId: input.tenantId || 'default',
    checkoutAttemptId: input.checkoutAttemptId,
    inventoryState: 'converted',
  }));
}

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

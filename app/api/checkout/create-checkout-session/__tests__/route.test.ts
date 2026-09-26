const mockPrepare = jest.fn();
const mockPersist = jest.fn();
const mockCreateHolds = jest.fn();
const mockReleaseHolds = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionExpire = jest.fn();
const mockSessionRetrieve = jest.fn();
const mockAcquireLease = jest.fn();
const mockReleaseLease = jest.fn();
const mockCoverHolds = jest.fn();
const mockListHosted = jest.fn();
const mockSupersede = jest.fn();
const mockMarkClosed = jest.fn();
const mockHasPaid = jest.fn();
const mockAssertLease = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: init.status || 200,
      headers: init.headers || {},
      json: async () => body,
    }),
  },
}));

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockSessionCreate(...args),
        expire: (...args: unknown[]) => mockSessionExpire(...args),
        retrieve: (...args: unknown[]) => mockSessionRetrieve(...args),
      },
    },
  })),
}));
jest.mock('@/lib/checkout/webCheckoutPreparation', () => ({
  prepareWebCheckout: (...args: unknown[]) => mockPrepare(...args),
  persistPreparedCheckoutQuote: (...args: unknown[]) => mockPersist(...args),
  webCheckoutErrorResponse: jest.fn(() => null),
}));
jest.mock('@/lib/checkout/inventoryHolds', () => ({
  createInventoryHolds: (...args: unknown[]) => mockCreateHolds(...args),
  releaseInventoryHolds: (...args: unknown[]) => mockReleaseHolds(...args),
  acquireCheckoutInventoryLease: (...args: unknown[]) => mockAcquireLease(...args),
  releaseCheckoutInventoryLease: (...args: unknown[]) => mockReleaseLease(...args),
  coverInventoryHoldsUntil: (...args: unknown[]) => mockCoverHolds(...args),
  assertCheckoutInventoryLeaseHeld: (...args: unknown[]) => mockAssertLease(...args),
  InventoryHoldError: class InventoryHoldError extends Error {
    status = 409;
    constructor(public code: string, message: string) { super(message); }
  },
}));
jest.mock('@/lib/checkout/hostedCheckoutQuote', () => ({
  listHostedCheckoutsForAttempt: (...args: unknown[]) => mockListHosted(...args),
  markHostedCheckoutSuperseded: (...args: unknown[]) => mockSupersede(...args),
  markHostedCheckoutClosed: (...args: unknown[]) => mockMarkClosed(...args),
  hasPaidCheckoutForAttempt: (...args: unknown[]) => mockHasPaid(...args),
}));
jest.mock('@/lib/checkout/publicCheckoutOrigin', () => ({
  publicCheckoutOrigin: () => 'https://egypt-excursionsonline.com',
}));

import { POST } from '@/app/api/checkout/create-checkout-session/route';

const prepared = {
  checkoutAttemptId: '123e4567-e89b-42d3-a456-426614174000',
  paymentExperience: 'hosted',
  locale: 'en',
  customer: { email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer' },
  cart: [{ title: 'Nile Cruise' }],
  cartSummary: [{ t: '507f1f77bcf86cd799439011' }],
  pricing: { subtotal: 100, serviceFee: 3, tax: 5, discount: 0, total: 108, currency: 'USD' },
  amountMinor: 10_800,
  quoteBinding: 'a'.repeat(64),
  metadata: {
    quote_binding: 'a'.repeat(64),
    checkout_attempt_id: '123e4567-e89b-42d3-a456-426614174000',
    checkout_experience: 'hosted',
  },
};

describe('POST /api/checkout/create-checkout-session', () => {
  const originalStripeKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepare.mockResolvedValue(prepared);
    mockCreateHolds.mockResolvedValue([]);
    mockSessionCreate.mockResolvedValue({
      id: 'cs_test_hosted_1234567890',
      status: 'open',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_1234567890',
    });
    mockPersist.mockResolvedValue({ quoteBinding: prepared.quoteBinding });
    mockSessionExpire.mockResolvedValue({ status: 'expired' });
    mockReleaseHolds.mockResolvedValue(1);
    mockAcquireLease.mockResolvedValue('lease-token');
    mockReleaseLease.mockResolvedValue(undefined);
    mockCoverHolds.mockResolvedValue('covered');
    mockListHosted.mockResolvedValue([]);
    mockSupersede.mockResolvedValue(undefined);
    mockMarkClosed.mockResolvedValue(undefined);
    mockHasPaid.mockResolvedValue(false);
    mockAssertLease.mockResolvedValue(undefined);
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
  });

  afterAll(() => {
    if (originalStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalStripeKey;
  });

  it('creates a hosted Session from the server-authoritative total and preserves webhook metadata', async () => {
    const response = await POST(new Request('https://example.com/api/checkout/create-checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }));
    expect(response.status).toBe(200);
    expect(mockPrepare).toHaveBeenCalledWith(expect.anything(), {
      rateLimitAction: 'checkout-hosted-session',
      paymentExperience: 'hosted',
    });
    expect(mockCreateHolds).toHaveBeenCalledWith({
      reservationKey: prepared.quoteBinding,
      cart: prepared.cart,
      holdMinutes: 32,
    });
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        ui_mode: 'hosted',
        success_url: 'https://egypt-excursionsonline.com/en/checkout/return?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://egypt-excursionsonline.com/en/checkout?payment=cancelled',
        line_items: [expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 10_800 }) })],
        payment_intent_data: expect.objectContaining({ metadata: prepared.metadata }),
      }),
      { idempotencyKey: expect.stringMatching(new RegExp(`^tourticket-hosted-${prepared.quoteBinding}-[0-9a-f-]{36}$`)) },
    );
    expect(mockPersist).toHaveBeenCalledWith(expect.objectContaining({
      paymentIntentId: 'cs_test_hosted_1234567890',
      checkoutSessionId: 'cs_test_hosted_1234567890',
    }));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      sessionId: 'cs_test_hosted_1234567890',
    });
  });

  it('expires the provider Session and releases inventory when durable quote persistence fails', async () => {
    mockPersist.mockRejectedValueOnce(new Error('database unavailable'));
    const response = await POST(new Request('https://example.com/api/checkout/create-checkout-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }));
    expect(response.status).toBe(500);
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_hosted_1234567890');
    expect(mockReleaseHolds).toHaveBeenCalledWith({
      reservationKey: prepared.quoteBinding,
      reason: 'checkout_session_snapshot_failed',
    });
  });

  const post = () => POST(new Request('https://example.com/api/checkout/create-checkout-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  }));
  const nowSeconds = () => Math.floor(Date.now() / 1000);
  const recorded = (overrides: Record<string, unknown> = {}) => ({
    checkoutSessionId: 'cs_test_previous_1234567890',
    quoteBinding: prepared.quoteBinding,
    ...overrides,
  });
  const stripeSession = (overrides: Record<string, unknown> = {}) => ({
    id: 'cs_test_previous_1234567890',
    status: 'open',
    payment_status: 'unpaid',
    amount_total: 10_800,
    currency: 'usd',
    expires_at: nowSeconds() + 25 * 60,
    url: 'https://checkout.stripe.com/c/pay/cs_test_previous_1234567890',
    ...overrides,
  });

  it('gives every new Stripe page its own idempotency key, so a changed expiry is never replayed under an old key', async () => {
    await post();
    await post();
    expect(mockSessionCreate).toHaveBeenCalledTimes(2);
    const [, first] = mockSessionCreate.mock.calls[0];
    const [, second] = mockSessionCreate.mock.calls[1];
    expect(first.idempotencyKey).not.toEqual(second.idempotencyKey);
  });

  it('hands back the still-usable page when the guest returns to checkout', async () => {
    mockListHosted.mockResolvedValue([recorded()]);
    mockSessionRetrieve.mockResolvedValue(stripeSession());
    const response = await post();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      sessionId: 'cs_test_previous_1234567890',
      url: 'https://checkout.stripe.com/c/pay/cs_test_previous_1234567890',
    });
    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockSessionExpire).not.toHaveBeenCalled();
    expect(mockReleaseHolds).not.toHaveBeenCalled();
  });

  it('closes a page that is about to expire with Stripe before making its replacement, and covers the new page with the hold', async () => {
    mockListHosted.mockResolvedValue([recorded()]);
    mockSessionRetrieve.mockResolvedValue(stripeSession({ expires_at: nowSeconds() + 5 * 60 }));
    mockSessionExpire.mockResolvedValue(stripeSession({ status: 'expired' }));
    const response = await post();
    expect(response.status).toBe(200);
    expect(mockSupersede).toHaveBeenCalledWith('cs_test_previous_1234567890');
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_previous_1234567890');
    expect(mockSupersede.mock.invocationCallOrder[0]).toBeLessThan(mockSessionExpire.mock.invocationCallOrder[0]);
    expect(mockSessionExpire.mock.invocationCallOrder[0]).toBeLessThan(mockSessionCreate.mock.invocationCallOrder[0]);
    const [params] = mockSessionCreate.mock.calls[0];
    expect(mockCoverHolds).toHaveBeenCalledWith(expect.objectContaining({
      reservationKey: prepared.quoteBinding,
      itemCount: 1,
      until: new Date((params.expires_at + 60) * 1000),
    }));
    expect(mockCoverHolds.mock.invocationCallOrder[0]).toBeLessThan(mockSessionCreate.mock.invocationCallOrder[0]);
    // Same cart: the hold carries over to the new page and is never released.
    expect(mockReleaseHolds).not.toHaveBeenCalled();
  });

  it('never opens a second page when the guest already paid on the first', async () => {
    mockListHosted.mockResolvedValue([recorded()]);
    mockSessionRetrieve.mockResolvedValue(stripeSession({ status: 'complete', payment_status: 'paid' }));
    const response = await post();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'CHECKOUT_ALREADY_PAID' });
    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockReleaseHolds).not.toHaveBeenCalled();
  });

  it('never opens a second page when the guest pays while the old page is being closed', async () => {
    mockListHosted.mockResolvedValue([recorded()]);
    mockSessionRetrieve.mockResolvedValue(stripeSession({ expires_at: nowSeconds() + 60 }));
    mockSessionExpire.mockResolvedValue(stripeSession({ status: 'complete', payment_status: 'paid' }));
    const response = await post();
    expect(response.status).toBe(409);
    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockReleaseHolds).not.toHaveBeenCalled();
  });

  it('fails closed when Stripe will not close the old page', async () => {
    mockListHosted.mockResolvedValue([recorded()]);
    mockSessionRetrieve.mockResolvedValue(stripeSession({ expires_at: nowSeconds() + 60 }));
    mockSessionExpire.mockRejectedValue(Object.assign(new Error('Stripe unavailable'), { type: 'StripeAPIError' }));
    const response = await post();
    expect(response.status).toBe(500);
    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockReleaseHolds).not.toHaveBeenCalled();
  });

  it('closes the old page and frees its seats when the guest changed the cart in the same checkout', async () => {
    const oldBinding = 'b'.repeat(64);
    mockListHosted.mockResolvedValue([recorded({ quoteBinding: oldBinding })]);
    mockSessionRetrieve.mockResolvedValue(stripeSession());
    mockSessionExpire.mockResolvedValue(stripeSession({ status: 'expired' }));
    const response = await post();
    expect(response.status).toBe(200);
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_previous_1234567890');
    expect(mockReleaseHolds).toHaveBeenCalledWith({ reservationKey: oldBinding, reason: 'checkout_session_replaced', onlyUnbound: true });
    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
  });

  it('keeps the seats when Stripe did not answer, because the page may exist and still take payment', async () => {
    mockSessionCreate.mockRejectedValue(Object.assign(new Error('socket hang up'), { type: 'StripeConnectionError' }));
    const response = await post();
    expect(response.status).toBe(500);
    expect(mockReleaseHolds).not.toHaveBeenCalled();
  });

  it('frees the seats when Stripe refused to make the page', async () => {
    mockSessionCreate.mockRejectedValue(Object.assign(new Error('bad request'), { type: 'StripeInvalidRequestError' }));
    const response = await post();
    expect(response.status).toBe(500);
    expect(mockReleaseHolds).toHaveBeenCalledWith({
      reservationKey: prepared.quoteBinding,
      reason: 'checkout_session_creation_failed',
    });
  });

  it('lets only one request at a time prepare a checkout, and always gives the lease back', async () => {
    await post();
    expect(mockAcquireLease).toHaveBeenCalledWith(`hosted-checkout:${prepared.checkoutAttemptId}`, 20_000);
    expect(mockAcquireLease.mock.invocationCallOrder[0]).toBeLessThan(mockSessionCreate.mock.invocationCallOrder[0]);
    expect(mockReleaseLease).toHaveBeenCalledWith(`hosted-checkout:${prepared.checkoutAttemptId}`, 'lease-token');
  });

  it('renews an old hold through a fresh availability check instead of extending it forever', async () => {
    mockCoverHolds.mockResolvedValueOnce('stale').mockResolvedValueOnce('covered');
    const response = await post();
    expect(response.status).toBe(200);
    expect(mockReleaseHolds).toHaveBeenCalledWith({ reservationKey: prepared.quoteBinding, reason: 'checkout_hold_renewed' });
    expect(mockCreateHolds).toHaveBeenCalledTimes(2);
    expect(mockCoverHolds).toHaveBeenCalledTimes(2);
  });

  it('keeps a page visible until Stripe confirms it closed, so a later request retries the close', async () => {
    mockListHosted.mockResolvedValue([recorded()]);
    mockSessionRetrieve.mockResolvedValue(stripeSession({ expires_at: nowSeconds() + 60 }));
    mockSessionExpire.mockRejectedValue(Object.assign(new Error('timeout'), { type: 'StripeConnectionError' }));
    await post();
    expect(mockMarkClosed).not.toHaveBeenCalled();

    jest.clearAllMocks();
    mockSessionExpire.mockResolvedValue(stripeSession({ status: 'expired' }));
    await post();
    expect(mockMarkClosed).toHaveBeenCalledWith('cs_test_previous_1234567890');
    expect(mockSessionExpire.mock.invocationCallOrder[0]).toBeLessThan(mockMarkClosed.mock.invocationCallOrder[0]);
  });

  it('does not hand back a page whose seats are gone; it closes it and starts a fresh reservation', async () => {
    mockListHosted.mockResolvedValue([recorded()]);
    mockSessionRetrieve.mockResolvedValue(stripeSession());
    mockSessionExpire.mockResolvedValue(stripeSession({ status: 'expired' }));
    mockCoverHolds
      .mockRejectedValueOnce(Object.assign(new Error('lapsed'), { code: 'INVENTORY_HOLD_MISSING' }))
      .mockResolvedValue('covered');
    const response = await post();
    expect(response.status).toBe(200);
    expect(mockCoverHolds.mock.calls[0][0]).toMatchObject({ reservationKey: prepared.quoteBinding, itemCount: 1 });
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_previous_1234567890');
    expect(mockCreateHolds).toHaveBeenCalled();
    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
  });

  it('refuses a new page when this checkout was already paid another way', async () => {
    mockHasPaid.mockResolvedValue(true);
    const response = await post();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'CHECKOUT_ALREADY_PAID' });
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('checks it still holds the lease right before creating a page', async () => {
    mockAssertLease.mockRejectedValue(Object.assign(new Error('lease lost'), { code: 'INVENTORY_BUSY' }));
    const response = await post();
    expect(response.status).toBe(500);
    expect(mockAssertLease).toHaveBeenCalledWith(`hosted-checkout:${prepared.checkoutAttemptId}`, 'lease-token');
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('tells the browser which page was paid, so it can show the booking instead of an error', async () => {
    mockListHosted.mockResolvedValue([recorded()]);
    mockSessionRetrieve.mockResolvedValue(stripeSession({ status: 'complete', payment_status: 'paid' }));
    const response = await post();
    await expect(response.json()).resolves.toMatchObject({
      code: 'CHECKOUT_ALREADY_PAID',
      sessionId: 'cs_test_previous_1234567890',
    });
  });
});

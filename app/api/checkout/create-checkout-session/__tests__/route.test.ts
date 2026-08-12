const mockPrepare = jest.fn();
const mockPersist = jest.fn();
const mockCreateHolds = jest.fn();
const mockReleaseHolds = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionExpire = jest.fn();

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
      { idempotencyKey: `tourticket-hosted-${prepared.quoteBinding}` },
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
});

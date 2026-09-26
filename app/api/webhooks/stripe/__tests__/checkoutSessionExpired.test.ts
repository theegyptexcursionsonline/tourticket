const mockConstructEvent = jest.fn();
const mockReleaseHolds = jest.fn();
const mockIsSuperseded = jest.fn();
const mockQuoteUpdateOne = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number } = {}) => ({ status: init.status || 200, json: async () => body }),
  },
}));
jest.mock('next/headers', () => ({
  headers: async () => ({ get: () => 't=1,v1=signature' }),
}));
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({ webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) } })),
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Discount', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({
  __esModule: true,
  default: { updateOne: (...args: unknown[]) => mockQuoteUpdateOne(...args) },
}));
jest.mock('@/lib/email/emailService', () => ({ EmailService: {} }));
jest.mock('@/lib/checkout/webhookOutcomeLog', () => ({ recordWebhookOutcome: jest.fn() }));
jest.mock('@/lib/bookings/refunds', () => ({ reconcileStripeBookingRefund: jest.fn(), reconcileUnboundStripeRefund: jest.fn() }));
jest.mock('@/lib/bookings/refundNotifications', () => ({ sendBookingRefundNotification: jest.fn() }));
jest.mock('@/lib/checkout/paymentFailedNotification', () => ({ notifyPaymentFailed: jest.fn() }));
jest.mock('@/lib/bookings/checkoutNotificationDelivery', () => ({ deliverCheckoutNotifications: jest.fn() }));
jest.mock('@/lib/integrations/bookingEventProducers', () => ({ queuePersistedBookingEvent: jest.fn() }));
jest.mock('@/lib/checkout/inventoryPaymentRecovery', () => ({
  markPaymentInventoryConverted: jest.fn(),
  refundUnavailablePaidInventory: jest.fn(),
  releasePaymentInventory: jest.fn(),
}));
jest.mock('@/lib/checkout/inventoryHolds', () => ({
  acquireCheckoutInventoryLease: jest.fn(),
  bindInventoryHoldsToPayment: jest.fn(),
  convertInventoryHold: jest.fn(),
  ensureInventoryHoldsForPayment: jest.fn(),
  InventoryHoldError: class InventoryHoldError extends Error {},
  releaseInventoryHolds: (...args: unknown[]) => mockReleaseHolds(...args),
  releaseCheckoutInventoryLease: jest.fn(),
}));
jest.mock('@/lib/checkout/hostedCheckoutQuote', () => ({
  isHostedCheckoutSuperseded: (...args: unknown[]) => mockIsSuperseded(...args),
  loadWebhookPaymentQuote: jest.fn(),
}));

import { POST } from '@/app/api/webhooks/stripe/route';

const binding = 'c'.repeat(64);

function expiredEvent() {
  return {
    id: 'evt_test_expired',
    type: 'checkout.session.expired',
    data: {
      object: {
        id: 'cs_test_expired_1234567890',
        metadata: { checkout_experience: 'hosted', quote_binding: binding },
      },
    },
  };
}

describe('Stripe webhook: checkout.session.expired', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';
    mockConstructEvent.mockReturnValue(expiredEvent());
    mockReleaseHolds.mockResolvedValue(1);
    mockQuoteUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  });
  afterAll(() => { process.env = env; });

  const deliver = () => POST({ text: async () => '{}' } as unknown as Request);

  it('frees the seats when the current page expires', async () => {
    mockIsSuperseded.mockResolvedValue(false);
    const response = await deliver();
    expect(response.status).toBe(200);
    expect(mockReleaseHolds).toHaveBeenCalledWith(expect.objectContaining({
      reservationKey: binding,
      reason: 'checkout_session_expired',
    }));
  });

  it('keeps the seats when a replaced page expires, because the new page is paying for them', async () => {
    mockIsSuperseded.mockResolvedValue(true);
    const response = await deliver();
    expect(response.status).toBe(200);
    expect(mockIsSuperseded).toHaveBeenCalledWith('cs_test_expired_1234567890', expect.any(String));
    expect(mockReleaseHolds).not.toHaveBeenCalled();
    // The replaced page's own quote is still closed out.
    expect(mockQuoteUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ checkoutSessionId: 'cs_test_expired_1234567890' }),
      expect.anything(),
    );
  });
});

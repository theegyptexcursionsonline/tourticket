/** @jest-environment node */
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
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: { find: jest.fn(), create: jest.fn(), updateMany: jest.fn() } }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: { findById: jest.fn() } }));
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
  InventoryHoldError: class InventoryHoldError extends Error { constructor(public code: string, message: string) { super(message); } },
  releaseInventoryHolds: (...args: unknown[]) => mockReleaseHolds(...args),
  releaseCheckoutInventoryLease: jest.fn(),
}));
jest.mock('@/lib/checkout/hostedCheckoutQuote', () => ({
  isHostedCheckoutSuperseded: (...args: unknown[]) => mockIsSuperseded(...args),
  loadWebhookPaymentQuote: jest.fn(),
}));


import { POST } from '@/app/api/webhooks/stripe/route';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import { loadWebhookPaymentQuote } from '@/lib/checkout/hostedCheckoutQuote';
import { ensureInventoryHoldsForPayment, bindInventoryHoldsToPayment, InventoryHoldError } from '@/lib/checkout/inventoryHolds';
import { refundUnavailablePaidInventory } from '@/lib/checkout/inventoryPaymentRecovery';
import { departureAdmissionTime } from '@/lib/checkout/departureAdmission';

const deadline = Date.parse('2026-10-02T05:00:00Z');
const binding = 'c'.repeat(64);
function event(created: number, deadlines = JSON.stringify([deadline])) {
  return { id: 'evt_test_bound', created, type: 'payment_intent.succeeded', data: { object: {
    id: 'pi_bound', amount: 1000, currency: 'usd', created: 1,
    metadata: { has_booking_data: 'true', quote_binding: binding, pricing_total: '10', departure_deadlines_utc: deadlines,
      cart_data: JSON.stringify([{ t: '69861276f1598842cc1e5028', d: '2026-10-02', tm: '08:00', a: 1, ok: 'standard' }]) },
  } } };
}
describe('signature-verified payment completion cutoff transport', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(deadline + 60_000);
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit'; process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.mocked(loadWebhookPaymentQuote).mockResolvedValue(null);
    jest.mocked(Booking.find).mockReturnValue({ sort: async () => [] } as never);
    jest.mocked(ensureInventoryHoldsForPayment).mockImplementation(async input => {
      try { departureAdmissionTime({ date: '2026-10-02', time: '08:00', paymentIntentId: input.paymentIntentId,
        reservationKey: input.reservationKey, paymentSuccess: input.paymentSuccess && { ...input.paymentSuccess, departureDeadlineUtc: input.departureDeadlinesUtc?.[0] } }); }
      catch (error) { throw new InventoryHoldError((error as { code: string }).code, (error as Error).message); }
      // Stop after proof admission; this test never fabricates a booking or message.
      throw new InventoryHoldError('PAYMENT_TIME_UNPROVEN', 'Downstream unavailable');
    });
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  afterAll(() => { process.env = env; });
  const deliver = () => POST({ text: async () => '{}' } as unknown as Request);
  it('passes signed success event time, not intent creation or delayed delivery clock', async () => {
    mockConstructEvent.mockReturnValue(event(deadline / 1000 - 1));
    expect((await deliver()).status).toBe(500);
    expect(ensureInventoryHoldsForPayment).toHaveBeenCalledWith(expect.objectContaining({ departureDeadlinesUtc: [deadline],
      paymentSuccess: { paymentIntentId: 'pi_bound', reservationKey: binding, succeededAt: new Date(deadline - 1000) } }));
    expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
    expect(Booking.create).not.toHaveBeenCalled();
  });
  it.each([deadline / 1000, deadline / 1000 + 1])('routes genuinely late payment through existing compensation %s', created => {
    mockConstructEvent.mockReturnValue(event(created));
    return deliver().then(response => {
      expect(response.status).toBe(200);
      expect(refundUnavailablePaidInventory).toHaveBeenCalledWith(expect.objectContaining({ paymentIntentId: 'pi_bound', reason: 'DEPARTURE_NOT_FUTURE' }));
      expect(Booking.create).not.toHaveBeenCalled();
    });
  });
  it('malformed deadline proof retries without booking or blind refund', async () => {
    mockConstructEvent.mockReturnValue(event(deadline / 1000 - 1, '[]'));
    expect((await deliver()).status).toBe(500);
    expect(ensureInventoryHoldsForPayment).not.toHaveBeenCalled();
    expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
    expect(Booking.create).not.toHaveBeenCalled();
  });
  it('future or absent signed success time never causes an arrival-time refund', async () => {
    mockConstructEvent.mockReturnValue(event((deadline + 120_000) / 1000));
    expect((await deliver()).status).toBe(500);
    expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
    mockConstructEvent.mockReturnValue(event(NaN));
    expect((await deliver()).status).toBe(500);
    expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
  });
  it('recovers the exact hosted paid hold before binding, so an expired hold is not prematurely refunded', async () => {
    const signed = event(deadline / 1000 - 1);
    Object.assign(signed.data.object.metadata, { checkout_experience: 'hosted' });
    mockConstructEvent.mockReturnValue(signed);
    jest.mocked(loadWebhookPaymentQuote).mockResolvedValue({ quoteBinding: binding, pricing: { total: 10 },
      cartSummary: [{ t: '69861276f1598842cc1e5028', d: '2026-10-02', tm: '08:00', a: 1, ok: 'standard' }] } as never);
    jest.mocked(ensureInventoryHoldsForPayment).mockResolvedValue([{ state: 'active' }] as never);
    await deliver();
    expect(ensureInventoryHoldsForPayment).toHaveBeenCalledTimes(1);
    expect(bindInventoryHoldsToPayment).toHaveBeenCalledWith(binding, 'pi_bound');
    expect(jest.mocked(ensureInventoryHoldsForPayment).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(bindInventoryHoldsToPayment).mock.invocationCallOrder[0]);
    expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
  });
  it('preserves a Cancelled booking without resurrecting it or sending confirmation on a repeated success event', async () => {
    mockConstructEvent.mockReturnValue(event(deadline / 1000 - 1));
    jest.mocked(Booking.find).mockReturnValue({ sort: async () => [{ status: 'Cancelled', confirmationSentAt: undefined, paymentItemIndex: 0 }] } as never);
    expect((await deliver()).status).toBe(200);
    expect(ensureInventoryHoldsForPayment).not.toHaveBeenCalled();
    expect(Booking.updateMany).not.toHaveBeenCalled(); expect(Booking.create).not.toHaveBeenCalled();
    expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
  });
  it('recognizes an exact historical default-tagged brand payment before any new inventory or booking', async () => {
    const signed = event(deadline / 1000 - 1);
    Object.assign(signed.data.object.metadata, { tenant_id: 'named-brand', customer_email: 'qa@example.test' });
    mockConstructEvent.mockReturnValue(signed);
    jest.mocked(Booking.find).mockReturnValue({ sort: async () => [{ _id: 'booking-owned', user: 'user-owned', tenantId: 'default',
      paymentItemIndex: 0, status: 'Confirmed', paymentStatus: 'paid', tour: '69861276f1598842cc1e5028',
      dateString: '2026-10-02', time: '08:00', adultGuests: 1, childGuests: 0, infantGuests: 0 }] } as never);
    jest.mocked(User.findById).mockResolvedValue({ email: 'qa@example.test' } as never);
    expect((await deliver()).status).toBe(500); // admitted proof, stopped at mocked downstream outage
    expect(Booking.find).toHaveBeenCalledWith({ paymentId: 'pi_bound' });
    expect(ensureInventoryHoldsForPayment).toHaveBeenCalledTimes(1);
    expect(Booking.create).not.toHaveBeenCalled(); expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
  });
  it.each(['foreign-tenant', 'wrong-tour', 'wrong-quantity', 'wrong-customer'])('reconciles account-wide %s mismatch before any inventory, promotion or refund', async mismatch => {
    const signed = event(deadline / 1000 - 1);
    Object.assign(signed.data.object.metadata, { tenant_id: 'named-brand', customer_email: 'qa@example.test' });
    mockConstructEvent.mockReturnValue(signed);
    jest.mocked(Booking.find).mockReturnValue({ sort: async () => [{ _id: 'booking-owned', user: 'user-owned',
      tenantId: mismatch === 'foreign-tenant' ? 'other-brand' : 'default', paymentItemIndex: 0,
      status: 'Pending', paymentStatus: 'paid', tour: mismatch === 'wrong-tour' ? 'other-tour' : '69861276f1598842cc1e5028',
      dateString: '2026-10-02', time: '08:00', adultGuests: mismatch === 'wrong-quantity' ? 2 : 1 }] } as never);
    jest.mocked(User.findById).mockResolvedValue({ email: mismatch === 'wrong-customer' ? 'other@example.test' : 'qa@example.test' } as never);
    expect((await deliver()).status).toBe(500);
    expect(ensureInventoryHoldsForPayment).not.toHaveBeenCalled(); expect(Booking.updateMany).not.toHaveBeenCalled();
    expect(Booking.create).not.toHaveBeenCalled(); expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
  });
  it('invalid provider signature admits nothing', async () => {
    mockConstructEvent.mockImplementationOnce(() => { throw new Error('Bad signature'); });
    expect((await deliver()).status).toBe(400);
    expect(ensureInventoryHoldsForPayment).not.toHaveBeenCalled();
    expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
  });
});

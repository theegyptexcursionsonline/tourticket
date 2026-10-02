/** @jest-environment node */
const mockRetrieve = jest.fn();
jest.mock('stripe', () => ({ __esModule: true, default: jest.fn(() => ({ paymentIntents: { retrieve: mockRetrieve } })) }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init: { status?: number } = {}) => ({ status: init.status || 200, json: async () => body }) } }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: { findOne: jest.fn(), create: jest.fn() } }));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: { find: jest.fn(), create: jest.fn() } }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Discount', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('@/lib/email/emailService', () => ({ EmailService: {} }));
jest.mock('@/lib/auth/customerSession', () => ({ authenticateCustomerSession: jest.fn() }));
jest.mock('@/lib/jwt', () => ({ signToken: jest.fn(async () => 'unit-receipt') }));
jest.mock('@/lib/checkout/assertAvailability', () => ({ assertCartAvailability: jest.fn(), UnavailableTourError: class extends Error {} }));
jest.mock('@/lib/checkout/serverCartPricing', () => ({ secureCartPricing: jest.fn(), PriceChangedError: class extends Error {} }));
jest.mock('@/lib/checkout/inventoryHolds', () => ({ acquireCheckoutInventoryLease: jest.fn(), ensureInventoryHoldsForPayment: jest.fn(), releaseCheckoutInventoryLease: jest.fn(), InventoryHoldError: class extends Error {} }));
jest.mock('@/lib/checkout/inventoryPaymentRecovery', () => ({ refundUnavailablePaidInventory: jest.fn(), markPaymentInventoryConverted: jest.fn() }));
jest.mock('@/lib/integrations/bookingEventProducers', () => ({ queuePersistedBookingEvent: jest.fn() }));
import { buildQuoteBinding } from '@/lib/checkout/quoteBinding';
import { secureCartPricing } from '@/lib/checkout/serverCartPricing';
import { POST } from '@/app/api/checkout/route';
import User from '@/lib/models/user';
import Booking from '@/lib/models/Booking';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import { ensureInventoryHoldsForPayment } from '@/lib/checkout/inventoryHolds';
import { refundUnavailablePaidInventory } from '@/lib/checkout/inventoryPaymentRecovery';
const deadline = Date.parse('2026-10-02T05:00:00Z');
const binding = 'c'.repeat(64);
const cart = [{ _id: '69861276f1598842cc1e5028', selectedDate: '2026-10-02', selectedTime: '08:00', quantity: 1, childQuantity: 0, infantQuantity: 0, price: 10 }];
const customer = { firstName: 'QA', lastName: 'Customer', email: 'qa@example.test' };
let rows: unknown[];
describe('synchronous paid checkout after departure', () => {
  beforeEach(() => {
    jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(deadline);
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    rows = [];
    jest.mocked(User.findOne).mockReturnValue({ select: async () => null } as never);
    jest.mocked(CheckoutPaymentQuote.findOne).mockReturnValue({ lean: async () => ({ quoteBinding: binding,
      customer, cart, pricing: { subtotal: 10, serviceFee: 0, tax: 0, discount: 0, total: 10, currency: 'USD' }, expiresAt: new Date(deadline - 1) }) } as never);
    jest.mocked(Booking.find).mockReturnValue({ lean: async () => rows } as never);
    mockRetrieve.mockResolvedValue({ id: 'pi_bound', status: 'succeeded', amount: 1000, currency: 'usd', metadata: { quote_binding: binding } });
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  const deliver = () => POST({ json: async () => ({ customer, cart, isGuest: true, paymentDetails: { paymentIntentId: 'pi_bound' } }) } as never);
  it('returns processing at the exact boundary without new booking, inventory, account or refund effects', async () => {
    const response = await deliver();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ success: false, processing: true, code: 'PAYMENT_RECONCILIATION_PENDING' });
    expect(User.create).not.toHaveBeenCalled(); expect(Booking.create).not.toHaveBeenCalled();
    expect(ensureInventoryHoldsForPayment).not.toHaveBeenCalled(); expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
    expect(CheckoutPaymentQuote.findOne).toHaveBeenCalledWith({ paymentIntentId: 'pi_bound', tenantId: 'default' });
  });
  it('keeps Pending/partial paid records in processing instead of saying confirmed', async () => {
    rows = [{ ...cart[0], tour: cart[0]._id, dateString: cart[0].selectedDate, time: cart[0].selectedTime,
      paymentItemIndex: 0, status: 'Pending', paymentStatus: 'paid' }];
    expect((await deliver()).status).toBe(202);
    expect(Booking.create).not.toHaveBeenCalled();
  });
  it('preserves immutable already-confirmed paid replay after departure', async () => {
    rows = [{ _id: 'booking', tour: cart[0]._id, dateString: cart[0].selectedDate, time: cart[0].selectedTime,
      paymentItemIndex: 0, status: 'Confirmed', paymentStatus: 'paid', adultGuests: 1, childGuests: 0, infantGuests: 0, bookingReference: 'QA-REF' }];
    const response = await deliver();
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ success: true, bookingId: 'QA-REF' });
    expect(Booking.create).not.toHaveBeenCalled(); expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
  });
  it('never returns another tour or quantity as an immutable receipt', async () => {
    rows = [{ tour: cart[0]._id, dateString: cart[0].selectedDate, time: cart[0].selectedTime,
      paymentItemIndex: 0, status: 'Confirmed', paymentStatus: 'paid', adultGuests: 2 }];
    expect((await deliver()).status).toBe(202);
  });
  const lostQuotePayment = () => {
    const attempt = '11111111-1111-4111-8111-111111111111';
    return { id: 'pi_bound', status: 'succeeded', amount: 1000, currency: 'usd', metadata: {
      customer_email: customer.email, pricing_total: '10', checkout_attempt_id: attempt,
      departure_deadlines_utc: JSON.stringify([deadline]),
      quote_binding: buildQuoteBinding({ cart, customerEmail: customer.email, currency: 'USD', amountMinor: 1000,
        checkoutAttemptId: attempt, departureDeadlinesUtc: [deadline] }),
    } };
  };
  it('a paid missing quote after cutoff only reconciles, never reprices or creates another booking', async () => {
    jest.mocked(CheckoutPaymentQuote.findOne).mockReturnValue({ lean: async () => null } as never);
    mockRetrieve.mockResolvedValue(lostQuotePayment());
    expect((await deliver()).status).toBe(202);
    expect(secureCartPricing).not.toHaveBeenCalled(); expect(User.create).not.toHaveBeenCalled();
    expect(Booking.create).not.toHaveBeenCalled(); expect(refundUnavailablePaidInventory).not.toHaveBeenCalled();
  });
  it('a lost paid quote still denies the wrong customer and tampered fingerprint before repricing', async () => {
    jest.mocked(CheckoutPaymentQuote.findOne).mockReturnValue({ lean: async () => null } as never);
    const paid = lostQuotePayment();
    mockRetrieve.mockResolvedValue({ ...paid, metadata: { ...paid.metadata, customer_email: 'other@example.test' } });
    expect((await deliver()).status).toBe(403);
    mockRetrieve.mockResolvedValue({ ...paid, metadata: { ...paid.metadata, quote_binding: 'tampered' } });
    expect((await deliver()).status).toBe(409);
    expect(secureCartPricing).not.toHaveBeenCalled(); expect(Booking.find).not.toHaveBeenCalled();
  });
  it('verifies payment quote binding before exposing any prior paid record', async () => {
    mockRetrieve.mockResolvedValue({ id: 'pi_bound', status: 'succeeded', amount: 1000, currency: 'usd', metadata: { quote_binding: 'foreign' } });
    expect((await deliver()).status).toBe(409); expect(Booking.find).not.toHaveBeenCalled();
  });
});

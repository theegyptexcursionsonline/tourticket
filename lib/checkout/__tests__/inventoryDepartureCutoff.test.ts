/** @jest-environment node */
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock('@/lib/models/CheckoutInventoryHold', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));
jest.mock('@/lib/models/CheckoutInventoryLease', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock('@/lib/revenue/sellableDeparture', () => ({
  assertRevenuePriceTargetSellable: jest.fn(), readPaidDepartureCapacity: jest.fn(),
}));
jest.mock('@/lib/revenue/pricingResolver', () => ({
  normalizePriceDate: jest.fn((value: string) => new Date(`${value}T00:00:00.000Z`)),
}));

import Booking from '@/lib/models/Booking';
import CheckoutInventoryHold from '@/lib/models/CheckoutInventoryHold';
import CheckoutInventoryLease from '@/lib/models/CheckoutInventoryLease';
import { ensureInventoryHoldsForPayment } from '@/lib/checkout/inventoryHolds';
import { assertRevenuePriceTargetSellable, readPaidDepartureCapacity } from '@/lib/revenue/sellableDeparture';


const deadline = Date.parse('2026-10-02T05:00:00Z');
const tour = '69861276f1598842cc1e5028';
const binding = 'b'.repeat(64);
const cart = [{ _id: tour, selectedDate: '2026-10-02', selectedTime: '08:00', quantity: 1, selectedBookingOption: { pricingKey: 'standard' } }];
const request = { tenantId: 'brand', paymentIntentId: 'pi_bound', reservationKey: binding, cart };
const proof = { paymentIntentId: request.paymentIntentId, reservationKey: binding, succeededAt: new Date(deadline - 1) };
let currentHold: Record<string, unknown> | null;
let currentBooking: Record<string, unknown> | null;

describe('paid hold departure cutoff', () => {
  beforeEach(() => {
    jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(deadline + 60_000);
    currentBooking = null;
    currentHold = { _id: 'hold', tenantId: 'brand', tourId: tour, dateString: '2026-10-02', time: '08:00', optionKey: 'standard', guests: 1,
      state: 'active', expiresAt: new Date(deadline + 120_000) };
    jest.mocked(CheckoutInventoryLease.findOneAndUpdate).mockImplementation(((_filter: unknown, update: unknown) => ({
      lean: jest.fn().mockResolvedValue({ leaseToken: (update as { $set: { leaseToken: string } }).$set.leaseToken }),
    })) as never);
    jest.mocked(CheckoutInventoryLease.updateOne).mockResolvedValue({ acknowledged: true } as never);
    jest.mocked(Booking.findOne).mockImplementation((() => ({ select: () => ({ lean: async () => currentBooking }) })) as never);
    jest.mocked(CheckoutInventoryHold.findOne).mockImplementation((() => ({ lean: async () => currentHold })) as never);
    jest.mocked(CheckoutInventoryHold.find).mockReturnValue({ select: () => ({ lean: async () => [] }) } as never);
    jest.mocked(CheckoutInventoryHold.findOneAndUpdate).mockReturnValue({ lean: async () => ({ state: 'active' }) } as never);
    jest.mocked(readPaidDepartureCapacity).mockResolvedValue({ capacity: 10, booked: 0 });
    jest.mocked(assertRevenuePriceTargetSellable).mockResolvedValue({ startsAtUtc: new Date(deadline).toISOString(), capacity: 10, booked: 0, available: 10, optionId: 'standard' });
  });
  afterEach(() => jest.useRealTimers());
  it('an active hold does not admit a new paid booking without completion-time proof', async () => {
    await expect(ensureInventoryHoldsForPayment(request)).rejects.toMatchObject({ code: 'PAYMENT_TIME_UNPROVEN' });
    expect(CheckoutInventoryHold.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('accepts delayed on-time success on an active hold without mutable catalogue admission', async () => {
    await expect(ensureInventoryHoldsForPayment({ ...request, paymentSuccess: proof, departureDeadlinesUtc: [deadline] })).resolves.toHaveLength(1);
    expect(assertRevenuePriceTargetSellable).not.toHaveBeenCalled();
    expect(readPaidDepartureCapacity).not.toHaveBeenCalled();
  });
  it('recovers expired holds using only actual capacity for a valid on-time paid snapshot', async () => {
    currentHold!.expiresAt = new Date(deadline - 1);
    await ensureInventoryHoldsForPayment({ ...request, paymentSuccess: proof, departureDeadlinesUtc: [deadline] });
    expect(readPaidDepartureCapacity).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'brand', tourId: tour, date: '2026-10-02', time: '08:00' }));
    expect(assertRevenuePriceTargetSellable).not.toHaveBeenCalled();
    expect(CheckoutInventoryHold.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
  it('does not overwrite unavailable capacity or fabricate missing capacity', async () => {
    currentHold!.expiresAt = new Date(deadline - 1);
    jest.mocked(readPaidDepartureCapacity).mockResolvedValue({ capacity: 1, booked: 1 });
    await expect(ensureInventoryHoldsForPayment({ ...request, paymentSuccess: proof, departureDeadlinesUtc: [deadline] })).rejects.toMatchObject({ code: 'INVENTORY_UNAVAILABLE' });
    expect(CheckoutInventoryHold.findOneAndUpdate).not.toHaveBeenCalled();
    jest.mocked(readPaidDepartureCapacity).mockRejectedValue({ code: 'PAYMENT_TIME_UNPROVEN' });
    await expect(ensureInventoryHoldsForPayment({ ...request, paymentSuccess: proof, departureDeadlinesUtc: [deadline] })).rejects.toMatchObject({ code: 'PAYMENT_TIME_UNPROVEN' });
  });
  it('rejects late signed completion even with an active hold', async () => {
    await expect(ensureInventoryHoldsForPayment({ ...request, paymentSuccess: { ...proof, succeededAt: new Date(deadline) }, departureDeadlinesUtc: [deadline] })).rejects.toMatchObject({ code: 'DEPARTURE_NOT_FUTURE' });
    expect(CheckoutInventoryHold.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('a Pending booking cannot bypass late payment admission', async () => {
    currentBooking = { _id: 'booking', tour, dateString: '2026-10-02', time: '08:00', status: 'Pending', paymentStatus: 'pending' };
    await expect(ensureInventoryHoldsForPayment({ ...request, paymentSuccess: { ...proof, succeededAt: new Date(deadline) }, departureDeadlinesUtc: [deadline] })).rejects.toMatchObject({ code: 'DEPARTURE_NOT_FUTURE' });
    expect(CheckoutInventoryHold.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('preserves already-confirmed and paid exact booking replay without requiring a new deadline', async () => {
    currentBooking = { _id: 'booking', tour, dateString: '2026-10-02', time: '08:00', status: 'Confirmed', paymentStatus: 'paid' };
    await expect(ensureInventoryHoldsForPayment(request)).resolves.toHaveLength(1);
    expect(readPaidDepartureCapacity).not.toHaveBeenCalled();
  });
  it('does not replace a hold belonging to another payment, even with valid on-time proof', async () => {
    currentHold!.paymentIntentId = 'pi_other';
    await expect(ensureInventoryHoldsForPayment({ ...request, paymentSuccess: proof, departureDeadlinesUtc: [deadline] })).rejects.toMatchObject({ code: 'INVENTORY_PAYMENT_CONFLICT' });
    expect(CheckoutInventoryHold.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('a cancelled record cannot be converted or resurrected even by valid on-time payment evidence', async () => {
    currentBooking = { _id: 'booking', tour, dateString: '2026-10-02', time: '08:00', status: 'Cancelled', paymentStatus: 'paid' };
    await expect(ensureInventoryHoldsForPayment({ ...request, paymentSuccess: proof, departureDeadlinesUtc: [deadline] })).rejects.toMatchObject({ code: 'PAYMENT_TIME_UNPROVEN' });
    expect(CheckoutInventoryHold.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('refuses malformed/mismatched snapshot arrays before any booking or hold read', async () => {
    await expect(ensureInventoryHoldsForPayment({ ...request, paymentSuccess: proof, departureDeadlinesUtc: [] })).rejects.toMatchObject({ code: 'PAYMENT_TIME_UNPROVEN' });
    expect(Booking.findOne).not.toHaveBeenCalled();
  });
  it('rechecks clock after awaited capacity work before writing an unproven synchronous hold', async () => {
    jest.setSystemTime(deadline - 1); currentHold = null;
    jest.mocked(assertRevenuePriceTargetSellable).mockImplementation(async () => {
      jest.setSystemTime(deadline);
      return { startsAtUtc: new Date(deadline).toISOString(), capacity: 10, booked: 0, available: 10, optionId: 'standard' };
    });
    await expect(ensureInventoryHoldsForPayment(request)).rejects.toMatchObject({ code: 'PAYMENT_TIME_UNPROVEN' });
    expect(CheckoutInventoryHold.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

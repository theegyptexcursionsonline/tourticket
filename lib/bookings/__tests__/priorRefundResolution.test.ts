/**
 * Regression: a $0 policy-cancellation (refundState 'not_required') must not
 * permanently block a deliberate admin refund. Fouad cancelled a same-day
 * booking (0% policy window, nothing refunded) and then got
 * "A different cancellation or refund has already completed." when trying to
 * process the actual refund — with the customer's money still captured.
 */
import { resolvePriorRefund } from '@/lib/bookings/refunds';

jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/bookings/refundNotifications', () => ({ sendBookingRefundNotification: jest.fn() }));

describe('resolvePriorRefund', () => {
  it('lets an admin refund proceed after a zero-money cancellation (the regression)', () => {
    expect(resolvePriorRefund('not_required', 'admin_cancel', 0, 'admin_full')).toBe('proceed');
    expect(resolvePriorRefund('not_required', 'admin_cancel', 0, 'admin_partial')).toBe('proceed');
    expect(resolvePriorRefund('not_required', 'customer_cancel', 0, 'admin_full')).toBe('proceed');
  });

  it('still replays an identical repeated request (idempotency)', () => {
    expect(resolvePriorRefund('not_required', 'admin_cancel', 0, 'admin_cancel')).toBe('replay');
    expect(resolvePriorRefund('succeeded', 'admin_full', 58.32, 'admin_full')).toBe('replay');
  });

  it('keeps real completed refunds terminal — no second refund', () => {
    expect(resolvePriorRefund('succeeded', 'admin_full', 58.32, 'admin_partial')).toBe('conflict');
    expect(resolvePriorRefund('succeeded', 'admin_cancel', 29.16, 'admin_full')).toBe('conflict');
  });

  it('keeps manual-review outcomes terminal (non-Stripe money)', () => {
    expect(resolvePriorRefund('manual_required', 'admin_cancel', 0, 'admin_full')).toBe('conflict');
  });

  it('does not let a cancellation supersede a zero-money outcome', () => {
    expect(resolvePriorRefund('not_required', 'admin_full', 0, 'admin_cancel')).toBe('conflict');
  });

  it('proceeds normally when no prior terminal state exists', () => {
    expect(resolvePriorRefund(undefined, undefined, 0, 'admin_full')).toBe('proceed');
    expect(resolvePriorRefund('failed', 'admin_full', 0, 'admin_full')).toBe('proceed');
  });
});

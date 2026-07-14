jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));

import {
  BookingRefundError,
  calculateCancellationPolicy,
  CANCELLATION_POLICY_VERSION,
  sanitizeRefundReason,
} from '@/lib/bookings/refunds';
import { localDepartureToUtc } from '@/lib/revenue/departureSchedule';

const departure = new Date(localDepartureToUtc('2026-08-15', '10:00'));
const before = (milliseconds: number) => new Date(departure.getTime() - milliseconds);

describe('server-owned cancellation policy', () => {
  it('uses the Africa/Cairo departure instant at the exact seven-day boundary', () => {
    const result = calculateCancellationPolicy({
      dateString: '2026-08-15', time: '10:00', totalPrice: 123.45, now: before(7 * 86_400_000),
    });
    expect(result).toMatchObject({
      policyVersion: CANCELLATION_POLICY_VERSION,
      refundPercentage: 100,
      refundAmount: 123.45,
      customerCancellationAllowed: true,
    });
  });

  it.each([
    [7 * 86_400_000 - 1, 50],
    [3 * 86_400_000, 50],
    [3 * 86_400_000 - 1, 0],
    [24 * 3_600_000, 0],
  ])('applies the existing provisional tiers at %i milliseconds', (lead, percentage) => {
    expect(calculateCancellationPolicy({
      dateString: '2026-08-15', time: '10:00', totalPrice: 100, now: before(lead),
    }).refundPercentage).toBe(percentage);
  });

  it('enforces the customer 24-hour cutoff using the time, not date midnight', () => {
    expect(calculateCancellationPolicy({
      dateString: '2026-08-15', time: '10:00', totalPrice: 100, now: before(24 * 3_600_000 - 1),
    }).customerCancellationAllowed).toBe(false);
  });

  it('normalizes bounded reasons and rejects invalid input', () => {
    expect(sanitizeRefundReason('  changed\nplans\u0000 ', 'fallback')).toBe('changed plans');
    expect(() => sanitizeRefundReason({ reason: 'bad' }, 'fallback')).toThrow(BookingRefundError);
    expect(() => sanitizeRefundReason('x'.repeat(501), 'fallback')).toThrow('1 to 500');
  });
});

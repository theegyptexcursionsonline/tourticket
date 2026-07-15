import {
  ADMIN_BOOKING_STATUS_OPTIONS,
  isFinancialBookingStatus,
  validateAdminLifecycleTransition,
} from '@/lib/bookings/statusTransitions';

describe('admin booking status options', () => {
  it('keeps every lifecycle and protected financial action visible to admins', () => {
    expect(ADMIN_BOOKING_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      'Pending',
      'Confirmed',
      'Completed',
      'Cancelled',
      'Refunded',
      'Partial_Refund',
    ]);
  });

  it('routes only cancellation and refund states through protected workflows', () => {
    expect(isFinancialBookingStatus('Cancelled')).toBe(true);
    expect(isFinancialBookingStatus('Refunded')).toBe(true);
    expect(isFinancialBookingStatus('Partial_Refund')).toBe(true);
    expect(isFinancialBookingStatus('Completed')).toBe(false);
  });
});

describe('validateAdminLifecycleTransition', () => {
  it('allows the normal lifecycle from pending to confirmed to completed', () => {
    expect(validateAdminLifecycleTransition({
      currentStatus: 'Pending',
      nextStatus: 'Confirmed',
      paymentMethod: 'cash',
    })).toBeNull();
    expect(validateAdminLifecycleTransition({
      currentStatus: 'Confirmed',
      nextStatus: 'Completed',
      paymentMethod: 'card',
      dateString: '2026-07-14',
      time: '10:00',
      now: new Date('2026-07-15T10:00:00.000Z'),
    })).toBeNull();
  });

  it('does not complete a booking before its scheduled departure', () => {
    expect(validateAdminLifecycleTransition({
      currentStatus: 'Confirmed',
      nextStatus: 'Completed',
      dateString: '2026-07-16',
      time: '10:00',
      now: new Date('2026-07-15T10:00:00.000Z'),
    })).toMatchObject({ code: 'TOUR_NOT_FINISHED' });
  });

  it('requires provider confirmation for card payments', () => {
    expect(validateAdminLifecycleTransition({
      currentStatus: 'Pending',
      nextStatus: 'Confirmed',
      paymentMethod: 'card',
    })).toMatchObject({ code: 'PAYMENT_PROVIDER_CONFIRMATION_REQUIRED' });
  });

  it('does not allow pending bookings to skip confirmation', () => {
    expect(validateAdminLifecycleTransition({
      currentStatus: 'Pending',
      nextStatus: 'Completed',
    })).toMatchObject({ code: 'BOOKING_MUST_BE_CONFIRMED_FIRST' });
  });

  it('keeps cancellation and refunds on protected workflows', () => {
    expect(validateAdminLifecycleTransition({
      currentStatus: 'Confirmed',
      nextStatus: 'Cancelled',
    })).toMatchObject({ code: 'FINANCIAL_TRANSITION_REQUIRES_WORKFLOW' });
    expect(validateAdminLifecycleTransition({
      currentStatus: 'Completed',
      nextStatus: 'Refunded',
    })).toMatchObject({ code: 'FINANCIAL_TRANSITION_REQUIRES_WORKFLOW' });
  });

  it('prevents completed and financial records from being reopened', () => {
    expect(validateAdminLifecycleTransition({
      currentStatus: 'Completed',
      nextStatus: 'Confirmed',
    })).toMatchObject({ code: 'COMPLETED_BOOKING_IMMUTABLE' });
    expect(validateAdminLifecycleTransition({
      currentStatus: 'Refunded',
      nextStatus: 'Confirmed',
    })).toMatchObject({ code: 'FINANCIAL_RECORD_IMMUTABLE' });
  });
});

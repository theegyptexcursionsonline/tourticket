import type { BookingStatus } from '@/lib/models/Booking';

export type BookingTransitionError = {
  code: string;
  message: string;
};

const FINANCIAL_STATUSES: BookingStatus[] = ['Cancelled', 'Refunded', 'Partial_Refund'];

export function validateAdminLifecycleTransition(input: {
  currentStatus: BookingStatus;
  nextStatus: BookingStatus;
  paymentMethod?: string;
  dateString?: string;
  time?: string;
  now?: Date;
}): BookingTransitionError | null {
  const { currentStatus, nextStatus } = input;
  if (currentStatus === nextStatus) return null;

  if (FINANCIAL_STATUSES.includes(nextStatus)) {
    return {
      code: 'FINANCIAL_TRANSITION_REQUIRES_WORKFLOW',
      message: nextStatus === 'Cancelled'
        ? 'Use the cancellation endpoint so policy and payment-provider state are enforced.'
        : 'Use the refund endpoint so payment-provider confirmation is recorded before status changes.',
    };
  }

  if (FINANCIAL_STATUSES.includes(currentStatus)) {
    return {
      code: 'FINANCIAL_RECORD_IMMUTABLE',
      message: 'A cancelled or refunded booking cannot be reopened or rescheduled. Create a new booking instead.',
    };
  }

  if (currentStatus === 'Completed') {
    return {
      code: 'COMPLETED_BOOKING_IMMUTABLE',
      message: 'A completed booking cannot be reopened. Use the protected refund workflow if money must be returned.',
    };
  }

  if (currentStatus === 'Confirmed' && nextStatus === 'Pending') {
    return {
      code: 'CONFIRMED_PAYMENT_IMMUTABLE',
      message: 'A confirmed booking cannot be reverted to pending. Use cancellation/refund workflows when money must be reversed.',
    };
  }

  if (currentStatus === 'Pending' && nextStatus === 'Completed') {
    return {
      code: 'BOOKING_MUST_BE_CONFIRMED_FIRST',
      message: 'A pending booking must be confirmed before it can be completed.',
    };
  }

  if (currentStatus === 'Confirmed' && nextStatus === 'Completed') {
    const departure = `${input.dateString || ''}T${input.time || ''}`;
    if (/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(departure)) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(input.now || new Date());
      const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
      const nowInCairo = `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
      if (departure > nowInCairo) {
        return {
          code: 'TOUR_NOT_FINISHED',
          message: 'A booking can be completed only after its scheduled departure time.',
        };
      }
    }
  }

  if (currentStatus === 'Pending' && nextStatus === 'Confirmed') {
    const method = String(input.paymentMethod || '').toLowerCase();
    if (!['cash', 'bank'].includes(method)) {
      return {
        code: 'PAYMENT_PROVIDER_CONFIRMATION_REQUIRED',
        message: 'Card bookings are confirmed only by the verified Stripe webhook.',
      };
    }
  }

  return null;
}

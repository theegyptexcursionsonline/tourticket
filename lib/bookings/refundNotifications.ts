import { randomUUID } from 'node:crypto';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';
import type { PopulatedBookingTour, PopulatedBookingUser } from '@/lib/types/populatedBooking';

function formatDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Cairo',
  });
}

function safeFailureCode(error: unknown) {
  const name = error instanceof Error ? error.name : 'UnknownError';
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? String((error as { status?: unknown }).status || '')
    : '';
  return `${name}${status ? `:${status}` : ''}`.slice(0, 200);
}

export type RefundNotificationOutcome = {
  /** 'already_handled' = another caller owns the one-shot claim (e.g. the
   * Stripe webhook raced this request and sent the email itself). */
  customer: 'sent' | 'failed' | 'already_handled';
  operator: 'sent' | 'failed' | 'skipped';
};

function describeRefundOutcome(booking: {
  refundState?: string;
  refundKind?: string;
  refundAmount?: number;
}) {
  const amount = `$${Number(booking.refundAmount || 0).toFixed(2)}`;
  if (booking.refundState === 'manual_required') {
    return 'Booking cancelled — the payment was not collected through Stripe, so any refund requires manual processing.';
  }
  if (booking.refundKind === 'admin_partial') return `Partial refund of ${amount} confirmed by Stripe.`;
  if (booking.refundKind === 'admin_full') return `Full refund of ${amount} confirmed by Stripe.`;
  return Number(booking.refundAmount || 0) > 0
    ? `Booking cancelled — ${amount} refund confirmed by Stripe.`
    : 'Booking cancelled — no refund due under the cancellation policy.';
}

/**
 * Send only after durable refund state proves what happened.
 *
 * The booking row is atomically claimed before contacting Mailgun. A second
 * request, cron run, or webhook therefore cannot send the same notification.
 * We deliberately do not auto-retry a claimed delivery: a transport timeout
 * can occur after provider acceptance, and retrying it could duplicate a
 * financial email. Failed/stale claims remain visible for operator review via
 * refundNotificationState and the monitoring index.
 *
 * "Nothing silent": the operator/supplier is notified inside the same claim,
 * before the customer email, so internal teams learn about every
 * cancellation/refund even when the customer transport fails.
 */
export async function sendBookingRefundNotification(bookingId: string): Promise<RefundNotificationOutcome> {
  const claimToken = randomUUID();
  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      tenantId: 'default',
      refundState: { $in: ['succeeded', 'not_required', 'manual_required'] },
      refundNotificationSentAt: { $exists: false },
      refundNotificationState: { $exists: false },
    },
    {
      $set: {
        refundNotificationState: 'sending',
        refundNotificationClaimToken: claimToken,
        refundNotificationClaimedAt: new Date(),
      },
      $inc: { refundNotificationAttempts: 1 },
    },
    { new: true },
  ).populate([{ path: 'tour', model: Tour }, { path: 'user', model: User }]);
  if (!booking) return { customer: 'already_handled', operator: 'skipped' };

  const markFailed = async (code: string) => {
    await Booking.updateOne(
      {
        _id: booking._id,
        tenantId: 'default',
        refundNotificationState: 'sending',
        refundNotificationClaimToken: claimToken,
      },
      {
        $set: {
          refundNotificationState: 'failed',
          refundNotificationFailureCode: code.slice(0, 200),
        },
      },
    ).catch((error) => {
      console.error('Refund notification failure state could not be persisted.', error);
    });
  };

  const user = booking.user as unknown as PopulatedBookingUser;
  const tour = booking.tour as unknown as PopulatedBookingTour;
  if (!user?.email || !tour?.title) {
    await markFailed('missing_recipient_or_tour');
    return { customer: 'failed', operator: 'skipped' };
  }

  const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Valued customer';
  let operator: RefundNotificationOutcome['operator'] = 'failed';
  try {
    await EmailService.sendOperatorBookingUpdate({
      bookingId: booking.bookingReference || String(booking._id),
      tourTitle: tour.title,
      customerName,
      customerEmail: user.email,
      customerPhone: user.phone,
      bookingDate: formatDate(booking.date),
      bookingTime: booking.time,
      changesSummary: describeRefundOutcome(booking),
      changedBy: booking.refundActor || 'System',
      changedAt: new Date().toISOString(),
      newStatus: booking.status,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      adultGuests: booking.adultGuests,
      childGuests: booking.childGuests,
      infantGuests: booking.infantGuests,
    });
    operator = 'sent';
  } catch (error) {
    console.error('Refund completed but its operator notification was not confirmed.', error);
  }

  try {
    const cancellation = booking.refundKind === 'customer_cancel' || booking.refundKind === 'admin_cancel';
    if (cancellation) {
      await EmailService.sendCancellationConfirmation({
        customerName,
        customerEmail: user.email,
        tourTitle: tour.title,
        bookingDate: formatDate(booking.date),
        bookingId: booking.bookingReference || String(booking._id),
        refundAmount: booking.refundState === 'succeeded' && Number(booking.refundAmount || 0) > 0
          ? `$${Number(booking.refundAmount).toFixed(2)}`
          : undefined,
        refundProcessingDays: booking.refundState === 'succeeded' && Number(booking.refundAmount || 0) > 0 ? 5 : undefined,
        cancellationReason: booking.refundState === 'manual_required'
          ? `${booking.refundReason || 'Booking cancelled'}. Any offline refund requires operator review.`
          : booking.refundReason,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      });
    } else {
      await EmailService.sendBookingStatusUpdate({
        customerName,
        customerEmail: user.email,
        tourTitle: tour.title,
        bookingDate: formatDate(booking.date),
        bookingTime: booking.time,
        bookingId: booking.bookingReference || String(booking._id),
        newStatus: booking.status,
        statusMessage: booking.status === 'Refunded'
          ? `A $${Number(booking.refundAmount || 0).toFixed(2)} refund was confirmed by the payment provider.`
          : `A $${Number(booking.refundAmount || 0).toFixed(2)} partial refund was confirmed by the payment provider.`,
        additionalInfo: booking.refundReason,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      });
    }
  } catch (error) {
    await markFailed(safeFailureCode(error));
    console.error('Refund completed but its customer notification was not confirmed.', error);
    return { customer: 'failed', operator };
  }

  try {
    await Booking.updateOne(
      {
        _id: booking._id,
        tenantId: 'default',
        refundNotificationState: 'sending',
        refundNotificationClaimToken: claimToken,
      },
      {
        $set: {
          refundNotificationState: 'sent',
          refundNotificationSentAt: new Date(),
        },
        $unset: {
          refundNotificationClaimToken: 1,
          refundNotificationFailureCode: 1,
        },
      },
    );
  } catch (error) {
    // The claim remains durable and prevents a duplicate send. Monitoring will
    // surface this uncertain receipt state for manual reconciliation.
    console.error('Refund notification was accepted but its receipt could not be persisted.', error);
  }
  return { customer: 'sent', operator };
}

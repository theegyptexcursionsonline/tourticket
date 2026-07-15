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

const FINAL_REFUND_STATES = ['succeeded', 'not_required', 'manual_required'];

/**
 * Admin-initiated resend of a booking's notification emails.
 *
 * Financial bookings (a completed cancellation/refund outcome exists): the
 * one-shot claim is deliberately released first, then the standard
 * refund-notification path re-runs — customer AND operator. This is the only
 * sanctioned way to bypass the anti-duplicate claim, and it exists precisely
 * for the human case: the admin saw a failure toast (or the customer says
 * they never got the email) and explicitly asks for a resend.
 *
 * Non-financial bookings: sends the current-status update to the customer and
 * the operator notification directly (no claim system applies there).
 */
export async function resendBookingNotifications(
  bookingId: string,
  actor: string,
): Promise<RefundNotificationOutcome | null> {
  const financial = await Booking.findOne({
    _id: bookingId,
    tenantId: 'default',
    refundState: { $in: FINAL_REFUND_STATES },
  }).select('_id').lean();
  if (financial) {
    await Booking.updateOne(
      { _id: bookingId, tenantId: 'default' },
      {
        $unset: {
          refundNotificationState: 1,
          refundNotificationSentAt: 1,
          refundNotificationClaimToken: 1,
          refundNotificationClaimedAt: 1,
          refundNotificationFailureCode: 1,
        },
      },
    );
    return sendBookingRefundNotification(bookingId);
  }

  const booking = await Booking.findOne({ _id: bookingId, tenantId: 'default' })
    .populate([{ path: 'tour', model: Tour }, { path: 'user', model: User }]);
  if (!booking) return null;
  const user = booking.user as unknown as PopulatedBookingUser;
  const tour = booking.tour as unknown as PopulatedBookingTour;
  if (!user?.email || !tour?.title) return { customer: 'failed', operator: 'skipped' };

  const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Valued customer';
  const outcome: RefundNotificationOutcome = { customer: 'failed', operator: 'failed' };
  try {
    // A live (Pending/Confirmed) booking's relevant email is the REAL
    // confirmation with the QR voucher — the one checkout/webhook may have
    // failed to deliver. Other statuses get a current-status update.
    if (booking.status === 'Pending' || booking.status === 'Confirmed') {
      const adults = Number(booking.adultGuests || 0);
      const children = Number(booking.childGuests || 0);
      const infants = Number(booking.infantGuests || 0);
      const totalGuests = adults + children + infants || Number(booking.guests || 1);
      await EmailService.sendBookingConfirmation({
        customerName,
        customerEmail: user.email,
        customerPhone: user.phone,
        tourTitle: tour.title,
        bookingDate: formatDate(booking.date),
        bookingTime: booking.time,
        participants: `${totalGuests} participant${totalGuests !== 1 ? 's' : ''}`,
        totalPrice: `$${Number(booking.totalPrice || 0).toFixed(2)}`,
        bookingId: booking.bookingReference || String(booking._id),
        bookingOption: booking.selectedBookingOption?.title,
        specialRequests: booking.specialRequests,
        hotelPickupDetails: booking.hotelPickupDetails,
        meetingPoint: tour.meetingPoint || 'Meeting point will be confirmed 24 hours before tour',
        tourImage: tour.image,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      });
      await Booking.updateOne(
        { _id: booking._id, tenantId: 'default' },
        { $set: { confirmationSentAt: new Date() }, $unset: { confirmationEmailFailedAt: 1, confirmationEmailFailureCode: 1 } },
      ).catch(() => undefined);
    } else {
      await EmailService.sendBookingStatusUpdate({
        customerName,
        customerEmail: user.email,
        tourTitle: tour.title,
        bookingDate: formatDate(booking.date),
        bookingTime: booking.time,
        bookingId: booking.bookingReference || String(booking._id),
        newStatus: booking.status,
        statusMessage: `Your booking is currently ${booking.status}.`,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      });
    }
    outcome.customer = 'sent';
  } catch (error) {
    console.error('Manual customer notification resend failed.', error);
  }
  try {
    await EmailService.sendOperatorBookingUpdate({
      bookingId: booking.bookingReference || String(booking._id),
      tourTitle: tour.title,
      customerName,
      customerEmail: user.email,
      customerPhone: user.phone,
      bookingDate: formatDate(booking.date),
      bookingTime: booking.time,
      changesSummary: `Manual notification resend by ${actor}. Current status: ${booking.status}.`,
      changedBy: actor,
      changedAt: new Date().toISOString(),
      newStatus: booking.status,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      adultGuests: booking.adultGuests,
      childGuests: booking.childGuests,
      infantGuests: booking.infantGuests,
    });
    outcome.operator = 'sent';
  } catch (error) {
    console.error('Manual operator notification resend failed.', error);
  }
  return outcome;
}

/**
 * Ops tool: re-send a booking's refund/cancellation notification when its
 * one-shot claim was consumed by an EARLIER, different outcome (e.g. a $0
 * policy cancellation emailed at time T, then an admin Stripe refund
 * completed at T+n but could not claim the notification again).
 *
 * Safety: only releases a claim that is provably STALE — the recorded
 * refundNotificationSentAt must predate refundCompletedAt, meaning the email
 * that was sent described a different (earlier) outcome than the refund that
 * finally completed. A claim from the refund itself is never released, so
 * this cannot duplicate a correctly-sent refund email.
 *
 * Usage:
 *   MAILGUN_API_KEY=... MAILGUN_DOMAIN=... npx tsx scripts/resend-refund-notification.ts <bookingId>
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import mongoose from 'mongoose';

async function main() {
  const bookingId = process.argv[2];
  if (!/^[a-f0-9]{24}$/i.test(String(bookingId || ''))) {
    console.error('Usage: npx tsx scripts/resend-refund-notification.ts <bookingId>');
    process.exit(1);
  }
  const dbConnect = (await import('../lib/dbConnect')).default;
  const Booking = (await import('../lib/models/Booking')).default;
  const { sendBookingRefundNotification } = await import('../lib/bookings/refundNotifications');

  await dbConnect();

  const booking = await Booking.findOne({ _id: bookingId, tenantId: 'default' })
    .select('refundState refundKind refundAmount refundCompletedAt refundNotificationState refundNotificationSentAt')
    .lean<{
      refundState?: string;
      refundKind?: string;
      refundAmount?: number;
      refundCompletedAt?: Date;
      refundNotificationState?: string;
      refundNotificationSentAt?: Date;
    } | null>();
  if (!booking) throw new Error('Booking not found.');
  console.log('Before:', JSON.stringify({
    refundState: booking.refundState,
    refundKind: booking.refundKind,
    refundAmount: booking.refundAmount,
    refundCompletedAt: booking.refundCompletedAt,
    refundNotificationState: booking.refundNotificationState,
    refundNotificationSentAt: booking.refundNotificationSentAt,
  }));

  if (booking.refundState !== 'succeeded') throw new Error(`Refund state is ${booking.refundState}, not succeeded — aborting.`);
  const sentAt = booking.refundNotificationSentAt ? new Date(booking.refundNotificationSentAt).getTime() : NaN;
  const completedAt = booking.refundCompletedAt ? new Date(booking.refundCompletedAt).getTime() : NaN;
  if (!(Number.isFinite(sentAt) && Number.isFinite(completedAt) && sentAt < completedAt)) {
    throw new Error('Notification claim is not provably stale (sentAt does not predate refundCompletedAt) — aborting to avoid a duplicate email.');
  }

  // Release the stale claim so the refund outcome can send its own email.
  const released = await Booking.updateOne(
    {
      _id: bookingId,
      tenantId: 'default',
      refundState: 'succeeded',
      refundNotificationState: 'sent',
      refundNotificationSentAt: booking.refundNotificationSentAt,
    },
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
  if (released.modifiedCount !== 1) throw new Error('Stale claim could not be released (booking changed concurrently) — aborting.');
  console.log('Stale claim released.');

  const outcome = await sendBookingRefundNotification(bookingId);
  console.log('sendBookingRefundNotification returned:', JSON.stringify(outcome));
  const sent = outcome.customer === 'sent';

  const after = await Booking.findOne({ _id: bookingId, tenantId: 'default' })
    .select('refundNotificationState refundNotificationSentAt refundNotificationFailureCode')
    .lean();
  console.log('After:', JSON.stringify(after));
  await mongoose.disconnect();
  process.exit(sent ? 0 : 2);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

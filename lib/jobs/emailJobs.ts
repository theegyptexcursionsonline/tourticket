// lib/jobs/emailJobs.ts
import dbConnect from '@/lib/dbConnect';
import Booking, { type IBooking } from '@/lib/models/Booking';
import Tour, { type ITour } from '@/lib/models/Tour';
import User, { type IUser } from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';
import { isValidEmailAddress } from '@/lib/mailgun';
import { contentPath } from '@/lib/content/contentUrl';
import { loadWelcomeTourRecommendations } from '@/lib/auth/welcomeRecommendations';

type PopulatedBooking = Omit<IBooking, 'tour' | 'user'> & {
  tour: ITour;
  user: IUser;
};

/** What a scheduled mail run actually did. Never a row count dressed as a send. */
export interface EmailJobResult {
  success: boolean;
  /** Bookings the window matched, before claiming. */
  matched: number;
  sent: number;
  failed: number;
  /** Already claimed by an earlier run — the idempotency guard doing its job. */
  skipped: number;
}

// Helper to format dates consistently and avoid timezone issues
// MongoDB stores dates in UTC which can cause off-by-one day errors when reformatted
function formatBookingDate(dateValue: Date | string | undefined): string {
  if (!dateValue) return '';

  // Convert to string if Date object
  const dateStr = dateValue instanceof Date
    ? dateValue.toISOString()
    : String(dateValue);

  // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Fallback
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function dayWindow(offsetDays: number): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() + offsetDays);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Claim one booking for one kind of scheduled email.
 *
 * The field is set BEFORE the send, with the "not yet set" condition inside the
 * filter, so two overlapping runs cannot both win. `modifiedCount` is checked
 * rather than the absence of an error: a filter that matches nothing returns a
 * perfectly successful-looking result.
 */
async function claim(
  bookingId: unknown,
  tenantId: string,
  field: 'tripReminderSentAt' | 'tripCompletionSentAt',
): Promise<boolean> {
  const result = await Booking.updateOne(
    { _id: bookingId, tenantId, [field]: { $exists: false } },
    { $set: { [field]: new Date() } },
  );
  return result.modifiedCount === 1;
}

/** Release a claim so the next run can retry a send that never left the building. */
async function releaseClaim(
  bookingId: unknown,
  tenantId: string,
  field: 'tripReminderSentAt' | 'tripCompletionSentAt',
): Promise<void> {
  await Booking.updateOne(
    { _id: bookingId, tenantId },
    { $unset: { [field]: 1 } },
  ).catch((error) => {
    console.error(`Could not release ${field} claim for ${String(bookingId)}:`, error);
  });
}

// Send trip reminders (run this daily)
export async function sendTripReminders(): Promise<EmailJobResult> {
  await dbConnect();

  const { start, end } = dayWindow(1);
  // The claim field is part of the query as well as the guarded write, so a
  // re-run does not even load the bookings an earlier run already mailed.
  const upcomingBookings = await Booking.find({
    date: { $gte: start, $lte: end },
    status: 'Confirmed',
    tripReminderSentAt: { $exists: false },
  }).populate([
    { path: 'tour', model: Tour },
    { path: 'user', model: User },
  ]);

  console.log(`Trip reminders: ${upcomingBookings.length} unsent bookings for tomorrow`);
  const result: EmailJobResult = { success: true, matched: upcomingBookings.length, sent: 0, failed: 0, skipped: 0 };

  for (const booking of upcomingBookings as unknown as PopulatedBooking[]) {
    const tenantId = booking.tenantId || 'default';
    if (!isValidEmailAddress(booking.user?.email) || !booking.tour?.title) {
      result.failed += 1;
      console.error(`Trip reminder skipped booking=${String(booking._id)} reason=missing_recipient_or_tour`);
      continue;
    }
    if (!(await claim(booking._id, tenantId, 'tripReminderSentAt'))) {
      result.skipped += 1;
      continue;
    }

    try {
      await EmailService.sendTripReminder({
        customerName: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || 'there',
        customerEmail: booking.user.email,
        tourTitle: booking.tour.title,
        bookingDate: formatBookingDate(booking.date),
        bookingTime: booking.time,
        meetingPoint: booking.tour.meetingPoint || 'Meeting point will be confirmed by our team',
        contactNumber: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+20 11 42255624',
        // No `weatherInfo`: this product has no weather source, and a fixed
        // "Sunny, 28°C" told every customer a forecast we had not looked up.
        whatToBring: [
          'Comfortable walking shoes',
          'Sun hat and sunglasses',
          'Water bottle',
          'A light layer for the evening',
        ],
        importantNotes: 'Please arrive 15 minutes early at the meeting point.',
        // The customer-facing reference, not a raw database id.
        bookingId: booking.bookingReference || String(booking._id),
      });
      result.sent += 1;
    } catch (emailError) {
      result.failed += 1;
      await releaseClaim(booking._id, tenantId, 'tripReminderSentAt');
      console.error(`Trip reminder failed booking=${String(booking._id)}:`, emailError);
    }
  }

  result.success = result.failed === 0;
  return result;
}

// Send trip completion emails (run this daily)
export async function sendTripCompletionEmails(): Promise<EmailJobResult> {
  await dbConnect();

  const { start, end } = dayWindow(-1);
  const completedBookings = await Booking.find({
    date: { $gte: start, $lte: end },
    status: 'Confirmed',
    tripCompletionSentAt: { $exists: false },
  }).populate([
    { path: 'tour', model: Tour },
    { path: 'user', model: User },
  ]);

  console.log(`Trip completion: ${completedBookings.length} unsent bookings from yesterday`);
  const result: EmailJobResult = { success: true, matched: completedBookings.length, sent: 0, failed: 0, skipped: 0 };
  if (!completedBookings.length) return result;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  // Real catalogue entries with the catalogue's own prices and current URL
  // shape, loaded once for the batch. Two hardcoded tours at hardcoded prices
  // used to go out here; both prices were wrong and both links were stale.
  const recommendedTours = await loadWelcomeTourRecommendations(2)
    .then((tours) => tours
      .filter((tour) => tour.slug && Number(tour.discountPrice) > 0)
      .map((tour) => ({
        title: tour.title,
        image: tour.images?.[0] || '',
        price: `From $${tour.discountPrice}`,
        link: `${baseUrl}${contentPath('tour', tour.slug, (tour as { urlType?: string }).urlType)}`,
      })))
    .catch((error) => {
      // A recommendation block is a nicety; its absence must never stop the
      // thank-you, and a failed load is not an empty catalogue.
      console.error('Trip completion recommendations unavailable:', error);
      return [] as Array<{ title: string; image: string; price: string; link: string }>;
    });

  for (const booking of completedBookings as unknown as PopulatedBooking[]) {
    const tenantId = booking.tenantId || 'default';
    if (!isValidEmailAddress(booking.user?.email) || !booking.tour?.title || !booking.tour?.slug) {
      result.failed += 1;
      console.error(`Trip completion skipped booking=${String(booking._id)} reason=missing_recipient_or_tour`);
      continue;
    }
    if (!(await claim(booking._id, tenantId, 'tripCompletionSentAt'))) {
      result.skipped += 1;
      continue;
    }

    try {
      await EmailService.sendTripCompletion({
        customerName: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || 'there',
        customerEmail: booking.user.email,
        tourTitle: booking.tour.title,
        bookingDate: formatBookingDate(booking.date),
        reviewLink: `${baseUrl}${contentPath('tour', booking.tour.slug, (booking.tour as { urlType?: string }).urlType)}?review=true`,
        // No `photoSharingLink`: `/share-photos/:id` does not exist in this
        // application, so the link led nowhere.
        recommendedTours,
        baseUrl,
      });
      result.sent += 1;
    } catch (emailError) {
      result.failed += 1;
      await releaseClaim(booking._id, tenantId, 'tripCompletionSentAt');
      console.error(`Trip completion failed booking=${String(booking._id)}:`, emailError);
    }
  }

  result.success = result.failed === 0;
  return result;
}

// Departure reminders and after-trip thank-yous are the two customer emails
// this product owes on a clock. Both routes existed and were correct; nothing
// scheduled them, so neither had ever been sent.
//
// Daily, not every five minutes: each job covers a whole calendar day of
// bookings, so a five-minute cadence would add 287 no-op runs a day and lean on
// the per-booking claim for something a sensible schedule already prevents.
//
// 05:00 UTC is 07:00 in Cairo (UTC+2). The reminder therefore reaches a guest
// travelling tomorrow at the start of their day, with the whole day left to act
// on it, and the thank-you reaches a guest who travelled yesterday while the
// trip is still fresh. The two run one after the other in this invocation.
//
// Safe to re-run: `sendTripReminders` and `sendTripCompletionEmails` claim each
// booking with a guarded write before sending, so a retry, an overlapping run
// or a manual invocation cannot mail the same customer twice.
const BASE_URL = 'https://egypt-excursionsonline.com';
const ROUTES = ['/api/cron/trip-reminders', '/api/cron/trip-completion'];

const dailyCustomerMail = async () => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error(JSON.stringify({ level: 'error', message: 'Daily customer mail is not configured.', code: 'CRON_SECRET_MISSING' }));
    return new Response('Daily customer mail is not configured.', { status: 503 });
  }

  // Sequential on purpose: both jobs write to the same collection and send
  // through the same Mailgun account, and neither is time-critical to the
  // second. Running them one after another keeps the send rate predictable.
  const results = [];
  for (const route of ROUTES) {
    try {
      const response = await fetch(`${BASE_URL}${route}`, {
        headers: { authorization: `Bearer ${secret}`, 'user-agent': 'eeo-daily-customer-mail/1.0' },
        redirect: 'error',
        signal: AbortSignal.timeout(25_000),
      });
      const body = await response.json().catch(() => null);
      const success = response.ok && body?.success === true;
      console.log(JSON.stringify({
        level: success ? 'info' : 'error',
        message: 'Daily customer mail result.',
        route,
        status: response.status,
        success,
        // Counts only — never a recipient address.
        matched: body?.matched ?? null,
        sent: body?.sent ?? null,
        failed: body?.failed ?? null,
        skipped: body?.skipped ?? null,
      }));
      results.push({ route, status: response.status, success });
    } catch (error) {
      const code = error instanceof Error && error.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE';
      console.error(JSON.stringify({ level: 'error', message: 'Daily customer mail request failed.', route, code }));
      results.push({ route, status: 0, success: false });
    }
  }

  const success = results.every((result) => result.success);
  return Response.json({ success, results }, { status: success ? 200 : 502 });
};

export default dailyCustomerMail;
export const config = { schedule: '0 5 * * *' };

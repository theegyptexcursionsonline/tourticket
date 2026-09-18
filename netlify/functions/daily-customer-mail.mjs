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
//
// Scope of one run, so nobody has to guess before enabling it: each job queries
// exactly ONE calendar day (UTC) of `status: 'Confirmed'` bookings — reminders
// for bookings dated tomorrow, thank-yous for bookings dated yesterday. Neither
// sweeps history, so enabling this does not flush a backlog. It is still the
// first time either mail has ever gone out, so every booking inside those two
// days is eligible on the first run.
//
// DISABLED BY DEFAULT — see LIFECYCLE_FLAG below.
const BASE_URL = 'https://egypt-excursionsonline.com';
const ROUTES = ['/api/cron/trip-reminders', '/api/cron/trip-completion'];

/**
 * Off until the owner turns it on.
 *
 * Deploying a schedule must never be the thing that starts mailing customers.
 * This product has no acceptance-recipient redirect — EO has one, which is why
 * EO is safe by default — so the first enabled run reaches real travellers.
 * Switching that on is a deliberate act, not a side effect of a merge.
 *
 * The flag name is deliberately the same as eeo-backend's, so both halves of
 * EEO's lifecycle mail are governed by one switch. EO gates its sweep and ATN
 * uses BOOKING_REMINDERS_ENABLED; this is the same pattern.
 */
export const LIFECYCLE_FLAG = 'LIFECYCLE_EMAILS_ENABLED';

/** Strictly opt-in: only the exact string "true" enables it. */
export function lifecycleEmailsEnabled(env = process.env) {
  return String(env[LIFECYCLE_FLAG] ?? '').trim().toLowerCase() === 'true';
}

const dailyCustomerMail = async () => {
  // Checked before anything else, including the secret: a deployment that has
  // not been switched on is not misconfigured, it is simply off, and must exit
  // cleanly rather than erroring or half-running.
  if (!lifecycleEmailsEnabled()) {
    console.log(JSON.stringify({
      level: 'info',
      message: `Daily customer mail is disabled. Set ${LIFECYCLE_FLAG}=true to enable it.`,
      code: 'LIFECYCLE_EMAILS_DISABLED',
      flag: LIFECYCLE_FLAG,
    }));
    return Response.json(
      { success: true, skipped: true, reason: 'lifecycle_emails_disabled' },
      { status: 200 },
    );
  }

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

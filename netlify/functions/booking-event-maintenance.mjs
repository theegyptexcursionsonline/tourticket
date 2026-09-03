const BASE_URL = 'https://egypt-excursionsonline.com';
const ROUTE = '/api/cron/booking-events';

const bookingEventMaintenance = async () => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error(JSON.stringify({ level: 'error', message: 'Booking-event maintenance is not configured.', code: 'CRON_SECRET_MISSING' }));
    return new Response('Booking-event maintenance is not configured.', { status: 503 });
  }

  try {
    const response = await fetch(`${BASE_URL}${ROUTE}`, {
      headers: { authorization: `Bearer ${secret}`, 'user-agent': 'eeo-booking-event-maintenance/1.0' },
      redirect: 'error',
      signal: AbortSignal.timeout(25_000),
    });
    const body = await response.json().catch(() => null);
    const success = response.ok && body?.success === true;
    console.log(JSON.stringify({ level: success ? 'info' : 'error', message: 'Booking-event maintenance result.', route: ROUTE, status: response.status, success }));
    return Response.json({ success, status: response.status }, { status: success ? 200 : 502 });
  } catch (error) {
    const code = error instanceof Error && error.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE';
    console.error(JSON.stringify({ level: 'error', message: 'Booking-event maintenance request failed.', route: ROUTE, code }));
    return Response.json({ success: false, code }, { status: 502 });
  }
};

export default bookingEventMaintenance;
export const config = { schedule: '*/5 * * * *' };

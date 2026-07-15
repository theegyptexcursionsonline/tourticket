// Revenue pricing summaries are an authoritative recovery path, not a
// browser-driven task. Keep this schedule authenticated, bounded, and
// independent of RevenuePilot's write switches. Payment/inventory recovery is
// intentionally excluded because it has a separate operational risk boundary.
const BASE_URL = 'https://egypt-excursionsonline.com';
const ROUTES = ['/api/cron/pricing-summaries'];

const revenueMaintenance = async () => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error(JSON.stringify({ level: 'error', message: 'Revenue maintenance is not configured.', code: 'CRON_SECRET_MISSING' }));
    return new Response('Revenue maintenance is not configured.', { status: 503 });
  }

  const results = await Promise.all(ROUTES.map(async (route) => {
    try {
      const response = await fetch(`${BASE_URL}${route}`, {
        headers: { authorization: `Bearer ${secret}`, 'user-agent': 'eeo-revenue-maintenance/1.0' },
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      });
      const body = await response.json().catch(() => null);
      const success = response.ok && body?.success === true;
      console.log(JSON.stringify({ level: success ? 'info' : 'error', message: 'Revenue maintenance result.', route, status: response.status, success }));
      return { route, status: response.status, success };
    } catch (error) {
      const code = error instanceof Error && error.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE';
      console.error(JSON.stringify({ level: 'error', message: 'Revenue maintenance request failed.', route, code }));
      return { route, status: 0, success: false };
    }
  }));

  const success = results.every((result) => result.success);
  return Response.json({ success, results }, { status: success ? 200 : 502 });
};

export default revenueMaintenance;
export const config = { schedule: '*/5 * * * *' };

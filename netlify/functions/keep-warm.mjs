// Scheduled keep-warm ping. Netlify tears the Next.js server function down
// after idling, so the first admin visitor pays a multi-second cold start
// (function boot + MongoDB connection). Touching one no-DB route and one
// cheap DB-backed route every 5 minutes keeps both the function instance
// and the database connection pool warm.
const TARGETS = [
  'https://dashboard2.egypt-excursionsonline.com/monitoring',
  'https://dashboard2.egypt-excursionsonline.com/api/hero-settings',
];

export default async () => {
  const results = await Promise.allSettled(
    TARGETS.map(async (url) => {
      const started = Date.now();
      const response = await fetch(url, {
        headers: { 'user-agent': 'eeo-keep-warm/1.0' },
      });
      return `${url} -> ${response.status} in ${Date.now() - started}ms`;
    }),
  );
  for (const result of results) {
    console.log(result.status === 'fulfilled' ? result.value : `ping failed: ${result.reason}`);
  }
  return new Response('ok');
};

export const config = {
  schedule: '*/5 * * * *',
};

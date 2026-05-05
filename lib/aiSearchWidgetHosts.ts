const DEFAULT_ALLOWED_HOSTS = [
  'egypt-excursionsonline.com',
  'www.egypt-excursionsonline.com',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
];

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/:\d+$/, '');
}

function allowedHostsFromEnv() {
  return (process.env.NEXT_PUBLIC_AI_SEARCH_WIDGET_HOSTS || '')
    .split(',')
    .map(normalizeHostname)
    .filter(Boolean);
}

function baseUrlHostFromEnv() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) return [];

  try {
    const hostname = normalizeHostname(new URL(baseUrl).hostname);
    const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    return Array.from(new Set([hostname, withoutWww, `www.${withoutWww}`]));
  } catch {
    return [];
  }
}

export function shouldRenderAISearchWidgetForHost(hostname: string) {
  const normalizedHostname = normalizeHostname(hostname);
  const allowedHosts = new Set([
    ...DEFAULT_ALLOWED_HOSTS,
    ...baseUrlHostFromEnv(),
    ...allowedHostsFromEnv(),
  ]);

  return allowedHosts.has(normalizedHostname);
}

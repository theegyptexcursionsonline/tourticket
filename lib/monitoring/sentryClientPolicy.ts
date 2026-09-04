type SentryEventLike = {
  message?: string;
  logentry?: { message?: string };
  exception?: { values?: Array<{ type?: string; value?: string }> };
};

export const SENTRY_CLIENT_SAMPLE_RATES = Object.freeze({
  developmentTrace: 1,
  adminTrace: 0.1,
  storefrontTrace: 0.02,
  sessionReplay: 0.01,
  errorReplay: 0.1,
});

// Embedded Foxes products are separate security origins. Safari throws when
// rrweb probes a cross-origin frame during replay serialization, even though
// the frame cannot contribute readable content. Keep every iframe opaque in
// recordings: the host DOM remains observable without crossing that boundary.
export const SENTRY_REPLAY_BLOCK_SELECTOR = 'iframe';

/**
 * Firebase Analytics and Installations retry independently of customer auth.
 * When the provider project is unavailable they can emit the same background
 * failure on every page load. Those retries are operationally redundant and
 * previously contributed to Sentry rate limiting.
 *
 * Do not filter Firebase Auth failures here. A real sign-in exception remains
 * actionable and must still reach monitoring if an uncaught path captures it.
 */
const BACKGROUND_PROVIDER_NOISE = [
  'analytics/config-fetch-failed',
  'installations/request-failed',
  "failed to fetch this firebase app's measurement id",
  'installations: generate auth token request failed',
];

function primaryEventText(event: SentryEventLike): string {
  return [
    event.message,
    event.logentry?.message,
    ...(event.exception?.values || []).flatMap((value) => [value.type, value.value]),
  ]
    .filter((value): value is string => typeof value === 'string')
    .join('\n')
    .toLowerCase();
}

export function isBackgroundProviderNoise(event: SentryEventLike): boolean {
  const text = primaryEventText(event);
  return BACKGROUND_PROVIDER_NOISE.some((marker) => text.includes(marker));
}

export function filterClientSentryEvent<T extends SentryEventLike>(event: T): T | null {
  return isBackgroundProviderNoise(event) ? null : event;
}

export function clientTraceSampleRate(pathname: string, environment: string | undefined): number {
  if (environment === 'development') return SENTRY_CLIENT_SAMPLE_RATES.developmentTrace;
  return pathname.startsWith('/admin')
    ? SENTRY_CLIENT_SAMPLE_RATES.adminTrace
    : SENTRY_CLIENT_SAMPLE_RATES.storefrontTrace;
}

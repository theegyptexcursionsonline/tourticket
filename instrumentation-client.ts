// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
  SENTRY_CLIENT_SAMPLE_RATES,
  clientTraceSampleRate,
  filterClientSentryEvent,
} from "@/lib/monitoring/sentryClientPolicy";

Sentry.init({
  dsn: "https://1e487dfcf46247c460d5626e1e7598b1@o4510057591668736.ingest.us.sentry.io/4510057591865344",

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration(),
  ],

  // Keep full local observability, while bounding both admin and high-volume
  // storefront traces in production so a traffic or provider-error spike
  // cannot consume the client telemetry budget.
  tracesSampler: () => {
    const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
    return clientTraceSampleRate(pathname, process.env.NODE_ENV);
  },
  // Browser console output is intentionally not forwarded wholesale. Captured
  // exceptions still flow through Sentry, without duplicating noisy SDK logs.
  enableLogs: false,

  // Suppress only known Analytics/Installations background retry noise. Auth
  // failures and unrelated application exceptions remain actionable.
  beforeSend: filterClientSentryEvent,

  // Record a small baseline of ordinary sessions and a larger—but bounded—
  // sample when an error occurs.
  replaysSessionSampleRate: SENTRY_CLIENT_SAMPLE_RATES.sessionReplay,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: SENTRY_CLIENT_SAMPLE_RATES.errorReplay,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

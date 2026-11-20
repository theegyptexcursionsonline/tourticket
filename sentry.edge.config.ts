// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { IGNORED_SERVER_ERRORS, shouldEnableMonitoring } from "./lib/monitoring/monitoringEnabled";

Sentry.init({
  dsn: "https://1e487dfcf46247c460d5626e1e7598b1@o4510057591668736.ingest.us.sentry.io/4510057591865344",

  // Only a Netlify production deploy reports; local and preview runs stay silent.
  enabled: shouldEnableMonitoring({
    nodeEnv: process.env.NODE_ENV,
    deployContext: process.env.SENTRY_DEPLOY_CONTEXT,
  }),
  ignoreErrors: [...IGNORED_SERVER_ERRORS],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

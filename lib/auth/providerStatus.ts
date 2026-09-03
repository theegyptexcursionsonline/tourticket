// Classification of authentication failures by CAUSE, not by message.
//
// Customer sign-in is a money path: it gates checkout, bookings and the whole
// account area. The identity provider going away must therefore be handled as
// a distinct, recoverable condition — not folded in with "wrong password", and
// never surfaced to a customer as a raw provider string.
//
// This exists because on 2026-09-03 the Google project behind the storefront
// was suspended and every sign-in returned
//   403 PERMISSION_DENIED — Consumer 'api_key:…' has been suspended.
// which the client rendered verbatim to visitors, API key included.
//
// Side-effect free and provider-agnostic so it can be unit tested without a
// network or a live provider.

export type AuthFailureKind =
  | 'provider_unavailable' // the identity provider cannot serve us at all
  | 'credential' // the customer's details were rejected — their action to fix
  | 'rate_limited' // too many attempts, provider- or platform-side
  | 'cancelled' // the customer abandoned an interactive flow
  | 'unknown';

export type AuthOperation = 'login' | 'signup' | 'google' | 'logout';

/** Error codes that mean "this customer's input was rejected". */
const CREDENTIAL_CODES = new Set([
  'auth/user-not-found',
  'auth/wrong-password',
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
  'auth/invalid-email',
  'auth/user-disabled',
  'auth/email-already-in-use',
  'auth/weak-password',
  'auth/missing-password',
]);

/** Error codes that mean "the provider itself cannot serve this request". */
const PROVIDER_CODES = new Set([
  'auth/configuration-not-found',
  'auth/invalid-api-key',
  'auth/api-key-not-valid',
  'auth/app-deleted',
  'auth/app-not-authorized',
  'auth/internal-error',
  'auth/network-request-failed',
  'auth/operation-not-allowed',
  'auth/unauthorized-domain',
  'auth/timeout',
  'auth/quota-exceeded',
  'auth/project-not-found',
]);

const CANCELLED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/popup-blocked',
  'auth/user-cancelled',
]);

/**
 * Substrings that identify a provider-side outage regardless of the code the
 * SDK attached. Matched case-insensitively against the raw message so that a
 * provider which changes its error taxonomy cannot silently downgrade an
 * outage into "invalid password".
 */
const PROVIDER_MESSAGE_MARKERS = [
  'has been suspended',
  'consumer_suspended',
  'permission_denied',
  'permission-denied',
  'api key not valid',
  'api-key-not-valid',
  'service_disabled',
  'project has been deleted',
  'billing',
  'failed to fetch',
];

function errorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code.toLowerCase() : '';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message.toLowerCase();
  }
  return '';
}

/**
 * Resolve an error into its cause.
 *
 * Credential codes are checked FIRST and exactly: a rejected password must
 * never be misread as an outage, or the fallback path would be handed a
 * credential the provider already refused.
 */
export function classifyAuthFailure(error: unknown): AuthFailureKind {
  const code = errorCode(error);
  const message = errorMessage(error);

  if (CREDENTIAL_CODES.has(code)) return 'credential';
  if (code === 'auth/too-many-requests') return 'rate_limited';
  if (CANCELLED_CODES.has(code)) return 'cancelled';

  if (PROVIDER_CODES.has(code)) return 'provider_unavailable';
  // A suspended project arrives as `auth/permission-denied:-consumer-'api-key…'`
  // — a code the SDK synthesises from the HTTP body, so match on the prefix.
  if (code.startsWith('auth/permission-denied')) return 'provider_unavailable';
  if (code.startsWith('auth/internal-error')) return 'provider_unavailable';

  if (PROVIDER_MESSAGE_MARKERS.some((marker) => message.includes(marker))) {
    return 'provider_unavailable';
  }

  return 'unknown';
}

export function isProviderUnavailable(error: unknown): boolean {
  return classifyAuthFailure(error) === 'provider_unavailable';
}

/**
 * The only text that may reach a customer.
 *
 * Every branch returns a fixed string. Nothing derived from the provider's
 * response is interpolated, so a provider error can never put an API key,
 * a project id or an internal hostname on the page.
 */
export function customerAuthMessage(kind: AuthFailureKind, operation: AuthOperation): string {
  switch (kind) {
    case 'credential':
      if (operation === 'signup') {
        return 'We could not create your account with those details. Please check them and try again.';
      }
      return 'Invalid email or password.';

    case 'rate_limited':
      return 'Too many attempts. Please wait a few minutes and try again.';

    case 'cancelled':
      return 'Sign-in was cancelled.';

    case 'provider_unavailable':
      if (operation === 'google') {
        return 'Google sign-in is unavailable at the moment. You can still sign in with your email and password.';
      }
      if (operation === 'signup') {
        return 'We could not finish creating your account. Please try again in a few minutes.';
      }
      return 'We could not sign you in. Please try again in a few minutes, or reset your password to continue.';

    case 'unknown':
    default:
      if (operation === 'signup') {
        return 'We could not create your account. Please try again.';
      }
      return 'We could not sign you in. Please try again.';
  }
}

/**
 * Whether a failed provider attempt should be retried against the platform's
 * own credential store. Only a provider outage qualifies — a rejected
 * credential, a rate limit or an abandoned popup must not be retried.
 */
export function shouldFallBackToPlatform(error: unknown): boolean {
  return classifyAuthFailure(error) === 'provider_unavailable';
}

import {
  classifyAuthFailure,
  customerAuthMessage,
  isProviderUnavailable,
  shouldFallBackToPlatform,
  type AuthFailureKind,
  type AuthOperation,
} from '@/lib/auth/providerStatus';

/**
 * The exact error the live storefront produced on 2026-09-03, when the Google
 * project behind sign-in was suspended. The SDK synthesises the code from the
 * HTTP body, so the API key ends up inside the code itself.
 */
function suspendedProjectError() {
  const error = new Error(
    "Firebase: Error (auth/permission-denied:-consumer-'api-key:aizasyc3nhtgnodh4vgm8pvyedpbzggzdcrrg-w'-has-been-suspended.).",
  );
  Object.assign(error, {
    code: "auth/permission-denied:-consumer-'api-key:aizasyc3nhtgnodh4vgm8pvyedpbzggzdcrrg-w'-has-been-suspended.",
  });
  return error;
}

function firebaseError(code: string, message = 'provider said so') {
  const error = new Error(message);
  Object.assign(error, { code });
  return error;
}

describe('classifyAuthFailure', () => {
  it('treats a suspended provider project as an outage, not a bad password', () => {
    expect(classifyAuthFailure(suspendedProjectError())).toBe('provider_unavailable');
    expect(isProviderUnavailable(suspendedProjectError())).toBe(true);
    expect(shouldFallBackToPlatform(suspendedProjectError())).toBe(true);
  });

  it.each([
    'auth/user-not-found',
    'auth/wrong-password',
    'auth/invalid-credential',
    'auth/invalid-email',
    'auth/user-disabled',
    'auth/email-already-in-use',
    'auth/weak-password',
  ])('classifies %s as a credential failure', (code) => {
    expect(classifyAuthFailure(firebaseError(code))).toBe('credential');
  });

  it('never retries a rejected credential against the platform store', () => {
    // The provider already refused these. Replaying them elsewhere would turn
    // one rejected attempt into two, and defeat the provider's own lockout.
    for (const code of ['auth/wrong-password', 'auth/invalid-credential', 'auth/user-not-found']) {
      expect(shouldFallBackToPlatform(firebaseError(code))).toBe(false);
    }
  });

  it.each([
    'auth/configuration-not-found',
    'auth/invalid-api-key',
    'auth/network-request-failed',
    'auth/internal-error',
    'auth/operation-not-allowed',
    'auth/quota-exceeded',
  ])('classifies %s as a provider outage', (code) => {
    expect(classifyAuthFailure(firebaseError(code))).toBe('provider_unavailable');
  });

  it('detects an outage from the message when the code is unrecognised', () => {
    // A provider that changes its taxonomy must not be able to downgrade an
    // outage into "unknown" and strand the customer.
    expect(classifyAuthFailure(new Error('Requests to this API are blocked: CONSUMER_SUSPENDED'))).toBe(
      'provider_unavailable',
    );
    expect(classifyAuthFailure(new Error('403 PERMISSION_DENIED'))).toBe('provider_unavailable');
    expect(classifyAuthFailure(new Error('API key not valid. Please pass a valid API key.'))).toBe(
      'provider_unavailable',
    );
  });

  it('separates rate limiting and cancellation from both other causes', () => {
    expect(classifyAuthFailure(firebaseError('auth/too-many-requests'))).toBe('rate_limited');
    expect(classifyAuthFailure(firebaseError('auth/popup-closed-by-user'))).toBe('cancelled');
    expect(shouldFallBackToPlatform(firebaseError('auth/too-many-requests'))).toBe(false);
    expect(shouldFallBackToPlatform(firebaseError('auth/popup-closed-by-user'))).toBe(false);
  });

  it('falls back to unknown rather than guessing', () => {
    expect(classifyAuthFailure(new Error('something else entirely'))).toBe('unknown');
    expect(classifyAuthFailure(null)).toBe('unknown');
    expect(classifyAuthFailure(undefined)).toBe('unknown');
    expect(classifyAuthFailure({})).toBe('unknown');
  });
});

describe('customerAuthMessage', () => {
  const kinds: AuthFailureKind[] = [
    'provider_unavailable',
    'credential',
    'rate_limited',
    'cancelled',
    'unknown',
  ];
  const operations: AuthOperation[] = ['login', 'signup', 'google', 'logout'];

  it('never leaks provider internals to a customer', () => {
    // The defect being prevented: the live page rendered the project's API key.
    const forbidden = [
      'api-key',
      'api key',
      'aizasy',
      'firebase',
      'consumer',
      'suspended',
      'permission_denied',
      'permission-denied',
      'googleapis',
      'auth/',
      '403',
    ];
    for (const kind of kinds) {
      for (const operation of operations) {
        const message = customerAuthMessage(kind, operation).toLowerCase();
        for (const needle of forbidden) {
          expect(message).not.toContain(needle);
        }
      }
    }
  });

  it('returns a non-empty, human sentence for every combination', () => {
    for (const kind of kinds) {
      for (const operation of operations) {
        const message = customerAuthMessage(kind, operation);
        expect(message.length).toBeGreaterThan(10);
        expect(message.trim()).toBe(message);
        expect(message.endsWith('.')).toBe(true);
      }
    }
  });

  it('keeps the rejected-credential wording indistinguishable between unknown email and wrong password', () => {
    // Account enumeration: both cases must read identically.
    expect(customerAuthMessage('credential', 'login')).toBe('Invalid email or password.');
  });

  it('tells a customer what still works when the provider is down', () => {
    expect(customerAuthMessage('provider_unavailable', 'google')).toContain('email and password');
    expect(customerAuthMessage('provider_unavailable', 'login')).toContain('reset your password');
  });
});

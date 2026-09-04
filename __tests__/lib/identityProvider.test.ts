import {
  activeIdentityProvider,
  isWorkosConfigured,
  platformCredentialsAvailable,
  resolvedIdentityProvider,
} from '@/lib/auth/identityProvider';

const workosEnv = {
  WORKOS_API_KEY: 'sk_test_value',
  WORKOS_CLIENT_ID: 'client_value',
};

describe('activeIdentityProvider', () => {
  it('defaults to the store we own when unset', () => {
    // A missing or misspelt value must not silently hand sign-in to a third
    // party — it degrades to the path that cannot be taken away from us.
    expect(activeIdentityProvider({})).toBe('platform');
    expect(activeIdentityProvider({ NEXT_PUBLIC_IDENTITY_PROVIDER: '' })).toBe('platform');
    expect(activeIdentityProvider({ NEXT_PUBLIC_IDENTITY_PROVIDER: 'wrkos' })).toBe('platform');
  });

  it('accepts the supported providers case-insensitively', () => {
    expect(activeIdentityProvider({ NEXT_PUBLIC_IDENTITY_PROVIDER: 'workos' })).toBe('workos');
    expect(activeIdentityProvider({ NEXT_PUBLIC_IDENTITY_PROVIDER: 'WorkOS' })).toBe('workos');
    expect(activeIdentityProvider({ NEXT_PUBLIC_IDENTITY_PROVIDER: 'platform' })).toBe('platform');
    expect(activeIdentityProvider({ NEXT_PUBLIC_IDENTITY_PROVIDER: 'firebase' })).toBe('platform');
  });
});

describe('configuration detection', () => {
  it('treats a partially configured provider as unconfigured', () => {
    // Half-configured auth fails in front of a customer, at the worst moment.
    expect(isWorkosConfigured({ WORKOS_API_KEY: 'sk_test_value' })).toBe(false);
    expect(isWorkosConfigured({ WORKOS_CLIENT_ID: 'client_value' })).toBe(false);
    expect(isWorkosConfigured(workosEnv)).toBe(true);
  });
});

describe('resolvedIdentityProvider', () => {
  it('falls back to the platform store when the selected provider is not configured', () => {
    expect(resolvedIdentityProvider({ NEXT_PUBLIC_IDENTITY_PROVIDER: 'workos' })).toBe('platform');
  });

  it('uses the selected provider once it is fully configured', () => {
    expect(
      resolvedIdentityProvider({ NEXT_PUBLIC_IDENTITY_PROVIDER: 'workos', ...workosEnv }),
    ).toBe('workos');
  });

  it('never resolves to a provider the operator did not select', () => {
    // Configuration left over from a previous provider must not reactivate it.
    expect(resolvedIdentityProvider({ ...workosEnv })).toBe('platform');
  });
});

describe('platform credentials', () => {
  it('are always available — the floor, not a switchable fallback', () => {
    expect(platformCredentialsAvailable()).toBe(true);
  });
});

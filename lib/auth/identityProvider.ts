// Which identity provider verifies a customer's credential, and what happens
// when it cannot.
//
// The storefront must never again depend on exactly one external provider for
// sign-in. Two rules encode that:
//
//   1. The provider is selected by configuration, not hard-coded, so it can be
//      changed without touching call sites.
//   2. The platform's own credential store is ALWAYS available underneath.
//      It is not a provider option — it is the floor.
//
// The session itself is always issued by the platform (a signed JWT in an
// httpOnly cookie). A provider verifies the credential; it never becomes the
// authority for access. That keeps authorization in one place regardless of
// which provider is in front, and means a provider outage costs new sign-ins
// but never existing sessions.

export type IdentityProviderName = 'workos' | 'platform';

const KNOWN_PROVIDERS: readonly IdentityProviderName[] = ['workos', 'platform'];

/**
 * The provider that should verify credentials, from
 * `NEXT_PUBLIC_IDENTITY_PROVIDER`.
 *
 * Defaults to `platform` — the store we own — so a missing or misspelt value
 * degrades to the path that cannot be taken away from us, rather than to an
 * external dependency.
 */
export function activeIdentityProvider(
  env: Record<string, string | undefined> = process.env,
): IdentityProviderName {
  const configured = (env.NEXT_PUBLIC_IDENTITY_PROVIDER || '').trim().toLowerCase();
  return (KNOWN_PROVIDERS as readonly string[]).includes(configured)
    ? (configured as IdentityProviderName)
    : 'platform';
}

/**
 * WorkOS is usable only when every value its server-side calls need is present.
 * A partial configuration is treated as absent: half-configured auth fails at
 * the worst possible moment, in front of a customer.
 */
export function isWorkosConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.WORKOS_API_KEY && env.WORKOS_CLIENT_ID);
}

/**
 * The provider that will actually be attempted, after checking that the
 * selected one is configured. Selecting a provider whose configuration is
 * missing resolves to `platform` rather than failing the request.
 */
export function resolvedIdentityProvider(
  env: Record<string, string | undefined> = process.env,
): IdentityProviderName {
  const selected = activeIdentityProvider(env);
  if (selected === 'workos') return isWorkosConfigured(env) ? 'workos' : 'platform';
  return 'platform';
}

/**
 * Whether the platform credential store may serve a sign-in directly.
 * Always true — it is the floor, never a fallback that can be switched off.
 */
export function platformCredentialsAvailable(): boolean {
  return true;
}

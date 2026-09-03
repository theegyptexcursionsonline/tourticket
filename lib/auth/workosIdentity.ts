// WorkOS as a credential verifier — not as the session authority.
//
// WorkOS checks that the person knows the password (and, later, runs MFA,
// passkeys and Google sign-in). The platform still issues its own JWT session
// afterwards, exactly as it does for a platform sign-in. That keeps one
// authorization model regardless of who verified the credential, and means a
// WorkOS outage costs new sign-ins but never existing sessions.
//
// Deliberately NOT the hosted AuthKit redirect: a shopper stays on the
// storefront's own sign-in form.
//
// Every failure is reduced to an outcome. No WorkOS message, code or
// identifier is ever returned to a caller, so nothing provider-shaped can
// reach a customer.

import { isWorkosConfigured } from './identityProvider';

export type WorkosOutcome =
  | {
      outcome: 'verified';
      workosUserId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      emailVerified: boolean;
    }
  | { outcome: 'rejected' } // the credential is wrong, or the user is unknown
  | { outcome: 'exists' } // sign-up only: that email is already registered
  | { outcome: 'rate_limited' }
  | { outcome: 'unavailable' }; // WorkOS cannot serve us — caller falls back

interface WorkosUserShape {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: boolean;
}

/** Minimal surface we depend on, so tests never need the real SDK. */
export interface WorkosUserManagement {
  authenticateWithPassword(options: {
    clientId?: string;
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: WorkosUserShape }>;
  createUser(options: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<WorkosUserShape>;
}

type ClientFactory = () => Promise<WorkosUserManagement | null>;

let clientFactory: ClientFactory = async () => {
  if (!isWorkosConfigured()) return null;
  const { WorkOS } = await import('@workos-inc/node');
  const workos = new WorkOS(process.env.WORKOS_API_KEY as string, {
    clientId: process.env.WORKOS_CLIENT_ID,
  });
  return workos.userManagement as unknown as WorkosUserManagement;
};

/** Test seam. Passing `null` restores the real client. */
export function __setWorkosClientFactory(factory: ClientFactory | null): void {
  if (factory) {
    clientFactory = factory;
    return;
  }
  clientFactory = async () => {
    if (!isWorkosConfigured()) return null;
    const { WorkOS } = await import('@workos-inc/node');
    const workos = new WorkOS(process.env.WORKOS_API_KEY as string, {
      clientId: process.env.WORKOS_CLIENT_ID,
    });
    return workos.userManagement as unknown as WorkosUserManagement;
  };
}

function statusOf(error: unknown): number {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { status?: unknown; statusCode?: unknown };
    if (typeof candidate.status === 'number') return candidate.status;
    if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  }
  return 0;
}

function codeOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code.toLowerCase();
  }
  return '';
}

/**
 * Map a thrown provider error onto an outcome.
 *
 * Anything that is not unambiguously the customer's fault is treated as
 * `unavailable`, because the caller's fallback is safe (it re-verifies against
 * our own store) while wrongly reporting "invalid password" during an outage
 * is not — it tells a customer with correct details that they are wrong.
 */
export function outcomeForWorkosError(error: unknown): Exclude<WorkosOutcome, { outcome: 'verified' }> {
  const status = statusOf(error);
  const code = codeOf(error);

  if (code === 'email_verification_required') return { outcome: 'rejected' };
  if (code === 'user_creation_error' || code === 'email_not_available') return { outcome: 'exists' };
  if (status === 409) return { outcome: 'exists' };
  if (status === 429) return { outcome: 'rate_limited' };
  if (status === 401 || status === 403 || code === 'invalid_credentials') {
    return { outcome: 'rejected' };
  }
  return { outcome: 'unavailable' };
}

function toVerified(user: WorkosUserShape): WorkosOutcome {
  return {
    outcome: 'verified',
    workosUserId: user.id,
    email: user.email,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    emailVerified: Boolean(user.emailVerified),
  };
}

export async function verifyPasswordWithWorkos(input: {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<WorkosOutcome> {
  let client: WorkosUserManagement | null;
  try {
    client = await clientFactory();
  } catch {
    return { outcome: 'unavailable' };
  }
  // Unconfigured is an outage, not a rejection: the caller must fall back
  // rather than tell a customer their password is wrong.
  if (!client) return { outcome: 'unavailable' };

  try {
    const { user } = await client.authenticateWithPassword({
      clientId: process.env.WORKOS_CLIENT_ID,
      email: input.email,
      password: input.password,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    return toVerified(user);
  } catch (error) {
    return outcomeForWorkosError(error);
  }
}

export async function createWorkosUser(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<WorkosOutcome> {
  let client: WorkosUserManagement | null;
  try {
    client = await clientFactory();
  } catch {
    return { outcome: 'unavailable' };
  }
  if (!client) return { outcome: 'unavailable' };

  try {
    const user = await client.createUser({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    return toVerified(user);
  } catch (error) {
    return outcomeForWorkosError(error);
  }
}

/**
 * Hash formats WorkOS accepts on import, taken from the SDK's own
 * `PasswordHashType`. This is why a migration does not have to force a
 * password reset: platform accounts carry `bcrypt`, and accounts that came
 * from the previous provider carry `firebase-scrypt`.
 */
export const IMPORTABLE_PASSWORD_HASH_TYPES = [
  'bcrypt',
  'firebase-scrypt',
  'ssha',
  'scrypt',
  'argon2',
] as const;

export type ImportablePasswordHashType = (typeof IMPORTABLE_PASSWORD_HASH_TYPES)[number];

export function isImportablePasswordHashType(value: string): value is ImportablePasswordHashType {
  return (IMPORTABLE_PASSWORD_HASH_TYPES as readonly string[]).includes(value);
}

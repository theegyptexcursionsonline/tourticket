// Client-side access to the platform's own credential store.
//
// These routes have always existed and were hardened long ago — bcrypt with a
// timing-safe dummy compare, per-account lockout and distributed abuse limits
// — but nothing in the customer UI ever called them, so sign-in depended
// entirely on one external provider. They are the resilient path underneath
// whichever identity provider is in front.

export interface PlatformUser {
  id: string;
  _id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  permissions?: string[];
  authProvider?: string;
  emailVerified?: boolean;
}

export interface PlatformAuthResult {
  ok: boolean;
  status: number;
  token?: string;
  user?: PlatformUser;
  /** Server-supplied, already customer-safe. Never a provider string. */
  error?: string;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

async function post(path: string, body: unknown): Promise<PlatformAuthResult> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
  } catch {
    // The platform itself is unreachable — distinct from a rejected credential.
    return { ok: false, status: 0 };
  }

  const data = await readJson(response);
  if (!response.ok) {
    return { ok: false, status: response.status, error: asString(data.error) };
  }

  return {
    ok: true,
    status: response.status,
    token: asString(data.token),
    user: (data.user as PlatformUser | undefined) ?? undefined,
  };
}

export function platformLogin(email: string, password: string): Promise<PlatformAuthResult> {
  return post('/api/auth/login', { email, password });
}

export function platformSignup(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<PlatformAuthResult> {
  return post('/api/auth/signup', input);
}

export class PlatformSessionUnavailableError extends Error {
  constructor() {
    super('The customer session service is temporarily unavailable.');
    this.name = 'PlatformSessionUnavailableError';
  }
}

/**
 * Restore a platform session from the httpOnly cookie.
 * Returns `null` only when the server confirms that there is no session.
 * Transport, server and malformed-success failures remain failures so callers
 * never turn an outage into an apparently signed-out customer.
 */
export async function platformSession(): Promise<PlatformUser | null> {
  try {
    const response = await fetch('/api/auth/platform-session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new PlatformSessionUnavailableError();
    const data = await readJson(response);
    const user = data.user as PlatformUser | undefined;
    if (!user?.id || !user.email) throw new PlatformSessionUnavailableError();
    return user;
  } catch (error) {
    if (error instanceof PlatformSessionUnavailableError) throw error;
    throw new PlatformSessionUnavailableError();
  }
}

export async function platformLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    // Clearing the local session still proceeds; the cookie expires server-side.
  }
}

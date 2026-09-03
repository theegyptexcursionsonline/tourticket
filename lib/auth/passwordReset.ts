// Platform-owned password reset.
//
// Recovery has to work when the external identity provider does not. Without
// it a customer whose password lives only with that provider is permanently
// locked out of their own account during an outage — which is exactly the
// situation the storefront is in today.
//
// Design constraints, in the order they matter:
//
//  - The token is a bearer credential for the account, so only its HASH is
//    stored. A leaked database read must not hand over live reset links.
//  - Single use and short lived.
//  - Nothing in any response may reveal whether an account exists.
//
// Side-effect free so the token rules can be unit tested without a database.

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** 32 random bytes rendered as 64 hex characters — matches the existing link shape. */
export const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

/** One hour. Long enough to find the email, short enough to limit exposure. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export interface IssuedResetToken {
  /** Sent to the customer. Never stored. */
  token: string;
  /** Stored on the account. */
  tokenHash: string;
  expiresAt: Date;
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function createResetToken(now: Date = new Date()): IssuedResetToken {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
  };
}

/**
 * Constant-time comparison of a presented token against the stored hash, so
 * the endpoint cannot be used as a timing oracle to recover a valid token.
 */
export function resetTokenMatches(presentedToken: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !RESET_TOKEN_PATTERN.test(presentedToken)) return false;
  const presented = Buffer.from(hashResetToken(presentedToken), 'hex');
  let stored: Buffer;
  try {
    stored = Buffer.from(storedHash, 'hex');
  } catch {
    return false;
  }
  if (presented.length !== stored.length || presented.length === 0) return false;
  return timingSafeEqual(presented, stored);
}

export function resetTokenExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return true;
  const time = expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(String(expiresAt));
  if (!Number.isFinite(time)) return true;
  return time <= now.getTime();
}

export type PasswordRuleFailure = 'too_short' | 'too_long' | 'mismatch' | null;

export function checkNewPassword(password: unknown, confirmPassword: unknown): PasswordRuleFailure {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) return 'too_short';
  if (password.length > MAX_PASSWORD_LENGTH) return 'too_long';
  if (typeof confirmPassword !== 'string' || password !== confirmPassword) return 'mismatch';
  return null;
}

export function passwordRuleMessage(failure: Exclude<PasswordRuleFailure, null>): string {
  switch (failure) {
    case 'too_short':
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    case 'too_long':
      return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
    case 'mismatch':
      return 'Passwords do not match.';
  }
}

/**
 * The single response a reset request may produce, whatever happened.
 * Identical for a known account, an unknown account, a disabled account and a
 * failed send, so the endpoint cannot be used to enumerate customers. It also
 * never claims delivery occurred, so it stays truthful when sending fails.
 */
export const RESET_REQUEST_MESSAGE =
  'If an eligible account exists and email delivery succeeds, reset instructions will arrive shortly.';

export function buildResetUrl(baseOrigin: string, token: string, email?: string): string {
  const url = new URL('/reset-password', baseOrigin);
  url.searchParams.set('token', token);
  // Tells the reset page to complete against the platform endpoint rather than
  // the mobile backend, which owns its own separate token store.
  url.searchParams.set('src', 'web');
  if (email) url.searchParams.set('email', email);
  return url.toString();
}

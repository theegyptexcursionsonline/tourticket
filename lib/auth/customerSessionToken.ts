/**
 * Client-only marker for an authenticated httpOnly-cookie session.
 * It is never accepted as a credential; server guards use it only to select
 * the cookie path when legacy client callers still emit a Bearer header.
 */
export const PLATFORM_SESSION_SENTINEL = 'platform-session';

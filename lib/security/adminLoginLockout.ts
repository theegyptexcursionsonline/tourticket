export const MAX_ADMIN_LOGIN_ATTEMPTS = 5;
export const ADMIN_LOGIN_LOCK_MS = 15 * 60 * 1000;

export function nextAdminLoginFailure(
  currentAttempts: number,
  now = Date.now(),
): { attempts: number; lockUntil?: Date } {
  const attempts = Math.max(0, currentAttempts) + 1;
  if (attempts < MAX_ADMIN_LOGIN_ATTEMPTS) return { attempts };

  return {
    attempts: 0,
    lockUntil: new Date(now + ADMIN_LOGIN_LOCK_MS),
  };
}

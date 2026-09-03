import {
  buildResetUrl,
  checkNewPassword,
  createResetToken,
  hashResetToken,
  passwordRuleMessage,
  RESET_TOKEN_PATTERN,
  RESET_TOKEN_TTL_MS,
  resetTokenExpired,
  resetTokenMatches,
} from '@/lib/auth/passwordReset';

describe('createResetToken', () => {
  it('issues a 64-hex token and stores only its hash', () => {
    const issued = createResetToken();
    expect(RESET_TOKEN_PATTERN.test(issued.token)).toBe(true);
    expect(issued.tokenHash).toBe(hashResetToken(issued.token));
    // The stored value must not be the token itself — a database read must not
    // yield live reset links.
    expect(issued.tokenHash).not.toBe(issued.token);
    expect(issued.tokenHash).toHaveLength(64);
  });

  it('never issues the same token twice', () => {
    const seen = new Set(Array.from({ length: 200 }, () => createResetToken().token));
    expect(seen.size).toBe(200);
  });

  it('expires one hour after issue', () => {
    const now = new Date('2026-09-03T10:00:00.000Z');
    const issued = createResetToken(now);
    expect(issued.expiresAt.getTime() - now.getTime()).toBe(RESET_TOKEN_TTL_MS);
  });
});

describe('resetTokenMatches', () => {
  it('accepts the issued token against its stored hash', () => {
    const issued = createResetToken();
    expect(resetTokenMatches(issued.token, issued.tokenHash)).toBe(true);
  });

  it('rejects a different token, a malformed token and a missing hash', () => {
    const issued = createResetToken();
    const other = createResetToken();
    expect(resetTokenMatches(other.token, issued.tokenHash)).toBe(false);
    expect(resetTokenMatches('not-a-token', issued.tokenHash)).toBe(false);
    expect(resetTokenMatches(issued.token, null)).toBe(false);
    expect(resetTokenMatches(issued.token, undefined)).toBe(false);
    expect(resetTokenMatches(issued.token, '')).toBe(false);
  });

  it('rejects a stored hash of the wrong length without throwing', () => {
    const issued = createResetToken();
    expect(resetTokenMatches(issued.token, 'abcd')).toBe(false);
  });
});

describe('resetTokenExpired', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');

  it('treats a missing or unparseable expiry as expired', () => {
    // Fail closed: absent configuration is never "still valid".
    expect(resetTokenExpired(null, now)).toBe(true);
    expect(resetTokenExpired(undefined, now)).toBe(true);
    expect(resetTokenExpired(new Date('nonsense'), now)).toBe(true);
  });

  it('expires exactly at the boundary, not after it', () => {
    expect(resetTokenExpired(new Date(now.getTime() + 1), now)).toBe(false);
    expect(resetTokenExpired(new Date(now.getTime()), now)).toBe(true);
    expect(resetTokenExpired(new Date(now.getTime() - 1), now)).toBe(true);
  });
});

describe('checkNewPassword', () => {
  it('enforces the same 8–128 rule as sign-up', () => {
    expect(checkNewPassword('short', 'short')).toBe('too_short');
    expect(checkNewPassword('a'.repeat(129), 'a'.repeat(129))).toBe('too_long');
    expect(checkNewPassword('longenough1', 'different11')).toBe('mismatch');
    expect(checkNewPassword('longenough1', 'longenough1')).toBeNull();
  });

  it('rejects non-string input rather than coercing it', () => {
    expect(checkNewPassword(undefined, undefined)).toBe('too_short');
    expect(checkNewPassword(12345678, 12345678)).toBe('too_short');
    expect(checkNewPassword('longenough1', undefined)).toBe('mismatch');
  });

  it('has a message for every failure', () => {
    for (const failure of ['too_short', 'too_long', 'mismatch'] as const) {
      expect(passwordRuleMessage(failure).length).toBeGreaterThan(10);
    }
  });
});

describe('buildResetUrl', () => {
  it('marks the link as platform-issued so it completes against the right store', () => {
    const url = new URL(buildResetUrl('https://egypt-excursionsonline.com', 'a'.repeat(64), 'x@y.com'));
    expect(url.origin).toBe('https://egypt-excursionsonline.com');
    expect(url.pathname).toBe('/reset-password');
    expect(url.searchParams.get('token')).toBe('a'.repeat(64));
    expect(url.searchParams.get('src')).toBe('web');
    expect(url.searchParams.get('email')).toBe('x@y.com');
  });

  it('omits the email when none is supplied', () => {
    const url = new URL(buildResetUrl('https://egypt-excursionsonline.com', 'b'.repeat(64)));
    expect(url.searchParams.has('email')).toBe(false);
  });
});

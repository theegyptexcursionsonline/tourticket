import {
  ADMIN_LOGIN_LOCK_MS,
  nextAdminLoginFailure,
} from '../adminLoginLockout';

describe('admin login lockout', () => {
  it('locks the account after five consecutive failures', () => {
    const now = Date.parse('2026-07-11T00:00:00Z');
    expect(nextAdminLoginFailure(3, now)).toEqual({ attempts: 4 });
    expect(nextAdminLoginFailure(4, now)).toEqual({
      attempts: 0,
      lockUntil: new Date(now + ADMIN_LOGIN_LOCK_MS),
    });
  });

  it('does not accept negative attempt counts', () => {
    expect(nextAdminLoginFailure(-10).attempts).toBe(1);
  });
});

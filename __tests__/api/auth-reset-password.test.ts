/**
 * POST /api/auth/reset-password — platform-owned account recovery.
 *
 * This is the path that must keep working when the external identity provider
 * does not. Without it, a customer whose password lives only with that
 * provider is locked out of their own account for the duration of an outage.
 *
 * Every unusable link — unknown, replayed, expired, or belonging to a
 * deactivated account — must produce one identical response.
 */

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _body: unknown;
    headers: Map<string, string>;
    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this._body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    async json() {
      return this._body;
    }
    static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));

const mockFindOne = jest.fn();
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { findOne: (...a: unknown[]) => mockFindOne(...a) },
}));

const mockLimits = jest.fn();
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  enforcePublicActionLimits: (...a: unknown[]) => mockLimits(...a),
}));

jest.mock('@/lib/security/publicInput', () => {
  class PublicInputError extends Error {
    status = 400;
  }
  return {
    PublicInputError,
    readBoundedJson: async (request: { _body: unknown }) => request._body,
  };
});

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockImplementation(async (value: string) => `hashed:${value}`),
  },
}));

import { POST } from '@/app/api/auth/reset-password/route';
import { createResetToken, hashResetToken } from '@/lib/auth/passwordReset';

const VALID_PASSWORD = 'a-good-password-1';

function requestWith(body: unknown) {
  return { _body: body } as never;
}

interface UserDoc {
  isActive: boolean;
  password?: string;
  adminLoginAttempts?: number;
  adminLockUntil?: Date;
  requirePasswordChange?: boolean;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  save: jest.Mock;
}

function userDoc(overrides: Partial<UserDoc> = {}): UserDoc {
  return {
    isActive: true,
    password: 'old',
    adminLoginAttempts: 4,
    adminLockUntil: new Date(Date.now() + 60_000),
    requirePasswordChange: true,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function selectable(doc: UserDoc | null) {
  return { select: jest.fn().mockResolvedValue(doc) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLimits.mockResolvedValue({ allowed: true });
});

describe('input validation', () => {
  it.each([
    ['a missing token', { password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }],
    ['a malformed token', { token: 'nope', password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }],
  ])('rejects %s without touching the database', async (_label, body) => {
    const response = await POST(requestWith(body));
    expect(response.status).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('enforces the password rules before any lookup', async () => {
    const { token } = createResetToken();
    const response = await POST(requestWith({ token, password: 'short', confirmPassword: 'short' }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('at least 8');
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('requires the confirmation to match', async () => {
    const { token } = createResetToken();
    const response = await POST(
      requestWith({ token, password: VALID_PASSWORD, confirmPassword: 'something-else-1' }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Passwords do not match.');
  });
});

describe('token handling', () => {
  it('looks the account up by the token HASH, never the token', async () => {
    const issued = createResetToken();
    mockFindOne.mockReturnValueOnce(
      selectable(userDoc({ passwordResetTokenHash: issued.tokenHash, passwordResetExpires: issued.expiresAt })),
    );

    await POST(requestWith({ token: issued.token, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }));

    expect(mockFindOne).toHaveBeenCalledWith({ passwordResetTokenHash: hashResetToken(issued.token) });
    const queried = JSON.stringify(mockFindOne.mock.calls[0]);
    expect(queried).not.toContain(issued.token);
  });

  it('resets the password, consumes the link and clears any lockout', async () => {
    const issued = createResetToken();
    const doc = userDoc({ passwordResetTokenHash: issued.tokenHash, passwordResetExpires: issued.expiresAt });
    mockFindOne.mockReturnValueOnce(selectable(doc));

    const response = await POST(
      requestWith({ token: issued.token, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }),
    );

    expect(response.status).toBe(200);
    expect(doc.password).toBe(`hashed:${VALID_PASSWORD}`);
    // Single use.
    expect(doc.passwordResetTokenHash).toBeUndefined();
    expect(doc.passwordResetExpires).toBeUndefined();
    // Otherwise the customer resets their password and still cannot sign in.
    expect(doc.adminLoginAttempts).toBe(0);
    expect(doc.adminLockUntil).toBeUndefined();
    expect(doc.requirePasswordChange).toBe(false);
    expect(doc.save).toHaveBeenCalled();
  });

  it.each([
    ['an unknown or already-used link', null],
    ['an expired link', 'expired'],
    ['a deactivated account', 'inactive'],
    ['a stored hash that does not match', 'mismatch'],
  ])('answers identically for %s', async (_label, mode) => {
    const issued = createResetToken();
    let doc: UserDoc | null = null;
    if (mode === 'expired') {
      doc = userDoc({
        passwordResetTokenHash: issued.tokenHash,
        passwordResetExpires: new Date(Date.now() - 1_000),
      });
    } else if (mode === 'inactive') {
      doc = userDoc({
        isActive: false,
        passwordResetTokenHash: issued.tokenHash,
        passwordResetExpires: issued.expiresAt,
      });
    } else if (mode === 'mismatch') {
      doc = userDoc({
        passwordResetTokenHash: createResetToken().tokenHash,
        passwordResetExpires: issued.expiresAt,
      });
    }
    mockFindOne.mockReturnValueOnce(selectable(doc));

    const response = await POST(
      requestWith({ token: issued.token, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(
      'This reset link is invalid or has expired. Request a new link and try again.',
    );
    if (doc) expect(doc.save).not.toHaveBeenCalled();
  });
});

describe('abuse limits and failure handling', () => {
  it('buckets on the token hash, never on an email', async () => {
    const issued = createResetToken();
    mockFindOne.mockReturnValueOnce(
      selectable(userDoc({ passwordResetTokenHash: issued.tokenHash, passwordResetExpires: issued.expiresAt })),
    );

    await POST(requestWith({ token: issued.token, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }));

    const options = mockLimits.mock.calls[0][0] as { action: string; subject: string };
    expect(options.action).toBe('reset-password');
    expect(options.subject).toBe(hashResetToken(issued.token).slice(0, 32));
  });

  it('returns 429 with Retry-After when limited, without a lookup', async () => {
    mockLimits.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 900 });
    const { token } = createResetToken();

    const response = await POST(requestWith({ token, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('900');
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('reports a storage failure as unavailable rather than as an invalid link', async () => {
    // "Invalid link" would send the customer round the loop forever for a
    // fault that is ours.
    const issued = createResetToken();
    mockFindOne.mockImplementationOnce(() => {
      throw new Error('connection lost');
    });

    const response = await POST(
      requestWith({ token: issued.token, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }),
    );
    expect(response.status).toBe(503);
  });

  it('never caches a reset response', async () => {
    const issued = createResetToken();
    mockFindOne.mockReturnValueOnce(
      selectable(userDoc({ passwordResetTokenHash: issued.tokenHash, passwordResetExpires: issued.expiresAt })),
    );
    const response = await POST(
      requestWith({ token: issued.token, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }),
    );
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});

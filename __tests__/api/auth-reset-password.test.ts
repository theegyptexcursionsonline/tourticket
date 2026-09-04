jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private readonly body: unknown;
    headers: Map<string, string>;

    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }

    async json() {
      return this.body;
    }

    static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockFindOneAndUpdate = jest.fn();
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args) },
}));

const mockLimits = jest.fn();
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  enforcePublicActionLimits: (...args: unknown[]) => mockLimits(...args),
}));

jest.mock('@/lib/security/publicInput', () => {
  class PublicInputError extends Error {
    status = 400;
  }
  return {
    PublicInputError,
    readBoundedJson: async (request: { body: unknown }) => request.body,
  };
});

const mockGenSalt = jest.fn();
const mockHash = jest.fn();
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    genSalt: (...args: unknown[]) => mockGenSalt(...args),
    hash: (...args: unknown[]) => mockHash(...args),
  },
}));

import { POST } from '@/app/api/auth/reset-password/route';
import { createResetToken, hashResetToken } from '@/lib/auth/passwordReset';

const validPassword = 'a-good-password-1';
const invalidLink = 'This reset link is invalid or has expired. Request a new link and try again.';

function request(body: unknown) {
  return { body } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLimits.mockResolvedValue({ allowed: true });
  mockGenSalt.mockResolvedValue('salt');
  mockHash.mockResolvedValue('new-password-hash');
  mockFindOneAndUpdate.mockResolvedValue({ _id: 'customer-1' });
});

describe('POST /api/auth/reset-password', () => {
  it.each([
    ['a missing token', { password: validPassword, confirmPassword: validPassword }],
    ['a malformed token', { token: 'nope', password: validPassword, confirmPassword: validPassword }],
  ])('rejects %s before hashing or querying', async (_label, body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('enforces password strength and matching confirmation before storage', async () => {
    const { token } = createResetToken();
    const weak = await POST(request({ token, password: 'short', confirmPassword: 'short' }));
    expect(weak.status).toBe(400);
    expect((await weak.json()).error).toContain('at least 8');

    const mismatch = await POST(request({
      token,
      password: validPassword,
      confirmPassword: 'something-else-1',
    }));
    expect(mismatch.status).toBe(400);
    expect((await mismatch.json()).error).toBe('Passwords do not match.');
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('atomically consumes the hash while setting the platform credential and preserving the customer record', async () => {
    const issued = createResetToken();

    const response = await POST(request({
      token: issued.token,
      password: validPassword,
      confirmPassword: validPassword,
    }));

    expect(response.status).toBe(200);
    expect(mockHash).toHaveBeenCalledWith(validPassword, 'salt');
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      {
        passwordResetTokenHash: hashResetToken(issued.token),
        passwordResetExpires: { $gt: expect.any(Date) },
        isActive: { $ne: false },
      },
      {
        $set: {
          password: 'new-password-hash',
          isGuestProfile: false,
          authProvider: 'jwt',
          emailVerified: true,
          adminLoginAttempts: 0,
          requirePasswordChange: false,
        },
        $unset: {
          passwordResetTokenHash: '',
          passwordResetExpires: '',
          adminLockUntil: '',
        },
      },
      { new: true, runValidators: false },
    );
    expect(JSON.stringify(mockFindOneAndUpdate.mock.calls[0])).not.toContain(issued.token);
  });

  it('permits exactly one winner when the same link is submitted concurrently', async () => {
    const issued = createResetToken();
    mockFindOneAndUpdate
      .mockResolvedValueOnce({ _id: 'customer-1' })
      .mockResolvedValueOnce(null);

    const responses = await Promise.all([
      POST(request({ token: issued.token, password: validPassword, confirmPassword: validPassword })),
      POST(request({ token: issued.token, password: validPassword, confirmPassword: validPassword })),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect((await responses.find((response) => response.status === 400)!.json()).error).toBe(invalidLink);
  });

  it('answers identically for an unknown, expired, deactivated, or already-used link', async () => {
    const issued = createResetToken();
    mockFindOneAndUpdate.mockResolvedValue(null);

    const response = await POST(request({
      token: issued.token,
      password: validPassword,
      confirmPassword: validPassword,
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(invalidLink);
  });

  it('enforces the distributed limit before hashing or storage', async () => {
    const issued = createResetToken();
    mockLimits.mockResolvedValue({ allowed: false, retryAfterSeconds: 900 });

    const response = await POST(request({
      token: issued.token,
      password: validPassword,
      confirmPassword: validPassword,
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('900');
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('buckets on the token hash and never caches responses', async () => {
    const issued = createResetToken();
    const response = await POST(request({
      token: issued.token,
      password: validPassword,
      confirmPassword: validPassword,
    }));

    expect(mockLimits.mock.calls[0][0]).toMatchObject({
      action: 'reset-password',
      subject: hashResetToken(issued.token).slice(0, 32),
    });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('reports a storage failure as unavailable rather than invalid-link user error', async () => {
    const issued = createResetToken();
    mockFindOneAndUpdate.mockRejectedValue(new Error('connection lost'));

    const response = await POST(request({
      token: issued.token,
      password: validPassword,
      confirmPassword: validPassword,
    }));

    expect(response.status).toBe(503);
  });
});

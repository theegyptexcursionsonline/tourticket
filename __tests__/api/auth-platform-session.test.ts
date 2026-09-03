/**
 * GET /api/auth/platform-session
 *
 * Restores a session created against the platform's own credential store, so a
 * customer who signed in while the external identity provider was unavailable
 * is not silently signed out on their next page load.
 *
 * Every failure path must be a bare 401 that reveals nothing about the account,
 * and a deactivated or missing user must fail closed.
 */

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this._body = body;
      this.status = init?.status || 200;
    }
    async json() {
      return this._body;
    }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));

const mockVerifyToken = jest.fn();
jest.mock('@/lib/jwt', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

const mockFindById = jest.fn();
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

jest.mock('@/lib/constants/adminPermissions', () => ({
  getDefaultPermissions: () => ['read:own'],
}));

import { GET } from '@/app/api/auth/platform-session/route';

type FakeRequest = { cookies: { get: (name: string) => { value: string } | undefined } };

function requestWithCookie(value?: string): FakeRequest {
  return {
    cookies: {
      get: (name: string) => (name === 'authToken' && value ? { value } : undefined),
    },
  };
}

const activeUser = {
  _id: 'user-1',
  email: 'traveller@example.com',
  firstName: 'Test',
  lastName: 'Traveller',
  role: 'customer',
  permissions: [],
  authProvider: 'jwt',
  emailVerified: true,
  isActive: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/auth/platform-session', () => {
  it('returns 401 when no session cookie is present', async () => {
    const response = await GET(requestWithCookie() as never);
    expect(response.status).toBe(401);
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns 401 for a forged or expired token without touching the database', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('bad signature'));
    const response = await GET(requestWithCookie('forged.token.value') as never);
    expect(response.status).toBe(401);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns 401 when the token carries no subject', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'traveller@example.com' });
    const response = await GET(requestWithCookie('token') as never);
    expect(response.status).toBe(401);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('restores the session for a valid token', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user-1', scope: 'customer' });
    mockFindById.mockResolvedValueOnce(activeUser);

    const response = await GET(requestWithCookie('good.token') as never);
    expect(response.status).toBe(200);

    const body = (await response.json()) as { success: boolean; user: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(mockFindById).toHaveBeenCalledWith('user-1');
    expect(body.user).toMatchObject({
      id: 'user-1',
      email: 'traveller@example.com',
      name: 'Test Traveller',
      role: 'customer',
      authProvider: 'jwt',
    });
  });

  it('never returns a password or hash to the client', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user-1' });
    mockFindById.mockResolvedValueOnce({ ...activeUser, password: '$2b$12$hash' });

    const response = await GET(requestWithCookie('good.token') as never);
    const body = (await response.json()) as { user: Record<string, unknown> };
    expect(Object.keys(body.user)).not.toContain('password');
    expect(JSON.stringify(body)).not.toContain('$2b$');
  });

  it('fails closed for a deactivated account', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user-1' });
    mockFindById.mockResolvedValueOnce({ ...activeUser, isActive: false });

    const response = await GET(requestWithCookie('good.token') as never);
    expect(response.status).toBe(401);
  });

  it('fails closed for a token whose user no longer exists', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'deleted-user' });
    mockFindById.mockResolvedValueOnce(null);

    const response = await GET(requestWithCookie('good.token') as never);
    expect(response.status).toBe(401);
  });

  it('reports a failed read as a failure, never as a signed-out state', async () => {
    // A database outage must not render as "not signed in" — that is the K4
    // defect class: a failed read masquerading as an empty state.
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user-1' });
    mockFindById.mockRejectedValueOnce(new Error('connection lost'));

    const response = await GET(requestWithCookie('good.token') as never);
    expect(response.status).toBe(503);
  });

  it('falls back to default permissions when the record carries none', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user-1' });
    mockFindById.mockResolvedValueOnce({ ...activeUser, permissions: [] });

    const response = await GET(requestWithCookie('good.token') as never);
    const body = (await response.json()) as { user: { permissions: string[] } };
    expect(body.user.permissions).toEqual(['read:own']);
  });
});

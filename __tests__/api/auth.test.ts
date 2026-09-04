/**
 * Customer authentication route contracts.
 *
 * These tests exercise the real route decisions while keeping the database,
 * password hashing, mail delivery, and token signing behind deterministic
 * boundaries. They deliberately replace the former `expect(true)` suite:
 * authentication is a checkout dependency and a no-op test is false safety.
 */

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private readonly body: unknown;
    headers: Map<string, string>;
    cookies: { set: jest.Mock };

    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.cookies = { set: jest.fn() };
    }

    async json() {
      return this.body;
    }

    static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(body, init);
    }
  }

  return { NextResponse: MockNextResponse, NextRequest: jest.fn() };
});

const mockDbConnect = jest.fn();
jest.mock('@/lib/dbConnect', () => (...args: unknown[]) => mockDbConnect(...args));

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockExists = jest.fn();
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    exists: (...args: unknown[]) => mockExists(...args),
  },
}));

const mockCompare = jest.fn();
const mockGenSalt = jest.fn();
const mockHash = jest.fn();
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    compare: (...args: unknown[]) => mockCompare(...args),
    genSalt: (...args: unknown[]) => mockGenSalt(...args),
    hash: (...args: unknown[]) => mockHash(...args),
  },
}));

const mockSignToken = jest.fn();
jest.mock('@/lib/jwt', () => ({
  signToken: (...args: unknown[]) => mockSignToken(...args),
}));

const mockAssertJwtSecretConfigured = jest.fn();
jest.mock('@/lib/auth/jwtConfiguration', () => ({
  assertJwtSecretConfigured: (...args: unknown[]) => mockAssertJwtSecretConfigured(...args),
}));

const mockLimits = jest.fn();
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  enforcePublicActionLimits: (...args: unknown[]) => mockLimits(...args),
}));

const mockDefaultPermissions = jest.fn();
jest.mock('@/lib/constants/adminPermissions', () => ({
  getDefaultPermissions: (...args: unknown[]) => mockDefaultPermissions(...args),
}));

const mockSendWelcomeEmail = jest.fn();
jest.mock('@/lib/email/emailService', () => ({
  EmailService: {
    sendWelcomeEmail: (...args: unknown[]) => mockSendWelcomeEmail(...args),
  },
}));

const mockWelcomeRecommendations = jest.fn();
jest.mock('@/lib/auth/welcomeRecommendations', () => ({
  loadWelcomeTourRecommendations: (...args: unknown[]) => mockWelcomeRecommendations(...args),
}));

const mockAuthenticate = jest.fn();
const mockFormatUser = jest.fn();
jest.mock('@/lib/auth/customerSession', () => ({
  authenticateCustomerSession: (...args: unknown[]) => mockAuthenticate(...args),
  formatCustomerForClient: (...args: unknown[]) => mockFormatUser(...args),
}));

import { HEAD as loginReadiness, POST as login } from '@/app/api/auth/login/route';
import { POST as signup } from '@/app/api/auth/signup/route';
import { GET as me } from '@/app/api/auth/me/route';
import { POST as logout } from '@/app/api/auth/logout/route';

function requestWith(body: unknown) {
  return {
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  } as never;
}

function selectable<T>(value: T) {
  return { select: jest.fn().mockResolvedValue(value) };
}

function userDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'customer-1',
    email: 'traveller@example.com',
    firstName: 'Test',
    lastName: 'Traveller',
    password: 'password-hash',
    isActive: true,
    role: 'customer',
    permissions: [],
    adminLoginAttempts: 0,
    adminLockUntil: undefined,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDbConnect.mockResolvedValue(undefined);
  mockLimits.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
  mockDefaultPermissions.mockReturnValue(['read:own']);
  mockSignToken.mockResolvedValue('signed-token');
  mockExists.mockResolvedValue({ _id: 'customer-1' });
  mockCompare.mockResolvedValue(true);
  mockGenSalt.mockResolvedValue('salt');
  mockHash.mockResolvedValue('password-hash');
  mockWelcomeRecommendations.mockResolvedValue([]);
  mockSendWelcomeEmail.mockResolvedValue(undefined);
});

describe('HEAD /api/auth/login', () => {
  it('returns 204 only when token configuration, database, and a password customer are ready', async () => {
    const response = await loginReadiness();

    expect(response.status).toBe(204);
    expect(mockAssertJwtSecretConfigured).toHaveBeenCalledTimes(1);
    expect(mockDbConnect).toHaveBeenCalledTimes(1);
    expect(mockExists).toHaveBeenCalledWith({
      role: 'customer',
      isActive: true,
      password: { $type: 'string' },
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('fails closed when no active password-backed customer exists', async () => {
    mockExists.mockResolvedValue(null);

    const response = await loginReadiness();

    expect(response.status).toBe(503);
  });

  it('fails closed without querying customer records when token configuration is invalid', async () => {
    mockAssertJwtSecretConfigured.mockImplementation(() => {
      throw new Error('missing secret');
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await loginReadiness();

    expect(response.status).toBe(503);
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(mockExists).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Customer sign-in readiness check failed');
    consoleError.mockRestore();
  });

  it('fails closed on a database error without exposing the provider error', async () => {
    mockDbConnect.mockRejectedValue(new Error('private database detail'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await loginReadiness();

    expect(response.status).toBe(503);
    expect(await response.json()).toBeNull();
    expect(consoleError).toHaveBeenCalledWith('Customer sign-in readiness check failed');
    consoleError.mockRestore();
  });
});

describe('POST /api/auth/login', () => {
  it('normalizes the identity, signs a customer token, and sets the httpOnly session cookie', async () => {
    const user = userDoc();
    mockFindOne.mockReturnValue(selectable(user));

    const response = await login(requestWith({
      email: '  Traveller@Example.COM ',
      password: 'correct-password',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({ email: 'traveller@example.com' });
    expect(mockCompare).toHaveBeenCalledWith('correct-password', 'password-hash');
    expect(mockSignToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'customer-1',
        email: 'traveller@example.com',
        role: 'customer',
        scope: 'customer',
      }),
      { expiresIn: '7d' },
    );
    expect(body).toMatchObject({ success: true, token: 'signed-token' });
    expect(response.cookies.set).toHaveBeenCalledWith('authToken', 'signed-token', expect.objectContaining({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    }));
    expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
  });

  it('returns one generic response for a missing account after a timing-safe comparison', async () => {
    mockFindOne.mockReturnValue(selectable(null));

    const response = await login(requestWith({
      email: 'unknown@example.com',
      password: 'not-the-password',
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Invalid credentials' });
    expect(mockCompare).toHaveBeenCalledTimes(1);
    expect(mockSignToken).not.toHaveBeenCalled();
  });

  it('does not mint a storefront customer session for an administrator credential', async () => {
    mockFindOne.mockReturnValue(selectable(userDoc({ role: 'admin' })));

    const response = await login(requestWith({
      email: 'administrator@example.com',
      password: 'correct-password',
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Invalid credentials' });
    expect(mockSignToken).not.toHaveBeenCalled();
  });

  it('persists a failed-password attempt and reveals no account detail', async () => {
    const user = userDoc({ adminLoginAttempts: 1 });
    mockFindOne.mockReturnValue(selectable(user));
    mockCompare.mockResolvedValue(false);

    const response = await login(requestWith({
      email: 'traveller@example.com',
      password: 'wrong-password',
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Invalid credentials' });
    expect(user.adminLoginAttempts).toBe(2);
    expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(mockSignToken).not.toHaveBeenCalled();
  });

  it('enforces the distributed limit before looking up an account', async () => {
    mockLimits.mockResolvedValue({ allowed: false, retryAfterSeconds: 75 });

    const response = await login(requestWith({
      email: 'traveller@example.com',
      password: 'correct-password',
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('75');
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/signup', () => {
  it('creates a normalized customer account, signs it in, and attempts the welcome message', async () => {
    const user = userDoc({ password: undefined });
    mockFindOne.mockReturnValue(selectable(null));
    mockCreate.mockResolvedValue(user);

    const response = await signup(requestWith({
      firstName: '  Test  ',
      lastName: '  Traveller  ',
      email: ' Traveller@Example.COM ',
      password: 'strong-password',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockHash).toHaveBeenCalledWith('strong-password', 'salt');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Test',
      lastName: 'Traveller',
      email: 'traveller@example.com',
      password: 'password-hash',
      role: 'customer',
      permissions: [],
      isGuestProfile: false,
      authProvider: 'jwt',
    }));
    expect(mockSignToken).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'customer' }),
      { expiresIn: '7d' },
    );
    expect(body).toMatchObject({ success: true, token: 'signed-token' });
    expect(response.cookies.set).toHaveBeenCalledWith('authToken', 'signed-token', expect.objectContaining({
      httpOnly: true,
      sameSite: 'lax',
    }));
    expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects a weak password before connecting to the database', async () => {
    const response = await signup(requestWith({
      firstName: 'Test',
      lastName: 'Traveller',
      email: 'traveller@example.com',
      password: 'short',
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('between 8 and 128');
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('never claims an existing profile from email equality alone', async () => {
    mockFindOne.mockReturnValue(selectable(userDoc()));

    const response = await signup(requestWith({
      firstName: 'Test',
      lastName: 'Traveller',
      email: 'traveller@example.com',
      password: 'strong-password',
    }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('ACCOUNT_EXISTS');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSignToken).not.toHaveBeenCalled();
  });

  it('returns a deterministic conflict if a concurrent signup wins the unique index', async () => {
    mockFindOne.mockReturnValue(selectable(null));
    mockCreate.mockRejectedValue({ code: 11000 });

    const response = await signup(requestWith({
      firstName: 'Test',
      lastName: 'Traveller',
      email: 'traveller@example.com',
      password: 'strong-password',
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'An account with this email already exists' });
    expect(mockSignToken).not.toHaveBeenCalled();
  });

  it('enforces the signup limit before checking or creating an account', async () => {
    mockLimits.mockResolvedValue({ allowed: false, retryAfterSeconds: 300 });

    const response = await signup(requestWith({
      firstName: 'Test',
      lastName: 'Traveller',
      email: 'traveller@example.com',
      password: 'strong-password',
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('GET /api/auth/me', () => {
  it('returns only the helper-approved current-user shape for an authenticated request', async () => {
    const storedUser = userDoc({ password: 'must-not-leak' });
    const clientUser = { id: 'customer-1', email: 'traveller@example.com' };
    mockAuthenticate.mockResolvedValue({ success: true, user: storedUser });
    mockFormatUser.mockReturnValue(clientUser);

    const response = await me({} as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, user: clientUser });
    expect(mockFormatUser).toHaveBeenCalledWith(storedUser);
    expect(JSON.stringify(await response.json())).not.toContain('must-not-leak');
  });

  it('passes through the authentication failure status without formatting a user', async () => {
    mockAuthenticate.mockResolvedValue({
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401,
    });

    const response = await me({} as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: 'Invalid or expired token' });
    expect(mockFormatUser).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/logout', () => {
  it('expires the platform session cookie at the root path', async () => {
    const response = await logout();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(response.cookies.set).toHaveBeenCalledWith('authToken', '', expect.objectContaining({
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    }));
  });
});

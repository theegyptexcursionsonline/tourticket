/**
 * The shared account guard must accept BOTH session types.
 *
 * Cart, wishlist, profile, reviews and checkout all sit behind
 * `authenticateFirebaseUser`. Before this, it accepted only a provider ID
 * token, so a customer who signed in through the platform's own credential
 * store during a provider outage was signed in and still could not use their
 * own account — including checkout.
 *
 * A cookie is sent automatically by the browser, so the platform path also has
 * to refuse cross-origin requests. These tests pin both halves.
 */

const mockVerifyFirebaseToken = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  verifyFirebaseToken: (...a: unknown[]) => mockVerifyFirebaseToken(...a),
}));

const mockVerifyToken = jest.fn();
jest.mock('@/lib/jwt', () => ({
  verifyToken: (...a: unknown[]) => mockVerifyToken(...a),
}));

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));

const mockFindOne = jest.fn();
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { findOne: (...a: unknown[]) => mockFindOne(...a) },
}));

jest.mock('@/lib/auth/guestProfileClaim', () => ({
  guestProfileClaimFilter: jest.fn(),
  isClaimableGuestProfile: jest.fn().mockReturnValue(false),
}));

import { authenticateFirebaseUser } from '@/lib/firebase/authHelpers';

const customer = {
  _id: 'user-1',
  email: 'traveller@example.com',
  emailVerified: true,
  isActive: true,
  role: 'customer',
};

function request(options: {
  cookie?: string;
  bearer?: string;
  origin?: string;
  host?: string;
} = {}) {
  const headers = new Map<string, string>();
  if (options.bearer) headers.set('authorization', `Bearer ${options.bearer}`);
  if (options.origin) headers.set('origin', options.origin);
  headers.set('host', options.host ?? 'egypt-excursionsonline.com');
  return {
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    cookies: { get: (name: string) => (name === 'authToken' && options.cookie ? { value: options.cookie } : undefined) },
  } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('platform session', () => {
  it('authenticates a customer holding only the platform session cookie', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user-1' });
    mockFindOne.mockResolvedValueOnce(customer);

    const result = await authenticateFirebaseUser(request({ cookie: 'platform.jwt' }));

    expect(result.success).toBe(true);
    expect(result.user).toBe(customer);
    // Scoped to an active account, looked up by the token's subject.
    expect(mockFindOne).toHaveBeenCalledWith({ _id: 'user-1', isActive: true });
    expect(mockVerifyFirebaseToken).not.toHaveBeenCalled();
  });

  it('refuses a cross-origin request even with a valid cookie', async () => {
    mockVerifyToken.mockResolvedValue({ sub: 'user-1' });
    mockFindOne.mockResolvedValue(customer);

    const result = await authenticateFirebaseUser(
      request({ cookie: 'platform.jwt', origin: 'https://attacker.example', host: 'egypt-excursionsonline.com' }),
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('accepts a same-origin request that declares its origin', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user-1' });
    mockFindOne.mockResolvedValueOnce(customer);

    const result = await authenticateFirebaseUser(
      request({ cookie: 'platform.jwt', origin: 'https://egypt-excursionsonline.com' }),
    );

    expect(result.success).toBe(true);
  });

  it('rejects a forged or expired session token', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('bad signature'));
    const result = await authenticateFirebaseUser(request({ cookie: 'forged' }));
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('rejects a token with no subject', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'traveller@example.com' });
    const result = await authenticateFirebaseUser(request({ cookie: 'no-sub' }));
    expect(result.success).toBe(false);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('fails closed for a deactivated or deleted account', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user-1' });
    mockFindOne.mockResolvedValueOnce(null);
    const result = await authenticateFirebaseUser(request({ cookie: 'platform.jwt' }));
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
  });

  it('returns 401 when neither credential is present', async () => {
    const result = await authenticateFirebaseUser(request());
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
  });
});

describe('provider session', () => {
  it('still authenticates a valid provider token without consulting the platform store', async () => {
    mockVerifyFirebaseToken.mockResolvedValueOnce({ success: true, uid: 'fb-1', email: 'traveller@example.com' });
    mockFindOne.mockResolvedValueOnce(customer);

    const result = await authenticateFirebaseUser(request({ bearer: 'firebase.id.token' }));

    expect(result.success).toBe(true);
    expect(mockFindOne).toHaveBeenCalledWith({ firebaseUid: 'fb-1', isActive: true });
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('falls back to the platform session when the provider cannot verify', async () => {
    // The provider being unreachable is precisely when this matters.
    mockVerifyFirebaseToken.mockResolvedValueOnce({ success: false });
    mockVerifyToken.mockResolvedValueOnce({ sub: 'user-1' });
    mockFindOne.mockResolvedValueOnce(customer);

    const result = await authenticateFirebaseUser(
      request({ bearer: 'stale.firebase.token', cookie: 'platform.jwt' }),
    );

    expect(result.success).toBe(true);
    expect(result.user).toBe(customer);
  });

  it('still rejects when the provider fails and there is no platform session', async () => {
    mockVerifyFirebaseToken.mockResolvedValueOnce({ success: false });
    const result = await authenticateFirebaseUser(request({ bearer: 'stale.firebase.token' }));
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
  });
});

import {
  __setWorkosClientFactory,
  createWorkosUser,
  isImportablePasswordHashType,
  outcomeForWorkosError,
  verifyPasswordWithWorkos,
  type WorkosUserManagement,
} from '@/lib/auth/workosIdentity';

const workosUser = {
  id: 'user_01ABC',
  email: 'traveller@example.com',
  firstName: 'Test',
  lastName: 'Traveller',
  emailVerified: true,
};

function providerError(init: { status?: number; code?: string; message?: string }) {
  const error = new Error(init.message ?? 'workos said no');
  Object.assign(error, init);
  return error;
}

function client(overrides: Partial<WorkosUserManagement>): WorkosUserManagement {
  return {
    authenticateWithPassword: jest.fn().mockResolvedValue({ user: workosUser }),
    createUser: jest.fn().mockResolvedValue(workosUser),
    ...overrides,
  } as WorkosUserManagement;
}

afterEach(() => {
  __setWorkosClientFactory(null);
  jest.clearAllMocks();
});

describe('outcomeForWorkosError', () => {
  it('treats an unambiguous rejection as the customer\'s to fix', () => {
    expect(outcomeForWorkosError(providerError({ status: 401 }))).toEqual({ outcome: 'rejected' });
    expect(outcomeForWorkosError(providerError({ code: 'invalid_credentials' }))).toEqual({
      outcome: 'rejected',
    });
  });

  it('separates an already-registered email from a rejected password', () => {
    expect(outcomeForWorkosError(providerError({ status: 409 }))).toEqual({ outcome: 'exists' });
    expect(outcomeForWorkosError(providerError({ code: 'email_not_available' }))).toEqual({
      outcome: 'exists',
    });
  });

  it('surfaces rate limiting rather than calling it a bad password', () => {
    expect(outcomeForWorkosError(providerError({ status: 429 }))).toEqual({ outcome: 'rate_limited' });
  });

  it('defaults anything ambiguous to unavailable, never to rejected', () => {
    // Reporting "invalid password" during an outage tells a customer with
    // correct details that they are wrong. Falling back is the safe default:
    // the fallback re-verifies against our own store.
    expect(outcomeForWorkosError(providerError({ status: 500 }))).toEqual({ outcome: 'unavailable' });
    expect(outcomeForWorkosError(providerError({ status: 503 }))).toEqual({ outcome: 'unavailable' });
    expect(outcomeForWorkosError(new Error('socket hang up'))).toEqual({ outcome: 'unavailable' });
    expect(outcomeForWorkosError(null)).toEqual({ outcome: 'unavailable' });
  });
});

describe('verifyPasswordWithWorkos', () => {
  it('returns the verified identity on success', async () => {
    const authenticateWithPassword = jest.fn().mockResolvedValue({ user: workosUser });
    __setWorkosClientFactory(async () => client({ authenticateWithPassword }));

    const result = await verifyPasswordWithWorkos({
      email: 'traveller@example.com',
      password: 'correct-horse',
      ipAddress: '203.0.113.9',
      userAgent: 'jest',
    });

    expect(result).toEqual({
      outcome: 'verified',
      workosUserId: 'user_01ABC',
      email: 'traveller@example.com',
      firstName: 'Test',
      lastName: 'Traveller',
      emailVerified: true,
    });
    expect(authenticateWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'traveller@example.com',
        password: 'correct-horse',
        ipAddress: '203.0.113.9',
        userAgent: 'jest',
      }),
    );
  });

  it('reports unavailable — not rejected — when WorkOS is not configured', async () => {
    __setWorkosClientFactory(async () => null);
    await expect(
      verifyPasswordWithWorkos({ email: 'a@b.com', password: 'x' }),
    ).resolves.toEqual({ outcome: 'unavailable' });
  });

  it('reports unavailable when the client itself cannot be constructed', async () => {
    __setWorkosClientFactory(async () => {
      throw new Error('bad api key');
    });
    await expect(
      verifyPasswordWithWorkos({ email: 'a@b.com', password: 'x' }),
    ).resolves.toEqual({ outcome: 'unavailable' });
  });

  it('never returns provider text to the caller', async () => {
    __setWorkosClientFactory(async () =>
      client({
        authenticateWithPassword: jest
          .fn()
          .mockRejectedValue(providerError({ status: 500, message: 'sk_live_secret leaked here' })),
      }),
    );
    const result = await verifyPasswordWithWorkos({ email: 'a@b.com', password: 'x' });
    expect(JSON.stringify(result)).not.toContain('sk_live_secret');
    expect(result).toEqual({ outcome: 'unavailable' });
  });
});

describe('createWorkosUser', () => {
  it('creates and returns the identity', async () => {
    const createUser = jest.fn().mockResolvedValue(workosUser);
    __setWorkosClientFactory(async () => client({ createUser }));

    const result = await createWorkosUser({
      email: 'traveller@example.com',
      password: 'correct-horse-battery',
      firstName: 'Test',
      lastName: 'Traveller',
    });

    expect(result).toMatchObject({ outcome: 'verified', workosUserId: 'user_01ABC' });
    expect(createUser).toHaveBeenCalledWith({
      email: 'traveller@example.com',
      password: 'correct-horse-battery',
      firstName: 'Test',
      lastName: 'Traveller',
    });
  });

  it('reports an already-registered email distinctly', async () => {
    __setWorkosClientFactory(async () =>
      client({ createUser: jest.fn().mockRejectedValue(providerError({ status: 409 })) }),
    );
    await expect(
      createWorkosUser({ email: 'taken@example.com', password: 'x' }),
    ).resolves.toEqual({ outcome: 'exists' });
  });
});

describe('password hash import', () => {
  it('accepts the formats both of our stores already produce', () => {
    // This is why migrating customers does not require a password reset:
    // platform accounts hold bcrypt, and accounts created through the previous
    // provider hold firebase-scrypt. Both import directly.
    expect(isImportablePasswordHashType('bcrypt')).toBe(true);
    expect(isImportablePasswordHashType('firebase-scrypt')).toBe(true);
  });

  it('rejects anything the provider does not accept', () => {
    expect(isImportablePasswordHashType('md5')).toBe(false);
    expect(isImportablePasswordHashType('plaintext')).toBe(false);
    expect(isImportablePasswordHashType('')).toBe(false);
  });
});

const mockVerifyToken = jest.fn();
jest.mock('@/lib/jwt', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

const mockDbConnect = jest.fn();
jest.mock('@/lib/dbConnect', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockDbConnect(...args),
}));

const mockFindOne = jest.fn();
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => mockFindOne(...args) },
}));

import {
  authenticateCustomerSession,
  formatCustomerForClient,
} from '@/lib/auth/customerSession';
import { PLATFORM_SESSION_SENTINEL } from '@/lib/auth/customerSessionToken';

const customerId = '507f1f77bcf86cd799439011';
const customer = {
  _id: { toString: () => customerId },
  email: 'traveller@example.com',
  firstName: 'Test',
  lastName: 'Traveller',
  role: 'customer',
  permissions: [],
  isActive: true,
  password: 'hidden',
  firebaseUid: 'legacy-id',
};

function request(options: {
  bearer?: string;
  authorization?: string;
  cookie?: string;
  method?: string;
  origin?: string;
  host?: string;
} = {}) {
  const headers = new Map<string, string>();
  if (options.bearer) headers.set('authorization', `Bearer ${options.bearer}`);
  if (options.authorization) headers.set('authorization', options.authorization);
  if (options.origin) headers.set('origin', options.origin);
  headers.set('host', options.host ?? 'egypt-excursionsonline.com');

  return {
    method: options.method ?? 'GET',
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    cookies: {
      get: (name: string) => name === 'authToken' && options.cookie
        ? { value: options.cookie }
        : undefined,
    },
  } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDbConnect.mockResolvedValue(undefined);
});

describe('authenticateCustomerSession', () => {
  it('accepts a scoped platform Bearer token for an active customer', async () => {
    mockVerifyToken.mockResolvedValueOnce({ scope: 'customer', sub: customerId });
    mockFindOne.mockResolvedValueOnce(customer);

    const result = await authenticateCustomerSession(request({ bearer: 'platform.jwt' }));

    expect(result).toEqual({ success: true, user: customer });
    expect(mockFindOne).toHaveBeenCalledWith({ _id: customerId, isActive: true });
  });

  it('accepts a cookie for a read request with no Origin header', async () => {
    mockVerifyToken.mockResolvedValueOnce({ scope: 'customer', sub: customerId });
    mockFindOne.mockResolvedValueOnce(customer);

    const result = await authenticateCustomerSession(request({ cookie: 'platform.cookie' }));

    expect(result.success).toBe(true);
  });

  it('accepts the restored-session sentinel only by verifying the same-origin cookie', async () => {
    mockVerifyToken.mockResolvedValueOnce({ scope: 'customer', sub: customerId });
    mockFindOne.mockResolvedValueOnce(customer);

    const result = await authenticateCustomerSession(request({
      bearer: PLATFORM_SESSION_SENTINEL,
      cookie: 'platform.cookie',
      method: 'POST',
      origin: 'https://egypt-excursionsonline.com',
    }));

    expect(result.success).toBe(true);
    expect(mockVerifyToken).toHaveBeenCalledWith('platform.cookie');
  });

  it('rejects a cookie mutation without an explicit Origin header', async () => {
    const result = await authenticateCustomerSession(request({
      cookie: 'platform.cookie',
      method: 'POST',
    }));

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('rejects a declared cross-origin request before consulting the cookie', async () => {
    const result = await authenticateCustomerSession(request({
      cookie: 'platform.cookie',
      method: 'POST',
      origin: 'https://attacker.example',
    }));

    expect(result.success).toBe(false);
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('does not downgrade an invalid explicit Bearer token to a valid cookie', async () => {
    mockVerifyToken.mockResolvedValueOnce(null);

    const result = await authenticateCustomerSession(request({
      bearer: 'forged.jwt',
      cookie: 'valid.cookie',
      origin: 'https://egypt-excursionsonline.com',
    }));

    expect(result.success).toBe(false);
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
    expect(mockVerifyToken).toHaveBeenCalledWith('forged.jwt');
  });

  it.each([
    ['wrong scope', { scope: 'admin', sub: customerId }],
    ['missing subject', { scope: 'customer' }],
    ['invalid subject', { scope: 'customer', sub: 'not-an-object-id' }],
  ])('rejects a %s token before the database lookup', async (_label, payload) => {
    mockVerifyToken.mockResolvedValueOnce(payload);

    const result = await authenticateCustomerSession(request({ bearer: 'bad.jwt' }));

    expect(result.success).toBe(false);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it.each([
    ['missing account', null],
    ['non-customer principal', { ...customer, role: 'admin' }],
  ])('rejects a %s after token validation', async (_label, record) => {
    mockVerifyToken.mockResolvedValueOnce({ scope: 'customer', sub: customerId });
    mockFindOne.mockResolvedValueOnce(record);

    const result = await authenticateCustomerSession(request({ bearer: 'platform.jwt' }));

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
  });

  it('rejects a malformed Authorization header even when a cookie exists', async () => {
    const result = await authenticateCustomerSession(request({
      authorization: 'Basic abc',
      cookie: 'valid.cookie',
    }));

    expect(result.success).toBe(false);
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('rejects a request with no credential', async () => {
    const result = await authenticateCustomerSession(request());
    expect(result).toEqual({ success: false, error: 'Authentication required', statusCode: 401 });
  });
});

describe('formatCustomerForClient', () => {
  it('returns the client contract without password or legacy identity fields', () => {
    const result = formatCustomerForClient(customer as never);
    expect(result).toMatchObject({ id: customerId, email: customer.email, role: 'customer' });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('firebaseUid');
  });
});

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

const mockDbConnect = jest.fn();
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: () => mockDbConnect() }));

const mockFindOne = jest.fn();
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => mockFindOne(...args) },
}));

const mockSendPasswordResetEmail = jest.fn();
jest.mock('@/lib/mailgun', () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
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
    normalizeEmail: (value: unknown) => typeof value === 'string' && value.includes('@')
      ? value.trim().toLowerCase()
      : '',
  };
});

jest.mock('@/lib/auth/passwordReset', () => ({
  createResetToken: () => ({
    token: 'raw-token',
    tokenHash: 'stored-hash',
    expiresAt: new Date('2026-09-04T12:00:00.000Z'),
  }),
  buildResetUrl: (origin: string, token: string, email: string) => `${origin}/reset-password?token=${token}&email=${email}`,
}));

import { POST } from '@/app/api/auth/forgot-password/route';

const genericMessage = 'If an eligible account exists and email delivery succeeds, reset instructions will arrive shortly.';

function request(email: unknown) {
  return { body: { email } } as never;
}

function selectable(value: unknown) {
  return { select: jest.fn().mockResolvedValue(value) };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_BASE_URL = 'https://egypt-excursionsonline.com';
  process.env.MAILGUN_API_KEY = 'test-key';
  process.env.MAILGUN_DOMAIN = 'hello.foxestechnology.com';
  mockDbConnect.mockResolvedValue(undefined);
  mockLimits.mockResolvedValue({ allowed: true });
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
});

afterAll(() => {
  delete process.env.NEXT_PUBLIC_BASE_URL;
  delete process.env.MAILGUN_API_KEY;
  delete process.env.MAILGUN_DOMAIN;
});

describe('POST /api/auth/forgot-password', () => {
  it('returns the same accepted response for an unknown account without sending mail', async () => {
    mockFindOne.mockReturnValue(selectable(null));

    const response = await POST(request(' Unknown@Example.com '));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ success: true, message: genericMessage });
    expect(mockFindOne).toHaveBeenCalledWith({ email: 'unknown@example.com' });
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('persists only the token hash and sends the platform-owned reset URL', async () => {
    const user = {
      isActive: true,
      passwordResetTokenHash: undefined,
      passwordResetExpires: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindOne.mockReturnValue(selectable(user));

    const response = await POST(request('Traveller@Example.com'));

    expect(response.status).toBe(202);
    expect(user.passwordResetTokenHash).toBe('stored-hash');
    expect(user.passwordResetExpires).toEqual(new Date('2026-09-04T12:00:00.000Z'));
    expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      'traveller@example.com',
      'https://egypt-excursionsonline.com/reset-password?token=raw-token&email=traveller@example.com',
    );
  });

  it('returns the same accepted wording when delivery fails', async () => {
    const user = { isActive: true, save: jest.fn().mockResolvedValue(undefined) };
    mockFindOne.mockReturnValue(selectable(user));
    mockSendPasswordResetEmail.mockRejectedValue(new Error('provider unavailable'));

    const response = await POST(request('traveller@example.com'));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ success: true, message: genericMessage });
  });

  it('fails closed before account lookup when delivery is not configured', async () => {
    delete process.env.MAILGUN_API_KEY;

    const response = await POST(request('traveller@example.com'));

    expect(response.status).toBe(503);
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

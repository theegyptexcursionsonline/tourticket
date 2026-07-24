let mockAdminRecord = {
  email: 'admin@example.com',
  role: 'admin',
  permissions: ['manageDashboard'],
  adminPortalScopes: ['main'],
  twoFactorEnabled: false,
};

jest.mock('mongoose', () => ({
  __esModule: true,
  default: { isValidObjectId: jest.fn().mockReturnValue(true) },
}));
jest.mock('@/lib/dbConnect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn().mockResolvedValue({ sub: '507f1f77bcf86cd799439011', scope: 'admin' }),
}));
jest.mock('@/lib/auth/adminPortalScope', () => ({
  canAccessMainAdminPortal: jest.fn().mockReturnValue(true),
}));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(() => ({
      select: jest.fn(() => ({
        lean: jest.fn().mockImplementation(() => Promise.resolve(mockAdminRecord)),
      })),
    })),
  },
}));
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    body: unknown;

    constructor(body?: unknown, init?: { status?: number }) {
      this.status = init?.status || 200;
      this.body = body;
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
  }

  return { NextResponse: MockNextResponse, NextRequest: jest.fn() };
});

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../adminAuth';

const request = {
  method: 'GET',
  headers: new Headers(),
  cookies: { get: jest.fn().mockReturnValue({ value: 'cookie-token' }) },
  nextUrl: new URL('https://dashboard2.egypt-excursionsonline.com/api/admin/dashboard'),
} as any;

describe('mandatory admin two-factor enrollment', () => {
  beforeEach(() => {
    mockAdminRecord = { ...mockAdminRecord, twoFactorEnabled: false };
  });

  it('blocks normal admin API access for an unenrolled account', async () => {
    const result = await requireAdminAuth(request);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    expect((result as any).body).toMatchObject({ code: 'TWO_FACTOR_SETUP_REQUIRED' });
  });

  it('allows the explicitly-scoped enrollment flow', async () => {
    const result = await requireAdminAuth(request, { allowTwoFactorEnrollment: true });

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toMatchObject({
      userId: '507f1f77bcf86cd799439011',
      twoFactorEnabled: false,
    });
  });
});

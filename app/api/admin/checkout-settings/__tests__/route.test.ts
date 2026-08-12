const mockDbConnect = jest.fn();
const mockRequireAdminAuth = jest.fn();
const mockRegisterAudit = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private value: unknown;
    headers: { get: (name: string) => string | null };
    constructor(value: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
      this.value = value;
      this.status = init.status || 200;
      this.headers = { get: (name) => init.headers?.[name] || init.headers?.[name.toLowerCase()] || null };
    }
    static json(value: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(value, init);
    }
    json() { return Promise.resolve(this.value); }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: () => mockDbConnect() }));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
}));
jest.mock('@/lib/admin/adminAudit', () => ({
  registerAdminAuditDetail: (...args: unknown[]) => mockRegisterAudit(...args),
  withAdminAudit: (handler: unknown) => handler,
}));
jest.mock('@/lib/models/CheckoutSettings', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

import { GET, PUT } from '@/app/api/admin/checkout-settings/route';

const query = (value: unknown) => ({
  select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(value) }),
});

function request(method = 'GET', body?: unknown) {
  return {
    method,
    url: 'https://egypt-excursionsonline.com/api/admin/checkout-settings',
    nextUrl: { pathname: '/api/admin/checkout-settings' },
    headers: { get: (name: string) => name.toLowerCase() === 'content-type' && body !== undefined ? 'application/json' : null },
    json: jest.fn().mockResolvedValue(body),
  } as never;
}

describe('/api/admin/checkout-settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({
      userId: 'admin-1',
      role: 'admin',
      permissions: ['managePayments'],
      twoFactorEnabled: true,
    });
    mockFindOne.mockReturnValue(query({ paymentExperience: 'modal', updatedAt: new Date('2026-08-12') }));
    mockFindOneAndUpdate.mockReturnValue(query({ paymentExperience: 'hosted', updatedAt: new Date('2026-08-12') }));
  });

  it('requires the dedicated payment-management permission', async () => {
    const { NextResponse } = jest.requireMock('next/server');
    mockRequireAdminAuth.mockResolvedValueOnce(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(mockRequireAdminAuth).toHaveBeenCalledWith(expect.anything(), { permissions: ['managePayments'] });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('returns the current setting to an authorized admin', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { paymentExperience: 'modal' },
    });
  });

  it.each(['redirect', 'card', '', null])('rejects unsupported payment experience %p', async (paymentExperience) => {
    const response = await PUT(request('PUT', { paymentExperience }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_PAYMENT_EXPERIENCE' });
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('persists and audits a valid payment-experience change', async () => {
    const response = await PUT(request('PUT', { paymentExperience: 'hosted' }));
    expect(response.status).toBe(200);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { tenantId: 'default' },
      expect.objectContaining({ $set: { paymentExperience: 'hosted' } }),
      { upsert: true, new: true, runValidators: true },
    );
    expect(mockRegisterAudit).toHaveBeenCalledWith(expect.objectContaining({
      resourceType: 'checkout-settings',
      changedFields: ['paymentExperience'],
      changes: [{ field: 'paymentExperience', before: 'modal', after: 'hosted' }],
      tenantIds: ['default'],
    }));
  });
});

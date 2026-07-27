export {};

const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockSelect = jest.fn();
const mockHash = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;

    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status || 200;
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }

    async json() {
      return this.data;
    }
  }

  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    findOne: mockFindOne,
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}));
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: mockHash },
}));

const token = 'a'.repeat(64);
const request = (body: unknown) => ({
  json: jest.fn().mockResolvedValue(body),
});

describe('EEO Main POST /api/admin/accept-invitation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReturnValue({ select: mockSelect });
    mockHash.mockResolvedValue('hashed-password');
  });

  it('grants an existing account the pending offer without changing its password', async () => {
    mockSelect.mockResolvedValue({
      _id: 'customer-1',
      email: 'customer@example.com',
      role: 'customer',
      permissions: [],
      adminPortalScopes: [],
      tenantIds: [],
      isActive: true,
      requirePasswordChange: false,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['main'],
    });
    mockFindOneAndUpdate.mockResolvedValue({ email: 'customer@example.com' });

    const { POST } = await import('@/app/api/admin/accept-invitation/route');
    const response = await POST(request({ token }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.existingAccount).toBe(true);
    expect(mockHash).not.toHaveBeenCalled();

    const [filter, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual(expect.objectContaining({
      _id: 'customer-1',
      invitationToken: token,
      pendingAdminRole: 'operations',
    }));
    expect(update.$set).toEqual(expect.objectContaining({
      role: 'operations',
      permissions: ['manageTours'],
      adminPortalScopes: ['main'],
      isActive: true,
      requirePasswordChange: false,
    }));
    expect(update.$set).not.toHaveProperty('password');
    expect(update.$unset).toEqual(expect.objectContaining({
      invitationToken: 1,
      invitationExpires: 1,
      pendingAdminRole: 1,
      pendingAdminPermissions: 1,
      pendingAdminScopes: 1,
    }));
  });

  it('requires and hashes a password only for a brand-new inactive invitee', async () => {
    const newInvitee = {
      _id: 'new-1',
      email: 'new@example.com',
      role: 'customer',
      permissions: [],
      adminPortalScopes: [],
      tenantIds: [],
      isActive: false,
      requirePasswordChange: true,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageBookings'],
      pendingAdminScopes: ['main'],
    };
    mockSelect.mockResolvedValue(newInvitee);

    const { POST } = await import('@/app/api/admin/accept-invitation/route');
    const missing = await POST(request({ token }) as never);
    expect(missing.status).toBe(400);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();

    mockSelect.mockResolvedValue(newInvitee);
    mockFindOneAndUpdate.mockResolvedValue({ email: 'new@example.com' });
    const accepted = await POST(request({ token, password: 'SecurePass123!' }) as never);

    expect(accepted.status).toBe(200);
    expect(mockHash).toHaveBeenCalledWith('SecurePass123!', 10);
    expect(mockFindOneAndUpdate.mock.calls[0][1].$set.password).toBe('hashed-password');
  });

  it('allows only one atomic acceptance of the same invitation', async () => {
    mockSelect.mockResolvedValue({
      _id: 'customer-1',
      email: 'customer@example.com',
      role: 'customer',
      permissions: [],
      isActive: true,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['main'],
    });
    mockFindOneAndUpdate.mockResolvedValue(null);

    const { POST } = await import('@/app/api/admin/accept-invitation/route');
    const response = await POST(request({ token }) as never);

    expect(response.status).toBe(409);
  });
});

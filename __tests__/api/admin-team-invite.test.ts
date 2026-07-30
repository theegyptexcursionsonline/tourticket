export {};

const mockRequireAdminAuth = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneSelect = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockUpdateOne = jest.fn();
const mockCreate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockFindOneAndDelete = jest.fn();
const mockFind = jest.fn();
const mockFindSort = jest.fn();
const mockFindLean = jest.fn();
const mockSendAdminInviteEmail = jest.fn();

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
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
}));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    findOne: mockFindOne,
    findOneAndUpdate: mockFindOneAndUpdate,
    updateOne: mockUpdateOne,
    create: mockCreate,
    findByIdAndDelete: mockFindByIdAndDelete,
    findOneAndDelete: mockFindOneAndDelete,
    find: mockFind,
  },
}));
jest.mock('@/lib/email/emailService', () => ({
  EmailService: { sendAdminInviteEmail: mockSendAdminInviteEmail },
}));
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

const request = (body: unknown) => ({
  json: jest.fn().mockResolvedValue(body),
});

const createdUser = {
  _id: 'member-1',
  firstName: 'New',
  lastName: 'Teammate',
  email: 'new.teammate@excursions.online',
  role: 'customer',
  permissions: [],
  isActive: false,
  pendingAdminRole: 'operations',
  pendingAdminPermissions: ['manageBookings'],
  pendingAdminScopes: ['main'],
  createdAt: new Date('2026-07-27T00:00:00.000Z'),
};

describe('EEO Main POST /api/admin/team', () => {
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['manageUsers'],
    });
    mockFindOne.mockReturnValue({ select: mockFindOneSelect });
    mockFindOneSelect.mockResolvedValue(null);
    mockFind.mockReturnValue({ sort: mockFindSort });
    mockFindSort.mockReturnValue({ lean: mockFindLean });
    mockFindLean.mockResolvedValue([]);
    mockCreate.mockResolvedValue(createdUser);
    mockSendAdminInviteEmail.mockResolvedValue(undefined);
  });

  it('keeps network-only administrators out of the main EEO team list', async () => {
    const { GET } = await import('@/app/api/admin/team/route');
    const response = await GET({} as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: [] });
    expect(mockFind).toHaveBeenCalledWith({
      $and: [
        {
          $or: [
            { role: { $ne: 'customer' } },
            { pendingAdminRole: { $exists: true } },
            { formerAdminScopes: 'main' },
          ],
        },
        {
          $or: [
            { adminPortalScopes: 'main' },
            { pendingAdminScopes: 'main' },
            {
              $and: [
                {
                  $or: [
                    { adminPortalScopes: { $exists: false } },
                    { adminPortalScopes: { $size: 0 } },
                  ],
                },
                {
                  $or: [
                    { tenantIds: { $exists: false } },
                    { tenantIds: { $size: 0 } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('accepts modern long TLD work emails without granting access before acceptance', async () => {
    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'New',
      lastName: 'Teammate',
      email: 'new.teammate@excursions.online',
      permissions: ['manageBookings'],
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'new.teammate@excursions.online',
      role: 'customer',
      permissions: [],
      isActive: false,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageBookings'],
      pendingAdminScopes: ['main'],
    }));
    const [created] = mockCreate.mock.calls[0];
    expect(created).not.toHaveProperty('adminPortalScopes');
  });

  it('never accepts customer as the pending admin role', async () => {
    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'New',
      lastName: 'Teammate',
      email: 'new.teammate@excursions.online',
      role: 'customer',
      permissions: ['manageBookings'],
    }) as never);

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      role: 'customer',
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageBookings'],
    }));
  });

  const existingCustomer = {
    _id: 'customer-1',
    firstName: 'Existing',
    lastName: 'Shopper',
    email: 'existing.customer@example.com',
    role: 'customer',
    permissions: [],
    isActive: true,
    requirePasswordChange: false,
  };

  it('invites an existing customer without granting any admin access yet', async () => {
    mockFindOneSelect.mockResolvedValue(existingCustomer);
    mockFindOneAndUpdate.mockResolvedValue({
      ...existingCustomer,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['main'],
    });

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Existing',
      lastName: 'Shopper',
      email: 'existing.customer@example.com',
      permissions: ['manageTours'],
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.convertedExistingCustomer).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();

    const [, update] = mockFindOneAndUpdate.mock.calls[0];
    // The whole point: the invitation records an offer and touches nothing
    // that could let the account act as an admin before accepting it.
    expect(update.$set).toEqual(expect.objectContaining({
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
      pendingAdminScopes: ['main'],
    }));
    expect(update.$set).not.toHaveProperty('role');
    expect(update.$set).not.toHaveProperty('permissions');
    expect(update.$set).not.toHaveProperty('isActive');
    expect(update.$set).not.toHaveProperty('password');
    expect(update).not.toHaveProperty('$addToSet');

    expect(mockSendAdminInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteeName: 'Existing Shopper',
        inviteeEmail: 'existing.customer@example.com',
      }),
    );
  });

  it('reports a pending invitee as inactive so the list never implies live access', async () => {
    mockFindOneSelect.mockResolvedValue(existingCustomer);
    mockFindOneAndUpdate.mockResolvedValue({
      ...existingCustomer,
      isActive: true,
      pendingAdminRole: 'operations',
      pendingAdminPermissions: ['manageTours'],
    });

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Existing',
      lastName: 'Shopper',
      email: 'existing.customer@example.com',
      permissions: ['manageTours'],
    }) as never);
    const body = await response.json();

    expect(body.data).toEqual(expect.objectContaining({
      role: 'operations',
      isActive: false,
      invitationPending: true,
    }));
  });

  it('refuses to re-invite an account that already has a live invitation', async () => {
    mockFindOneSelect.mockResolvedValue({
      ...existingCustomer,
      pendingAdminRole: 'operations',
      invitationExpires: new Date(Date.now() + 60_000),
    });

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Existing',
      lastName: 'Shopper',
      email: 'existing.customer@example.com',
    }) as never);

    expect(response.status).toBe(409);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns a structured JSON error and rolls back when email delivery fails', async () => {
    mockSendAdminInviteEmail.mockRejectedValueOnce(new Error('provider rejected'));
    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'New',
      lastName: 'Teammate',
      email: 'new.teammate@excursions.online',
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      success: false,
      error: 'Failed to send invitation email. Please check the address and try again.',
    });
    expect(mockFindOneAndDelete).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'member-1' }),
    );
  });

  it('withdraws only the invitation when the email cannot be sent to a customer', async () => {
    mockFindOneSelect.mockResolvedValue(existingCustomer);
    mockFindOneAndUpdate.mockResolvedValue({
      ...existingCustomer,
      pendingAdminRole: 'operations',
    });
    mockSendAdminInviteEmail.mockRejectedValueOnce(new Error('provider rejected'));

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Existing',
      lastName: 'Shopper',
      email: 'existing.customer@example.com',
      permissions: ['manageTours'],
    }) as never);

    expect(response.status).toBe(502);
    const [, rollback] = mockUpdateOne.mock.calls[0];
    expect(rollback.$unset).toEqual(expect.objectContaining({
      invitationToken: 1,
      invitationExpires: 1,
      pendingAdminRole: 1,
      pendingAdminPermissions: 1,
      pendingAdminScopes: 1,
    }));
    // A Mailgun outage must not cost the customer their account.
    expect(rollback).not.toHaveProperty('$set');
    expect(mockFindOneAndDelete).not.toHaveBeenCalled();
    expect(mockFindByIdAndDelete).not.toHaveBeenCalled();
  });

  it('returns JSON for malformed request bodies instead of an empty platform response', async () => {
    const malformedRequest = {
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
    };
    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(malformedRequest as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Invalid request body.',
    });
  });
});

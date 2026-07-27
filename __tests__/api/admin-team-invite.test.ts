export {};

const mockRequireAdminAuth = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneSelect = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockUpdateOne = jest.fn();
const mockCreate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
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
  firstName: 'Esraa',
  lastName: 'Khaled',
  email: 'esraa.khaled@excursions.online',
  role: 'operations',
  permissions: ['manageBookings'],
  isActive: false,
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
      role: { $ne: 'customer' },
      $or: [
        { adminPortalScopes: 'main' },
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
    });
  });

  it('accepts modern long TLD work emails and scopes new admins to the main portal', async () => {
    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Esraa',
      lastName: 'Khaled',
      email: 'esraa.khaled@excursions.online',
      permissions: ['manageBookings'],
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'esraa.khaled@excursions.online',
      adminPortalScopes: ['main'],
    }));
  });

  it('promotes an existing customer identity and sends a password-setup invitation', async () => {
    mockFindOneSelect.mockResolvedValue({
      _id: 'customer-1',
      firstName: 'Sara',
      lastName: 'Sameh Baz',
      email: 'sara.sameh.foxes@gmail.com',
      role: 'customer',
      permissions: [],
      isActive: true,
      requirePasswordChange: false,
    });
    mockFindOneAndUpdate.mockResolvedValue({
      _id: 'customer-1',
      firstName: 'Sara',
      lastName: 'Sameh Baz',
      email: 'sara.sameh.foxes@gmail.com',
      role: 'operations',
      permissions: ['manageTours'],
      isActive: true,
      requirePasswordChange: true,
      adminPortalScopes: ['main'],
    });

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Sarah',
      lastName: 'Sameh',
      email: 'sara.sameh.foxes@gmail.com',
      permissions: ['manageTours'],
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.convertedExistingCustomer).toBe(true);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'customer-1', role: 'customer', isActive: true },
      {
        $set: expect.objectContaining({
          role: 'operations',
          permissions: ['manageTours'],
          requirePasswordChange: true,
        }),
        $addToSet: { adminPortalScopes: 'main' },
      },
      { new: true, runValidators: true },
    );
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSendAdminInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteeName: 'Sara Sameh Baz',
        inviteeEmail: 'sara.sameh.foxes@gmail.com',
      }),
    );
  });

  it('returns a structured JSON error and rolls back when email delivery fails', async () => {
    mockSendAdminInviteEmail.mockRejectedValueOnce(new Error('provider rejected'));
    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Esraa',
      lastName: 'Khaled',
      email: 'esraa.khaled@excursions.online',
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      success: false,
      error: 'Failed to send invitation email. Please check the address and try again.',
    });
    expect(mockFindByIdAndDelete).toHaveBeenCalledWith('member-1');
  });

  it('restores a customer account if its admin invitation email cannot be sent', async () => {
    mockFindOneSelect.mockResolvedValue({
      _id: 'customer-1',
      role: 'customer',
      permissions: [],
      isActive: true,
      requirePasswordChange: false,
    });
    mockFindOneAndUpdate.mockResolvedValue({
      ...createdUser,
      _id: 'customer-1',
      email: 'sara.sameh.foxes@gmail.com',
      role: 'operations',
      isActive: true,
    });
    mockSendAdminInviteEmail.mockRejectedValueOnce(new Error('provider rejected'));

    const { POST } = await import('@/app/api/admin/team/route');
    const response = await POST(request({
      firstName: 'Sara',
      lastName: 'Sameh',
      email: 'sara.sameh.foxes@gmail.com',
      permissions: ['manageTours'],
    }) as never);

    expect(response.status).toBe(502);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'customer-1' }),
      expect.objectContaining({
        $set: expect.objectContaining({
          role: 'customer',
          permissions: [],
          requirePasswordChange: false,
        }),
        $unset: expect.objectContaining({
          invitationToken: 1,
          invitationExpires: 1,
          adminPortalScopes: 1,
        }),
      }),
    );
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

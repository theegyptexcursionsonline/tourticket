jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private readonly body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status || 200;
    }

    async json() {
      return this.body;
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockAuthenticate = jest.fn();
jest.mock('@/lib/auth/customerSession', () => ({
  authenticateCustomerSession: (...args: unknown[]) => mockAuthenticate(...args),
}));

const mockFindOne = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
  },
}));

const mockCompare = jest.fn();
const mockHash = jest.fn();
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    compare: (...args: unknown[]) => mockCompare(...args),
    hash: (...args: unknown[]) => mockHash(...args),
  },
}));

import { POST } from '@/app/api/user/change-password/route';

const userId = '507f1f77bcf86cd799439011';

function request(body: unknown) {
  return { json: async () => body } as never;
}

function selectable(value: unknown) {
  return { select: jest.fn().mockResolvedValue(value) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticate.mockResolvedValue({ success: true, user: { _id: userId } });
  mockCompare.mockResolvedValue(true);
  mockHash.mockResolvedValue('new-password-hash');
  mockFindByIdAndUpdate.mockResolvedValue({ _id: userId });
});

describe('POST /api/user/change-password', () => {
  it('returns the shared authentication failure without a user lookup', async () => {
    mockAuthenticate.mockResolvedValue({ success: false, error: 'Authentication required', statusCode: 401 });

    const response = await POST(request({ currentPassword: 'old-password', newPassword: 'new-password' }));

    expect(response.status).toBe(401);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('directs a passwordless legacy account through the verified reset flow', async () => {
    mockFindOne.mockReturnValue(selectable({ _id: userId, password: undefined }));

    const response = await POST(request({ currentPassword: 'old-password', newPassword: 'new-password' }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: 'PASSWORD_SETUP_REQUIRED',
      error: 'Set your password through “Forgot password?” before changing it here.',
    });
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it('rejects an incorrect current password without mutating the account', async () => {
    mockFindOne.mockReturnValue(selectable({ _id: userId, password: 'old-hash' }));
    mockCompare.mockResolvedValue(false);

    const response = await POST(request({ currentPassword: 'wrong-password', newPassword: 'new-password' }));

    expect(response.status).toBe(400);
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('hashes and stores a different valid password', async () => {
    mockFindOne.mockReturnValue(selectable({ _id: userId, password: 'old-hash' }));

    const response = await POST(request({ currentPassword: 'old-password', newPassword: 'new-password' }));

    expect(response.status).toBe(200);
    expect(mockCompare).toHaveBeenCalledWith('old-password', 'old-hash');
    expect(mockHash).toHaveBeenCalledWith('new-password', 12);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      { password: 'new-password-hash' },
      { runValidators: true },
    );
  });
});

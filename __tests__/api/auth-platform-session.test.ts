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

const mockAuthenticate = jest.fn();
const mockFormat = jest.fn();
jest.mock('@/lib/auth/customerSession', () => ({
  authenticateCustomerSession: (...args: unknown[]) => mockAuthenticate(...args),
  formatCustomerForClient: (...args: unknown[]) => mockFormat(...args),
}));

import { GET } from '@/app/api/auth/platform-session/route';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/auth/platform-session', () => {
  it('returns the same bare 401 for every invalid session', async () => {
    mockAuthenticate.mockResolvedValue({
      success: false,
      error: 'internal detail',
      statusCode: 401,
    });

    const response = await GET({} as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: 'Not signed in' });
    expect(mockFormat).not.toHaveBeenCalled();
  });

  it('returns only the shared client-safe customer shape', async () => {
    const storedUser = { _id: 'customer-1', password: 'must-not-leak' };
    const clientUser = { id: 'customer-1', email: 'traveller@example.com' };
    mockAuthenticate.mockResolvedValue({ success: true, user: storedUser });
    mockFormat.mockReturnValue(clientUser);

    const response = await GET({} as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, user: clientUser });
    expect(mockFormat).toHaveBeenCalledWith(storedUser);
    expect(JSON.stringify(await response.json())).not.toContain('must-not-leak');
  });

  it('reports a session-store failure as unavailable, not signed out', async () => {
    mockAuthenticate.mockRejectedValue(new Error('connection lost'));

    const response = await GET({} as never);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      error: 'Could not restore your session',
    });
  });
});

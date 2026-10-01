import { headers } from 'next/headers';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { authorizeAdminPage } from '@/lib/auth/adminPageAccess';

jest.mock('next/headers', () => ({ headers: jest.fn() }));

jest.mock('next/server', () => {
  class NextResponse {
    status: number;
    constructor(status: number) {
      this.status = status;
    }
  }
  class NextRequest {
    url: string;
    init: { method: string; headers: unknown };
    constructor(url: string, init: { method: string; headers: unknown }) {
      this.url = url;
      this.init = init;
    }
  }
  return { NextRequest, NextResponse };
});

jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: jest.fn() }));

const { NextResponse } = jest.requireMock('next/server') as {
  NextResponse: new (status: number) => { status: number };
};
const requestHeaders = headers as jest.Mock;
const requireAuth = requireAdminAuth as jest.Mock;
const incoming = { get: (name: string) => (name === 'cookie' ? 'authToken=session' : null) };

beforeEach(() => {
  jest.clearAllMocks();
  requestHeaders.mockResolvedValue(incoming);
});

describe('authorizeAdminPage', () => {
  it('checks the page request with the same authority the admin APIs use', async () => {
    const auth = { userId: 'a'.repeat(24), role: 'admin', permissions: ['manageContent'], twoFactorEnabled: true };
    requireAuth.mockResolvedValue(auth);

    await expect(authorizeAdminPage(['manageContent'])).resolves.toEqual({ granted: true, auth });

    const [request, options] = requireAuth.mock.calls[0];
    expect(options).toEqual({ permissions: ['manageContent'] });
    // A read-only GET carrying the browser's own headers (and so its cookie).
    expect(request.init.method).toBe('GET');
    expect(request.init.headers).toBe(incoming);
  });

  it.each([
    [401, 'sign-in-required'],
    [403, 'forbidden'],
    [503, 'unavailable'],
    [500, 'unavailable'],
  ])('maps an API %s refusal to %s', async (status, denial) => {
    requireAuth.mockResolvedValue(new NextResponse(status));

    await expect(authorizeAdminPage(['manageContent'])).resolves.toEqual({ granted: false, denial });
  });

  it('fails closed when the authority throws', async () => {
    requireAuth.mockRejectedValue(new Error('database unreachable'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(authorizeAdminPage(['manageContent'])).resolves.toEqual({
      granted: false,
      denial: 'unavailable',
    });
    expect(log).toHaveBeenCalledWith('Admin page authorization failed:', 'database unreachable');
  });

  it("lets Next's per-request rendering signal from headers() propagate", async () => {
    const dynamicUsage = new Error('Dynamic server usage: headers');
    requestHeaders.mockRejectedValue(dynamicUsage);

    await expect(authorizeAdminPage(['manageContent'])).rejects.toBe(dynamicUsage);
    expect(requireAuth).not.toHaveBeenCalled();
  });
});

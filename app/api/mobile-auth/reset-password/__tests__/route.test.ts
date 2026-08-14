jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: ResponseInit = {}) => ({
      status: init.status ?? 200,
      headers: new Headers(init.headers),
      json: async () => body,
    }),
  },
}));

import {POST} from '../route';

const token = 'a'.repeat(64);

function request(body: Record<string, unknown>) {
  return {
    method: 'POST',
    url: 'https://egypt-excursionsonline.com/api/mobile-auth/reset-password',
    headers: new Headers({'content-type': 'application/json'}),
    json: jest.fn().mockResolvedValue(body),
  } as never;
}

describe('mobile password reset browser bridge', () => {
  const originalBackend = process.env.EEO_MOBILE_BACKEND_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EEO_MOBILE_BACKEND_URL = 'https://mobile-api.example.com';
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
    if (originalBackend === undefined) delete process.env.EEO_MOBILE_BACKEND_URL;
    else process.env.EEO_MOBILE_BACKEND_URL = originalBackend;
  });

  it('rejects malformed links before contacting the backend', async () => {
    const response = await POST(request({
      token: 'short',
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({success: false});
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards only a validated reset request and returns a no-store success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
    });

    const response = await POST(request({
      token,
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
      ignored: 'not forwarded',
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mobile-api.example.com/api/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          token,
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!',
        }),
        cache: 'no-store',
      }),
    );
  });

  it('maps expired links and provider failures without exposing provider details', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers(),
    });
    const expired = await POST(request({
      token,
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    }));
    expect(expired.status).toBe(400);
    await expect(expired.json()).resolves.toEqual({
      success: false,
      error: 'This reset link is invalid or has expired. Request a new link and try again.',
    });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('private provider failure'));
    const unavailable = await POST(request({
      token,
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    }));
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toEqual({
      success: false,
      error: 'Password reset is temporarily unavailable. Please try again later.',
    });
  });

  it('rejects unsafe backend configuration without making a request', async () => {
    process.env.EEO_MOBILE_BACKEND_URL = 'https://user:secret@example.com/path?token=leak';
    const response = await POST(request({
      token,
      password: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    }));

    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

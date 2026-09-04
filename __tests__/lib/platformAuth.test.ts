import {
  PlatformSessionUnavailableError,
  platformSession,
} from '@/lib/auth/platformAuth';

const fetchMock = jest.fn();

function mockResponse(status: number, body: Record<string, unknown>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as typeof fetch;
});

describe('platformSession', () => {
  it('returns null only for a confirmed unauthenticated response', async () => {
    fetchMock.mockResolvedValue(mockResponse(401, { success: false }));

    await expect(platformSession()).resolves.toBeNull();
  });

  it('returns a valid customer session', async () => {
    const user = { id: 'customer-1', email: 'qa@example.com', role: 'customer' };
    fetchMock.mockResolvedValue(mockResponse(200, { success: true, user }));

    await expect(platformSession()).resolves.toEqual(user);
  });

  it.each([
    ['server failure', () => Promise.resolve(mockResponse(503, {}))],
    ['transport failure', () => Promise.reject(new Error('network down'))],
    ['malformed success', () => Promise.resolve(mockResponse(200, { success: true }))],
  ])('fails closed for a %s', async (_name, response) => {
    fetchMock.mockImplementationOnce(response);

    await expect(platformSession()).rejects.toBeInstanceOf(PlatformSessionUnavailableError);
  });
});

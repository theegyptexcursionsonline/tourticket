const mockRetrieve = jest.fn();
const mockDbConnect = jest.fn();
const mockRateLimit = jest.fn();
const mockBookingFind = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: init.status || 200,
      headers: { get: (name: string) => Object.entries(init.headers || {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] || null },
      json: async () => body,
    }),
  },
  NextRequest: jest.fn(),
}));

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    checkout: { sessions: { retrieve: (...args: unknown[]) => mockRetrieve(...args) } },
  })),
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: () => mockDbConnect() }));
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  enforcePublicActionLimits: (...args: unknown[]) => mockRateLimit(...args),
}));
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: { find: (...args: unknown[]) => mockBookingFind(...args) },
}));

import { GET } from '@/app/api/checkout/session-status/route';

const bookingsQuery = (value: unknown) => ({
  select: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(value) }),
  }),
});

function request(sessionId = 'cs_test_12345678901234567890') {
  const searchParams = new URLSearchParams({ session_id: sessionId });
  return {
    method: 'GET',
    url: `https://example.com/api/checkout/session-status?${searchParams}`,
    nextUrl: { pathname: '/api/checkout/session-status', searchParams },
    headers: { get: () => null },
  } as never;
}

describe('GET /api/checkout/session-status', () => {
  const originalStripeKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockRetrieve.mockResolvedValue({
      id: 'cs_test_12345678901234567890',
      status: 'complete',
      payment_status: 'paid',
      payment_intent: 'pi_hosted_1',
      metadata: { has_booking_data: 'true', checkout_experience: 'hosted' },
    });
    mockBookingFind.mockReturnValue(bookingsQuery([
      { bookingReference: 'EEO-123456', status: 'Confirmed', paymentStatus: 'paid' },
    ]));
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
  });

  afterAll(() => {
    if (originalStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalStripeKey;
  });

  it('returns only redacted confirmation references after both payment and booking are durable', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({
      success: true,
      status: 'confirmed',
      paymentStatus: 'paid',
      bookingReferences: ['EEO-123456'],
    });
    expect(JSON.stringify(payload)).not.toMatch(/email|phone|price|customer/i);
  });

  it('reports processing instead of a false confirmation while the webhook is still writing the booking', async () => {
    mockBookingFind.mockReturnValueOnce(bookingsQuery([]));
    const response = await GET(request());
    await expect(response.json()).resolves.toMatchObject({
      status: 'processing',
      bookingReferences: [],
    });
  });

  it('rejects malformed Session identifiers before contacting Stripe or the database', async () => {
    const response = await GET(request('https://evil.example/session'));
    expect(response.status).toBe(400);
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it('rate-limits repeated status polling per Session', async () => {
    mockRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 30 });
    const response = await GET(request());
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('30');
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it('does not reveal the state of an unrelated Stripe Session', async () => {
    mockRetrieve.mockResolvedValueOnce({
      id: 'cs_test_12345678901234567890',
      status: 'complete',
      payment_status: 'paid',
      payment_intent: 'pi_unrelated',
      metadata: {},
    });
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mockBookingFind).not.toHaveBeenCalled();
  });
});

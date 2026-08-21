/**
 * API Route Handler Tests
 *
 * Tests Next.js API route handlers directly by importing them.
 * These run during build without needing a live server or database.
 */

// Mock NextResponse.json since the real one needs Web APIs not available in Node/Jest
jest.mock('next/server', () => {
  class MockNextResponse {
    body: any;
    status: number;
    headers: Map<string, string>;
    cookies: { set: jest.Mock; get: jest.Mock; delete: jest.Mock };
    _data: any;

    constructor(body?: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map();
      this.cookies = { set: jest.fn(), get: jest.fn(), delete: jest.fn() };
    }

    async json() {
      return this._data;
    }

    static json(data: any, init?: any) {
      const resp = new MockNextResponse(null, init);
      resp._data = data;
      return resp;
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: jest.fn(),
  };
});

// Mock database connection
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  enforcePublicActionLimits: jest.fn().mockResolvedValue({
    allowed: true,
    count: 1,
    limit: 10,
    retryAfterSeconds: 60,
  }),
}));
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    // Route-contract tests prove the response decision, not bcrypt cost. Real
    // password hashing has dedicated coverage; keeping cost-12 work here made
    // this smoke test exceed Jest's case budget under full-suite CPU load.
    compare: jest.fn().mockResolvedValue(false),
  },
}));
jest.mock('@/lib/auth/loginAudit', () => ({
  recordLoginAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    Types: {
      ObjectId: {
        isValid: jest.fn().mockReturnValue(false),
      },
    },
  },
}));

// Chainable mock helper
function chainable(resolveValue: any = []) {
  const chain: any = {};
  const methods = ['find', 'findOne', 'findById', 'populate', 'lean', 'sort', 'skip', 'limit', 'select', 'exec'];
  methods.forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.lean.mockResolvedValue(resolveValue);
  chain.exec.mockResolvedValue(resolveValue);
  // countDocuments resolves directly
  chain.countDocuments = jest.fn().mockResolvedValue(0);
  return chain;
}

// Mock Mongoose models with proper chaining
const tourChain = chainable([]);
jest.mock('@/lib/models/Tour', () => {
  const mock: any = jest.fn().mockReturnValue(tourChain);
  Object.assign(mock, tourChain);
  mock.find = jest.fn().mockReturnValue(tourChain);
  mock.findOne = jest.fn().mockReturnValue(tourChain);
  mock.findById = jest.fn().mockReturnValue(tourChain);
  mock.countDocuments = jest.fn().mockResolvedValue(0);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn().mockResolvedValue(0) },
}));

const destChain = chainable([]);
jest.mock('@/lib/models/Destination', () => {
  const mock: any = jest.fn().mockReturnValue(destChain);
  Object.assign(mock, destChain);
  mock.find = jest.fn().mockReturnValue(destChain);
  mock.findOne = jest.fn().mockReturnValue(destChain);
  mock.countDocuments = jest.fn().mockResolvedValue(0);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/models/Category', () => {
  const chain = chainable([]);
  const mock: any = jest.fn().mockReturnValue(chain);
  Object.assign(mock, chain);
  mock.find = jest.fn().mockReturnValue(chain);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/models/user', () => {
  const chain = chainable(null);
  // Make chain thenable so `await chain` resolves to null (user not found)
  chain.then = (resolve: any) => Promise.resolve(null).then(resolve);
  const mock: any = jest.fn().mockReturnValue(chain);
  Object.assign(mock, chain);
  mock.findOne = jest.fn().mockReturnValue(chain);
  return { __esModule: true, default: mock };
});

const bookingChain = chainable([]);
jest.mock('@/lib/models/Booking', () => {
  const mock: any = jest.fn().mockReturnValue(bookingChain);
  Object.assign(mock, bookingChain);
  mock.find = jest.fn().mockReturnValue(bookingChain);
  mock.findOne = jest.fn().mockReturnValue(bookingChain);
  mock.countDocuments = jest.fn().mockResolvedValue(0);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/models/Review', () => {
  const chain = chainable([]);
  const mock: any = jest.fn().mockReturnValue(chain);
  Object.assign(mock, chain);
  mock.find = jest.fn().mockReturnValue(chain);
  return { __esModule: true, default: mock };
});

jest.mock('@/lib/jwt', () => ({
  signToken: jest.fn().mockReturnValue('mock-jwt-token'),
  verifyToken: jest.fn().mockReturnValue(null),
}));

// Helper to create a NextRequest-like object
function createRequest(method: string, url: string, body?: any) {
  return {
    method,
    url: `http://localhost:3000${url}`,
    nextUrl: new URL(`http://localhost:3000${url}`),
    json: async () => body || {},
    headers: new Headers({}),
    cookies: { get: jest.fn().mockReturnValue(undefined) },
  } as any;
}

describe('API Route Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/login', () => {
    let POST: any;

    beforeAll(async () => {
      const mod = await import('@/app/api/admin/login/route');
      POST = mod.POST;
    });

    it('rejects empty body with 400', async () => {
      const request = createRequest('POST', '/api/admin/login', {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('rejects missing password with 400', async () => {
      const request = createRequest('POST', '/api/admin/login', { email: 'admin@test.com' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('rejects invalid credentials with 401', async () => {
      const request = createRequest('POST', '/api/admin/login', {
        email: 'wrong@test.com',
        password: 'wrongpassword',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/destinations', () => {
    let GET: any;

    beforeAll(async () => {
      const mod = await import('@/app/api/destinations/route');
      GET = mod.GET;
    });

    it('returns 200 with destinations array', async () => {
      const request = createRequest('GET', '/api/destinations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('critical route authorization', () => {
    it('rejects unauthenticated admin booking exports and userId overrides', async () => {
      const { GET } = await import('@/app/api/bookings/route');

      const adminResponse = await GET(createRequest('GET', '/api/bookings?admin=true'));
      const userOverrideResponse = await GET(
        createRequest('GET', '/api/bookings?userId=someone-else'),
      );

      expect(adminResponse.status).toBe(401);
      expect(userOverrideResponse.status).toBe(401);
    });

    it('rejects unauthenticated category writes', async () => {
      const collectionRoute = await import('@/app/api/categories/route');
      const itemRoute = await import('@/app/api/categories/[id]/route');
      const context = { params: Promise.resolve({ id: 'not-an-id' }) };

      const createResponse = await collectionRoute.POST(
        createRequest('POST', '/api/categories', {}),
      );
      const updateResponse = await itemRoute.PUT(
        createRequest('PUT', '/api/categories/not-an-id', {}),
        context,
      );
      const deleteResponse = await itemRoute.DELETE(
        createRequest('DELETE', '/api/categories/not-an-id'),
        context,
      );

      expect(createResponse.status).toBe(401);
      expect(updateResponse.status).toBe(401);
      expect(deleteResponse.status).toBe(401);
    });

    it('rejects unauthenticated booking-option and Algolia writes', async () => {
      const bookingOptionsRoute = await import(
        '@/app/api/tours/[tourId]/booking-options/route'
      );
      const algoliaRoute = await import('@/app/api/algolia/sync/route');

      const bookingOptionsResponse = await bookingOptionsRoute.PUT(
        createRequest('PUT', '/api/tours/not-an-id/booking-options', {}),
        { params: Promise.resolve({ tourId: 'not-an-id' }) },
      );
      const algoliaResponse = await algoliaRoute.POST(
        createRequest('POST', '/api/algolia/sync'),
      );

      expect(bookingOptionsResponse.status).toBe(401);
      // Retired 2026-08-21: 410 for every caller — tighter than the old 401.
      expect(algoliaResponse.status).toBe(410);
    });

    it('rejects unauthenticated image uploads', async () => {
      const uploadRoute = await import('@/app/api/upload/route');
      const heroUploadRoute = await import('@/app/api/uploadhero/route');

      const uploadResponse = await uploadRoute.POST(createRequest('POST', '/api/upload'));
      const heroUploadResponse = await heroUploadRoute.POST(
        createRequest('POST', '/api/uploadhero'),
      );

      expect(uploadResponse.status).toBe(401);
      expect(heroUploadResponse.status).toBe(401);
    });

    it('disables legacy client-priced booking and review creation', async () => {
      const bookingsRoute = await import('@/app/api/bookings/route');
      const reviewsRoute = await import('@/app/api/reviews/route');

      const bookingResponse = await bookingsRoute.POST(
        createRequest('POST', '/api/bookings', { totalPrice: 0.01 }),
      );
      const reviewResponse = await reviewsRoute.POST();

      expect(bookingResponse.status).toBe(405);
      expect(reviewResponse.status).toBe(405);
    });

    it('rejects receipt generation without a signed receipt token', async () => {
      const receiptRoute = await import('@/app/api/checkout/receipt/route');
      const response = await receiptRoute.POST(
        createRequest('POST', '/api/checkout/receipt', {
          orderId: 'FORGED',
          pricing: { total: 0.01 },
          customer: { email: 'victim@example.com' },
        }),
      );

      expect(response.status).toBe(401);
    });

    it('requires booking-management permission for the admin cancellation route', async () => {
      const route = await import('@/app/api/admin/bookings/[id]/cancel/route');
      const response = await route.POST(
        createRequest('POST', '/api/admin/bookings/not-an-id/cancel'),
        { params: Promise.resolve({ id: 'not-an-id' }) },
      );

      expect(response.status).toBe(401);
    });

    it('fails closed when cron authentication is not configured', async () => {
      const previousSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;
      const reminders = await import('@/app/api/cron/trip-reminders/route');
      const completion = await import('@/app/api/cron/trip-completion/route');

      const maliciousHeader = new Headers({ Authorization: 'Bearer undefined' });
      const reminderRequest = createRequest('GET', '/api/cron/trip-reminders');
      const completionRequest = createRequest('GET', '/api/cron/trip-completion');
      reminderRequest.headers = maliciousHeader;
      completionRequest.headers = maliciousHeader;

      expect((await reminders.GET(reminderRequest)).status).toBe(503);
      expect((await completion.GET(completionRequest)).status).toBe(503);
      if (previousSecret) process.env.CRON_SECRET = previousSecret;
    });

    it('returns only the public booking verification allowlist', async () => {
      bookingChain.lean.mockResolvedValueOnce({
        bookingReference: 'SAFE-REFERENCE',
        tour: { title: 'Tour', image: 'image.jpg', duration: '2h' },
        user: { firstName: 'Private', lastName: 'Guest', email: 'private@example.com' },
        date: new Date('2026-07-20T00:00:00.000Z'),
        time: '09:00',
        guests: 2,
        totalPrice: 200,
        status: 'Confirmed',
        selectedBookingOption: { title: 'Morning', price: 100 },
        specialRequests: 'Private request',
        emergencyContact: 'Private contact',
      });
      const { GET } = await import('@/app/api/booking/verify/[reference]/route');

      const response = await GET(
        createRequest('GET', '/api/booking/verify/SAFE-REFERENCE'),
        { params: Promise.resolve({ reference: 'SAFE-REFERENCE' }) },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Object.keys(data.booking).sort()).toEqual([
        'bookingReference', 'date', 'guests', 'selectedBookingOption', 'status', 'time', 'tour',
      ]);
      expect(data.booking).not.toHaveProperty('user');
      expect(data.booking).not.toHaveProperty('totalPrice');
      expect(data.booking.selectedBookingOption).toEqual({ title: 'Morning' });
    });
  });
});

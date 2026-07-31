export {};

const mockRequireAdminAuth = jest.fn();
const mockTourFind = jest.fn();
const mockSelect = jest.fn();
const mockSort = jest.fn();
const mockLimit = jest.fn();
const mockLean = jest.fn();

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
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: mockRequireAdminAuth }));
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { find: mockTourFind },
}));

function installTourQueryMock() {
  const chain = {
    select: mockSelect,
    sort: mockSort,
    limit: mockLimit,
    lean: mockLean,
  };
  mockTourFind.mockReturnValue(chain);
  mockSelect.mockReturnValue(chain);
  mockSort.mockReturnValue(chain);
  mockLimit.mockReturnValue(chain);
  mockLean.mockResolvedValue([
    {
      _id: '64b64c9bfc13ae1f19e8a001',
      title: 'Cairo English Tour',
      slug: 'cairo-english-tour',
      isPublished: true,
      bookingOptions: [{ pricingKey: 'private-luxor-tour-123' }],
    },
    {
      _id: '64b64c9bfc13ae1f19e8a002',
      title: 'Kairo Tagesausflug mit Mittagessen',
      slug: 'kairo-tagesausflug',
      description: 'Geführte Tour mit Abholung und Mittagessen',
      isPublished: true,
      bookingOptions: [],
    },
  ]);
}

describe('GET /api/admin/pages/options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ id: 'main-admin' });
    installTourQueryMock();
  });

  it('keeps the main EEO tenant filter when searching tours', async () => {
    const { GET } = await import('@/app/api/admin/pages/options/route');
    const request = {
      url: 'https://dashboard2.egypt-excursionsonline.com/api/admin/pages/options?kind=tours&q=cairo',
    } as never;

    const response = await GET(request);
    const body = await response.json();
    const filter = mockTourFind.mock.calls[0][0];

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Cairo English Tour');
    expect(filter).toEqual({
      $and: [
        {
          $or: [
            { tenantId: 'default' },
            { tenantId: { $exists: false } },
            { tenantId: null },
            { tenantId: '' },
          ],
        },
        {
          $or: [
            { title: expect.any(RegExp) },
            { slug: expect.any(RegExp) },
            { 'bookingOptions.pricingKey': 'cairo' },
            { 'bookingOptions.id': 'cairo' },
          ],
        },
      ],
    });
  });

  it('searches by exact Tour ID without removing tenant isolation', async () => {
    const { GET } = await import('@/app/api/admin/pages/options/route');
    const tourId = '64b64c9bfc13ae1f19e8a001';
    await GET({
      url: `https://dashboard2.egypt-excursionsonline.com/api/admin/pages/options?kind=tours&q=${tourId}`,
    } as never);

    const filter = mockTourFind.mock.calls[0][0];
    expect(filter.$and[0].$or).toContainEqual({ tenantId: 'default' });
    expect(filter.$and[1].$or).toContainEqual({ _id: tourId });
  });

  it('searches by Option ID and reports the matched identifier', async () => {
    const { GET } = await import('@/app/api/admin/pages/options/route');
    const optionId = 'private-luxor-tour-123';
    const response = await GET({
      url: `https://dashboard2.egypt-excursionsonline.com/api/admin/pages/options?kind=tours&q=${optionId}`,
    } as never);
    const body = await response.json();
    const filter = mockTourFind.mock.calls[0][0];

    expect(filter.$and[0].$or).toContainEqual({ tenantId: 'default' });
    expect(filter.$and[1].$or).toContainEqual({ 'bookingOptions.pricingKey': optionId });
    expect(body.data[0].matchedOptionIds).toEqual([optionId]);
  });
});

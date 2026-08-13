export {};

const mockRequireAdminAuth = jest.fn();
const mockTourFind = jest.fn();
const mockSelect = jest.fn();
const mockSort = jest.fn();
const mockLimit = jest.fn();
const mockLean = jest.fn();
const mockAttractionPageFind = jest.fn();
const mockCategoryFind = jest.fn();
const mockDestinationFind = jest.fn();

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
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: { find: mockAttractionPageFind } }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: { find: mockCategoryFind } }));
jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: { find: mockDestinationFind } }));
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

function installListQueryMock(find: jest.Mock, rows: Array<Record<string, unknown>>) {
  const lean = jest.fn().mockResolvedValue(rows);
  const chain = {
    select: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    lean,
  };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  find.mockReturnValue(chain);
}

describe('GET /api/admin/pages/options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ id: 'main-admin' });
    installTourQueryMock();
    installListQueryMock(mockAttractionPageFind, []);
    installListQueryMock(mockCategoryFind, []);
    installListQueryMock(mockDestinationFind, []);
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

  it('returns tenant-scoped destinations and pages for the parent selector', async () => {
    installListQueryMock(mockDestinationFind, [{
      _id: '64b64c9bfc13ae1f19e8a010',
      name: 'Hurghada',
      slug: 'hurghada',
      isPublished: true,
    }]);
    installListQueryMock(mockAttractionPageFind, [{
      _id: '64b64c9bfc13ae1f19e8a011',
      title: 'Family Tours',
      slug: 'family-tours',
      pageType: 'category',
      isPublished: true,
    }]);
    installListQueryMock(mockCategoryFind, [{
      _id: '64b64c9bfc13ae1f19e8a012',
      name: 'Aswan Tours',
      slug: 'aswan-tours',
      isPublished: true,
    }]);

    const { GET } = await import('@/app/api/admin/pages/options/route');
    const response = await GET({
      url: 'https://dashboard2.egypt-excursionsonline.com/api/admin/pages/options?kind=parents&q=hurghada',
    } as never);
    const body = await response.json();

    expect(mockDestinationFind.mock.calls[0][0].$and[0]).toEqual(expect.objectContaining({
      $or: expect.arrayContaining([{ tenantId: 'default' }]),
    }));
    expect(mockCategoryFind.mock.calls[0][0].$and).toEqual(expect.arrayContaining([
      expect.objectContaining({
        $or: expect.arrayContaining([{ tenantId: 'default' }]),
      }),
      expect.objectContaining({
        $or: expect.arrayContaining([{ name: expect.any(RegExp) }, { slug: expect.any(RegExp) }]),
      }),
    ]));
    expect(body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Hurghada', kind: 'destination', slug: 'hurghada' }),
      expect.objectContaining({ label: 'Family Tours', kind: 'category-2', slug: 'family-tours' }),
      expect.objectContaining({ label: 'Aswan Tours', kind: 'category', slug: 'aswan-tours' }),
    ]));
  });

  it('excludes the current Category from parent-page results', async () => {
    installListQueryMock(mockCategoryFind, []);
    const categoryId = '64b64c9bfc13ae1f19e8a012';

    const { GET } = await import('@/app/api/admin/pages/options/route');
    await GET({
      url: `https://dashboard2.egypt-excursionsonline.com/api/admin/pages/options?kind=parents&excludeId=${categoryId}`,
    } as never);

    expect(mockCategoryFind.mock.calls[0][0]).toEqual(expect.objectContaining({
      _id: { $ne: categoryId },
      $and: [expect.objectContaining({
        $or: expect.arrayContaining([{ tenantId: 'default' }]),
      })],
    }));
  });
});

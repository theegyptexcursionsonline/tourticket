export {};

const mockVerifyAdmin = jest.fn();
const mockTourFind = jest.fn();
const mockSelect = jest.fn();
const mockPopulate = jest.fn();
const mockSort = jest.fn();
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
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: mockVerifyAdmin }));
jest.mock('@/lib/algolia', () => ({ syncTourToAlgolia: jest.fn() }));
jest.mock('@/lib/i18n/autoTranslate', () => ({ autoTranslateTour: jest.fn() }));
jest.mock('@/lib/admin/cleanBookingOptions', () => ({ cleanBookingOptions: jest.fn((value) => value) }));
jest.mock('@/lib/revenue/pricingSummary', () => ({ refreshTourPricingSummary: jest.fn() }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    find: mockTourFind,
    create: jest.fn(),
    findById: jest.fn(),
  },
}));

const fixture = {
  _id: 'tour-1',
  tenantId: 'default',
  title: 'Main EEO Tour',
  slug: 'main-eeo-tour',
  discountPrice: 45,
  isPublished: true,
  image: '/tour.jpg',
  destination: { _id: 'destination-1', name: 'Hurghada', slug: 'hurghada' },
  category: { _id: 'category-1', name: 'Boat Trips', slug: 'boat-trips' },
  reviews: [
    { _id: 'review-1', comment: 'Must never be returned' },
    { _id: 'review-2', comment: 'Must never be returned' },
  ],
};

function installTourQueryMock() {
  const chain = {
    select: mockSelect,
    populate: mockPopulate,
    sort: mockSort,
    lean: mockLean,
  };
  mockTourFind.mockReturnValue(chain);
  mockSelect.mockReturnValue(chain);
  mockPopulate.mockReturnValue(chain);
  mockSort.mockReturnValue(chain);
  mockLean.mockResolvedValue([fixture]);
}

describe('GET /api/admin/tours list payload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ id: 'main-admin' });
    installTourQueryMock();
  });

  it('keeps main tenant scoping and returns counts instead of review documents', async () => {
    const { GET } = await import('@/app/api/admin/tours/route');
    const request = { url: 'https://dashboard2.egypt-excursionsonline.com/api/admin/tours' } as never;
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockVerifyAdmin).toHaveBeenCalledWith(request);
    expect(mockTourFind).toHaveBeenCalledWith(expect.objectContaining({
      $or: expect.arrayContaining([
        { tenantId: 'default' },
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' },
      ]),
    }));
    expect(body.data[0].reviewCount).toBe(2);
    expect(body.data[0].reviews).toBeUndefined();
    expect(body.data[0].description).toBeUndefined();
    expect(body.data[0].attractions).toBeUndefined();
    expect(body.data[0].interests).toBeUndefined();
  });

  it('projects only lean list fields and populates only compact taxonomy labels', async () => {
    const { GET } = await import('@/app/api/admin/tours/route');
    await GET({ url: 'https://dashboard2.egypt-excursionsonline.com/api/admin/tours' } as never);

    const projection = mockSelect.mock.calls[0][0] as string;
    expect(projection).toContain('title');
    expect(projection).toContain('review');
    expect(projection).not.toContain('description');
    expect(projection).not.toContain('bookingOptions');
    expect(mockPopulate).toHaveBeenCalledTimes(2);
    expect(mockPopulate).toHaveBeenNthCalledWith(1, {
      path: 'category',
      select: 'name title slug',
    });
    expect(mockPopulate).toHaveBeenNthCalledWith(2, {
      path: 'destination',
      select: 'name title slug',
    });
  });
});

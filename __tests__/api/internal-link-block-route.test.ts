export {};

const mockRequireAdminAuth = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockBuildDefault = jest.fn();
const mockRevalidate = jest.fn();

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
jest.mock('@/lib/models/InternalLinkBlock', () => ({
  __esModule: true,
  default: { findOne: mockFindOne, findOneAndUpdate: mockFindOneAndUpdate },
}));
jest.mock('@/lib/navigation/defaultInternalLinks', () => ({ buildDefaultInternalLinks: mockBuildDefault }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: mockRevalidate }));

const fallback = {
  enabled: true,
  heading: { en: 'Explore Egypt' },
  groups: [{
    id: 'destinations',
    title: { en: 'Destinations' },
    enabled: true,
    links: [{ id: 'hurghada', label: { en: 'Hurghada' }, href: '/destinations/hurghada', enabled: true }],
  }],
};

function lean(value: unknown) {
  return { lean: jest.fn().mockResolvedValue(value) };
}

describe('internal-link block API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ id: 'admin' });
    mockFindOne.mockReturnValue(lean(null));
    mockBuildDefault.mockResolvedValue(fallback);
  });

  it('requires manageContent and returns generated defaults when no override exists', async () => {
    const { GET } = await import('@/app/api/admin/internal-link-block/route');
    const response = await GET({} as never);
    const body = await response.json();

    expect(mockRequireAdminAuth).toHaveBeenCalledWith(expect.anything(), { permissions: ['manageContent'] });
    expect(body).toEqual({ success: true, data: fallback });
    expect(mockBuildDefault).toHaveBeenCalled();
  });

  it('rejects incomplete configuration without writing', async () => {
    const { PUT } = await import('@/app/api/admin/internal-link-block/route');
    const response = await PUT({ json: async () => ({ heading: {}, groups: [] }) } as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/English section heading/i);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('sanitizes and persists a tenant-scoped override, then invalidates storefront content', async () => {
    mockFindOneAndUpdate.mockReturnValue(lean({ ...fallback, tenantId: 'default' }));
    const { PUT } = await import('@/app/api/admin/internal-link-block/route');
    const response = await PUT({ json: async () => fallback } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { tenantId: 'default' },
      expect.objectContaining({ $set: expect.objectContaining({ tenantId: 'default' }) }),
      expect.objectContaining({ upsert: true, runValidators: true }),
    );
    expect(mockRevalidate).toHaveBeenCalled();
    expect(body.success).toBe(true);
  });
});

describe('public internal-link API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReturnValue(lean(null));
    mockBuildDefault.mockResolvedValue(fallback);
  });

  it('returns only enabled localized links and uses generated tenant defaults', async () => {
    const { GET } = await import('@/app/api/navigation/internal-links/route');
    const response = await GET({
      nextUrl: { searchParams: new URLSearchParams('locale=de') },
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({ tenantId: 'default', enabled: true });
    expect(body).toEqual({
      success: true,
      data: {
        enabled: true,
        heading: 'Explore Egypt',
        groups: [{
          id: 'destinations',
          title: 'Destinations',
          links: [{ id: 'hurghada', label: 'Hurghada', href: '/destinations/hurghada' }],
        }],
      },
    });
  });
});

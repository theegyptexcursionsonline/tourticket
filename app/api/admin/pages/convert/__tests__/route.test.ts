const mockRequireAdminAuth = jest.fn();
const mockCategoryFindOne = jest.fn();
const mockCategoryCount = jest.fn();
const mockCategoryCreate = jest.fn();
const mockAttractionFindOne = jest.fn();
const mockAttractionCreate = jest.fn();
const mockDestinationCount = jest.fn();
const mockValidateParent = jest.fn();
const mockValidateLinks = jest.fn();
const mockRegisterAudit = jest.fn();
const mockRevalidate = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private body: unknown;
    constructor(body: unknown, status = 200) {
      this.body = body;
      this.status = status;
    }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init?.status || 200);
    }
    json() {
      return Promise.resolve(this.body);
    }
  }
  return { NextResponse: MockNextResponse };
});
jest.mock('mongoose', () => {
  function MockObjectId() {
    return { toString: () => '68e1825fe6bab638df5a7f99' };
  }
  MockObjectId.isValid = jest.fn((value: unknown) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value));
  return {
    __esModule: true,
    default: { Types: { ObjectId: MockObjectId } },
  };
});
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
}));
jest.mock('@/lib/admin/adminAudit', () => ({
  registerAdminAuditDetail: (...args: unknown[]) => mockRegisterAudit(...args),
  withAdminAudit: (handler: unknown) => handler,
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => ({ lean: () => mockCategoryFindOne(...args) }),
    countDocuments: (...args: unknown[]) => mockCategoryCount(...args),
    create: (...args: unknown[]) => mockCategoryCreate(...args),
  },
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => ({ lean: () => mockAttractionFindOne(...args) }),
    create: (...args: unknown[]) => mockAttractionCreate(...args),
  },
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: { countDocuments: (...args: unknown[]) => mockDestinationCount(...args) },
}));
jest.mock('@/lib/content/validateParentPage', () => ({
  ParentPageValidationError: class ParentPageValidationError extends Error {},
  validateParentPageSelection: (...args: unknown[]) => mockValidateParent(...args),
}));
jest.mock('@/lib/attractionPages/validatePageLinks', () => ({
  PageLinkValidationError: class PageLinkValidationError extends Error {},
  validateAndNormalizePageLinks: (...args: unknown[]) => mockValidateLinks(...args),
}));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: (...args: unknown[]) => mockRevalidate(...args),
}));

const validId = '64b000000000000000000001';

function request(body: Record<string, unknown>) {
  return {
    method: 'POST',
    url: 'http://localhost/api/admin/pages/convert',
    nextUrl: new URL('http://localhost/api/admin/pages/convert'),
    headers: new Headers({ 'content-type': 'application/json' }),
    json: jest.fn().mockResolvedValue(body),
  } as never;
}

describe('POST /api/admin/pages/convert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ id: 'admin-1' });
    mockValidateParent.mockResolvedValue(null);
    mockValidateLinks.mockResolvedValue({
      linkedPageIds: [],
      linkedCategoryIds: [],
      linkedTourIds: [],
    });
    mockDestinationCount.mockResolvedValue(1);
    mockCategoryCount.mockResolvedValue(1);
  });

  it('fails closed when the caller lacks content-management permission', async () => {
    const { NextResponse } = jest.requireMock('next/server');
    mockRequireAdminAuth.mockResolvedValue(
      NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
    );
    const { POST } = await import('../route');
    const response = await POST(request({
      id: validId,
      sourceKind: 'category',
      targetKind: 'attraction',
    }));
    expect(response.status).toBe(403);
    expect(mockCategoryFindOne).not.toHaveBeenCalled();
  });

  it('rejects invalid and unsafe conversion pairs', async () => {
    const { POST } = await import('../route');
    const response = await POST(request({
      id: 'not-an-id',
      sourceKind: 'category',
      targetKind: 'category',
    }));
    expect(response.status).toBe(400);
  });

  it('creates an unpublished Attraction draft without mutating the Category source', async () => {
    const source = {
      _id: validId,
      name: 'Desert Safari',
      slug: 'desert-safari',
      description: 'Shared copy',
      heroImage: '/desert.jpg',
      archivedAt: null,
      isPublished: true,
    };
    mockCategoryFindOne.mockResolvedValue(source);
    mockAttractionCreate.mockImplementation(async (draft) => ({ ...draft }));

    const { POST } = await import('../route');
    const response = await POST(request({
      id: validId,
      sourceKind: 'category',
      targetKind: 'attraction',
    }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.editHref).toMatch(/^\/admin\/attraction-pages\//);
    expect(mockCategoryFindOne).toHaveBeenCalledWith(expect.objectContaining({
      $and: expect.arrayContaining([expect.objectContaining({ _id: validId, archivedAt: null })]),
    }));
    expect(mockAttractionCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Desert Safari (Attraction)',
      pageType: 'attraction',
      isPublished: false,
      archivedAt: null,
    }));
    expect(source).toMatchObject({ name: 'Desert Safari', isPublished: true, archivedAt: null });
    expect(mockRegisterAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      resourceType: 'pages',
    }));
  });

  it('creates a Category 2 draft linked to its active source Category', async () => {
    mockCategoryFindOne.mockResolvedValue({
      _id: validId,
      name: 'Boat Trips',
      slug: 'boat-trips',
      description: 'Shared copy',
      archivedAt: null,
    });
    mockAttractionCreate.mockImplementation(async (draft) => ({ ...draft }));
    const { POST } = await import('../route');
    const response = await POST(request({
      id: validId,
      sourceKind: 'category',
      targetKind: 'category-landing',
    }));

    expect(response.status).toBe(201);
    expect(mockCategoryCount).toHaveBeenCalledWith(expect.objectContaining({
      $and: expect.arrayContaining([expect.objectContaining({ _id: validId, archivedAt: null })]),
    }));
    expect(mockAttractionCreate).toHaveBeenCalledWith(expect.objectContaining({
      pageType: 'category',
      categoryId: validId,
      isPublished: false,
    }));
  });

  it('returns 404 when the tenant-scoped source is unavailable', async () => {
    mockAttractionFindOne.mockResolvedValue(null);
    const { POST } = await import('../route');
    const response = await POST(request({
      id: validId,
      sourceKind: 'attraction',
      targetKind: 'category',
    }));
    expect(response.status).toBe(404);
    expect(mockAttractionCreate).not.toHaveBeenCalled();
    expect(mockCategoryCreate).not.toHaveBeenCalled();
  });

  it('rejects a transfer when its city relationship is unavailable', async () => {
    mockCategoryFindOne.mockResolvedValue({
      _id: validId,
      name: 'City page',
      slug: 'city-page',
      description: 'Shared copy',
      urlType: 'city',
      cityDestination: '64b000000000000000000099',
      archivedAt: null,
    });
    mockDestinationCount.mockResolvedValue(0);
    const { POST } = await import('../route');
    const response = await POST(request({
      id: validId,
      sourceKind: 'category',
      targetKind: 'attraction',
    }));
    const payload = await response.json();
    expect(response.status).toBe(409);
    expect(payload.code).toBe('SOURCE_RELATIONSHIP_INVALID');
    expect(mockAttractionCreate).not.toHaveBeenCalled();
  });
});

import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const requireAdminAuth = jest.fn();
const registerAdminAuditDetail = jest.fn();
const refreshTourPricingSummary = jest.fn();
const revalidateTourStorefront = jest.fn();
const revalidateStorefrontContent = jest.fn();
const validateParentPageSelection = jest.fn(async ({ parentPage }) => parentPage ?? null);
const validateAndNormalizePageLinks = jest.fn(async (body: Record<string, unknown>) => ({
  ...(body.linkedTourIds !== undefined ? { linkedTourIds: body.linkedTourIds } : {}),
  ...(body.linkedPageIds !== undefined ? { linkedPageIds: body.linkedPageIds } : {}),
  ...(body.linkedCategoryIds !== undefined ? { linkedCategoryIds: body.linkedCategoryIds } : {}),
}));

const tourFindOne = jest.fn();
const tourCreate = jest.fn();
const tourCountDocuments = jest.fn();
const destinationFindOne = jest.fn();
const destinationCreate = jest.fn();
const destinationCountDocuments = jest.fn();
const categoryFindOne = jest.fn();
const categoryCreate = jest.fn();
const categoryCountDocuments = jest.fn();
const pageFindOne = jest.fn();
const pageCreate = jest.fn();
const pageCountDocuments = jest.fn();

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
  MockObjectId.isValid = jest.fn(() => true);
  return {
    __esModule: true,
    default: { Types: { ObjectId: MockObjectId } },
  };
});
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth }));
jest.mock('@/lib/admin/adminAudit', () => ({
  registerAdminAuditDetail,
  withAdminAudit: (handler: unknown) => handler,
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: tourFindOne, create: tourCreate, countDocuments: tourCountDocuments },
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: { findOne: destinationFindOne, create: destinationCreate, countDocuments: destinationCountDocuments },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: { findOne: categoryFindOne, create: categoryCreate, countDocuments: categoryCountDocuments },
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: { findOne: pageFindOne, create: pageCreate, countDocuments: pageCountDocuments },
}));
jest.mock('@/lib/content/validateParentPage', () => ({
  ParentPageValidationError: class ParentPageValidationError extends Error {},
  validateParentPageSelection,
}));
jest.mock('@/lib/attractionPages/validatePageLinks', () => ({
  PageLinkValidationError: class PageLinkValidationError extends Error {},
  validateAndNormalizePageLinks,
}));
jest.mock('@/lib/content/contentNavigation', () => ({ sanitizeContentNavigation: jest.fn(() => ({})) }));
jest.mock('@/lib/revenue/pricingSummary', () => ({ refreshTourPricingSummary }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateTourStorefront,
  revalidateStorefrontContent,
}));

const admin = {
  userId: '68e1825fe6bab638df5a7001',
  email: 'admin@example.com',
  name: 'Admin',
  role: 'super_admin',
  permissions: ['manageTours', 'manageContent'],
  twoFactorEnabled: true,
};

function request(url: string, body?: Record<string, unknown>) {
  return {
    method: 'POST',
    url,
    nextUrl: new URL(url),
    headers: new Headers({ 'content-type': 'application/json' }),
    cookies: { get: jest.fn() },
    json: jest.fn().mockResolvedValue(body || {}),
  } as never;
}

function query(value: unknown) {
  return { lean: jest.fn().mockResolvedValue(value) };
}

describe('admin content duplicate routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAuth.mockResolvedValue(admin);
    destinationCountDocuments.mockResolvedValue(1);
    categoryCountDocuments.mockResolvedValue(1);
    pageCountDocuments.mockResolvedValue(0);
    tourCountDocuments.mockResolvedValue(0);
    tourCreate.mockImplementation(async (draft) => ({ ...draft }));
    destinationCreate.mockImplementation(async (draft) => ({ _id: '68e1825fe6bab638df5a7020', ...draft }));
    categoryCreate.mockImplementation(async (draft) => ({ ...draft }));
    pageCreate.mockImplementation(async (draft) => ({ ...draft }));
  });

  it('enforces manageTours before reading or copying a Tour', async () => {
    const { NextResponse } = await import('next/server');
    requireAdminAuth.mockResolvedValue(NextResponse.json({ error: 'forbidden' }, { status: 403 }));
    const { POST } = await import('@/app/api/admin/tours/[id]/duplicate/route');
    const response = await POST(
      request('http://localhost/api/admin/tours/68e1825fe6bab638df5a7010/duplicate'),
      { params: Promise.resolve({ id: '68e1825fe6bab638df5a7010' }) },
    );
    expect(response.status).toBe(403);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), { permissions: ['manageTours'] });
    expect(tourFindOne).not.toHaveBeenCalled();
  });

  it('returns 404 for a Tour outside the default tenant boundary', async () => {
    tourFindOne.mockReturnValue(query(null));
    const { POST } = await import('@/app/api/admin/tours/[id]/duplicate/route');
    const response = await POST(
      request('http://localhost/api/admin/tours/68e1825fe6bab638df5a7010/duplicate'),
      { params: Promise.resolve({ id: '68e1825fe6bab638df5a7010' }) },
    );
    expect(response.status).toBe(404);
    expect(tourFindOne).toHaveBeenCalledWith({
      $and: [DEFAULT_TENANT_FILTER, { _id: '68e1825fe6bab638df5a7010' }],
    });
    expect(tourCreate).not.toHaveBeenCalled();
  });

  it('creates a tenant-safe unpublished Tour draft and resets money/search identities and metrics', async () => {
    tourFindOne.mockReturnValue(query({
      _id: '68e1825fe6bab638df5a7010',
      tenantId: 'default',
      title: 'Orange Bay',
      slug: 'orange-bay',
      description: 'A complete source description for the tour.',
      destination: '68e1825fe6bab638df5a7100',
      category: ['68e1825fe6bab638df5a7200'],
      bookingOptions: [{ id: 'old', pricingKey: 'old-pricing-key', type: 'standard', label: 'Standard', price: 50 }],
      reviews: ['review'],
      rating: 4.8,
      bookings: 90,
      pricingSummary: { version: 8 },
    }));
    const { POST } = await import('@/app/api/admin/tours/[id]/duplicate/route');
    const response = await POST(
      request('http://localhost/api/admin/tours/68e1825fe6bab638df5a7010/duplicate'),
      { params: Promise.resolve({ id: '68e1825fe6bab638df5a7010' }) },
    );
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(body.editHref).toMatch(/^\/admin\/tours\/edit\//);
    expect(tourCreate).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'default',
      title: 'Orange Bay (Copy)',
      slug: 'orange-bay-copy',
      isPublished: false,
      isFeatured: false,
      reviews: [],
      bookings: 0,
      rating: 0,
    }));
    const draft = tourCreate.mock.calls[0][0];
    expect(draft).not.toHaveProperty('pricingSummary');
    expect(draft.bookingOptions[0].pricingKey).not.toBe('old-pricing-key');
    expect(refreshTourPricingSummary).toHaveBeenCalledWith(String(draft._id));
    expect(registerAdminAuditDetail).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', resourceType: 'tours' }));
  });

  it('fails closed when a Tour relationship crosses the tenant boundary', async () => {
    tourFindOne.mockReturnValue(query({
      title: 'Unsafe Tour', slug: 'unsafe-tour', destination: 'dest', category: ['foreign-category'],
    }));
    categoryCountDocuments.mockResolvedValue(0);
    const { POST } = await import('@/app/api/admin/tours/[id]/duplicate/route');
    const response = await POST(
      request('http://localhost/api/admin/tours/68e1825fe6bab638df5a7010/duplicate'),
      { params: Promise.resolve({ id: '68e1825fe6bab638df5a7010' }) },
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(expect.objectContaining({ code: 'SOURCE_RELATIONSHIP_INVALID' }));
    expect(tourCreate).not.toHaveBeenCalled();
  });

  it('fails closed instead of silently dropping a malformed parent relationship', async () => {
    tourFindOne.mockReturnValue(query({
      title: 'Unsafe Parent Tour',
      slug: 'unsafe-parent-tour',
      destination: '68e1825fe6bab638df5a7100',
      category: ['68e1825fe6bab638df5a7200'],
      parentPage: { slug: 'missing-verified-identity' },
    }));
    const { POST } = await import('@/app/api/admin/tours/[id]/duplicate/route');
    const response = await POST(
      request('http://localhost/api/admin/tours/68e1825fe6bab638df5a7010/duplicate'),
      { params: Promise.resolve({ id: '68e1825fe6bab638df5a7010' }) },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({
      error: 'The source tour has an invalid parent-page relationship.',
    }));
    expect(tourCreate).not.toHaveBeenCalled();
  });

  it('creates a Destination draft without copying linked Tour ownership', async () => {
    destinationFindOne.mockReturnValue(query({
      _id: '68e1825fe6bab638df5a7030',
      name: 'Fayoum', slug: 'fayoum', country: 'Egypt', image: 'hero.jpg',
      description: 'Oasis destination', featured: true, isPublished: true, tourCount: 20,
      bestDealTourIds: ['68e1825fe6bab638df5a7300'],
    }));
    tourCountDocuments.mockResolvedValue(1);
    const { POST } = await import('@/app/api/admin/destinations/[id]/duplicate/route');
    const response = await POST(
      request('http://localhost/api/admin/destinations/68e1825fe6bab638df5a7030/duplicate'),
      { params: Promise.resolve({ id: '68e1825fe6bab638df5a7030' }) },
    );
    expect(response.status).toBe(201);
    expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(), { permissions: ['manageContent'] });
    expect(destinationFindOne).toHaveBeenCalledWith({
      $and: [DEFAULT_TENANT_FILTER, { _id: '68e1825fe6bab638df5a7030' }],
    });
    expect(destinationCreate).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Fayoum (Copy)', slug: 'fayoum-copy', tenantId: 'default',
      isPublished: false, featured: false, tourCount: 0,
    }));
  });

  it.each([
    ['attraction', pageFindOne, pageCreate, 'title', 'Egypt Attractions', '/admin/attraction-pages/'],
    ['category-landing', pageFindOne, pageCreate, 'title', 'Family Tours', '/admin/attraction-pages/'],
    ['category', categoryFindOne, categoryCreate, 'name', 'Boat Tours', '/admin/categories/'],
  ] as const)('duplicates each unified Page kind as an unpublished draft: %s', async (
    kind,
    findOne,
    create,
    labelField,
    label,
    editPrefix,
  ) => {
    const source = {
      _id: '68e1825fe6bab638df5a7040',
      [labelField]: label,
      slug: 'source-page',
      pageType: kind === 'category-landing' ? 'category' : 'attraction',
      description: 'Source page description',
      gridTitle: 'Available tours',
      categoryId: kind === 'category-landing' ? '68e1825fe6bab638df5a7200' : undefined,
      isPublished: true,
      featured: true,
    };
    findOne.mockReturnValue(query(source));
    const { POST } = await import('@/app/api/admin/pages/duplicate/route');
    const response = await POST(request('http://localhost/api/admin/pages/duplicate', {
      kind,
      id: '68e1825fe6bab638df5a7040',
    }));
    const body = await response.json() as { editHref?: string };
    expect(response.status).toBe(201);
    expect(body.editHref).toContain(editPrefix);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'default',
      [labelField]: `${label} (Copy)`,
      slug: 'source-page-copy',
      isPublished: false,
      featured: false,
    }));
  });

  it('rejects malformed Page duplication input before touching the database', async () => {
    const { POST } = await import('@/app/api/admin/pages/duplicate/route');
    const response = await POST(request('http://localhost/api/admin/pages/duplicate', {
      kind: 'unknown', id: 'not-an-id',
    }));
    expect(response.status).toBe(400);
    expect(pageFindOne).not.toHaveBeenCalled();
    expect(categoryFindOne).not.toHaveBeenCalled();
  });
});

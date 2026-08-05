import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const requireAdminAuth = jest.fn();
const findOne = jest.fn();
const findOneAndUpdate = jest.fn();
const findOneAndDelete = jest.fn();
const mockSave = jest.fn();
const leanQuery = (value: unknown) => ({
  lean: jest.fn().mockResolvedValue(value),
});
const mockCategoryConstructor = jest.fn((data: Record<string, unknown>) => ({
  ...data,
  save: mockSave,
}));

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

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { aggregate: jest.fn().mockResolvedValue([]) },
}));
jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: jest.fn(() => true) } } },
}));
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: jest.fn(),
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: Object.assign(mockCategoryConstructor, {
    findOne,
    findOneAndUpdate,
    findOneAndDelete,
  }),
}));

function request(method: string, body?: Record<string, unknown>) {
  return {
    method,
    url: 'http://localhost:3000/api/categories/68e1825fe6bab638df5a7f31',
    nextUrl: new URL('http://localhost:3000/api/categories/68e1825fe6bab638df5a7f31'),
    headers: new Headers({ 'content-type': 'application/json' }),
    cookies: { get: jest.fn() },
    json: jest.fn().mockResolvedValue(body || {}),
  } as never;
}

const context = {
  params: Promise.resolve({ id: '68e1825fe6bab638df5a7f31' }),
};

describe('main category item tenant boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAuth.mockResolvedValue({
      userId: 'admin',
      role: 'super_admin',
      permissions: ['manageContent'],
      twoFactorEnabled: true,
    });
  });

  it('creates a main category in the default tenant and ignores a caller tenant id', async () => {
    findOne.mockResolvedValue(null);
    mockSave.mockResolvedValue(undefined);
    const { POST } = await import('@/app/api/categories/route');

    const response = await POST({
      method: 'POST',
      url: 'http://localhost:3000/api/categories',
      nextUrl: new URL('http://localhost:3000/api/categories'),
      headers: new Headers({ 'content-type': 'application/json' }),
      cookies: { get: jest.fn() },
      json: jest.fn().mockResolvedValue({
        name: 'Nightlife & Bars',
        slug: 'nightlife-bars',
        tenantId: 'another-brand',
      }),
    } as never);

    expect(response.status).toBe(201);
    expect(findOne).toHaveBeenCalledWith({
      $and: [DEFAULT_TENANT_FILTER, { slug: 'nightlife-bars' }],
    });
    expect(mockCategoryConstructor).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Nightlife & Bars',
      slug: 'nightlife-bars',
      tenantId: 'default',
    }));
  });

  it('checks a same-slug edit only inside the main tenant', async () => {
    findOne
      .mockReturnValueOnce(leanQuery({
        _id: '68e1825fe6bab638df5a7f31',
        name: 'Nightlife & Bars',
        slug: 'nightlife-bars',
        tenantId: 'default',
      }))
      .mockResolvedValueOnce(null);
    findOneAndUpdate.mockReturnValue(leanQuery({
      _id: '68e1825fe6bab638df5a7f31',
      slug: 'nightlife-bars',
    }));
    const { PUT } = await import('@/app/api/categories/[id]/route');

    const response = await PUT(request('PUT', {
      slug: 'nightlife-bars',
      tenantId: 'another-brand',
    }), context);

    expect(response.status).toBe(200);
    expect(findOne).toHaveBeenCalledWith({
      $and: [
        DEFAULT_TENANT_FILTER,
        { slug: 'nightlife-bars', _id: { $ne: '68e1825fe6bab638df5a7f31' } },
      ],
    });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { $and: [DEFAULT_TENANT_FILTER, { _id: '68e1825fe6bab638df5a7f31' }] },
      { slug: 'nightlife-bars' },
      { new: true, runValidators: true },
    );
  });

  it('returns 404 rather than updating a category outside the main tenant', async () => {
    findOne.mockReturnValue(leanQuery({
      _id: '68e1825fe6bab638df5a7f31',
      name: 'Nightlife & Bars',
      slug: 'nightlife-bars',
      tenantId: 'default',
    }));
    findOneAndUpdate.mockReturnValue(leanQuery(null));
    const { PUT } = await import('@/app/api/categories/[id]/route');

    const response = await PUT(request('PUT', { name: 'Changed' }), context);

    expect(response.status).toBe(404);
  });

  it('scopes permanent deletion to the main tenant', async () => {
    findOneAndDelete.mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/categories/[id]/route');

    const response = await DELETE(request('DELETE'), context);

    expect(response.status).toBe(404);
    expect(findOneAndDelete).toHaveBeenCalledWith({
      $and: [DEFAULT_TENANT_FILTER, { _id: '68e1825fe6bab638df5a7f31' }],
    });
  });
});

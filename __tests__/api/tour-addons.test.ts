jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: init.status || 200,
      headers: init.headers || {},
      json: async () => body,
    }),
  },
}));

const mockDbConnect = jest.fn();
const mockLean = jest.fn();
const mockSelect = jest.fn(() => ({ lean: mockLean }));
const mockFindOne = jest.fn((_query?: unknown) => ({ select: mockSelect }));

jest.mock('@/lib/dbConnect', () => () => mockDbConnect());
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: (query: unknown) => mockFindOne(query) },
}));

import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { GET } from '@/app/api/tours/[tourId]/addons/route';

const tourId = '507f1f77bcf86cd799439011';

describe('GET /api/tours/[tourId]/addons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockLean.mockResolvedValue({ addOns: [] });
  });

  it('returns an empty list instead of manufactured fallback products', async () => {
    const response = await GET({} as never, { params: Promise.resolve({ tourId }) }) as any;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers['Cache-Control']).toBe('private, no-store');
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: tourId,
      isPublished: true,
      ...DEFAULT_TENANT_FILTER,
    });
  });

  it('returns only stable, valid authored add-ons without invented savings', async () => {
    mockLean.mockResolvedValue({
      addOns: [
        { _id: '507f1f77bcf86cd799439012', name: 'Lunch', description: 'Fresh lunch', price: 0, category: 'Food', pricingMethod: 'per_person' },
        { name: 'Missing stable id', description: '', price: 10 },
        { _id: '507f1f77bcf86cd799439013', name: 'Broken price', description: '', price: Number.NaN },
      ],
    });

    const response = await GET({} as never, { params: Promise.resolve({ tourId }) }) as any;
    expect(await response.json()).toEqual([{
      id: '507f1f77bcf86cd799439012',
      title: 'Lunch',
      description: 'Fresh lunch',
      price: 0,
      category: 'Food',
      perGuest: true,
      pricingMethod: 'per_person',
      groupKey: '',
      groupTitle: '',
      bookingOptionKeys: [],
      maxQuantity: 1,
      required: false,
    }]);
  });

  it('rejects malformed ids before touching the database', async () => {
    const response = await GET({} as never, { params: Promise.resolve({ tourId: 'not-an-id' }) }) as any;
    expect(response.status).toBe(400);
    expect(mockDbConnect).not.toHaveBeenCalled();
  });
});

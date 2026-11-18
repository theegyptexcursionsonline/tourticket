// Saving a tour or a single booking option whose price is 0 everywhere still
// succeeds ("Price on request" options are kept on purpose), and the response
// lists those options so the editor can warn staff. Nothing about the saved
// data changes: the stored body is what was sent.
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

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: jest.fn(() => true) } } },
}));
jest.mock('@/lib/auth/verifyAdmin', () => ({ verifyAdmin: jest.fn() }));
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: jest.fn() }));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn(), findById: jest.fn() },
}));
jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/algolia', () => ({ syncTourToAlgolia: jest.fn(), deleteTourFromAlgolia: jest.fn() }));
jest.mock('@/lib/admin/auditStamp', () => ({ auditStamp: jest.fn(() => ({ id: 'admin-1' })) }));
jest.mock('@/lib/revenue/pricingKeys', () => ({ ensureBookingOptionPricingKeys: jest.fn((_id, value) => value) }));
jest.mock('@/lib/i18n/autoTranslate', () => ({ autoTranslateTour: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/admin/cleanBookingOptions', () => ({ cleanBookingOptions: jest.fn((value) => value), bookingOptionCapacityError: jest.fn(() => null) }));
jest.mock('@/lib/revenue/pricingSummary', () => ({ refreshTourPricingSummary: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateTourStorefront: jest.fn(), revalidateStorefrontContent: jest.fn() }));
jest.mock('@/lib/content/validateParentPage', () => ({
  ParentPageValidationError: class extends Error {},
  validateParentPageSelection: jest.fn(async ({ parentPage }) => parentPage ?? null),
}));
jest.mock('@/lib/admin/tourTaxonomyOwnership', () => ({
  TourTaxonomyOwnershipError: class extends Error {},
  validateTourTaxonomyOwnership: jest.fn().mockResolvedValue(undefined),
}));

import { PUT } from '@/app/api/admin/tours/[id]/route';
import { POST } from '@/app/api/admin/tours/route';
import { PUT as PUT_OPTION } from '@/app/api/tours/[tourId]/booking-options/route';

const mockVerifyAdmin = jest.requireMock('@/lib/auth/verifyAdmin').verifyAdmin as jest.Mock;
const mockRequireAdminAuth = jest.requireMock('@/lib/auth/adminAuth').requireAdminAuth as jest.Mock;
const mockTour = jest.requireMock('@/lib/models/Tour').default as Record<string, jest.Mock>;

const id = '507f1f77bcf86cd799439011';
const context = { params: Promise.resolve({ id }) };
const optionContext = { params: Promise.resolve({ tourId: id }) };
const request = (body: unknown) => ({ url: 'https://example.test/api/admin/tours', json: jest.fn().mockResolvedValue(body) }) as never;

const priced = { label: 'Private Tour with Transfers', type: 'Per Person', price: 60, timeSlots: [{ time: '10:00', price: 60 }] };
const unpriced = { label: 'Private Cairo Experience', type: 'Per Person', price: 0, timeSlots: [{ time: '10:00' }] };
const zeroBasePriced = { label: 'Shared', type: 'Per Person', price: 0, timeSlots: [{ time: '10:00', price: 116 }] };

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAdmin.mockResolvedValue({ id: 'admin-1', role: 'admin' });
  mockRequireAdminAuth.mockResolvedValue({ id: 'admin-1', role: 'admin', permissions: ['manageTours'] });
  mockTour.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ bookingCutoffMinutes: 0, availability: { slots: [{ time: '10:00' }] }, bookingOptions: [] }) }) });
  mockTour.findOneAndUpdate.mockImplementation(async (_filter, update) => ({ _id: id, isPublished: false, ...update.$set }));
});

describe('PUT /api/admin/tours/[id] warns about unpriced options without blocking', () => {
  it('saves and lists the unpriced option by name', async () => {
    const options = [priced, unpriced];
    const response = await PUT(request({ bookingOptions: options }), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.warnings).toEqual({ unpricedOptions: ['Private Cairo Experience'] });
    // The stored options are exactly what was sent: no price is changed.
    const [, update] = mockTour.findOneAndUpdate.mock.calls[0];
    expect(update.$set.bookingOptions).toEqual(options);
  });

  it('an option priced only per start time is not reported', async () => {
    const response = await PUT(request({ bookingOptions: [priced, zeroBasePriced] }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).warnings).toEqual({ unpricedOptions: [] });
  });

  it('a tour with every option unpriced still saves', async () => {
    const response = await PUT(request({ bookingOptions: [unpriced, { ...unpriced, label: 'Second' }] }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).warnings.unpricedOptions).toEqual(['Private Cairo Experience', 'Second']);
  });

  it('a refused save carries no warning and saves nothing', async () => {
    const response = await PUT(request({ bookingOptions: [{ ...unpriced, timeSlots: [{ time: '23:00' }] }] }), context);
    expect(response.status).toBe(400);
    expect((await response.json()).warnings).toBeUndefined();
    expect(mockTour.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('an unauthenticated save is refused before any warning is computed', async () => {
    const { NextResponse } = jest.requireMock('next/server');
    mockVerifyAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const response = await PUT(request({ bookingOptions: [unpriced] }), context);
    expect(response.status).toBe(401);
    expect(mockTour.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/tours warns about unpriced options without blocking', () => {
  it('creates the tour and lists the unpriced option', async () => {
    mockTour.create.mockImplementation(async (body) => ({ ...body }));
    mockTour.findById.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.populate = () => chain;
      chain.lean = async () => null;
      return chain;
    });
    const response = await POST(request({
      title: 'Cairo shopping', slug: 'cairo-shopping', description: 'Markets', duration: '3 hours',
      discountPrice: 60, destination: 'd1', category: ['c1'], image: '/real.jpg',
      bookingOptions: [priced, unpriced],
    }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.warnings).toEqual({ unpricedOptions: ['Private Cairo Experience'] });
    expect(mockTour.create.mock.calls[0][0].bookingOptions).toEqual([priced, unpriced]);
  });
});

describe('PUT /api/tours/[tourId]/booking-options warns about an unpriced option', () => {
  function tourDoc(options: unknown[]) {
    return { availability: { slots: [{ time: '10:00' }] }, bookingOptions: [...options], save: jest.fn().mockResolvedValue(undefined) };
  }

  it('saves the option and returns the warning', async () => {
    const doc = tourDoc([priced]);
    mockTour.findOne.mockResolvedValue(doc);
    const response = await PUT_OPTION(request({ index: 1, option: unpriced }), optionContext);
    expect(response.status).toBe(200);
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(doc.bookingOptions[1]).toEqual(unpriced);
    expect((await response.json()).warnings).toEqual({ unpricedOptions: ['Private Cairo Experience'] });
  });

  it('pricing the option clears the warning', async () => {
    const doc = tourDoc([priced, unpriced]);
    mockTour.findOne.mockResolvedValue(doc);
    const response = await PUT_OPTION(request({ index: 1, option: { ...unpriced, price: 45 } }), optionContext);
    expect((await response.json()).warnings).toEqual({ unpricedOptions: [] });
  });

  it('a caller without tour permission is refused', async () => {
    const { NextResponse } = jest.requireMock('next/server');
    mockRequireAdminAuth.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const response = await PUT_OPTION(request({ index: 0, option: unpriced }), optionContext);
    expect(response.status).toBe(403);
    expect(mockTour.findOne).not.toHaveBeenCalled();
  });
});

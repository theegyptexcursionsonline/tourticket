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
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
}));
jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/algolia', () => ({
  syncTourToAlgolia: jest.fn(),
  deleteTourFromAlgolia: jest.fn(),
}));
jest.mock('@/lib/admin/auditStamp', () => ({ auditStamp: jest.fn(() => ({ id: 'admin-1' })) }));
jest.mock('@/lib/revenue/pricingKeys', () => ({ ensureBookingOptionPricingKeys: jest.fn((_id, value) => value) }));
jest.mock('@/lib/i18n/autoTranslate', () => ({ autoTranslateTour: jest.fn() }));
jest.mock('@/lib/admin/cleanBookingOptions', () => ({ cleanBookingOptions: jest.fn((value) => value), bookingOptionCapacityError: jest.fn(() => null) }));
jest.mock('@/lib/revenue/pricingSummary', () => ({ refreshTourPricingSummary: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateTourStorefront: jest.fn() }));

import { PUT } from '@/app/api/admin/tours/[id]/route';

const mockVerifyAdmin = jest.requireMock('@/lib/auth/verifyAdmin').verifyAdmin as jest.Mock;
const mockTour = jest.requireMock('@/lib/models/Tour').default as {
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
};
const mockFindOne = mockTour.findOne;
const mockFindOneAndUpdate = mockTour.findOneAndUpdate;
const mockDeleteTourFromAlgolia = jest.requireMock('@/lib/algolia').deleteTourFromAlgolia as jest.Mock;
const mockAutoTranslateTour = jest.requireMock('@/lib/i18n/autoTranslate').autoTranslateTour as jest.Mock;

const context = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };

function request(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as never;
}

describe('tour booking cutoff updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockFindOne.mockReturnValue({ select: () => ({ lean: async () => ({ bookingCutoffMinutes: 0, availability: { slots: [{ time: '10:00' }] } }) }) });
    mockFindOneAndUpdate.mockResolvedValue({ bookingCutoffMinutes: 120 });
  });
  it('saves a scoped cutoff alone without content providers', async () => {
    const response = await PUT(request({ bookingCutoffMinutes: 120 }), context);
    expect(response.status).toBe(200);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ $or: expect.any(Array) }), expect.objectContaining({ $set: expect.objectContaining({ bookingCutoffMinutes: 120 }) }), { new: true, runValidators: true });
    expect(mockAutoTranslateTour).not.toHaveBeenCalled();
    expect(mockDeleteTourFromAlgolia).not.toHaveBeenCalled();
  });
  it.each([-1, 43201, 1.5, null, '120'])('rejects malformed cutoff %s without writes', async value => {
    expect((await PUT(request({ bookingCutoffMinutes: value }), context)).status).toBe(400);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
  it('refuses a missing or out-of-tenant tour', async () => {
    mockFindOne.mockReturnValue({ select: () => ({ lean: async () => null }) });
    expect((await PUT(request({ bookingCutoffMinutes: 120 }), context)).status).toBe(404);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
  it('requires an authored departure schedule for positive cutoff', async () => {
    mockFindOne.mockReturnValue({ select: () => ({ lean: async () => ({}) }) });
    expect((await PUT(request({ bookingCutoffMinutes: 120 }), context)).status).toBe(400);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
  it('preserves zero for legacy tours and fails before querying when unauthorized', async () => {
    const { NextResponse } = await import('next/server');
    mockVerifyAdmin.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    expect((await PUT(request({ bookingCutoffMinutes: 0 }), context)).status).toBe(403);
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

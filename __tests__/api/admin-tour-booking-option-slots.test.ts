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

describe('PUT /api/admin/tours/[id] booking-option slot boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    mockAutoTranslateTour.mockResolvedValue(undefined);
  });

  it('rejects a direct partial update that revives a removed universal slot', async () => {
    const lean = jest.fn().mockResolvedValue({
      availability: { slots: [{ time: '09:00' }] },
    });
    const select = jest.fn().mockReturnValue({ lean });
    mockFindOne.mockReturnValue({ select });

    const response = await PUT(request({
      bookingOptions: [{ label: 'Private', price: 100, timeSlots: [{ time: '12:00', price: 125 }] }],
    }), context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Booking option contains a time slot that is not in tour availability',
    });
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('accepts a full save when every option slot remains universally available', async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      isPublished: false,
      bookingOptions: [{ label: 'Private', price: 100, timeSlots: [{ time: '09:00', price: 125 }] }],
    });

    const response = await PUT(request({
      bookingOptions: [{ label: 'Private', price: 100, timeSlots: [{ time: '09:00', price: 125 }] }],
      availability: { type: 'daily', slots: [{ time: '09:00', capacity: 10 }] },
    }), context);

    expect(response.status).toBe(200);
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mockDeleteTourFromAlgolia).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});

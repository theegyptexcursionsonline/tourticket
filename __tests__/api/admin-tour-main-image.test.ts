// A tour's main image is required. The admin create and update routes refuse a
// body that sets it blank or to the never-existing placeholder path, so a
// saved tour can never end up with no photo. A partial update that leaves the
// image alone (a booking cutoff) still saves.
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
  default: { findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn() },
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
import { POST } from '@/app/api/admin/tours/route';
import { MAIN_IMAGE_REQUIRED_MESSAGE, MISSING_MAIN_IMAGE_PATH } from '@/lib/admin/tourMainImage';

const mockVerifyAdmin = jest.requireMock('@/lib/auth/verifyAdmin').verifyAdmin as jest.Mock;
const mockTour = jest.requireMock('@/lib/models/Tour').default as {
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
  create: jest.Mock;
};

const context = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };

function request(body: unknown) {
  return { url: 'https://dashboard2.example/api/admin/tours', json: jest.fn().mockResolvedValue(body) } as never;
}

const tourBody = (image: unknown) => ({
  title: 'Pyramids day tour',
  description: 'Giza plateau with a guide',
  duration: '8 hours',
  discountPrice: 60,
  destination: 'destination-one',
  category: ['category-one'],
  image,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAdmin.mockResolvedValue({ id: 'admin-1', role: 'admin' });
  mockTour.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ bookingCutoffMinutes: 0, availability: { slots: [{ time: '10:00' }] } }) }) });
  mockTour.findOneAndUpdate.mockResolvedValue({ bookingCutoffMinutes: 120 });
});

describe('admin tour update requires a real main image', () => {
  it.each(['', '   ', null, MISSING_MAIN_IMAGE_PATH])('refuses to save main image %p', async image => {
    const response = await PUT(request(tourBody(image)), context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: MAIN_IMAGE_REQUIRED_MESSAGE });
    expect(mockTour.findOne).not.toHaveBeenCalled();
    expect(mockTour.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('leaves a booking cutoff update, which does not touch the image, alone', async () => {
    const response = await PUT(request({ bookingCutoffMinutes: 120 }), context);

    expect(response.status).toBe(200);
    const [, update] = mockTour.findOneAndUpdate.mock.calls[0];
    expect(update.$set).not.toHaveProperty('image');
  });
});

describe('admin tour create requires a real main image', () => {
  it.each(['', MISSING_MAIN_IMAGE_PATH])('refuses to create a tour with main image %p', async image => {
    const response = await POST(request(tourBody(image)));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: MAIN_IMAGE_REQUIRED_MESSAGE });
    expect(mockTour.create).not.toHaveBeenCalled();
  });
});

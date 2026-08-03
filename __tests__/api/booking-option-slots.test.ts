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

jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: jest.fn() }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

import { PUT } from '@/app/api/tours/[tourId]/booking-options/route';

const mockRequireAdminAuth = jest.requireMock('@/lib/auth/adminAuth').requireAdminAuth as jest.Mock;
const mockFindOne = jest.requireMock('@/lib/models/Tour').default.findOne as jest.Mock;

const context = { params: Promise.resolve({ tourId: '507f1f77bcf86cd799439011' }) };

function request(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as never;
}

describe('PUT /api/tours/[tourId]/booking-options slot boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ userId: 'admin-1' });
  });

  it('rejects an option slot that is absent from universal availability', async () => {
    const save = jest.fn();
    mockFindOne.mockResolvedValue({
      bookingOptions: [],
      availability: { slots: [{ time: '09:00', capacity: 10 }] },
      save,
    });

    const response = await PUT(request({
      index: 0,
      option: { label: 'Private', price: 100, timeSlots: [{ time: '12:00', price: 125 }] },
    }), context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Booking option contains a time slot that is not in tour availability',
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('saves an option whose configured slots exist on the tour', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const tour = {
      bookingOptions: [] as unknown[],
      availability: { slots: [{ time: '09:00', capacity: 10 }] },
      save,
    };
    mockFindOne.mockResolvedValue(tour);

    const option = { label: 'Private', price: 100, timeSlots: [{ time: '09:00', price: 125 }] };
    const response = await PUT(request({ index: 0, option }), context);

    expect(response.status).toBe(200);
    expect(tour.bookingOptions).toEqual([option]);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

/**
 * Public tour-options quote surface: the prices this route serves are what the
 * booking sidebar displays, so every number must equal what checkout will
 * charge through the shared discount helper (same pattern as routes.test.ts).
 */

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _data: unknown;

    constructor(init?: { status?: number }) {
      this.status = init?.status || 200;
    }

    async json() {
      return this._data;
    }

    static json(data: unknown, init?: { status?: number }) {
      const resp = new MockNextResponse(init);
      resp._data = data;
      return resp;
    }
  }

  return { NextResponse: MockNextResponse, NextRequest: jest.fn() };
});

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const tourLean = jest.fn();
const tourFindOne = jest.fn(() => ({ lean: tourLean }));

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => (tourFindOne as jest.Mock)(...args) },
}));

import { GET } from '@/app/api/tours/[tourId]/options/route';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';

const TOUR_ID = '507f1f77bcf86cd799439011';

const discountedTour = {
  _id: TOUR_ID,
  title: 'Discounted tour',
  discountPrice: 100,
  discountPercent: 20,
  originalPrice: 120,
  duration: '3 hours',
  description: 'A tour',
  maxGroupSize: 12,
  availability: { slots: [{ time: '09:00', capacity: 10, price: 75 }, { time: '11:00', capacity: 8 }] },
  bookingOptions: [
    {
      pricingKey: 'private-key',
      type: 'Per Person',
      label: 'Private',
      price: 150,
      applyTourDiscount: true,
      timeSlots: [
        { time: '14:00', capacity: 6, price: 200, guestPrices: { child: 100, infant: 20 } },
        { time: '16:00' },
      ],
    },
    { pricingKey: 'group-key', type: 'Per Person', label: 'Group', price: 90 },
  ],
};

const request = {} as Request;
const context = { params: Promise.resolve({ tourId: TOUR_ID }) };

describe('GET /api/tours/[tourId]/options quotes exactly what checkout charges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tourLean.mockResolvedValue(discountedTour);
  });

  it('serves discounted option prices with the pre-discount original for the strikethrough', async () => {
    const response = await GET(request, context);
    const options = await (response as unknown as { json: () => Promise<any[]> }).json();

    const priv = options.find((option) => option.pricingKey === 'private-key');
    expect(priv.price).toBe(120); // 150 - 20%
    expect(priv.originalPrice).toBe(150);
    expect(priv.discount).toBe(20);
    expect(priv.guestPrices).toEqual({ adult: 120, child: 60, infant: 0 });
    expect(priv.price).toBe(authoritativeBasePrice(discountedTour, {
      selectedBookingOption: { pricingKey: 'private-key' },
      selectedTime: null,
    }));

    const group = options.find((option) => option.pricingKey === 'group-key');
    expect(group.price).toBe(90);
    // No reduction — original must not fabricate a strikethrough for 90 vs 90.
    expect(group.originalPrice === undefined || group.originalPrice >= group.price).toBe(true);
  });

  it('prices configured option slots through the same helper as checkout', async () => {
    const response = await GET(request, context);
    const options = await (response as unknown as { json: () => Promise<any[]> }).json();
    const priv = options.find((option) => option.pricingKey === 'private-key');

    const slot14 = priv.timeSlots.find((slot: { time: string }) => slot.time === '14:00');
    expect(slot14.price).toBe(160); // 200 - 20%
    expect(slot14.guestPrices).toEqual({ adult: 160, child: 80, infant: 16 });
    expect(slot14.originalPrice).toBe(200);
    expect(slot14.price).toBe(authoritativeBasePrice(discountedTour, {
      selectedBookingOption: { pricingKey: 'private-key' },
      selectedTime: '14:00',
    }));

    const slot16 = priv.timeSlots.find((slot: { time: string }) => slot.time === '16:00');
    expect(slot16.price).toBe(120); // inherits the discounted base

    // An option without configured slots uses universal slots at its own
    // effective price — checkout never charges it a universal slot price.
    const group = options.find((option) => option.pricingKey === 'group-key');
    const groupSlot9 = group.timeSlots.find((slot: { time: string }) => slot.time === '09:00');
    expect(groupSlot9.price).toBe(90);
    expect(groupSlot9.price).toBe(authoritativeBasePrice(discountedTour, {
      selectedBookingOption: { pricingKey: 'group-key' },
      selectedTime: '09:00',
    }));
  });

  it('prices the standard fallback from universal slots exactly like the no-option charge', async () => {
    tourLean.mockResolvedValueOnce({ ...discountedTour, bookingOptions: [] });
    const response = await GET(request, context);
    const [standard] = await (response as unknown as { json: () => Promise<any[]> }).json();

    const slot9 = standard.timeSlots.find((slot: { time: string }) => slot.time === '09:00');
    expect(standard.price).toBe(80); // tour base 100 - 20%
    expect(standard.originalPrice).toBe(100);
    expect(standard.discount).toBe(20);
    expect(slot9.price).toBe(60); // universal slot 75 - 20%
    expect(slot9.originalPrice).toBe(75);
    expect(slot9.price).toBe(authoritativeBasePrice(discountedTour, {
      selectedBookingOption: null,
      selectedTime: '09:00',
    }));
    const slot11 = standard.timeSlots.find((slot: { time: string }) => slot.time === '11:00');
    expect(slot11.price).toBe(80); // unpriced slot inherits the discounted tour price
    expect(slot11.originalPrice).toBe(100);
  });
});

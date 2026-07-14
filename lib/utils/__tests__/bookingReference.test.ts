jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(() => ({
      lean: jest.fn().mockResolvedValue(null),
    })),
  },
}));

import Booking from '@/lib/models/Booking';
import {
  generateDeterministicBookingReference,
  generateUniqueBookingReference,
} from '@/lib/utils/bookingReference';

const findOne = Booking.findOne as unknown as jest.Mock;

describe('booking references', () => {
  beforeEach(() => {
    findOne.mockClear();
  });

  it('keeps paid-cart references deterministic and item-specific', () => {
    const first = generateDeterministicBookingReference('pi_secure_payment_123456', 0);
    expect(generateDeterministicBookingReference('pi_secure_payment_123456', 0)).toBe(first);
    expect(generateDeterministicBookingReference('pi_secure_payment_123456', 1)).not.toBe(first);
    expect(first).toMatch(/^EEO-[A-Z0-9]{6}-01-[A-F0-9]{8}$/);
  });

  it('uses cryptographically random capability-grade manual references', async () => {
    const first = await generateUniqueBookingReference();
    const second = await generateUniqueBookingReference();

    expect(first).toMatch(/^EEO-\d{8}-[A-F0-9]{20}$/);
    expect(second).toMatch(/^EEO-\d{8}-[A-F0-9]{20}$/);
    expect(second).not.toBe(first);
    expect(findOne).toHaveBeenCalledTimes(2);
  });
});

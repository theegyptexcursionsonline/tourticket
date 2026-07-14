jest.mock('@/lib/revenue/sellableDeparture', () => ({
  assertRevenuePriceTargetSellable: jest.fn(),
}));

import { assertRevenuePriceTargetSellable } from '@/lib/revenue/sellableDeparture';
import { assertCartAvailability, UnavailableTourError } from '@/lib/checkout/assertAvailability';

const target = {
  id: '507f1f77bcf86cd799439011',
  selectedDate: '2026-08-01',
  selectedTime: '10:00',
  selectedBookingOption: { pricingKey: 'standard' },
  quantity: 2,
  childQuantity: 1,
  infantQuantity: 1,
};

describe('checkout departure validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects missing exact date/time/option targets', async () => {
    await expect(assertCartAvailability([{ ...target, selectedTime: undefined }]))
      .rejects.toMatchObject({ code: 'INVALID_DEPARTURE' });
  });

  it('uses the controlled-pricing sellability resolver and enforces remaining capacity', async () => {
    jest.mocked(assertRevenuePriceTargetSellable).mockResolvedValue({
      startsAtUtc: '2026-08-01T07:00:00.000Z', capacity: 10, booked: 7, available: 3, optionId: 'standard-default',
    });
    await expect(assertCartAvailability([target])).rejects.toMatchObject({ code: 'DEPARTURE_CAPACITY_CHANGED' });
    expect(assertRevenuePriceTargetSellable).toHaveBeenCalledWith({
      tourId: target.id,
      optionKey: 'standard',
      date: target.selectedDate,
      time: target.selectedTime,
    });
  });

  it('accepts a fully targeted departure with enough capacity', async () => {
    jest.mocked(assertRevenuePriceTargetSellable).mockResolvedValue({
      startsAtUtc: '2026-08-01T07:00:00.000Z', capacity: 10, booked: 2, available: 8, optionId: 'standard-default',
    });
    await expect(assertCartAvailability([target])).resolves.toBeUndefined();
  });

  it('does not leak implementation errors through a different error class', async () => {
    jest.mocked(assertRevenuePriceTargetSellable).mockRejectedValue(Object.assign(new Error('Stop sale'), { code: 'OPTION_STOP_SALE' }));
    await expect(assertCartAvailability([target])).rejects.toBeInstanceOf(UnavailableTourError);
  });
});

import { assertRevenuePriceTargetSellable } from '@/lib/revenue/sellableDeparture';

interface AvailabilityCartItem {
  _id?: unknown;
  id?: unknown;
  selectedDate?: string;
  selectedTime?: string;
  quantity?: number;
  childQuantity?: number;
  infantQuantity?: number;
  selectedBookingOption?: { pricingKey?: string };
}

export class UnavailableTourError extends Error {
  status = 409;
  code: string;
  constructor(message = 'One or more selected departures are no longer available', code = 'DEPARTURE_UNAVAILABLE') {
    super(message);
    this.name = 'UnavailableTourError';
    this.code = code;
  }
}

/**
 * Use the same target/schedule/stop-sale/capacity resolver as controlled
 * pricing writes. Checkout must never accept a missing or approximate slot.
 */
export async function assertCartAvailability(cart: AvailabilityCartItem[]) {
  for (const item of cart) {
    const tourId = String(item?._id || item?.id || '');
    const date = String(item.selectedDate || '');
    const time = String(item.selectedTime || '');
    const optionKey = String(item.selectedBookingOption?.pricingKey || '');
    if (!/^[a-f0-9]{24}$/i.test(tourId)
      || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
      || !optionKey) {
      throw new UnavailableTourError('Select a valid departure date, time, and booking option.', 'INVALID_DEPARTURE');
    }

    const requested = Number(item.quantity || 0)
      + Number(item.childQuantity || 0)
      + Number(item.infantQuantity || 0);
    if (!Number.isInteger(requested) || requested < 1 || requested > 50) {
      throw new UnavailableTourError('Select between 1 and 50 guests.', 'INVALID_GUEST_COUNT');
    }

    try {
      const evidence = await assertRevenuePriceTargetSellable({ tourId, optionKey, date, time });
      if (requested > evidence.available) {
        throw new UnavailableTourError('The selected departure no longer has enough capacity.', 'DEPARTURE_CAPACITY_CHANGED');
      }
    } catch (error: unknown) {
      if (error instanceof UnavailableTourError) throw error;
      const code = error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code || 'DEPARTURE_UNAVAILABLE')
        : 'DEPARTURE_UNAVAILABLE';
      throw new UnavailableTourError(
        error instanceof Error ? error.message : 'The selected departure is unavailable.',
        code,
      );
    }
  }
}

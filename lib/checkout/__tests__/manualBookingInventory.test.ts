jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/checkout/inventoryHolds', () => ({
  convertInventoryReservationHold: jest.fn(),
  releaseInventoryHolds: jest.fn(),
}));

import type { Types } from 'mongoose';
import { finalizeManualBookingInventory } from '@/lib/checkout/manualBookingInventory';

const bookingId = {
  toString: () => '507f1f77bcf86cd799439011',
} as unknown as Types.ObjectId;

describe('manual booking inventory finalization', () => {
  it('keeps a durable paid booking authoritative when hold conversion fails', async () => {
    const convert = jest.fn().mockRejectedValue(Object.assign(new Error('conversion failed'), { code: 'INVENTORY_HOLD_INACTIVE' }));
    const release = jest.fn().mockResolvedValue(undefined);
    const mark = jest.fn().mockResolvedValue(undefined);

    await expect(finalizeManualBookingInventory(
      { reservationKey: 'a'.repeat(64), bookingId },
      { convert, release, mark },
    )).resolves.toBe('booking_authoritative');

    expect(release).toHaveBeenCalledWith(expect.objectContaining({
      reservationKey: 'a'.repeat(64),
      reason: 'manual_booking_conversion_recovered',
    }));
    expect(mark).toHaveBeenCalledWith(bookingId, {
      $set: expect.objectContaining({
        inventoryReservationState: 'booking_authoritative',
        inventoryReservationFailureCode: 'INVENTORY_HOLD_INACTIVE',
      }),
    });
    expect(mark.mock.calls.flat().join(' ')).not.toContain('Cancelled');
  });

  it('records a normal converted receipt', async () => {
    const convert = jest.fn().mockResolvedValue(undefined);
    const release = jest.fn();
    const mark = jest.fn().mockResolvedValue(undefined);

    await expect(finalizeManualBookingInventory(
      { reservationKey: 'b'.repeat(64), bookingId },
      { convert, release, mark },
    )).resolves.toBe('converted');
    expect(release).not.toHaveBeenCalled();
    expect(mark).toHaveBeenCalledWith(bookingId, expect.objectContaining({
      $set: expect.objectContaining({ inventoryReservationState: 'converted' }),
    }));
  });

  it('does not fail the paid booking when recovery bookkeeping is unavailable', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(finalizeManualBookingInventory(
      { reservationKey: 'c'.repeat(64), bookingId },
      {
        convert: jest.fn().mockRejectedValue(new Error('conversion failed')),
        release: jest.fn().mockRejectedValue(new Error('release unavailable')),
        mark: jest.fn().mockRejectedValue(new Error('database unavailable')),
      },
    )).resolves.toBe('booking_authoritative');
    consoleError.mockRestore();
  });
});

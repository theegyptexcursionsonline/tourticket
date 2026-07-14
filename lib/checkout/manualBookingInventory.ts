import type { Types } from 'mongoose';
import Booking from '@/lib/models/Booking';
import {
  convertInventoryReservationHold,
  releaseInventoryHolds,
} from '@/lib/checkout/inventoryHolds';

type Dependencies = {
  convert: typeof convertInventoryReservationHold;
  release: typeof releaseInventoryHolds;
  mark: (bookingId: Types.ObjectId, update: Record<string, unknown>) => Promise<unknown>;
};

const defaults: Dependencies = {
  convert: convertInventoryReservationHold,
  release: releaseInventoryHolds,
  mark: (bookingId, update) => Booking.updateOne(
    { _id: bookingId, tenantId: 'default' },
    update,
  ).then((result) => result),
};

function failureCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code || 'INVENTORY_CONVERSION_FAILED').slice(0, 200);
  }
  return (error instanceof Error ? error.name : 'INVENTORY_CONVERSION_FAILED').slice(0, 200);
}

/**
 * Once a Booking row exists it is the durable capacity authority. A hold
 * conversion failure must never cancel that booking (or strand a verified
 * card charge). Release the stale hold, record the fallback, and continue.
 */
export async function finalizeManualBookingInventory(
  input: { reservationKey: string; bookingId: Types.ObjectId },
  dependencies: Dependencies = defaults,
): Promise<'converted' | 'booking_authoritative'> {
  try {
    await dependencies.convert({
      reservationKey: input.reservationKey,
      itemIndex: 0,
      bookingId: input.bookingId,
    });
    await dependencies.mark(input.bookingId, {
      $set: {
        inventoryReservationState: 'converted',
        inventoryReservationFinalizedAt: new Date(),
      },
      $unset: { inventoryReservationFailureCode: 1 },
    }).catch((error) => {
      // The converted hold and booking are already safe. Leaving the durable
      // pending marker is preferable to failing a completed booking.
      console.error('Manual booking inventory conversion receipt could not be persisted.', error);
    });
    return 'converted';
  } catch (error) {
    const code = failureCode(error);
    const [releaseResult, markResult] = await Promise.allSettled([
      dependencies.release({
        reservationKey: input.reservationKey,
        reason: 'manual_booking_conversion_recovered',
      }),
      dependencies.mark(input.bookingId, {
        $set: {
          inventoryReservationState: 'booking_authoritative',
          inventoryReservationFailureCode: code,
          inventoryReservationFinalizedAt: new Date(),
        },
      }),
    ]);
    if (releaseResult.status === 'rejected') {
      console.error('Stale manual booking inventory hold could not be released.', releaseResult.reason);
    }
    if (markResult.status === 'rejected') {
      // The row was created with pending_conversion, so the unresolved state
      // remains visible to monitoring even when this follow-up write fails.
      console.error('Manual booking inventory recovery receipt could not be persisted.', markResult.reason);
    }
    return 'booking_authoritative';
  }
}

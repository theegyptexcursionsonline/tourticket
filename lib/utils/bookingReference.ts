import { createHash } from 'crypto';
import Booking from '@/lib/models/Booking';

// Creates a stable booking reference for a specific paid cart item.
// Using the same payment + item index in checkout and webhook makes creation idempotent.
export function generateDeterministicBookingReference(paymentId: string, itemIndex: number): string {
  const normalizedPaymentId = (paymentId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const tail = normalizedPaymentId.slice(-6).padStart(6, 'X');
  const normalizedIndex = Number.isFinite(itemIndex) && itemIndex >= 0 ? itemIndex : 0;
  const itemToken = String(normalizedIndex + 1).padStart(2, '0');
  const hash = createHash('sha256')
    .update(`${paymentId}:${normalizedIndex}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();

  return `EEO-${tail}-${itemToken}-${hash}`;
}

// Fallback generator for payment methods without a stable payment ID (e.g. bank transfer).
export async function generateUniqueBookingReference(): Promise<string> {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const reference = `EEO-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const existing = await Booking.findOne({ bookingReference: reference }).lean();
    if (!existing) return reference;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return `EEO-${Date.now()}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
}

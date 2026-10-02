import { resolveBookingCutoff } from '@/lib/bookings/bookingCutoff';
import { localDepartureToUtc, isValidDepartureDate } from '@/lib/revenue/departureSchedule';

export type PaymentSuccessProof = {
  paymentIntentId: string;
  reservationKey: string;
  /** Only the signature-verified payment_intent.succeeded event's created time. */
  succeededAt: Date;
  departureDeadlineUtc?: number;
};

export class DepartureAdmissionError extends Error {
  constructor(public readonly code: 'DEPARTURE_NOT_FUTURE' | 'PAYMENT_TIME_UNPROVEN' | 'INVALID_DEPARTURE', message: string) {
    super(message);
  }
}

/** No provider intent/charge creation or browser clock can establish payment completion. */
export function departureAdmissionTime(input: {
  date: string; time: string; now?: Date; bookingCutoffMinutes?: unknown;
  paymentIntentId?: string; reservationKey?: string;
  paymentSuccess?: PaymentSuccessProof;
}): Date {
  const proof = input.paymentSuccess;
  let startsAt: number;
  try {
    if (!isValidDepartureDate(input.date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error();
    startsAt = proof?.departureDeadlineUtc === undefined ? new Date(localDepartureToUtc(input.date, input.time)).getTime() - (proof ? 0 : resolveBookingCutoff(input.bookingCutoffMinutes)) * 60000 : proof.departureDeadlineUtc;
  }
  catch { throw new DepartureAdmissionError('INVALID_DEPARTURE', 'Select a valid departure date and time.'); }
  const now = input.now || new Date();
  if (!Number.isFinite(now.getTime())) throw new DepartureAdmissionError('INVALID_DEPARTURE', 'The departure clock could not be verified.');
  if (proof?.departureDeadlineUtc !== undefined) {
    if (!Number.isSafeInteger(proof.departureDeadlineUtc) || proof.departureDeadlineUtc <= 0 || !Number.isFinite(new Date(proof.departureDeadlineUtc).getTime())) {
      throw new DepartureAdmissionError('PAYMENT_TIME_UNPROVEN', 'The quoted departure deadline could not be verified.');
    }
    startsAt = proof.departureDeadlineUtc;
  }
  if (proof) {
    if (!/^pi_[A-Za-z0-9_]+$/.test(proof.paymentIntentId || '') || !/^[a-f0-9]{64}$/i.test(proof.reservationKey || '')
      || proof.paymentIntentId !== input.paymentIntentId || proof.reservationKey !== input.reservationKey
      || !(proof.succeededAt instanceof Date) || !Number.isFinite(proof.succeededAt.getTime())
      || proof.succeededAt.getTime() <= 0 || proof.succeededAt.getTime() > now.getTime()) {
      throw new DepartureAdmissionError('PAYMENT_TIME_UNPROVEN', 'Payment confirmation is still being reconciled.');
    }
    if (proof.succeededAt.getTime() >= startsAt) {
      throw new DepartureAdmissionError('DEPARTURE_NOT_FUTURE', 'The booking cutoff had passed when payment completed.');
    }
    return proof.succeededAt;
  }
  if (now.getTime() >= startsAt) {
    throw new DepartureAdmissionError(input.paymentIntentId ? 'PAYMENT_TIME_UNPROVEN' : 'DEPARTURE_NOT_FUTURE',
      input.paymentIntentId ? 'Payment confirmation is still being reconciled.' : 'Bookings for this departure are closed. Choose another time or date.');
  }
  return now;
}

export function quotedDepartureDeadlines(cart: readonly unknown[]) {
  return cart.map(raw => {
    const item = raw as { selectedDate?: string; selectedTime?: string; bookingCutoffMinutes?: unknown };
    const date = item?.selectedDate || '';
    const time = item?.selectedTime || '';
    departureAdmissionTime({ date, time, bookingCutoffMinutes: item.bookingCutoffMinutes });
    return new Date(localDepartureToUtc(date, time)).getTime() - resolveBookingCutoff(item.bookingCutoffMinutes) * 60000;
  });
}

/** Decoded only from the signed payment's server-authored metadata after quote binding. */
export function parseQuotedDepartureDeadlines(raw: string | undefined, count: number): number[] | undefined {
  if (raw === undefined) return undefined;
  try {
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values) || values.length !== count || !values.every(value => Number.isSafeInteger(value) && value > 0 && Number.isFinite(new Date(value).getTime()))) throw new Error();
    return values;
  } catch {
    throw new DepartureAdmissionError('PAYMENT_TIME_UNPROVEN', 'The quoted departure deadlines could not be verified.');
  }
}

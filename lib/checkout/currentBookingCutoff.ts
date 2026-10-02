import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { paidTenantFilter } from '@/lib/tenant/paidTenant';
import { resolveBookingCutoff } from '@/lib/bookings/bookingCutoff';
import { localDepartureToUtc } from '@/lib/revenue/departureSchedule';
import { DepartureAdmissionError } from './departureAdmission';

/** Re-read authoritative admission immediately before unpaid inventory/payment effects. */
export async function currentBookingDeadline(input: { tourId: string; date: string; time: string; tenantId?: string }): Promise<number> {
  if (input.tenantId && input.tenantId !== 'default') throw new DepartureAdmissionError('INVALID_DEPARTURE', 'A tenant-specific admission clock is required.');
  const scope = !input.tenantId || input.tenantId === 'default' ? DEFAULT_TENANT_FILTER : paidTenantFilter(input.tenantId);
  const tour = await Tour.findOne({ _id: input.tourId, ...scope }).select('bookingCutoffMinutes').lean<{ bookingCutoffMinutes?: number } | null>();
  if (!tour) throw new DepartureAdmissionError('INVALID_DEPARTURE', 'This tour is unavailable.');
  const deadline = new Date(localDepartureToUtc(input.date, input.time)).getTime() - resolveBookingCutoff(tour.bookingCutoffMinutes) * 60000;
  if (Date.now() >= deadline) throw new DepartureAdmissionError('DEPARTURE_NOT_FUTURE', 'Bookings for this departure are closed. Choose another time or date.');
  return deadline;
}

export async function recheckQuotedBookingDeadlines(cart: readonly unknown[]) {
  return Promise.all(cart.map(async raw => {
    const item = raw as { _id?: unknown; id?: unknown; selectedDate?: string; selectedTime?: string; bookingCutoffMinutes?: number };
    if (!item || typeof item !== 'object') throw new DepartureAdmissionError('INVALID_DEPARTURE', 'This tour is unavailable.');
    const live = await currentBookingDeadline({ tourId: String(item._id || item.id || ''), date: item.selectedDate || '', time: item.selectedTime || '' });
    const quoted = new Date(localDepartureToUtc(item.selectedDate || '', item.selectedTime || '')).getTime() - resolveBookingCutoff(item.bookingCutoffMinutes) * 60000;
    if (live !== quoted) throw new DepartureAdmissionError('DEPARTURE_NOT_FUTURE', 'The booking cutoff changed. Review availability before continuing.');
    return live;
  }));
}

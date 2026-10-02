/** @jest-environment node */
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
import Tour from '@/lib/models/Tour';
import { currentBookingDeadline, recheckQuotedBookingDeadlines } from '../currentBookingCutoff';
import { departureAdmissionTime, quotedDepartureDeadlines } from '../departureAdmission';
const item = { _id: 'owned-tour', selectedDate: '2026-10-03', selectedTime: '10:00', bookingCutoffMinutes: 120 };
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-03T04:59:59Z'));
  jest.mocked(Tour.findOne).mockReturnValue({ select: () => ({ lean: async () => ({ bookingCutoffMinutes: 120 }) }) } as never);
});
afterEach(() => jest.useRealTimers());
it('uses Egypt time and closes exactly at the configured deadline', async () => {
  expect(await recheckQuotedBookingDeadlines([item])).toEqual([Date.parse('2026-10-03T05:00:00Z')]);
  jest.setSystemTime(new Date('2026-10-03T05:00:00Z'));
  await expect(currentBookingDeadline({ tourId: item._id, date: item.selectedDate, time: item.selectedTime })).rejects.toMatchObject({ code: 'DEPARTURE_NOT_FUTURE' });
});
it('rejects a changed configuration before provider creation', async () => {
  await expect(recheckQuotedBookingDeadlines([{ ...item, bookingCutoffMinutes: 0 }])).rejects.toThrow('cutoff changed');
});
it('fails closed for missing tour and scopes the lookup', async () => {
  jest.mocked(Tour.findOne).mockReturnValue({ select: () => ({ lean: async () => null }) } as never);
  await expect(currentBookingDeadline({ tourId: item._id, date: item.selectedDate, time: item.selectedTime })).rejects.toThrow('unavailable');
  expect(Tour.findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: item._id, $or: expect.any(Array) }));
});
it('binds server cart cutoff and preserves immutable paid and legacy deadlines', () => {
  expect(quotedDepartureDeadlines([item])).toEqual([Date.parse('2026-10-03T05:00:00Z')]);
  const proof = { paymentIntentId: 'pi_owned', reservationKey: 'a'.repeat(64), succeededAt: new Date('2026-10-03T04:59:00Z'), departureDeadlineUtc: Date.parse('2026-10-03T05:00:00Z') };
  jest.setSystemTime(new Date('2026-10-03T08:00:00Z'));
  expect(departureAdmissionTime({ date: item.selectedDate, time: item.selectedTime, bookingCutoffMinutes: 43200, paymentIntentId: proof.paymentIntentId, reservationKey: proof.reservationKey, paymentSuccess: proof })).toEqual(proof.succeededAt);
  const legacy = { ...proof, departureDeadlineUtc: undefined, succeededAt: new Date('2026-10-03T06:00:00Z') };
  expect(departureAdmissionTime({ date: item.selectedDate, time: item.selectedTime, bookingCutoffMinutes: 43200, paymentIntentId: proof.paymentIntentId, reservationKey: proof.reservationKey, paymentSuccess: legacy })).toEqual(legacy.succeededAt);
});

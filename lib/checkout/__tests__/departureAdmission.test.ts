/** @jest-environment node */
import { departureAdmissionTime, parseQuotedDepartureDeadlines, quotedDepartureDeadlines } from '@/lib/checkout/departureAdmission';
import { isCompletePaidCheckoutReplay } from '@/lib/checkout/confirmedCheckoutReplay';

const deadline = Date.parse('2026-10-02T05:00:00Z');
const now = new Date(deadline + 60_000);
const binding = 'a'.repeat(64);
const input = { date: '2026-10-02', time: '08:00', now, paymentIntentId: 'pi_bound', reservationKey: binding };
const proof = (time: number) => ({ paymentIntentId: 'pi_bound', reservationKey: binding, succeededAt: new Date(time), departureDeadlineUtc: deadline });

describe('paid departure admission', () => {
  it('accepts on-time completion delivered after departure, not arrival time', () => {
    expect(departureAdmissionTime({ ...input, paymentSuccess: proof(deadline - 1) }).getTime()).toBe(deadline - 1);
  });
  it.each([deadline, deadline + 1])('denies actual payment completion at or after cutoff %s', time => {
    expect(() => departureAdmissionTime({ ...input, paymentSuccess: proof(time) })).toThrow('already started when payment completed');
  });
  it('does not infer payment time from a succeeded intent alone', () => {
    expect(() => departureAdmissionTime(input)).toThrow('still being reconciled');
    expect(departureAdmissionTime({ ...input, now: new Date(deadline - 1) }).getTime()).toBe(deadline - 1);
  });
  it.each([
    { paymentIntentId: 'pi_foreign' }, { reservationKey: 'b'.repeat(64) },
    { succeededAt: new Date(NaN) }, { succeededAt: new Date(now.getTime() + 1) }, { departureDeadlineUtc: 0 },
  ])('rejects unbound or invalid proof %s', patch => {
    expect(() => departureAdmissionTime({ ...input, paymentSuccess: { ...proof(deadline - 1), ...patch } })).toThrow(/could not be verified|still being reconciled/);
  });
  it('uses a server-resolved different-tenant deadline rather than Cairo for that paid snapshot', () => {
    const tenantDeadline = Date.parse('2026-10-02T12:00:00Z');
    expect(departureAdmissionTime({ ...input, now: new Date('2026-10-02T14:00:00Z'), paymentSuccess: {
      ...proof(tenantDeadline - 1), departureDeadlineUtc: tenantDeadline,
    } }).getTime()).toBe(tenantDeadline - 1);
  });
  it.each([['2026-02-30','08:00'],['2026-10-02',''],['2026-10-02','24:00']])('rejects malformed departure even with paid proof %s %s', (date,time) => {
    expect(() => departureAdmissionTime({ ...input, date, time, paymentSuccess: proof(deadline - 1) })).toThrow('valid departure');
  });
  it('decodes only exact finite deadline arrays; missing legacy metadata remains distinct', () => {
    expect(parseQuotedDepartureDeadlines(undefined, 1)).toBeUndefined();
    expect(parseQuotedDepartureDeadlines(JSON.stringify([deadline]), 1)).toEqual([deadline]);
    for (const raw of ['[]', '{}', '[0]', '[true]', '["1000"]', '[1.5]', '[null]', '[1,2]']) {
      expect(() => parseQuotedDepartureDeadlines(raw, 1)).toThrow('could not be verified');
    }
  });
  it('authors deadlines only while every selected departure is still future', () => {
    jest.useFakeTimers().setSystemTime(deadline - 1);
    expect(quotedDepartureDeadlines([{ selectedDate: input.date, selectedTime: input.time }])).toEqual([deadline]);
    jest.setSystemTime(deadline);
    expect(() => quotedDepartureDeadlines([{ selectedDate: input.date, selectedTime: input.time }])).toThrow('already started');
    jest.useRealTimers();
  });
});

describe('completed checkout replay', () => {
  const cart = [{ _id: 'tour', selectedDate: input.date, selectedTime: input.time }];
  const booking = { tour: 'tour', dateString: input.date, time: input.time, paymentItemIndex: 0, status: 'Confirmed', paymentStatus: 'paid' };
  it('preserves exactly completed immutable bookings', () => expect(isCompletePaidCheckoutReplay([booking],cart)).toBe(true));
  it.each([{ status:'Pending' },{ paymentStatus:'pending' },{ tour:'other' },{ time:'09:00' },{ paymentItemIndex:1 }])('does not treat partial/foreign records as completed %s', patch => {
    expect(isCompletePaidCheckoutReplay([{ ...booking,...patch }],cart)).toBe(false);
  });
  it('rejects missing or extra records', () => {
    expect(isCompletePaidCheckoutReplay([],cart)).toBe(false);
    expect(isCompletePaidCheckoutReplay([booking,booking],cart)).toBe(false);
  });
});

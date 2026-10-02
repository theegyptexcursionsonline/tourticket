/** @jest-environment node */
import { localDepartureToUtc } from '@/lib/revenue/departureSchedule';

describe('strict catalogue departure inputs', () => {
  it.each([['2026-02-30', '10:00'], ['2026-13-01', '10:00'], ['2026-10-02', '24:00'], ['2026-10-02', ''], ['2026-10-02T00:00:00Z', '10:00']])('rejects invalid or missing departure %s %s', (date, time) => {
    expect(() => localDepartureToUtc(date, time)).toThrow('Invalid local departure');
  });
  it('rejects a nonexistent Cairo clock time at spring daylight-saving transition', () => {
    expect(() => localDepartureToUtc('2026-04-24', '00:30')).toThrow('Invalid local departure');
  });
});

import { futureDepartureSlots, isFutureDeparture } from '@/lib/revenue/departureSchedule';
import { evaluateDepartureSellability } from '@/lib/revenue/departureSellability';
import { normalizePriceDate } from '@/lib/revenue/pricingResolver';

describe('shared departure admission boundary', () => {
  const instant = new Date('2026-10-02T05:00:00.000Z'); // Cairo 08:00 while daylight saving is active.
  it('permits one millisecond before departure, denies exact instant and afterward', () => {
    expect(isFutureDeparture('2026-10-02','08:00',new Date(instant.getTime()-1))).toBe(true);
    expect(isFutureDeparture('2026-10-02','08:00',instant)).toBe(false);
    expect(isFutureDeparture('2026-10-02','08:00',new Date(instant.getTime()+1))).toBe(false);
  });
  it('does not use the server or customer timezone instead of catalogue Cairo', () => {
    expect(isFutureDeparture('2026-01-15','10:00',new Date('2026-01-15T07:59:59Z'))).toBe(true);
    expect(isFutureDeparture('2026-01-15','10:00',new Date('2026-01-15T08:00:00Z'))).toBe(false);
  });
  it('filters expired and forged slots without changing prices or source input', () => {
    const slots=[{time:'04:30',price:5},{time:'08:00',price:6},{time:'12:00',price:7},{time:'24:00',price:8}];
    expect(futureDepartureSlots('2026-10-02',slots,new Date('2026-10-02T08:40:00Z'))).toEqual([{time:'12:00',price:7}]);
    expect(slots).toHaveLength(4);
    expect(futureDepartureSlots('2026-10-02',[],instant)).toEqual([]);
  });
  it('fails closed for date-only, malformed clock and invalid now', () => {
    expect(isFutureDeparture('2026-10-02','',instant)).toBe(false);
    expect(isFutureDeparture('2026-10-02','8:00',instant)).toBe(false);
    expect(isFutureDeparture('2026-10-02','12:00',new Date(NaN))).toBe(false);
    expect(()=>normalizePriceDate('2026-02-30')).toThrow('Invalid price date');
  });
  it('denies exact boundary through the authoritative capacity guard', () => {
    expect(()=>evaluateDepartureSellability({scheduled:true,startsAtUtc:instant.toISOString(),now:instant,slots:[{time:'08:00',capacity:10}],time:'08:00',explicitStopSale:false,fullStopSale:false,optionStopSale:false,booked:0})).toThrow('This departure has already started');
  });
});

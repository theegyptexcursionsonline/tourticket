import { filterBookableDatedPrices } from '@/lib/revenue/pricingSummary';

jest.mock('@/lib/models/RevenuePriceOverride', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Availability', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const price = (date: string, adult: number, optionKey = 'quad', time = '10:00') => ({ date: day(date), adult, optionKey, time, prices: { adult } });
const context = (overrides: Partial<Parameters<typeof filterBookableDatedPrices>[1]> = {}) => ({
  optionIdForKey: (key: string | undefined) => (key === 'quad' ? 'option-0' : key === 'jeep' ? 'option-1' : undefined),
  stopSales: [],
  days: [],
  ...overrides,
});

describe('date-specific prices count only on days a customer can book', () => {
  it('keeps a price on an open day', () => {
    expect(filterBookableDatedPrices([price('2026-12-01', 18)], context())).toHaveLength(1);
  });

  it('drops a price on a day the whole tour is stopped', () => {
    const stopSales = [{ startDate: day('2026-11-30'), endDate: day('2026-12-02'), optionIds: [] }];
    expect(filterBookableDatedPrices([price('2026-12-01', 18)], context({ stopSales }))).toHaveLength(0);
  });

  it('drops a price only for the option that is stopped', () => {
    const stopSales = [{ startDate: day('2026-12-01'), endDate: day('2026-12-01'), optionIds: ['option-0'] }];
    const kept = filterBookableDatedPrices([price('2026-12-01', 18, 'quad'), price('2026-12-01', 19, 'jeep')], context({ stopSales }));
    expect(kept.map((entry) => entry.optionKey)).toEqual(['jeep']);
  });

  it('drops a price on a sold-out or blocked departure, or a day stopped in availability', () => {
    const days = [
      { date: day('2026-12-01'), slots: [{ time: '10:00', capacity: 10, booked: 10 }] },
      { date: day('2026-12-02'), slots: [{ time: '10:00', capacity: 10, booked: 2, blocked: true }] },
      { date: day('2026-12-03'), stopSale: true, slots: [] },
      { date: day('2026-12-04'), slots: [{ time: '10:00', capacity: 10, booked: 10, extraCapacity: 2 }] },
    ];
    const kept = filterBookableDatedPrices(
      ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04'].map((date) => price(date, 18)),
      context({ days }),
    );
    expect(kept.map((entry) => entry.date.toISOString().slice(0, 10))).toEqual(['2026-12-04']);
  });
});

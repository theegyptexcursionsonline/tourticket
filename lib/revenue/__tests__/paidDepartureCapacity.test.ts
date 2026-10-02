/** @jest-environment node */
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('@/lib/models/Availability', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: { find: jest.fn() } }));
import Tour from '@/lib/models/Tour';
import Availability from '@/lib/models/Availability';
import Booking from '@/lib/models/Booking';
import StopSale from '@/lib/models/StopSale';
import { readPaidDepartureCapacity } from '@/lib/revenue/sellableDeparture';
const target = { tenantId: 'paid-brand', tourId: '69861276f1598842cc1e5028', date: '2026-10-02', time: '08:00' };
const chain = (value: unknown) => ({ select: () => ({ lean: async () => value }) });
describe('immutable paid departure capacity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Tour.findOne).mockReturnValue(chain({ availability: { slots: [{ time: '08:00', capacity: 10, booked: 2, blocked: true }] } }) as never);
    jest.mocked(Availability.findOne).mockReturnValue(chain(null) as never);
    jest.mocked(Booking.find).mockReturnValue(chain([{ adultGuests: 2, childGuests: 1 }, { guests: 1 }]) as never);
  });
  it('reads current actual capacity without rejecting an on-time purchase for later publication, schedule or stop-sale changes', async () => {
    expect(await readPaidDepartureCapacity(target)).toEqual({ capacity: 10, booked: 4 });
    expect(Tour.findOne).toHaveBeenCalledWith({ _id: target.tourId, tenantId: 'paid-brand' });
    expect(Availability.findOne).toHaveBeenCalledWith(expect.objectContaining({ tour: target.tourId, tenantId: 'paid-brand' }));
    expect(Booking.find).toHaveBeenCalledWith(expect.objectContaining({ $and: expect.arrayContaining([{ tenantId: 'paid-brand' }]) }));
    expect(StopSale.find).not.toHaveBeenCalled();
  });
  it('uses authoritative explicit capacity and larger booked ledger without pretending seats exist', async () => {
    jest.mocked(Availability.findOne).mockReturnValue(chain({ stopSale: true, slots: [{ time: '08:00', capacity: 3, extraCapacity: 1, booked: 5 }] }) as never);
    expect(await readPaidDepartureCapacity(target)).toEqual({ capacity: 4, booked: 5 });
  });
  it.each([null, { availability: { slots: [] } }, { availability: { slots: [{ time: '08:00', capacity: 0 }] } }, { availability: { slots: [{ time: '08:00', capacity: Infinity }] } }])('missing/invalid capacity requires reconciliation %s', tour => {
    jest.mocked(Tour.findOne).mockReturnValue(chain(tour) as never);
    return expect(readPaidDepartureCapacity(target)).rejects.toMatchObject({ code: 'PAYMENT_TIME_UNPROVEN' });
  });
  it('never treats a failed authoritative read as empty inventory', async () => {
    jest.mocked(Booking.find).mockReturnValue({ select: () => ({ lean: async () => { throw new Error('Read unavailable'); } }) } as never);
    await expect(readPaidDepartureCapacity(target)).rejects.toThrow('Read unavailable');
  });
});

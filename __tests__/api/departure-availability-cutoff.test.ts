/** @jest-environment node */
jest.mock('@/lib/dbConnect', () => ({ __esModule:true, default:jest.fn() }));
jest.mock('@/lib/models/Tour', () => ({__esModule:true,default:{findOne:jest.fn()}}));
jest.mock('@/lib/models/Booking', () => ({__esModule:true,default:{find:jest.fn()}}));
jest.mock('@/lib/models/Availability', () => ({__esModule:true,default:{find:jest.fn()}}));
jest.mock('@/lib/models/StopSale', () => ({__esModule:true,default:{find:jest.fn()}}));
jest.mock('@/lib/models/CheckoutInventoryHold', () => ({__esModule:true,default:{find:jest.fn()}}));
import { GET } from '@/app/api/tours/[tourId]/availability/route';
const tour=jest.requireMock('@/lib/models/Tour').default;
const bookings=jest.requireMock('@/lib/models/Booking').default;
const context={params:Promise.resolve({tourId:'507f1f77bcf86cd799439011'})};
beforeEach(()=>{
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-10-02T08:40:00Z'));
  tour.findOne.mockReturnValue({select:jest.fn().mockResolvedValue({tenantId:'default',availability:{availableDays:[0,1,2,3,4,5,6],slots:[{time:'04:30',capacity:10},{time:'08:00',capacity:10},{time:'11:40',capacity:10},{time:'12:00',capacity:10}]}})});
  jest.requireMock('@/lib/models/Availability').default.find.mockReturnValue({select:jest.fn().mockResolvedValue([])});
  jest.requireMock('@/lib/models/StopSale').default.find.mockReturnValue({select:jest.fn().mockResolvedValue([])});
  jest.requireMock('@/lib/models/CheckoutInventoryHold').default.find.mockReturnValue({select:jest.fn().mockResolvedValue([])});
  bookings.find.mockReturnValue({select:jest.fn().mockResolvedValue([])});
});
afterEach(()=>jest.useRealTimers());
it('omits Cairo past and exact-boundary slots while retaining later today',async()=>{
 const response=await GET(new Request('https://example.test/api/tours/id/availability?month=2026-10'),context);
 expect(response.status).toBe(200);
 const body=await response.json();
 expect(body.availableSlotsByDate['2026-10-02']).toEqual([{time:'12:00',remaining:10}]);
 expect(body.availableSlotsByDate['2026-10-01']).toBeUndefined();
});
it('rejects invalid calendar month before querying bookings',async()=>{
 const response=await GET(new Request('https://example.test/api/tours/id/availability?month=2026-13'),context);
 expect(response.status).toBe(400);
 expect(bookings.find).not.toHaveBeenCalled();
});

it('marks a date fully unavailable when all slots pass its cutoff', async () => {
 tour.findOne.mockReturnValue({select:jest.fn().mockResolvedValue({bookingCutoffMinutes:120,availability:{availableDays:[0,1,2,3,4,5,6],slots:[{time:'12:00',capacity:10}]}})});
 const body=await (await GET(new Request('https://example.test/api/tours/id/availability?month=2026-10'),context)).json();
 expect(body.availableSlotsByDate['2026-10-02']).toBeUndefined();
 expect(body.fullyBookedDates).toContain('2026-10-02');
 expect(body.availableSlotsByDate['2026-10-03']).toEqual([{time:'12:00',remaining:10}]);
});
it('keeps an option date open only when an unstopped option has a future slot', async () => {
 tour.findOne.mockReturnValue({select:jest.fn().mockResolvedValue({bookingOptions:[{_id:'early',timeSlots:[{time:'08:00'}]},{_id:'late-object',id:'late',timeSlots:[{time:'12:00'}]}],availability:{availableDays:[0,1,2,3,4,5,6],slots:[{time:'08:00',capacity:10},{time:'12:00',capacity:10}]}})});
 jest.requireMock('@/lib/models/StopSale').default.find.mockReturnValue({select:jest.fn().mockResolvedValue([{startDate:'2026-10-02',endDate:'2026-10-02',optionIds:['late']}])});
 const body=await (await GET(new Request('https://example.test/api/tours/id/availability?month=2026-10'),context)).json();
 expect(body.fullyBookedDates).toContain('2026-10-02');
 expect(body.availableSlotsByDate['2026-10-03']).toHaveLength(2);
});
it('returns a retryable failure instead of available dates after a source failure', async () => {
 bookings.find.mockReturnValue({select:jest.fn().mockRejectedValue(new Error('source unavailable'))});
 const response=await GET(new Request('https://example.test/api/tours/id/availability?month=2026-10'),context);
 expect(response.status).toBe(500);
 expect((await response.json()).availableSlotsByDate).toBeUndefined();
});
it('subtracts active holds and legacy dateString bookings before offering a day', async () => {
 bookings.find.mockReturnValue({select:jest.fn().mockResolvedValue([{dateString:'2026-10-02',date:'2026-10-01',time:'12:00',guests:6}])});
 jest.requireMock('@/lib/models/CheckoutInventoryHold').default.find.mockReturnValue({select:jest.fn().mockResolvedValue([{dateString:'2026-10-02',time:'12:00',guests:4}])});
 const body=await (await GET(new Request('https://example.test/api/tours/id/availability?month=2026-10'),context)).json();
 expect(body.fullyBookedDates).toContain('2026-10-02');
 expect(bookings.find).toHaveBeenCalledWith(expect.objectContaining({$and:expect.any(Array)}));
});

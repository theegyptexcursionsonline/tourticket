/** @jest-environment node */
jest.mock('@/lib/dbConnect', () => ({ __esModule:true, default:jest.fn() }));
jest.mock('@/lib/models/Tour', () => ({__esModule:true,default:{findOne:jest.fn()}}));
jest.mock('@/lib/models/Booking', () => ({__esModule:true,default:{find:jest.fn()}}));
import { GET } from '@/app/api/tours/[tourId]/availability/route';
const tour=jest.requireMock('@/lib/models/Tour').default;
const bookings=jest.requireMock('@/lib/models/Booking').default;
const context={params:Promise.resolve({tourId:'507f1f77bcf86cd799439011'})};
beforeEach(()=>{
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-10-02T08:40:00Z'));
  tour.findOne.mockReturnValue({select:jest.fn().mockResolvedValue({tenantId:'default',availability:{availableDays:[0,1,2,3,4,5,6],slots:[{time:'04:30',capacity:10},{time:'08:00',capacity:10},{time:'11:40',capacity:10},{time:'12:00',capacity:10}]}})});
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

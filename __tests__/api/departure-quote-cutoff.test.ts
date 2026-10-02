/** @jest-environment node */
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/revenue/pricingResolver', () => ({ resolveEffectivePrice: jest.fn().mockResolvedValue({prices:{adult:10}}) }));
jest.mock('@/lib/revenue/sellableDeparture', () => ({ assertRevenuePriceTargetSellable: jest.fn() }));
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/tours/[tourId]/quote/route';
import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';
import { assertRevenuePriceTargetSellable } from '@/lib/revenue/sellableDeparture';
import { RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
const context = {params:Promise.resolve({tourId:'507f1f77bcf86cd799439011'})};
const request = () => new NextRequest('https://example.test/api/tours/id/quote?date=2026-10-02&time=08:00&optionKey=standard');
beforeEach(() => jest.clearAllMocks());
it('rejects an expired authoritative slot before producing a price quote', async () => {
  (assertRevenuePriceTargetSellable as jest.Mock).mockRejectedValue(new RevenuePricingWriteError(422,'DEPARTURE_NOT_FUTURE','This departure has already started. Choose another time or date.'));
  const response=await GET(request(),context);
  expect(response.status).toBe(422);
  expect(resolveEffectivePrice).not.toHaveBeenCalled();
  expect(await response.json()).toMatchObject({error:{code:'DEPARTURE_NOT_FUTURE'}});
});
it('binds fresh sellability to the exact requested tour, date, option and time', async () => {
  (assertRevenuePriceTargetSellable as jest.Mock).mockResolvedValue({available:5});
  expect((await GET(request(),context)).status).toBe(200);
  expect(assertRevenuePriceTargetSellable).toHaveBeenCalledWith({tourId:'507f1f77bcf86cd799439011',date:'2026-10-02',time:'08:00',optionKey:'standard'});
});

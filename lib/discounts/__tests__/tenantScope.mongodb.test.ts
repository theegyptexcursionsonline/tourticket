/** @jest-environment node */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Discount from '@/lib/models/Discount';
import { discountTenantFilter } from '@/lib/discounts/tenantScope';
let server: MongoMemoryServer;
beforeAll(async () => {
  server=await MongoMemoryServer.create();
  await mongoose.connect(server.getUri(),{autoIndex:false});
  await Discount.createIndexes();
});
afterAll(async () => { await mongoose.disconnect(); await server?.stop(); });
beforeEach(async () => { await Discount.deleteMany({}); });
it('keeps global code uniqueness, including cross-brand and concurrent conflicts', async () => {
  const data={code:'QA20',discountType:'percentage',value:20,isActive:true};
  await Discount.create({...data,tenantId:'default'});
  await expect(Discount.create({...data,tenantId:'sharm-excursions-online'})).rejects.toMatchObject({code:11000});
  const results=await Promise.allSettled([
    Discount.create({...data,code:'QA30',tenantId:'brand-a'}),
    Discount.create({...data,code:'QA30',tenantId:'brand-b'}),
  ]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  expect(await Discount.countDocuments({code:'QA20'})).toBe(1);
  expect(await Discount.countDocuments({code:'QA30'})).toBe(1);
});
it('main lookups preserve legacy codes, exclude foreign-only codes and cannot increment foreign usage', async () => {
  await Discount.collection.insertOne({code:'LEGACY',discountType:'percentage',value:10,isActive:true,timesUsed:0});
  await Discount.create({tenantId:'sharm-excursions-online',code:'BRAND30',discountType:'percentage',value:30});
  const main=await Discount.findOne({...discountTenantFilter(),code:'LEGACY'}).lean();
  expect(main?.value).toBe(10);
  expect(await Discount.findOne({...discountTenantFilter(),code:'BRAND30'}).lean()).toBeNull();
  const denied=await Discount.updateOne({...discountTenantFilter(),code:'BRAND30'},{$inc:{timesUsed:1}});
  expect(denied.matchedCount).toBe(0);
  await Discount.updateOne({...discountTenantFilter('sharm-excursions-online'),code:'BRAND30'},{$inc:{timesUsed:1}});
  expect((await Discount.findOne({...discountTenantFilter('sharm-excursions-online'),code:'BRAND30'}).lean())?.timesUsed).toBe(1);
  expect((await Discount.findOne({...discountTenantFilter(),code:'LEGACY'}).lean())?.timesUsed).toBe(0);
});
it('never treats an absent tenant selection as all brands', () => {
  expect(()=>discountTenantFilter('')).toThrow();
  expect(()=>discountTenantFilter('all')).toThrow();
});

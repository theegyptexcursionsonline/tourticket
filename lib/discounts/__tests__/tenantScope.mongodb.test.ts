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
it('allows the same code across brands and rejects a duplicate within one brand, including concurrent attempts', async () => {
  const data={code:'QA20',discountType:'percentage',value:20,isActive:true};
  await Discount.create({...data,tenantId:'default'});
  await Discount.create({...data,tenantId:'sharm-excursions-online'});
  const results=await Promise.allSettled([Discount.create({...data,tenantId:'brand-b'}),Discount.create({...data,tenantId:'brand-b'})]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  expect(await Discount.countDocuments({code:'QA20'})).toBe(3);
});
it('main lookups preserve legacy codes and exclude another brand with the same code', async () => {
  await Discount.collection.insertOne({code:'LEGACY',discountType:'percentage',value:10,isActive:true,timesUsed:0});
  await Discount.create({tenantId:'sharm-excursions-online',code:'LEGACY',discountType:'percentage',value:30});
  const main=await Discount.findOne({...discountTenantFilter(),code:'LEGACY'}).lean();
  expect(main?.value).toBe(10);
  const sharm=await Discount.findOne({...discountTenantFilter('sharm-excursions-online'),code:'LEGACY'}).lean();
  expect(sharm?.value).toBe(30);
  await Discount.updateOne({...discountTenantFilter('sharm-excursions-online'),code:'LEGACY'},{$inc:{timesUsed:1}});
  expect((await Discount.findOne({...discountTenantFilter(),code:'LEGACY'}).lean())?.timesUsed).toBe(0);
});
it('never treats an absent tenant selection as all brands', () => {
  expect(()=>discountTenantFilter('')).toThrow();
  expect(()=>discountTenantFilter('all')).toThrow();
});

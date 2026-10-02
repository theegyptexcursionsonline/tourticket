/** @jest-environment node */
jest.mock('@/lib/dbConnect', () => ({__esModule:true,default:jest.fn()}));
jest.mock('@/lib/admin/adminAudit', () => ({withAdminAudit:(handler:unknown)=>handler}));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth:jest.fn(),
  canAccessTenant:jest.fn((_auth,tenant)=>tenant==='brand-a'),
  tenantForbiddenResponse:()=>require('next/server').NextResponse.json({error:'Forbidden'},{status:403}),
}));
jest.mock('@/lib/models/Discount', () => ({__esModule:true,default:{
  find:jest.fn(),findOne:jest.fn(),findById:jest.fn(),create:jest.fn(),exists:jest.fn(),
  findOneAndUpdate:jest.fn(),findOneAndDelete:jest.fn(),
}}));
import {NextRequest,NextResponse} from 'next/server';
import Discount from '@/lib/models/Discount';
import {requireAdminAuth} from '@/lib/auth/adminAuth';
import {POST,GET} from '@/app/api/admin/discounts/route';
import {PUT,DELETE} from '@/app/api/admin/discounts/[id]/route';
const db=Discount as unknown as Record<string,jest.Mock>;
const id='507f1f77bcf86cd799439011';
const ctx={params:Promise.resolve({id})};
const request=(body:unknown,tenant?:string)=>new NextRequest('https://example.test/api/admin/discounts'+(tenant?'?tenantId='+tenant:''),{method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json'}});
beforeEach(()=>{
  jest.clearAllMocks();
  (requireAdminAuth as jest.Mock).mockResolvedValue({role:'admin',tenantIds:['brand-a']});
  db.exists.mockResolvedValue(null);
  db.create.mockImplementation(async data=>({_id:id,...data}));
  db.find.mockReturnValue({sort:jest.fn().mockResolvedValue([])});
  db.findOneAndUpdate.mockResolvedValue({_id:id,isActive:false});
  db.findOneAndDelete.mockResolvedValue({_id:id});
});
it('denies missing permission before accessing data',async()=>{
  (requireAdminAuth as jest.Mock).mockResolvedValue(NextResponse.json({error:'Forbidden'},{status:403}));
  expect((await POST(request({}))).status).toBe(403);
  expect(db.create).not.toHaveBeenCalled();
});
it('turns a concurrent duplicate conflict into 409 without exposing the database error',async()=>{
  db.create.mockRejectedValue({code:11000,message:'private database detail'});
  const response=await POST(request(VALID));
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('private database');
});
it('rejects client-supplied usage counters and Mongo operators',async()=>{
  expect((await POST(request({...VALID,timesUsed:5}))).status).toBe(400);
  expect((await POST(request({...VALID,$set:{value:90}}))).status).toBe(400);
  expect(db.create).not.toHaveBeenCalled();
});

const VALID={code:' welcome20 ',discountType:'percentage',value:20};
it('creates main codes explicitly and keeps the main list scoped',async()=>{
  expect((await POST(request(VALID))).status).toBe(201);
  expect(db.create).toHaveBeenCalledWith({code:'WELCOME20',discountType:'percentage',value:20,tenantId:'default'});
  await GET(new NextRequest('https://example.test/api/admin/discounts'));
  expect(db.find.mock.calls[0][0]).toHaveProperty('$or');
  expect(requireAdminAuth).toHaveBeenCalledWith(expect.anything(),{permissions:['manageDiscounts']});
});
it('rejects a foreign tenant in main admin and reports an existing legacy code',async()=>{
  expect((await POST(request({...VALID,tenantId:'brand-other'}))).status).toBe(400);
  db.exists.mockResolvedValue({_id:id});
  expect((await POST(request(VALID))).status).toBe(409);
  expect(db.create).not.toHaveBeenCalled();
});
it('cannot update or delete another brand record by id',async()=>{
  db.findOne.mockReturnValue({lean:jest.fn().mockResolvedValue(null)});
  db.findOneAndDelete.mockResolvedValue(null);
  expect((await PUT(request({isActive:false}),ctx)).status).toBe(404);
  expect(db.findOne.mock.calls[0][0]).toHaveProperty('$or');
  expect(db.findOneAndUpdate).not.toHaveBeenCalled();
  expect((await DELETE(new NextRequest('https://example.test/api/admin/discounts/'+id,{method:'DELETE'}),ctx)).status).toBe(404);
  expect(db.findOneAndDelete.mock.calls[0][0]).toHaveProperty('$or');
});
it('updates only authorized fields and validates merged percentage value',async()=>{
  db.findOne.mockReturnValue({lean:jest.fn().mockResolvedValue({discountType:'percentage',value:20,code:'WELCOME20'})});
  expect((await PUT(request({value:101}),ctx)).status).toBe(400);
  expect((await PUT(request({isActive:false}),ctx)).status).toBe(200);
  expect(db.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({_id:id}),{$set:{isActive:false}},expect.objectContaining({runValidators:true}));
});
